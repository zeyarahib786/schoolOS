/* Explicit localhost-only retained demonstration. No password/account mutations or external messages. */
const fs = require("fs"),
  assert = require("assert"),
  path = require("path");
const browser = require("../helpers/browser.cjs");
const directory = "/tmp/schoolos-ai-live-review";
fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
const stateFile = path.join(directory, "records.json");
const state = fs.existsSync(stateFile)
  ? JSON.parse(fs.readFileSync(stateFile, "utf8"))
  : {
      grade: "Grade 10 · A",
      subject: "Mathematics",
      academicYear: "2026-2027",
      drafts: {},
      events: [],
    };
function save() {
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2), { mode: 0o600 });
}
const stage = process.argv[2];
if (
  ![
    "generate",
    "publish",
    "submit",
    "review",
    "apply",
    "views",
    "inbox",
  ].includes(stage)
)
  throw Error(
    "Choose generate, publish, submit, review, apply, views or inbox. Writes fictional demo data to localhost; requires existing demo logins.",
  );
if (
  ["generate", "publish", "submit", "review", "apply"].includes(stage) &&
  process.env.SCHOOLOS_ALLOW_RETAINED_DEMO !== "true"
)
  throw Error(
    "Set SCHOOLOS_ALLOW_RETAINED_DEMO=true to explicitly retain fictional classroom records in the configured local database.",
  );
