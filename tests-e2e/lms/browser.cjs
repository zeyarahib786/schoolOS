const assert = require("assert");
require("../helpers/browser.cjs")(
  "lms",
  async ({ role, step, evaluate, waitFor, fill, cdp, screenshot }) => {
    const manage = ["Administrator", "Principal", "Teacher"].includes(role),
      family = ["Parent", "Student"].includes(role);
    await step(
      "Full learning workspace loads correct role scope and controls",
      async () => {
        await evaluate("go('lms')");
        await waitFor(
          () => evaluate("lmsWorkspaceState().loaded"),
          "LMS loaded",
        );
        assert(await evaluate("lmsWorkspaceState().assignments.length>=12"));
        assert.strictEqual(
          await evaluate(
            "document.getElementById('view').textContent.includes('New assignment')",
          ),
          manage,
        );
        if (family) {
          assert(
            await evaluate(
              "lmsWorkspaceState().assignments.every(r=>r.grade==='Grade 7 · A'&&r.status!=='Draft'&&r.history.length===0)",
            ),
          );
          assert(
            await evaluate(
              "lmsWorkspaceState().submissions.every(r=>r.student.refId==='QA-001'&&r.gradeHistory.length===0)",
            ),
          );
        }
        if (role === "Accountant")
          assert.strictEqual(
            await evaluate("lmsWorkspaceState().submissions.length"),
            0,
          );
        if (manage) {
          assert(await evaluate("lmsWorkspaceState().assignments.length>=26"));
          await evaluate("lmsWorkspaceFilter('page',2)");
          assert(await evaluate("lmsWorkspaceState().page===2"));
        }
      },
    );
    await step(
      "Safe assignment detail displays persisted instructions",
      async () => {
        await evaluate(
          "lmsWorkspaceAssignmentDetail(lmsWorkspaceState().assignments.find(r=>r.title.includes('<img'))._id)",
        );
        assert(
          await evaluate(
            "document.getElementById('drawer').textContent.includes('QA safe <img')",
          ),
        );
        assert(
          !(await evaluate("!!document.querySelector('#drawer img[src=x]')")),
        );
        await evaluate("closeDrawer()");
      },
    );
    await step('AI tools are available only to teaching roles',async()=>{
      assert.strictEqual(await evaluate("document.getElementById('view').textContent.includes('Teacher AI Studio')"),manage);
      if(!manage){const result=await evaluate("SCHOOLOS_ADAPTER.api('/lms/ai/status').then(()=>200).catch(e=>e.status||403)");assert.strictEqual(result,403);}
    });
    if(role==='Student')await step('Student answers a real structured quiz without receiving the answer key',async()=>{
      const id=await evaluate("lmsWorkspaceState().assignments.find(a=>a.title.startsWith('QA AI quiz'))._id");
      assert(await evaluate("lmsWorkspaceState().assignments.find(a=>a._id==='"+id+"').questions.every(q=>!('answer' in q)&&!('rubric' in q))"));
      await evaluate(`lmsWorkspaceSubmitForm(${JSON.stringify(id)})`);await fill({q1:'Plant',q2:'Plants have roots and leaves.'});
      await waitFor(()=>evaluate('!lmsWorkspaceState().saving'),'quiz submitted');assert(await evaluate("lmsWorkspaceState().submissions.some(s=>s.assignment._id==='"+id+"')"));
    });
    if(manage){
      await step('AI studio generates editable quiz questions, protects answers and saves only after review',async()=>{
        await evaluate('lmsAiOpen()');await waitFor(()=>evaluate("document.getElementById('drawer').textContent.includes('Quick actions')"),'AI panel');
        await evaluate("lmsAiForm('Quiz')");await fill({scope:'Grade 7 · A / Science / 2026-2027',topic:'Plants',questionCount:'2',maxScore:'20'});
        await waitFor(()=>evaluate("!!document.querySelector('[data-ai=title]')"),'AI preview');
        assert.strictEqual(await evaluate("document.querySelectorAll('[data-ai-question]').length"),2);
        await evaluate("document.querySelector('[data-ai=title]').value='QA AI quiz '+state.role;lmsAiApplyForm()");
        await waitFor(()=>evaluate("!!document.querySelector('[data-fkey=reviewed]')"),'review form');
        await fill({dueDate:'2099-01-01T08:00',status:'Published',reviewed:'I reviewed this draft'});
        await waitFor(()=>evaluate("lmsAiState().active?.status==='Applied'&&!lmsAiState().busy"),'AI quiz applied');
        assert.strictEqual(await evaluate("lmsWorkspaceState().assignments.filter(r=>r.title==='QA AI quiz '+state.role).length"),1);
        await evaluate('closeDrawer()');
      });
      await step('AI lesson plans, parent drafts and progress summaries persist without auto-sending',async()=>{
        for(const kind of ['LessonPlan','Feedback','ParentMessage','Progress']){
          await evaluate(`lmsAiForm(${JSON.stringify(kind)})`);
          if(['ParentMessage','Progress'].includes(kind)){
            await waitFor(()=>evaluate("document.getElementById('teacherAiStudent').options.length>1"),'student choices');
            await evaluate("document.getElementById('teacherAiStudent').selectedIndex=1");
          }
          if(kind==='Feedback')await evaluate("document.querySelector('[data-fkey=scope]').value='Grade 7 · A / Science / 2026-2027';lmsAiSubmissionChoices();document.querySelector('[data-fkey=submission]').selectedIndex=1");
          await fill({topic:'Fictional classroom support'});
          await waitFor(()=>evaluate("!!document.querySelector('[data-ai=title]')&&!lmsAiState().busy"),'AI teaching draft');
          assert.strictEqual(await evaluate('lmsAiState().active.status'),'Draft');
          await evaluate('closeDrawer()');
        }
      });
      await step('AI studio supports Arabic controls and a mobile draft editor',async()=>{
        await evaluate("lmsAiPreview(lmsAiState().active._id)");await waitFor(()=>evaluate("!!document.querySelector('.teacher-ai-editor')"),'draft editor');
        await evaluate("setLanguage('ar')");
        assert(await evaluate("document.getElementById('drawer').textContent.includes('مراجعة المعلم')"));
        await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
        assert(await evaluate("document.getElementById('drawer').scrollWidth<=document.getElementById('drawer').clientWidth+2"));
        await screenshot('ai-arabic-mobile');
        await evaluate("setLanguage('en');closeDrawer()");await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
        if(role==='Teacher'){await evaluate("go('dashboard');lmsAiLaunch()");await waitFor(()=>evaluate("document.getElementById('drawer').textContent.includes('Quick actions')&&state.module==='lms'"),'dashboard AI entry');await evaluate('closeDrawer()');}
      });
      await step('Teaching access panel uses actual accounts and restricts management controls',async()=>{
        await evaluate('lmsTeachingPanel()');assert(await evaluate("document.getElementById('drawer').textContent.includes('Science')"));
        assert.strictEqual(await evaluate("[...document.querySelectorAll('#drawer button')].some(b=>b.textContent.includes('Assign teacher'))"),role!=='Teacher');await evaluate('closeDrawer()');
      });
      await step('Reusable templates create separate scheduled assignments for two sections',async()=>{
        await evaluate('lmsTemplateForm()');await fill({name:'QA reusable '+role,title:'QA scheduled '+role,description:'Reusable fictional instructions',subject:'Science',maxScore:'20'});await waitFor(()=>evaluate('!lmsWorkspaceState().templateSaving'),'template saved');
        const id=await evaluate("lmsWorkspaceState().templates.find(t=>t.name==='QA reusable '+state.role)._id");
        await evaluate(`lmsUseTemplate(${JSON.stringify(id)});document.querySelector('[data-fkey=grade]').value='Grade 7 · A';lmsWorkspaceTargets();document.querySelector('[data-lms-target][value="Grade 7 · B"]').checked=true`);
        await fill({grade:'Grade 7 · A',academicYear:'2026-2027',dueDate:'2099-01-01',status:'Scheduled',publishAt:'2098-01-01T08:00:00+04:00'});await waitFor(()=>evaluate('!lmsWorkspaceState().saving'),'scheduled batch saved');
        assert.strictEqual(await evaluate("lmsWorkspaceState().assignments.filter(a=>a.title==='QA scheduled '+state.role&&a.status==='Scheduled').length"),2);
      });
    }
    if (manage) {
      await step("Course form creates a real scoped course", async () => {
        await evaluate("lmsWorkspaceCourseForm()");
        await fill({
          title: "QA Created course " + role,
          teacher: "Fictional teacher",
          subject: "QA Subject",
          grade: "Grade 7 · A",
          academicYear: "2026-2027",
          startDate: "2026-09-01",
        });
        await waitFor(
          () => evaluate("!lmsWorkspaceState().saving"),
          "course saved",
        );
        assert(
          await evaluate(
            "lmsWorkspaceState().courses.some(r=>r.title==='QA Created course '+state.role)",
          ),
        );
      });
      await step("Course correction saves reason and coordinator", async () => {
        await evaluate(
          "lmsWorkspaceCourseForm(lmsWorkspaceState().courses.find(r=>r.title==='QA Created course '+state.role)._id)",
        );
        await fill({
          teacher: "Revised fictional coordinator",
          reason: "QA coordinator change",
        });
        await waitFor(
          () => evaluate("!lmsWorkspaceState().saving"),
          "course corrected",
        );
        assert(
          await evaluate(
            "lmsWorkspaceState().courses.find(r=>r.title==='QA Created course '+state.role).history.length===1",
          ),
        );
      });
      await step(
        "Course archive and restore use the saved directory state",
        async () => {
          await evaluate(
            "lmsWorkspaceCourseForm(lmsWorkspaceState().courses.find(r=>r.title==='QA Created course '+state.role)._id)",
          );
          await fill({ archived: "Archived", reason: "QA archive course" });
          await waitFor(
            () => evaluate("!lmsWorkspaceState().saving"),
            "course archived",
          );
          assert(
            await evaluate(
              "lmsWorkspaceState().courses.find(r=>r.title==='QA Created course '+state.role).archived",
            ),
          );
          await evaluate(
            "lmsWorkspaceFilter('tab','Courses');lmsWorkspaceFilter('showArchived',true)",
          );
          assert(
            await evaluate(
              "lmsWorkspaceFiltered().some(r=>r.title==='QA Created course '+state.role)",
            ),
          );
          await evaluate(
            "lmsWorkspaceCourseForm(lmsWorkspaceState().courses.find(r=>r.title==='QA Created course '+state.role)._id)",
          );
          await fill({ archived: "Active", reason: "QA restore course" });
          await waitFor(
            () => evaluate("!lmsWorkspaceState().saving"),
            "course restored",
          );
          await evaluate(
            "lmsWorkspaceFilter('showArchived',false);lmsWorkspaceFilter('tab','Assignments')",
          );
        },
      );
      await step(
        "Draft assignment creation and publication use actual forms",
        async () => {
          await evaluate("lmsWorkspaceAssignmentForm()");
          await fill({
            course: await evaluate(
              "lmsWorkspaceState().courseChoices.find(c=>c.label.startsWith('QA Created course '+state.role+' ·')).label",
            ),
            title: "QA Created assignment " + role,
            description: "Fictional assignment instructions",
            subject: "QA Subject",
            grade: "Grade 7 · A",
            academicYear: "2026-2027",
            dueDate: "2099-01-01",
            maxScore: "20",
            status: "Draft",
            remindersEnabled:"Before deadline and after missed deadline",
          });
          await waitFor(
            () => evaluate("!lmsWorkspaceState().saving"),
            "draft saved",
          );
          assert(
            await evaluate(
              "lmsWorkspaceState().assignments.find(r=>r.title==='QA Created assignment '+state.role).status==='Draft'",
            ),
          );
          assert(await evaluate("lmsWorkspaceState().assignments.find(r=>r.title==='QA Created assignment '+state.role).remindersEnabled===true"));
          await evaluate(
            "lmsWorkspaceAssignmentForm(lmsWorkspaceState().assignments.find(r=>r.title==='QA Created assignment '+state.role)._id)",
          );
          await fill({
            status: "Published",
            reason: "QA coordinator publication",
          });
          await waitFor(
            () => evaluate("!lmsWorkspaceState().saving"),
            "published",
          );
          assert(
            await evaluate(
              "lmsWorkspaceState().assignments.find(r=>r.title==='QA Created assignment '+state.role).history.length===1",
            ),
          );
        },
      );
      await step(
        "Assessment correction persists marks feedback and history",
        async () => {
          await evaluate(
            "lmsWorkspaceGradeForm(lmsWorkspaceState().submissions.find(r=>r.content.includes('QA work'))._id)",
          );
          await fill({
            score: "17",
            feedback: "QA corrected feedback " + role,
            reason: "QA rubric moderation",
          });
          await waitFor(
            () => evaluate("!lmsWorkspaceState().saving"),
            "grade saved",
          );
          assert(
            await evaluate(
              "lmsWorkspaceState().submissions.find(r=>r.content.includes('QA work')).score===17&&lmsWorkspaceState().submissions.find(r=>r.content.includes('QA work')).gradeHistory.length>=2",
            ),
          );
        },
      );
      await step("Closing published work persists the review", async () => {
        await evaluate(
          "lmsWorkspaceAssignmentForm(lmsWorkspaceState().assignments.find(r=>r.title==='QA Created assignment '+state.role)._id)",
        );
        await fill({ status: "Closed", reason: "QA assignment finished" });
        await waitFor(
          () => evaluate("!lmsWorkspaceState().saving"),
          "assignment closed",
        );
        assert(
          await evaluate(
            "lmsWorkspaceState().assignments.find(r=>r.title==='QA Created assignment '+state.role).status==='Closed'",
          ),
        );
      });
    }
    if (role === "Student")
      await step("Student submits actual own-grade work once", async () => {
        await evaluate(
          "lmsWorkspaceSubmitForm(lmsWorkspaceState().assignments.find(r=>r.title==='QA assignment 2')._id)",
        );
        await fill({ content: "QA actual student response" });
        await waitFor(
          () => evaluate("!lmsWorkspaceState().saving"),
          "student submitted",
        );
        assert(
          await evaluate(
            "lmsWorkspaceState().submissions.some(r=>r.content==='QA actual student response')",
          ),
        );
      });
    if (role !== "Accountant")
      await step(
        "Owned submission detail preserves safe response and real feedback",
        async () => {
          await evaluate(
            "lmsWorkspaceSubmissionDetail(lmsWorkspaceState().submissions.find(r=>r.content.includes('QA work'))._id)",
          );
          assert(
            await evaluate(
              "document.getElementById('drawer').textContent.includes('QA work <img')",
            ),
          );
          assert(
            !(await evaluate("!!document.querySelector('#drawer img[src=x]')")),
          );
          assert(
            await evaluate(
              "document.getElementById('drawer').textContent.includes('feedback')",
            ),
          );
          await evaluate("closeDrawer()");
        },
      );
    await step(
      "Search export and reload preserve actual coursework",
      async () => {
        await evaluate("lmsWorkspaceFilter('q','QA assignment 2')");
        assert(await evaluate("lmsWorkspaceFiltered().length>0"));
        await evaluate("lmsWorkspaceExport()");
        await cdp("Page.reload", { ignoreCache: true });
        await waitFor(
          () => evaluate("SCHOOLOS_ADAPTER.connected"),
          "login restore",
        );
        await evaluate("go('lms')");
        await waitFor(
          () => evaluate("lmsWorkspaceState().loaded"),
          "LMS reload",
        );
        if (role === "Student")
          assert(
            await evaluate(
              "lmsWorkspaceState().submissions.some(r=>r.content==='QA actual student response')",
            ),
          );
      },
    );
    await step("Mobile learning screen fits viewport", async () => {
      await cdp("Emulation.setDeviceMetricsOverride", {
        width: 390,
        height: 844,
        deviceScaleFactor: 1,
        mobile: true,
      });
      assert(
        await evaluate(
          "document.documentElement.scrollWidth<=window.innerWidth+1",
        ),
      );
      await screenshot("mobile");
    });
  },
);