const titles = {
  Assignment: "Similar triangles: explain and apply",
  Quiz: "Similar triangles: exit quiz",
  LessonPlan: "Similar triangles: 40-minute lesson",
  Feedback: "Similar triangles: reviewed practice feedback",
  ParentMessage: "Mathematics learning update: similar triangles",
  Progress: "Mathematics progress review: Fatima Al Hashimi",
};
async function run(role, callback) {
  const supplied = process.env.SCHOOLOS_LIVE_CREDENTIALS_FILE
    ? JSON.parse(
        fs.readFileSync(process.env.SCHOOLOS_LIVE_CREDENTIALS_FILE, "utf8"),
      )[role] || {}
    : {};
  const email =
    supplied.email ||
    {
      Teacher: "teacher",
      Student: "student",
      Parent: "parent",
      Administrator: "admin",
      Principal: "principal",
      Accountant: "accountant",
    }[role] + "@alnoor.ae";
  await browser(
    "ai-live-" + stage + "-" + role,
    async (ctx) => {
      await ctx.evaluate("go('lms')");
      await ctx.waitFor(
        () =>
          ctx.evaluate(
            "lmsWorkspaceState().loaded&&!lmsWorkspaceState().loading",
          ),
        "LMS workspace",
      );
      await callback(ctx);
    },
    {
      origin: "http://localhost:5173/",
      role,
      email,
      password: supplied.password || "ChangeMe123",
      viewport: { width: 1440, height: 1000 },
    },
  );
}
async function generate(ctx, kind) {
  const { evaluate, waitFor, fill, api, screenshot } = ctx;
  if (state.drafts[kind]) {
    const row = (await api("/lms/ai/drafts/" + state.drafts[kind]._id)).data;
    if (row.content) {
      state.drafts[kind] = row;
      save();
      return;
    }
  }
  await evaluate("lmsAiOpen()");
  await waitFor(
    () =>
      evaluate(
        "document.getElementById('drawer').textContent.includes('Quick actions')",
      ),
    "AI studio",
  );
  await evaluate("lmsAiForm(" + JSON.stringify(kind) + ")");
  const scope =
    state.grade + " / " + state.subject + " / " + state.academicYear;
  await evaluate(
    "document.querySelector('[data-fkey=scope]').value=" +
      JSON.stringify(scope),
  );
  if (kind === "Feedback") {
    await evaluate("lmsAiSubmissionChoices()");
    await evaluate(
      "document.querySelector('[data-fkey=submission]').value=lmsAiState().submissionChoices.find(s=>s.id===" +
        JSON.stringify(state.submissionId) +
        ").label",
    );
  }
  if (["ParentMessage", "Progress"].includes(kind)) {
    await evaluate("lmsAiStudents()");
    await waitFor(
      () =>
        evaluate(
          "!document.getElementById('teacherAiStudent').disabled&&document.getElementById('teacherAiStudent').options.length>1",
        ),
      "student selector",
    );
    await evaluate(
      'document.getElementById("teacherAiStudent").value=' +
        JSON.stringify(state.studentId),
    );
  }
  const instructions = {
    Assignment:
      "Create two short-answer questions worth 5 marks each about similar triangles: 3,4,5 and 6,8,10 (scale factor 2), and a 4 cm side with scale factor 3 (12 cm). Include clear rubrics. This is a fictional classroom demonstration.",
    Quiz: "Create two MCQs, 5 marks each, four options each, on corresponding side ratios and scaling a 4 cm side by factor 3. Give exact option text as the answer. Fictional classroom demonstration.",
    LessonPlan:
      "Use a 40-minute sequence: 5 minute starter, 10 minute modelling, 10 minute guided practice, 10 minute independent work, 5 minute exit ticket. Include materials, differentiated support and checks for understanding. Fictional classroom demonstration.",
    Feedback:
      "Apply the teacher rubric strictly to the supplied student answers. Explain each item with kind, specific corrective feedback. This is a fictional classroom demonstration.",
    ParentMessage:
      "Write a respectful short update using only supplied records. Mention a practical 10-minute similar-triangle practice activity. Do not invent a child name, scores, diagnosis or attendance. This is a fictional classroom demonstration.",
    Progress:
      "Use only the supplied recorded attendance and coursework facts. Quote the sample sizes and percentages accurately. Distinguish missing data. Give two practical next steps. This is a fictional classroom demonstration.",
  }[kind];
  await fill({
    topic: titles[kind],
    instructions,
    language: "English",
    ...(["Assignment", "Quiz"].includes(kind)
      ? { questionCount: "2", maxScore: "10" }
      : {}),
    ...(kind === "LessonPlan" ? { duration: "40" } : {}),
    ...(["ParentMessage", "Progress"].includes(kind)
      ? { reportDays: "30" }
      : {}),
  });
  await waitFor(
    () =>
      evaluate(
        "!lmsAiState().busy&&Boolean(lmsAiState().active?.content||lmsAiState().active?.status==='Failed'||document.querySelector('[data-ai-error]'))",
      ),
    "Live AI generation " + kind,
    180000,
  );
  const draft = await evaluate("lmsAiState().active");
  if (!draft?.content)
    throw Error(
      kind +
        ": " +
        (draft?.failureMessage ||
          (await evaluate(
            "document.querySelector('[data-ai-error]')?.textContent||'Generation failed'",
          ))),
    );
  assert.strictEqual(draft.status, "Draft");
  assert.strictEqual(draft.request.kind, kind);
  state.drafts[kind] = draft;
  state.events.push({
    kind,
    event: "Live generated through teacher UI",
    at: new Date().toISOString(),
  });
  save();
  await screenshot(kind + "-draft");
  await evaluate("closeDrawer()");
}
async function reviewedEdits(ctx, kind) {
  const { evaluate, waitFor } = ctx;
  const row = state.drafts[kind];
  if (!row) throw Error(kind + " draft missing");
  await evaluate("lmsAiPreview(" + JSON.stringify(row._id) + ")");
  await waitFor(
    () => evaluate("Boolean(document.querySelector('[data-ai=title]'))"),
    "draft preview",
  );
  state.originalGeneratedContent = state.originalGeneratedContent || {};
  if (!state.originalGeneratedContent[kind])
    state.originalGeneratedContent[kind] = row.content;
  save();
  const content = JSON.parse(JSON.stringify(row.content));
  content.title = titles[kind];
  if (kind === "Assignment") {
    content.body =
      "Use corresponding sides to explain your reasoning. Answer both questions and show your working. Total: 10 marks.";
    content.questions = [
      {
        id: "q1",
        type: "ShortAnswer",
        prompt:
          "Triangle ABC has sides 3 cm, 4 cm and 5 cm. Its enlargement has corresponding sides 6 cm, 8 cm and 10 cm. State the scale factor and justify it.",
        options: [],
        answer: "2; all corresponding side ratios are 2.",
        marks: 5,
        rubric:
          "Award 5 marks for scale factor 2 supported by corresponding ratios. Award 0 for an unsupported or incorrect answer.",
      },
      {
        id: "q2",
        type: "ShortAnswer",
        prompt:
          "A triangle has a 4 cm side. A similar triangle is an enlargement with scale factor 3. Find the corresponding side length.",
        options: [],
        answer: "12 cm",
        marks: 5,
        rubric:
          "Award 5 marks for 12 cm obtained using 4 × 3. Award 0 for any other answer.",
      },
    ];
  }
  if (kind === "Quiz") {
    content.body =
      "Choose one answer for each question. Each question is worth 5 marks.";
    content.questions = [
      {
        id: "q1",
        type: "MCQ",
        prompt:
          "Corresponding sides of similar triangles are 3 cm and 6 cm. What is the enlargement scale factor?",
        options: ["2", "3", "0.5", "6"],
        answer: "2",
        marks: 5,
        rubric: "5 marks for 2; 0 for any other option.",
      },
      {
        id: "q2",
        type: "MCQ",
        prompt:
          "A 4 cm side is enlarged by scale factor 3. What is its new length?",
        options: ["7 cm", "12 cm", "16 cm", "1 cm"],
        answer: "12 cm",
        marks: 5,
        rubric: "5 marks for 12 cm; 0 for any other option.",
      },
    ];
  }
  if (kind === "LessonPlan") {
    content.body =
      "Objectives: identify corresponding sides; justify similarity using AA, SAS or SSS; calculate a missing side using a constant scale factor.\n\n40-minute sequence: 5-minute starter comparing 3-4-5 and 6-8-10 triangles; 10-minute teacher modelling of corresponding ratios and AA/SSS similarity; 10-minute guided paired practice; 10-minute independent practice, including 4 × 3 = 12 cm; 5-minute exit ticket explaining one similarity criterion and one calculation.\n\nMaterials: ruler, protractor, board and triangle worksheet. Support: colour-code corresponding sides and provide a ratio table. Challenge: justify similarity before finding an unknown side. Formative checks: ask every student to identify a corresponding pair, inspect ratio tables and review exit tickets.\n\nTeacher review: CPCTC concerns congruence and is not a triangle similarity criterion. No official curriculum alignment is claimed because no matching school source was supplied. Fictional classroom demonstration.";
  }
  if (kind === "ParentMessage") {
    content.body =
      "Dear Parent, your child has been practising corresponding sides and scale factors in Mathematics. The reviewed exit quiz score is 5/10. The next step is to multiply a 4 cm side by scale factor 3 to obtain 12 cm. For a short home activity, compare two similar triangles and ask your child to explain the same ratio for each pair of corresponding sides. The five recorded attendance sessions across subjects include four present-or-late sessions and one absence (80%); missing registers have not been counted as absence. Please contact the school if you would like to discuss support. Teacher-reviewed fictional classroom demonstration.";
  }
  if (kind === "Progress") {
    const f = row.facts;
    content.body = `Attendance over the selected rolling window: ${f.presentOrLate} present-or-late sessions out of ${f.countedSessions} counted sessions (${f.attendancePercent}%). There were ${f.absent} absences and ${f.excused} excused sessions among ${f.recordedSessions} recorded sessions. These records cover this student's attendance across subjects, not Mathematics-only sessions. Missing registers are not counted as absences.\n\nMathematics coursework for ${row.request.academicYear}: ${f.publishedAssignments} published activities, ${f.submitted} submitted, ${f.graded} graded. The average percentage across graded submissions is ${f.averagePercent}%; this is an achievement measure, not a completion score. There are ${f.overdueUnsubmitted} overdue unsubmitted activities. Coursework covers the academic year, while attendance uses the separate rolling window.\n\nNext steps: practise multiplying every corresponding side by the same scale factor, including 4 × 3 = 12 cm; then explain the ratio using two different corresponding pairs. Review progress after the next short classroom assessment. Teacher-reviewed fictional classroom demonstration.`;
  }
  if (kind === "Feedback") {
    content.suggestedScore = 5;
    content.body =
      "Question 1: 5/5. You correctly identified scale factor 2 and justified it using matching side ratios. Question 2: 0/5. The new side is 4 × 3 = 12 cm, rather than 10 cm. Next step: multiply each original side by the same scale factor and check your answer with a ratio. Total: 5/10. Teacher-reviewed feedback.";
  }
  await evaluate(
    "(()=>{const c=" +
      JSON.stringify(content) +
      ';document.querySelector("[data-ai=title]").value=c.title;document.querySelector("[data-ai=body]").value=c.body;' +
      (kind === "Feedback"
        ? 'document.querySelector("[data-ai=suggestedScore]").value=c.suggestedScore;'
        : "") +
      'c.questions.forEach((q,i)=>{const host=document.querySelector(\'[data-ai-question="\'+i+\'"]\');for(const key of ["prompt","marks","answer","rubric"]){const el=host?.querySelector(\'[data-ai="\'+key+\'"]\');if(el)el.value=q[key];}const options=host?.querySelector("[data-ai=options]");if(options)options.value=q.options.join("\\n");});return lmsAiSaveEdits();})()',
  );
  const saved = await evaluate("lmsAiState().active");
  assert.strictEqual(saved.content.title, titles[kind]);
  state.drafts[kind] = saved;
  state.events.push({
    kind,
    event: "Teacher reviewed and saved edits through UI",
    at: new Date().toISOString(),
  });
  save();
}
async function apply(ctx, kind) {
  const { evaluate, waitFor, fill, api, screenshot } = ctx;
  if (state.drafts[kind]?.status === "Applied") {
    const saved = state.drafts[kind];
    const options = {
      action: ["Assignment", "Quiz"].includes(kind)
        ? "SaveAssignment"
        : kind === "Feedback"
          ? "Grade"
          : "Message",
      status: ["Assignment", "Quiz"].includes(kind) ? "Published" : "Draft",
      channel: "InApp",
      ...(["Assignment", "Quiz"].includes(kind)
        ? {
            dueDate: await evaluate(
              "new Date('2026-10-31T18:00').toISOString()",
            ),
          }
        : {}),
    };
    const again = await api("/lms/ai/drafts/" + saved._id + "/apply", "POST", {
      ...options,
      expectedUpdatedAt: saved.updatedAt,
      reviewed: true,
    });
    assert.strictEqual(again.data.appliedRecord, saved.appliedRecord);
    return;
  }
  await reviewedEdits(ctx, kind);
  await evaluate("lmsAiApplyForm()");
  await waitFor(
    () => evaluate("Boolean(document.querySelector('[data-fkey=reviewed]'))"),
    "review confirmation",
  );
  await fill({
    reviewed: "I reviewed this draft",
    ...(["Assignment", "Quiz"].includes(kind)
      ? { dueDate: "2026-10-31T18:00", status: "Published" }
      : {}),
    ...(kind === "ParentMessage" ? { channel: "InApp" } : {}),
  });
  await waitFor(
    () =>
      evaluate("!lmsAiState().busy&&lmsAiState().active?.status==='Applied'"),
    "reviewed action " + kind,
    60000,
  );
  const saved = await evaluate("lmsAiState().active");
  state.drafts[kind] = saved;
  state.events.push({
    kind,
    event: "Reviewed action applied through UI",
    record: saved.appliedRecord,
    at: new Date().toISOString(),
  });
  save();
  // Retry the exact action to verify server idempotency without generating another record.
  const options = {
    action: ["Assignment", "Quiz"].includes(kind)
      ? "SaveAssignment"
      : kind === "Feedback"
        ? "Grade"
        : "Message",
    status: ["Assignment", "Quiz"].includes(kind) ? "Published" : "Draft",
    channel: "InApp",
    ...(["Assignment", "Quiz"].includes(kind)
      ? {
          dueDate: await evaluate("new Date('2026-10-31T18:00').toISOString()"),
        }
      : {}),
  };
  const again = await api("/lms/ai/drafts/" + saved._id + "/apply", "POST", {
    ...options,
    expectedUpdatedAt: saved.updatedAt,
    reviewed: true,
  });
  assert.strictEqual(again.data.appliedRecord, saved.appliedRecord);
  await screenshot(kind + "-applied");
  await evaluate("closeDrawer()");
}
async function main() {
  if (stage === "generate")
    await run("Teacher", async (ctx) => {
      await ctx.step(
        "Live teacher uses configured provider and actual class context",
        async () => {
          const status = (await ctx.api("/lms/ai/status")).data;
          assert(status.configured);
          state.provider = status;
          const students = (
            await ctx.api(
              "/lms/ai/students?" +
                new URLSearchParams({
                  grade: state.grade,
                  subject: state.subject,
                  academicYear: state.academicYear,
                }),
            )
          ).data;
          const child = students.find((s) => s.refId === "ANS-1042");
          assert(child);
          state.studentId = child._id;
          state.studentName = child.name;
          save();
        },
      );
      for (const kind of ["Assignment", "Quiz", "LessonPlan"])
        await ctx.step("Live " + kind + " generated and retained", () =>
          generate(ctx, kind),
        );
    });
  if (stage === "publish")
    await run("Teacher", async (ctx) => {
      for (const kind of ["Assignment", "Quiz"])
        await ctx.step(
          kind + " review, publication and duplicate protection",
          () => apply(ctx, kind),
        );
      await ctx.step(
        "Lesson plan reviewed and retained as a private teaching draft",
        async () => {
          await reviewedEdits(ctx, "LessonPlan");
          await ctx.screenshot("lesson-reviewed");
        },
      );
    });
  if (stage === "submit")
    await run("Student", async (ctx) => {
      for (const kind of ["Assignment", "Quiz"])
        await ctx.step(
          "Student reads " +
            kind +
            " without answer keys and submits their own work",
          async () => {
            const id = state.drafts[kind]?.appliedRecord;
            assert(id);
            const row = await ctx.evaluate(
              "lmsWorkspaceState().assignments.find(a=>a._id===" +
                JSON.stringify(id) +
                ")",
            );
            assert(row);
            assert(
              row.questions.every((q) => !("answer" in q) && !("rubric" in q)),
            );
            await ctx.evaluate(
              "lmsWorkspaceSubmitForm(" + JSON.stringify(id) + ")",
            );
            await ctx.fill(
              kind === "Assignment"
                ? {
                    q1: "The scale factor is 2 because 6/3 = 8/4 = 10/5 = 2.",
                    q2: "10 cm",
                  }
                : { q1: "2", q2: "7 cm" },
            );
            await ctx.waitFor(
              () => ctx.evaluate("!lmsWorkspaceState().saving"),
              "student submission",
            );
            const sub = await ctx.evaluate(
              "lmsWorkspaceState().submissions.find(s=>(s.assignment?._id||s.assignment)===" +
                JSON.stringify(id) +
                ")",
            );
            assert(sub);
            if (kind === "Assignment") state.submissionId = sub._id;
            else state.quizSubmissionId = sub._id;
            save();
            await ctx.evaluate("closeDrawer()");
          },
        );
    });
  if (stage === "review")
    await run("Teacher", async (ctx) => {
      await ctx.step(
        "Recorded attendance and quiz marking provide factual progress context",
        async () => {
          const id = state.quizSubmissionId;
          const sub = await ctx.evaluate(
            "lmsWorkspaceState().submissions.find(s=>s._id===" +
              JSON.stringify(id) +
              ")",
          );
          assert(sub);
          if (sub.status !== "Graded")
            await ctx.api("/lms/submissions/" + id + "/grade", "POST", {
              score: 5,
              feedback:
                "One correct answer out of two. Revisit 4 × 3 = 12 cm. Teacher-reviewed classroom demonstration.",
              expectedUpdatedAt: sub.updatedAt,
              reason: "Teacher reviewed classroom exit quiz",
            });
          for (const [i, status] of [
            "Present",
            "Present",
            "Late",
            "Absent",
            "Present",
          ].entries()) {
            const date = "2026-10-" + (19 + i);
            const found = await ctx.api(
              "/attendance?" +
                new URLSearchParams({
                  studentId: state.studentId,
                  dateFrom: date,
                  dateTo: date,
                  session: "AM",
                }),
            );
            if (!found.data.length)
              await ctx.api("/attendance/mark", "POST", {
                date,
                session: "AM",
                entries: [
                  {
                    studentId: state.studentId,
                    status,
                    notes:
                      "Fictional classroom review demonstration; no guardian alert requested.",
                  },
                ],
              });
          }
          await ctx.evaluate("lmsWorkspaceLoad()");
        },
      );
      for (const kind of ["Feedback", "ParentMessage"])
        await ctx.step("Live " + kind + " generated from saved records", () =>
          generate(ctx, kind),
        );
    });
  if (stage === "apply")
    await run("Teacher", async (ctx) => {
      for (const kind of ["Feedback", "ParentMessage"])
        await ctx.step(kind + " teacher review and safe application", () =>
          apply(ctx, kind),
        );
      await ctx.step(
        "Progress summary refresh reflects the final reviewed grade",
        async () => {
          await generate(ctx, "Progress");
          await reviewedEdits(ctx, "Progress");
          await ctx.screenshot("progress-reviewed");
        },
      );
      await ctx.step(
        "Lesson plan and progress summary downloads contain the reviewed saved content",
        async () => {
          const downloads = path.join(directory, "downloads");
          fs.mkdirSync(downloads, { recursive: true, mode: 0o700 });
          await ctx.cdp("Browser.setDownloadBehavior", {
            behavior: "allow",
            downloadPath: downloads,
          });
          for (const kind of ["LessonPlan", "Progress"]) {
            await ctx.evaluate(
              "lmsAiPreview(" + JSON.stringify(state.drafts[kind]._id) + ")",
            );
            await ctx.waitFor(
              () =>
                ctx.evaluate(
                  "lmsAiState().active?._id===" +
                    JSON.stringify(state.drafts[kind]._id),
                ),
              "download draft preview",
            );
            const before = new Set(fs.readdirSync(downloads));
            await ctx.evaluate("lmsAiDownload()");
            let filename;
            await ctx.waitFor(() => {
              filename = fs
                .readdirSync(downloads)
                .find((name) => name.endsWith(".txt") && !before.has(name));
              return Boolean(filename);
            }, "download " + kind);
            assert(
              fs
                .readFileSync(path.join(downloads, filename), "utf8")
                .includes(titles[kind]),
            );
            fs.renameSync(
              path.join(downloads, filename),
              path.join(downloads, kind + ".txt"),
            );
          }
        },
      );
    });
  if (stage === "inbox")
    await run("Parent", async (ctx) => {
      await ctx.step(
        "Parent opens the reviewed AI message directly from its personal notification",
        async () => {
          await ctx.evaluate("openNotifs()");
          await ctx.waitFor(
            () =>
              ctx.evaluate(
                "schoolInboxState().rows.some(r=>r.recordId===" +
                  JSON.stringify(state.drafts.ParentMessage.appliedRecord) +
                  ")",
              ),
            "parent message notification",
          );
          await ctx.evaluate(
            "schoolInboxOpen(schoolInboxState().rows.find(r=>r.recordId===" +
              JSON.stringify(state.drafts.ParentMessage.appliedRecord) +
              ")._id)",
          );
          await ctx.waitFor(
            () =>
              ctx.evaluate(
                "state.module==='comm'&&document.getElementById('drawer').textContent.includes(" +
                  JSON.stringify(titles.ParentMessage) +
                  ")",
              ),
            "linked parent message",
          );
          assert(
            await ctx.evaluate(
              "document.getElementById('drawer').textContent.includes('12 cm')",
            ),
          );
          await ctx.screenshot("parent-notification-message");
        },
      );
    });
  if (stage === "views")
    for (const role of process.env.SCHOOLOS_LIVE_ROLES
      ? process.env.SCHOOLOS_LIVE_ROLES.split(",")
      : [
          "Teacher",
          "Student",
          "Parent",
          "Administrator",
          "Principal",
          "Accountant",
        ])
      await run(role, async (ctx) => {
        await ctx.step(
          role + " sees the appropriate persisted classroom records",
          async () => {
            const assignments = await ctx.evaluate(
              "lmsWorkspaceState().assignments",
            );
            for (const kind of ["Assignment", "Quiz"])
              assert(
                assignments.some(
                  (a) => a._id === state.drafts[kind].appliedRecord,
                ),
              );
            if (["Student", "Parent"].includes(role)) {
              for (const a of assignments)
                assert(
                  a.questions.every(
                    (q) => !("answer" in q) && !("rubric" in q),
                  ),
                );
              const subs = await ctx.evaluate(
                "lmsWorkspaceState().submissions",
              );
              const marked = subs.find((s) => s._id === state.submissionId);
              assert(marked);
              assert.strictEqual(marked.score, 5);
              assert(marked.feedback.includes("12 cm"));
              assert(
                !(await ctx.evaluate(
                  "document.getElementById('view').textContent.includes('Teacher AI Studio')",
                )),
              );
            }
            if (role === "Accountant") {
              assert.strictEqual(
                await ctx.evaluate("lmsWorkspaceState().submissions.length"),
                0,
              );
            }
            if (["Teacher", "Administrator", "Principal"].includes(role)) {
              await ctx.evaluate("lmsAiOpen()");
              await ctx.waitFor(
                () =>
                  ctx.evaluate(
                    "document.getElementById('drawer').textContent.includes('My saved drafts')",
                  ),
                "draft list",
              );
              if (role === "Teacher") {
                for (const kind of Object.keys(titles))
                  assert(
                    await ctx.evaluate(
                      "lmsAiState().drafts.some(d=>d._id===" +
                        JSON.stringify(state.drafts[kind]._id) +
                        ")",
                    ),
                  );
              } else
                assert(
                  !(await ctx.evaluate(
                    "lmsAiState().drafts.some(d=>d._id===" +
                      JSON.stringify(state.drafts.LessonPlan._id) +
                      ")",
                  )),
                );
              await ctx.evaluate("closeDrawer()");
            }
            if (role === "Parent") {
              const messages = await ctx.api("/messages?limit=100");
              const rows = Array.isArray(messages.data)
                ? messages.data
                : messages.data?.items || [];
              assert(
                rows.some(
                  (m) => m._id === state.drafts.ParentMessage.appliedRecord,
                ),
              );
              await ctx.evaluate("go('comm');commTab('Inbox')");
              await ctx.waitFor(
                () =>
                  ctx.evaluate(
                    'document.getElementById("view").textContent.includes(' +
                      JSON.stringify(titles.ParentMessage) +
                      ")",
                  ),
                "parent communication inbox",
              );
            }
            if (role !== "Parent" && role !== "Accountant")
              await ctx.evaluate(
                "lmsWorkspaceSubmissionDetail(" +
                  JSON.stringify(state.submissionId) +
                  ")",
              );
            await ctx.screenshot("persisted-view");
          },
        );
      });
  save();
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
