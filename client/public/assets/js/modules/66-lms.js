/* Learning workspace: persisted courses, assignments and owned coursework. */
function lmsWorkspaceManage() {
  return ["Administrator", "Principal", "Teacher"].includes(state.role);
}
function lmsWorkspaceState() {
  const userId = commUserId();
  if (state.lmsWorkspace?.userId !== userId)
    state.lmsWorkspace = {
      userId,
      courses: [],
      showArchived: false,
      assignments: [],
      submissions: [],
      teaching: [], templates: [], teachingOptions: null,
      loaded: false,
      loading: false,
      saving: false,
      error: "",
      tab: "Assignments",
      q: "",
      grade: "All",
      subject: "All",
      status: "All",
      page: 1,
    };
  return state.lmsWorkspace;
}
window.lmsWorkspaceLoad = async function () {
  const b = lmsWorkspaceState();
  if (b.loading) return;
  b.loading = true;
  b.error = "";
  try {
    const values = await Promise.all([
      SCHOOLOS_ADAPTER.apiAll("/lms/courses"),
      SCHOOLOS_ADAPTER.apiAll("/lms/courses?archived=true"),
      SCHOOLOS_ADAPTER.apiAll("/lms/assignments"),
      SCHOOLOS_ADAPTER.api("/lms/submissions"),
      ...(lmsWorkspaceManage()?[SCHOOLOS_ADAPTER.api('/lms/teaching-assignments'),SCHOOLOS_ADAPTER.api('/lms/templates')]:[]),
      ...(['Administrator','Principal'].includes(state.role)?[SCHOOLOS_ADAPTER.api('/lms/teaching-options')]:[]),
    ]);
    b.courses = [...(values[0].data || []), ...(values[1].data || [])];
    b.assignments = values[2].data || [];
    b.submissions = values[3].data || [];
    b.teaching=values[4]?.data||[];b.templates=values[5]?.data||[];b.teachingOptions=values[6]?.data||null;
    b.loaded = true;
  } catch (e) {
    b.error = e.message;
  } finally {
    b.loading = false;
    if (state.module === "lms") render();
    if(b.openAi&&state.module==='lms'&&lmsWorkspaceState()===b){b.openAi=false;if(b.loaded)lmsAiOpen();}
  }
};
function lmsWorkspaceAssignment(id) {
  return lmsWorkspaceState().assignments.find((r) => r._id === id);
}
function lmsWorkspaceSubAssignment(r) {
  return (
    lmsWorkspaceAssignment(r.assignment?._id || r.assignment) ||
    r.assignment ||
    {}
  );
}
function lmsWorkspaceSubmissions(id) {
  return lmsWorkspaceState().submissions.filter(
    (r) => (r.assignment?._id || r.assignment) === id,
  );
}
window.lmsWorkspaceFilter = function (k, v) {
  const b = lmsWorkspaceState();
  b[k] = v;
  if (k !== "page") b.page = 1;
  render();
};
function lmsWorkspaceFiltered() {
  const b = lmsWorkspaceState(),
    rows =
      b.tab === "Courses"
        ? b.courses
        : b.tab === "Submissions"
          ? b.submissions
          : b.assignments;
  return rows.filter((r) => {
    const a = b.tab === "Submissions" ? lmsWorkspaceSubAssignment(r) : r;
    return (
      (b.tab !== "Courses" || !!r.archived === b.showArchived) &&
      (b.grade === "All" || a.grade === b.grade) &&
      (b.subject === "All" || a.subject === b.subject) &&
      (b.status === "All" || r.status === b.status) &&
      (!b.q ||
        [a.title, a.description, a.teacher, r.student?.name, r.student?.refId]
          .join(" ")
          .toLowerCase()
          .includes(b.q.toLowerCase()))
    );
  });
}
window.lmsWorkspaceCourseForm = function (id) {
  if (!lmsWorkspaceManage()) return;
  const b = lmsWorkspaceState(),
    r = b.courses.find((r) => r._id === id);
  b.editId = id || null;
  b.mode = "course";
  studentFormDrawer(
    r ? "Edit course" : "New course",
    "Saved course directory and teaching scope.",
    [
      { key: "title", label: "Course title", req: true, val: r?.title || "" },
      {
        key: "teacher",
        label: "Teacher / coordinator",
        req: true,
        val: r?.teacher || "",
      },
      {
        key: "subject",
        label: "Subject",
        req: true,
        val: r?.subject || "General",
        half: true,
      },
      {
        key: "grade",
        label: "Grade / section",
        req: true,
        val: r?.grade || "",
        half: true,
      },
      {
        key: "academicYear",
        label: "Academic year",
        req: true,
        val: r?.academicYear || SCHOOLOS_ADAPTER.settings?.academicYear,
      },
      {
        key: "startDate",
        label: "Start date",
        type: "date",
        val: curriculumWorkspaceDay(r?.startDate),
      },
      ...(r
        ? [
            {
              key: "archived",
              label: "Course state",
              opts: ["Active", "Archived"],
              val: r.archived ? "Archived" : "Active",
            },
            {
              key: "reason",
              label: "Reason for correction",
              req: true,
              area: true,
            },
          ]
        : []),
    ],
    "Save course",
    "",
    "lmsWorkspaceSave",
  );
};
window.lmsWorkspaceAssignmentForm = function (id) {
  if (!lmsWorkspaceManage()) return;
  const b = lmsWorkspaceState(),
    r = lmsWorkspaceAssignment(id);
  if(state.role==='Teacher'&&!b.teaching.length)return toast('Ask school leadership to assign your class and subject first');
  b.editId = id || null;
  b.batchKey=crypto.randomUUID();
  b.mode = "assignment";
  b.courseChoices = b.courses
    .filter((c) => !c.archived || c._id === (r?.course?._id || r?.course))
    .map((c) => ({
      id: c._id,
      label:
        c.title +
        " · " +
        c.grade +
        " · " +
        c.academicYear +
        " · " +
        c._id.slice(-5),
    }));
  studentFormDrawer(
    r ? "Review assignment" : "New assignment",
    "Schedule using an ISO timestamp with timezone offset. Published assignments notify linked portal accounts.",
    [
      {
        key: "title",
        label: "Assignment title",
        req: true,
        val: r?.title || "",
      },
      {
        key: "description",
        label: "Instructions",
        req: true,
        area: true,
        maxlen:2000,
        val: r?.description || "",
      },
      {
        key: "course",
        label: "Course (optional)",
        opts: ["Standalone", ...b.courseChoices.map((c) => c.label)],
        val:
          b.courseChoices.find((c) => c.id === (r?.course?._id || r?.course))
            ?.label || "Standalone",
      },
      {
        key: "subject",
        label: "Subject",
        req: true,
        val: r?.subject || (state.role==='Teacher'?b.teaching[0]?.subject:'') || '',
        ...(state.role==='Teacher'?{opts:[...new Set(b.teaching.map(t=>t.subject))]}:{}),
        half: true,
      },
      {
        key: "grade",
        label: "Grade / section",
        req: true,
        val: r?.grade || (state.role==='Teacher'?b.teaching[0]?.grade:'') || '',
        ...(state.role==='Teacher'?{opts:[...new Set(b.teaching.map(t=>t.grade))]}:{}),
        half: true,
      },
      {
        key: "academicYear",
        label: "Academic year",
        req: true,
        val: r?.academicYear || SCHOOLOS_ADAPTER.settings?.academicYear,
      },
      {
        key: "dueDate",
        label: "Deadline (YYYY-MM-DD or ISO timestamp with offset)",
        req: true,
        val: r?.dueDate || healthDay(),
      },
      {
        key: "maxScore",
        label: "Maximum score",
        req: true,
        type: "number",
        val: r?.maxScore || 100,
        half: true,
      },
      {
        key: "status",
        label: "Publication",
        opts: ["Draft", "Scheduled", "Published", "Closed"],
        val: r?.status || "Draft",
        half: true,
      },
      {
        key: "acceptLate",
        label: "Late submissions",
        opts: ["Accept and flag late", "Reject after deadline"],
        val:
          r?.acceptLate === false
            ? "Reject after deadline"
            : "Accept and flag late",
      },
      {key:'publishAt',label:'Publish at (ISO timestamp with offset; Scheduled only)',val:r?.publishAt||''},
      {key:'remindersEnabled',label:'Pending homework reminders',opts:['Off','Before deadline and after missed deadline'],val:r?.remindersEnabled?'Before deadline and after missed deadline':'Off'},
      {key:'notifyEmail',label:'Assignment email requests',opts:['In-app only','In-app and email request'],val:r?.notifyEmail?'In-app and email request':'In-app only'},
      {note:'Teacher email requests require office approval. Automatic alerts include only active linked student and parent accounts.'},
      ...(r
        ? [{ key: "reason", label: "Reason for review", req: true, area: true }]
        : []),
    ],
    "Save assignment",
    "",
    "lmsWorkspaceSave",
  );
  if(!id){const form=document.querySelector('#drawer .form-body');form.insertAdjacentHTML('beforeend','<div id="lmsAdditionalTargets" style="grid-column:1/-1"></div>');form.addEventListener('change',lmsWorkspaceTargets);lmsWorkspaceTargets();}
};
window.lmsWorkspaceSubmitForm = function (id) {
  if (state.role !== "Student") return;
  const r = lmsWorkspaceAssignment(id);
  if (!r) return;
  const b = lmsWorkspaceState();
  b.editId = id;
  b.mode = "submit";
  if(r.questions?.length){
    studentFormDrawer('Submit coursework',r.title,r.questions.map(q=>({key:q.id,label:q.prompt+' · '+q.marks+' marks',req:true,...(q.type==='MCQ'?{opts:['Select answer',...q.options],val:'Select answer'}:{area:true,maxlen:1000})})),'Submit coursework','','lmsWorkspaceSave');return;
  }
  studentFormDrawer(
    "Submit coursework",
    r.title,
    [
      {
        key: "content",
        label: "Your response",
        req: true,
        area: true,
        maxlen: 5000,
      },
    ],
    "Submit coursework",
    "",
    "lmsWorkspaceSave",
  );
};
window.lmsWorkspaceGradeForm = function (id) {
  if (!lmsWorkspaceManage()) return;
  const b = lmsWorkspaceState(),
    r = b.submissions.find((r) => r._id === id);
  if (!r) return;
  const a = lmsWorkspaceSubAssignment(r);
  b.editId = id;
  b.mode = "grade";
  studentFormDrawer(
    r.status === "Graded" ? "Correct grade" : "Grade submission",
    r.student?.name + " · " + a.title,
    [
      {
        key: "score",
        label: "Score out of " + a.maxScore,
        req: true,
        type: "number",
        val: r.score ?? "",
      },
      {
        key: "feedback",
        label: "Feedback to student",
        area: true,
        val: r.feedback || "",
        maxlen: 2000,
      },
      {
        key: "reason",
        label: "Assessment / correction reason",
        req: true,
        area: true,
      },
    ],
    "Save assessment",
    "",
    "lmsWorkspaceSave",
  );
};
window.lmsWorkspaceSave = async function (v) {
  const b = lmsWorkspaceState();
  if (b.saving) return false;
  let payload,
    path,
    method = "POST";
  if (b.mode === "course") {
    const r = b.courses.find((r) => r._id === b.editId);
    payload = {
      title: v.title,
      teacher: v.teacher,
      subject: v.subject,
      grade: v.grade,
      academicYear: v.academicYear,
      ...(v.startDate ? { startDate: v.startDate } : {}),
    };
    path = "/lms/courses" + (r ? "/" + r._id : "");
    if (r) {
      method = "PATCH";
      Object.assign(payload, {
        archived: v.archived === "Archived",
        expectedUpdatedAt: r.updatedAt,
        reason: v.reason,
      });
    }
  } else if (b.mode === "assignment") {
    const r = lmsWorkspaceAssignment(b.editId);
    payload = {
      title: v.title,
      description: v.description,
      subject: v.subject,
      grade: v.grade,
      academicYear: v.academicYear,
      dueDate: v.dueDate,
      maxScore: Number(v.maxScore),
      status: v.status,
      publishAt:v.status==='Scheduled'?(v.publishAt||null):null,
      remindersEnabled:v.remindersEnabled==='Before deadline and after missed deadline',
      notifyEmail:v.notifyEmail==='In-app and email request',
      acceptLate: v.acceptLate !== "Reject after deadline",
      course: b.courseChoices.find((c) => c.label === v.course)?.id || null,
    };
    path = "/lms/assignments" + (r ? "/" + r._id : "");
    if(!r){const extra=[...document.querySelectorAll('[data-lms-target]:checked')].map(n=>n.value);path='/lms/assignments/batch';payload={assignment:payload,grades:[v.grade,...extra],idempotencyKey:b.batchKey};}
    if (r) {
      method = "PATCH";
      Object.assign(payload, {
        expectedUpdatedAt: r.updatedAt,
        reason: v.reason,
      });
    }
  } else if (b.mode === "submit") {
    path = "/lms/assignments/" + b.editId + "/submit";
    const assignment=lmsWorkspaceAssignment(b.editId);
    payload = assignment.questions?.length?{answers:assignment.questions.map(q=>({questionId:q.id,value:v[q.id]}))}:{ content: v.content };
  } else {
    const r = b.submissions.find((r) => r._id === b.editId);
    path = "/lms/submissions/" + b.editId + "/grade";
    payload = {
      score: Number(v.score),
      feedback: v.feedback,
      expectedUpdatedAt: r.updatedAt,
      reason: v.reason,
    };
  }
  const anchor=document.getElementById('drawer').firstElementChild;
  b.saving = true;
  try {
    await SCHOOLOS_ADAPTER.api(path, { method, body: JSON.stringify(payload) });
    if(state.module==='lms'&&lmsWorkspaceState()===b&&document.getElementById('drawer').firstElementChild===anchor)closeDrawer();
    await lmsWorkspaceLoad();
    toast("Coursework saved");
  } catch (e) {
    toast(e.message);
  } finally {
    b.saving = false;
  }
  return false;
};
window.lmsWorkspaceAssignmentDetail = function (id) {
  const r = lmsWorkspaceAssignment(id);
  if (!r) return;
  const subs = lmsWorkspaceSubmissions(id),
    esc = studentEscape,
    canSubmit =
      state.role === "Student" && r.status === "Published" && !subs.length;
  openDrawer(
    detailDrawer({
      title: esc(r.title),
      sub: esc(r.subject + " · " + r.grade + " · " + r.academicYear),
      sections: [
        ...(r.questions?.length?[{h:'Assessment questions',html:r.questions.map(q=>'<div class="card pad" style="margin-bottom:10px"><strong>'+esc(q.prompt)+'</strong><p>'+q.marks+' marks · '+esc(q.type)+'</p>'+q.options.map(o=>'<p>'+esc(o)+'</p>').join('')+(lmsWorkspaceManage()?'<p><b>Answer key (staff only)</b>: '+esc(q.answer)+'</p><p>'+esc(q.rubric)+'</p>':'')+'</div>').join('')}]:[]),
        {
          h: "Assignment",
          rows: [
            ["Status", esc(r.status)],
            ...(lmsWorkspaceManage()&&r.reminderSummary?[["Reminder result",esc(r.reminderSummary)]]:[]),
            ...(r.publishAt?[["Scheduled publication",esc(commDate(r.publishAt))]]:[]),
            ...(lmsWorkspaceManage()&&r.automationSummary?[["Automation result",esc(r.automationSummary)]]:[]),
            [
              "Deadline",
              esc(
                commDate(r.dueDate) +
                  " · " +
                  new Intl.DateTimeFormat("en-GB", {
                    timeZone: SCHOOLOS_ADAPTER.settings?.timezone || "UTC",
                    hour: "2-digit",
                    minute: "2-digit",
                  }).format(new Date(r.dueDate)),
              ),
            ],
            ["Maximum score", String(r.maxScore)],
            [
              "Late work",
              r.acceptLate ? "Accepted and flagged" : "Rejected after deadline",
            ],
          ],
        },
        {
          h: "Instructions",
          html:
            '<div style="white-space:pre-wrap">' +
            esc(r.description) +
            "</div>",
        },
        {
          h: "Submissions in your view",
          html: subs.length
            ? subs
                .map(
                  (s) =>
                    '<div class="lrow"><div><b>' +
                    esc(s.student?.name || "Student") +
                    "</b><p>" +
                    esc(s.status) +
                    (s.isLate ? " · Late" : "") +
                    (s.score !== undefined
                      ? " · " + s.score + " / " + r.maxScore
                      : "") +
                    '</p></div><button class="btn" onclick="' +
                    studentClick("lmsWorkspaceSubmissionDetail", s._id) +
                    '">View work</button></div>',
                )
                .join("")
            : '<p class="muted">No submissions in your view.</p>',
        },
        ...(lmsWorkspaceManage()
          ? [
              {
                h: "Plan review history",
                rows: (r.history || []).map((h) => [
                  esc(commDate(h.at)),
                  esc(h.reason),
                ]),
              },
            ]
          : []),
      ],
      footer: [
        ...(lmsWorkspaceManage()
          ? [
              [
                "Review assignment",
                studentClick("lmsWorkspaceAssignmentForm", id),
                true,
              ],
            ]
          : []),
        ...(canSubmit
          ? [["Submit work", studentClick("lmsWorkspaceSubmitForm", id), true]]
          : []),
        ["Close", "closeDrawer()"],
      ],
    }),
  );
};
window.lmsWorkspaceSubmissionDetail = function (id) {
  const r = lmsWorkspaceState().submissions.find((r) => r._id === id);
  if (!r) return;
  const a = lmsWorkspaceSubAssignment(r),
    esc = studentEscape;
  openDrawer(
    detailDrawer({
      title: esc(a.title || "Coursework"),
      sub: esc(r.student?.name || "Student"),
      sections: [
        {
          h: "Submission",
          rows: [
            ["Submitted", esc(commDate(r.submittedAt))],
            ["Deadline", r.isLate ? "Late" : "On time"],
            ["Status", esc(r.status)],
            [
              "Score",
              r.score !== undefined
                ? r.score + " / " + a.maxScore
                : "Not graded",
            ],
          ],
        },
        {
          h: "Student response",
          html:
            (r.content&&!(r.answers||[]).length?'<div style="white-space:pre-wrap">'+esc(r.content)+'</div>':'')+
            (r.answers||[]).map((answer,index)=>{const question=(a.questions||[]).find(q=>q.id===answer.questionId);return '<article class="card pad" style="margin-top:12px"><strong>'+esc(question?.prompt||('Question '+(index+1)))+'</strong><p style="white-space:pre-wrap">'+esc(answer.value)+'</p></article>';}).join('')+
            (!r.content&&!(r.answers||[]).length?'<p>No response recorded.</p>':''),
        },
        {
          h: "Feedback",
          html:
            '<div style="white-space:pre-wrap">' +
            esc(r.feedback || "No feedback yet.") +
            "</div>",
        },
        ...(lmsWorkspaceManage()
          ? [
              {
                h: "Assessment history",
                rows: (r.gradeHistory || []).map((h) => [
                  esc(commDate(h.at)),
                  esc(h.reason) + " · " + h.score + " / " + a.maxScore,
                ]),
              },
            ]
          : []),
      ],
      footer: [
        ...(lmsWorkspaceManage()
          ? [["Grading assistant", studentClick("lmsAiFeedbackFor", id)], ["Assess work", studentClick("lmsWorkspaceGradeForm", id), true]]
          : []),
        ["Close", "closeDrawer()"],
      ],
    }),
  );
};
window.lmsWorkspaceCourseDetail = function (id) {
  const r = lmsWorkspaceState().courses.find((r) => r._id === id);
  if (!r) return;
  openDrawer(
    detailDrawer({
      recordTitle:true,title:studentEscape(r.title),
      sub: studentEscape(r.teacher),
      sections: [
        {
          h: "Course scope",
          rows: [
            ["Subject", studentEscape(r.subject)],
            ["Grade", studentEscape(r.grade)],
            ["Academic year", studentEscape(r.academicYear)],
            [
              "Start",
              studentEscape(
                curriculumWorkspaceDay(r.startDate) || "Unscheduled",
              ),
            ],
          ],
        },
      ],
      footer: [
        ...(lmsWorkspaceManage()
          ? [["Edit course", studentClick("lmsWorkspaceCourseForm", id), true]]
          : []),
        ["Close", "closeDrawer()"],
      ],
    }),
  );
};
window.lmsWorkspaceExport = function () {
  studentDownloadCSV("coursework.csv", [
    ["Title", "Subject", "Grade", "Year", "Status", "Due", "Maximum"],
    ...lmsWorkspaceState().assignments.map((r) => [
      r.title,
      r.subject,
      r.grade,
      r.academicYear,
      r.status,
      r.dueDate,
      r.maxScore,
    ]),
  ]);
};
M.lms = () => {
  const b = lmsWorkspaceState();
  if (!b.loaded && !b.loading && !b.error) lmsWorkspaceLoad();
  const rows = lmsWorkspaceFiltered(),
    pages = Math.max(1, Math.ceil(rows.length / 20));
  b.page = Math.min(b.page, pages);
  const esc = studentEscape,
    manage = lmsWorkspaceManage();
  const tabs = ["Assignments", "Courses", "Submissions"]
    .map(
      (t) =>
        '<button class="btn ' +
        (b.tab === t ? "primary" : "") +
        "\" onclick=\"lmsWorkspaceFilter('tab','" +
        t +
        "');lmsWorkspaceFilter('status','All')\">" +
        t +
        "</button>",
    )
    .join("");
  return (
    '<div class="page-head"><div class="ph-l"><h2>Learning (LMS)</h2><p>' +
    (state.role === "Student"
      ? "Your grade assignments and submitted work."
      : state.role === "Parent"
        ? "Your children's coursework and teacher feedback."
        : "Course plans, assignments and assessment feedback.") +
    '</p></div><div class="ph-r">' +
    (manage
      ? '<button class="btn primary" onclick="lmsAiOpen()">Teacher AI Studio</button><button class="btn" onclick="lmsTeachingPanel()">Teaching assignments</button><button class="btn" onclick="lmsTemplatesPanel()">Assignment templates</button><button class="btn" onclick="lmsWorkspaceCourseForm()">New course</button><button class="btn primary" onclick="lmsWorkspaceAssignmentForm()">New assignment</button>'
      : "") +
    '<button class="btn" onclick="lmsWorkspaceLoad()">Refresh</button></div></div>' +
    '<div class="grid cols-4" style="margin-bottom:18px">' +
    kpi("lms", "#17A24A", "Courses", String(b.courses.length)) +
    kpi("exam", "#2563EB", "Assignments", String(b.assignments.length)) +
    kpi(
      "students",
      "#B45309",
      "Awaiting grading",
      String(b.submissions.filter((r) => r.status !== "Graded").length),
    ) +
    kpi(
      "reports",
      "#0E7C39",
      "Graded submissions",
      String(b.submissions.filter((r) => r.status === "Graded").length),
    ) +
    "</div>" +
    (state.role==='Teacher'?'<div class="card pad" style="margin-bottom:16px"><h3>My teaching workspace</h3><p>'+b.teaching.length+' <span>teaching assignments</span> · '+b.assignments.filter(a=>a.status==='Scheduled').length+' <span>scheduled assignments</span></p><p class="muted">'+(b.teaching.length?'Only your assigned classes, subjects and academic years are shown.':'Ask school leadership to assign your class and subject first')+'</p></div>':'')+
    '<div class="card pad" style="margin-bottom:16px"><div class="flex ac" style="gap:10px;flex-wrap:wrap">' +
    tabs +
    '<label><input type="checkbox" ' +
    (b.showArchived ? "checked" : "") +
    " onchange=\"lmsWorkspaceFilter('showArchived',this.checked)\"> Archived courses</label>" +
    '<input aria-label="Search coursework" placeholder="Search coursework" value="' +
    esc(b.q) +
    '" onchange="lmsWorkspaceFilter(\'q\',this.value)"><label>Grade <select onchange="lmsWorkspaceFilter(\'grade\',this.value)">' +
    ["All", ...new Set([...b.assignments, ...b.courses].map((r) => r.grade))]
      .map(
        (v) =>
          "<option " +
          (v === b.grade ? "selected" : "") +
          ">" +
          esc(v) +
          "</option>",
      )
      .join("") +
    "</select></label><label>Subject <select onchange=\"lmsWorkspaceFilter('subject',this.value)\">" +
    ["All", ...new Set([...b.assignments, ...b.courses].map((r) => r.subject))]
      .map(
        (v) =>
          "<option " +
          (v === b.subject ? "selected" : "") +
          ">" +
          esc(v) +
          "</option>",
      )
      .join("") +
    '</select></label><button class="btn" onclick="lmsWorkspaceExport()">Export assignments</button></div></div>' +
    (b.error ? '<div class="card pad">' + esc(b.error) + "</div>" : "") +
    '<div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Title / subject</th><th>Grade / year</th><th>Details</th><th></th></tr></thead><tbody>' +
    rows
      .slice((b.page - 1) * 20, b.page * 20)
      .map((r) => {
        const a = b.tab === "Submissions" ? lmsWorkspaceSubAssignment(r) : r;
        return (
          "<tr><td><b>" +
          esc(a.title) +
          '</b><div class="muted">' +
          esc(a.subject) +
          "</div></td><td>" +
          esc(a.grade || "") +
          '<div class="muted">' +
          esc(a.academicYear || "") +
          "</div></td><td>" +
          (b.tab === "Courses"
            ? esc(r.teacher)
            : b.tab === "Submissions"
              ? esc(r.student?.name || "") +
                " · " +
                esc(r.status) +
                (r.isLate ? " · Late" : "") +
                (r.score !== undefined
                  ? " · " + r.score + " / " + a.maxScore
                  : "")
              : chip(
                  r.status,
                  r.status === "Draft"
                    ? "gray"
                    : r.status === "Closed"
                      ? "amber"
                      : "green",
                ) +
                '<div class="muted">Due ' +
                esc(commDate(r.dueDate)) +
                " · " +
                r.maxScore +
                " marks</div>") +
          '</td><td><button class="btn" onclick="' +
          studentClick(
            b.tab === "Courses"
              ? "lmsWorkspaceCourseDetail"
              : b.tab === "Submissions"
                ? "lmsWorkspaceSubmissionDetail"
                : "lmsWorkspaceAssignmentDetail",
            r._id,
          ) +
          '">View</button></td></tr>'
        );
      })
      .join("") +
    "</tbody></table></div>" +
    (!rows.length
      ? '<p class="pad muted">' +
        (b.loading
          ? "Loading coursework…"
          : "No coursework matches this view.") +
        "</p>"
      : "") +
    '<div class="pad flex ac jb"><span>' +
    rows.length +
    " records · Page " +
    b.page +
    " of " +
    pages +
    '</span><div><button class="btn" ' +
    (b.page === 1 ? "disabled" : "") +
    " onclick=\"lmsWorkspaceFilter('page'," +
    (b.page - 1) +
    ')">Previous</button><button class="btn" ' +
    (b.page === pages ? "disabled" : "") +
    " onclick=\"lmsWorkspaceFilter('page'," +
    (b.page + 1) +
    ')">Next</button></div></div></div>'
  );
};

function lmsWorkspaceTargets(){
 const host=document.getElementById('lmsAdditionalTargets');if(!host)return;
 const v=readForm(),b=lmsWorkspaceState(),previous=new Set([...host.querySelectorAll(':checked')].map(n=>n.value));
 const choices=state.role==='Teacher'?b.teaching.filter(t=>t.subject===v.subject&&t.academicYear===v.academicYear).map(t=>t.grade):(b.teachingOptions?.classes||[]).map(c=>c.grade+' · '+c.section);
 host.innerHTML='<h4>Additional class sections</h4><p class="muted">Creates a separate assignment for each selected section. Use Standalone for multiple sections.</p>'+[...new Set(choices)].filter(g=>g!==v.grade).map(g=>'<label style="display:block;margin:8px 0"><input type="checkbox" data-lms-target value="'+studentEscape(g)+'" '+(previous.has(g)?'checked':'')+'> '+studentEscape(g)+'</label>').join('');
 localizeView(host);
}
function lmsTeachingClassOrder(a,b){const rank=v=>v.startsWith('KG')?Number(v.match(/\d+/)?.[0]||0):Number(v.match(/\d+/)?.[0]||0)+2;return rank(a)-rank(b)||a.localeCompare(b,undefined,{numeric:true});}
function lmsTeachingPanel(){const b=lmsWorkspaceState(),esc=studentEscape;
 const options=(values,compare=(a,b)=>a.localeCompare(b,undefined,{numeric:true}))=>[...new Set(values)].sort(compare).map(v=>'<option value="'+esc(v)+'">'+esc(v)+'</option>').join('');
 const filters='<div class="teaching-toolbar"><label>Search assignments<input class="inp" id="teachingSearch" placeholder="Teacher, class or subject…" oninput="lmsTeachingRender(true)"></label><label>Class / section<select class="inp" id="teachingClass" onchange="lmsTeachingRender(true)"><option value="">All classes</option>'+options(b.teaching.map(t=>t.grade),lmsTeachingClassOrder)+'</select></label><label>Subject<select class="inp" id="teachingSubject" onchange="lmsTeachingRender(true)"><option value="">All subjects</option>'+options(b.teaching.map(t=>t.subject))+'</select></label><label>Status<select class="inp" id="teachingStatus" onchange="lmsTeachingRender(true)"><option value="active">Active</option><option value="all">All statuses</option><option value="archived">Archived</option></select></label></div><p class="muted" id="teachingCount" role="status"></p><div class="teaching-grid" id="teachingGrid"></div><div class="teaching-pagination"><button class="btn sm" id="teachingPrevious" onclick="lmsTeachingPage(-1)">Previous</button><span id="teachingPage"></span><button class="btn sm" id="teachingNext" onclick="lmsTeachingPage(1)">Next</button></div>';
 openDrawer(detailDrawer({title:'Teaching assignments',sub:'Class and subject access is linked to actual teacher accounts.',sections:[{h:'Assigned classes',html:filters}],footer:[['Close','closeDrawer()'],...(['Administrator','Principal'].includes(state.role)?[['Assign teacher','lmsTeachingForm()',true]]:[])]}));
 b.teachingPage=1;lmsTeachingRender();
}
function lmsTeachingPage(delta){lmsWorkspaceState().teachingPage+=delta;lmsTeachingRender();document.getElementById('teachingGrid')?.scrollIntoView({block:'nearest'});}
function lmsTeachingRender(reset=false){
 const host=document.getElementById('teachingGrid');if(!host)return;
 const b=lmsWorkspaceState(),esc=studentEscape,manager=['Administrator','Principal'].includes(state.role);
 const q=document.getElementById('teachingSearch').value.trim().toLowerCase(),grade=document.getElementById('teachingClass').value,subject=document.getElementById('teachingSubject').value,status=document.getElementById('teachingStatus').value;
 const rows=b.teaching.filter(t=>(!grade||t.grade===grade)&&(!subject||t.subject===subject)&&(status==='all'||Boolean(t.active)===(status==='active'))&&(!q||[t.teacher?.name,t.grade,t.subject,t.academicYear].join(' ').toLowerCase().includes(q))).sort((a,b)=>lmsTeachingClassOrder(a.grade,b.grade)||a.subject.localeCompare(b.subject)||String(a.teacher?.name||'').localeCompare(String(b.teacher?.name||'')));
 const pages=Math.max(1,Math.ceil(rows.length/12));b.teachingPage=reset?1:Math.max(1,Math.min(pages,b.teachingPage||1));
 host.innerHTML=rows.slice((b.teachingPage-1)*12,b.teachingPage*12).map(t=>'<article class="teaching-card"><div class="teaching-card-top"><strong>'+esc(t.grade)+'</strong><span class="badge '+(t.active?'b-green':'b-gray')+'">'+(t.active?'Active':'Archived')+'</span></div><h4>'+esc(t.subject)+'</h4><p>'+esc(t.teacher?.name||'Teacher')+'</p><div class="teaching-card-bottom"><span class="muted">'+esc(t.academicYear)+'</span>'+(manager&&t.active?'<button class="btn sm" onclick="lmsTeachingRevoke(\''+t._id+'\')">Revoke assignment</button>':'')+'</div></article>').join('')||'<p class="muted">No matching teaching assignments.</p>';
 document.getElementById('teachingCount').textContent=rows.length+' / '+b.teaching.length;
 document.getElementById('teachingPage').textContent=b.teachingPage+' / '+pages;
 document.getElementById('teachingPrevious').disabled=b.teachingPage===1;document.getElementById('teachingNext').disabled=b.teachingPage===pages;
 if(typeof localizeView==='function')localizeView(host);
}
function lmsTeachingForm(){const b=lmsWorkspaceState(),o=b.teachingOptions;if(!o)return;
 studentFormDrawer('Assign teacher','Only active teacher accounts and class sections can be assigned.',[
 {key:'teacher',label:'Teacher account',opts:[],req:true,half:true},
 {key:'classSection',label:'Class section',opts:[],req:true,half:true},
 {key:'subject',label:'Subject',req:true,half:true},{key:'academicYear',label:'Academic year',val:SCHOOLOS_ADAPTER.settings?.academicYear,req:true,half:true}
 ],'Save teaching assignment','','lmsTeachingSave');
 const populate=(key,rows,label)=>{const select=document.querySelector('#drawer [data-fkey="'+key+'"]');if(!select)return;select.replaceChildren(...rows.map(row=>{const option=document.createElement('option');option.value=row._id;option.textContent=label(row);return option;}));};
 populate('teacher',[...o.teachers].sort((a,b)=>a.name.localeCompare(b.name)),t=>t.name);
 populate('classSection',[...o.classes].sort((a,b)=>{const rank=c=>c.grade.startsWith('KG')?Number(c.grade.match(/\d+/)?.[0]||0):Number(c.grade.match(/\d+/)?.[0]||0)+2;return rank(a)-rank(b)||a.section.localeCompare(b.section);}),c=>c.grade+' · '+c.section);
 if(typeof localizeView==='function')localizeView(document.querySelector('#drawer'));
}
window.lmsTeachingSave=async function(v){const b=lmsWorkspaceState();if(b.teachingSaving)return false;b.teachingSaving=true;const anchor=document.getElementById('drawer').firstElementChild;
 try{await SCHOOLOS_ADAPTER.api('/lms/teaching-assignments',{method:'POST',body:JSON.stringify({...v,teacher:v.teacher,classSection:v.classSection})});await lmsWorkspaceLoad();if(state.module==='lms'&&document.getElementById('drawer').firstElementChild===anchor)lmsTeachingPanel()}catch(e){toast(e.message)}finally{b.teachingSaving=false}return false;
};
window.lmsTeachingRevoke=async function(id){const t=lmsWorkspaceState().teaching.find(t=>t._id===id);if(!t||!confirm('Revoke this teaching assignment?'))return;try{await SCHOOLOS_ADAPTER.api('/lms/teaching-assignments/'+id,{method:'PATCH',body:JSON.stringify({active:false,expectedUpdatedAt:t.updatedAt})});await lmsWorkspaceLoad();if(state.module==='lms')lmsTeachingPanel()}catch(e){toast(e.message)}};
function lmsTemplatesPanel(){const b=lmsWorkspaceState();openDrawer(detailDrawer({title:'Assignment templates',sub:'Reuse instructions and grading settings; choose class and dates before saving.',sections:[{h:'Saved templates',html:b.templates.map(t=>'<div class="card pad" style="margin-bottom:10px"><strong>'+studentEscape(t.name)+'</strong><p>'+studentEscape(t.subject)+'</p><button class="btn" onclick="lmsUseTemplate(\''+t._id+'\')">Use template</button></div>').join('')||'<p>No assignment templates saved.</p>'}],footer:[['Close','closeDrawer()'],['New template','lmsTemplateForm()',true]]}));}
function lmsTemplateForm(){studentFormDrawer('New assignment template','Templates do not publish or send notifications.',[
 {key:'name',label:'Template name',req:true},{key:'title',label:'Assignment title',req:true},{key:'description',label:'Instructions',req:true,area:true,maxlen:2000},{key:'subject',label:'Subject',req:true},{key:'maxScore',label:'Maximum score',type:'number',val:100,req:true},
 ...(['Administrator','Principal'].includes(state.role)?[{key:'shared',label:'Visibility',opts:['Private','Shared with teachers']}]:[])
 ],'Save template','','lmsTemplateSave');}
window.lmsTemplateSave=async function(v){const b=lmsWorkspaceState();if(b.templateSaving)return false;b.templateSaving=true;const anchor=document.getElementById('drawer').firstElementChild;try{await SCHOOLOS_ADAPTER.api('/lms/templates',{method:'POST',body:JSON.stringify({...v,maxScore:Number(v.maxScore),shared:v.shared==='Shared with teachers',acceptLate:true})});await lmsWorkspaceLoad();if(state.module==='lms'&&document.getElementById('drawer').firstElementChild===anchor)lmsTemplatesPanel()}catch(e){toast(e.message)}finally{b.templateSaving=false}return false};
function lmsUseTemplate(id){const b=lmsWorkspaceState(),t=b.templates.find(t=>t._id===id);if(!t)return;if(state.role==='Teacher'&&!b.teaching.some(m=>m.subject===t.subject))return toast('This template subject is not assigned to your teacher account');lmsWorkspaceAssignmentForm();const form=document.querySelector('#drawer [data-fkey=title]');if(!form)return;for(const key of ['title','description','subject','maxScore']){const el=document.querySelector('#drawer [data-fkey='+key+']');if(el)el.value=t[key]}lmsWorkspaceTargets();}

// Teacher AI Studio: reviewed drafts share the real LMS permissions and workflows.
async function lmsAiApi(path,options){const response=await SCHOOLOS_ADAPTER.api(path,options);return response.data;}
function lmsAiState() {
  const workspace=lmsWorkspaceState();
  return workspace.ai || (workspace.ai={drafts:[],status:null,busy:false,active:null,requestId:null});
}
function lmsAiCurrent(a) { return lmsAiState()===a && state.module==='lms' && lmsWorkspaceManage(); }
window.lmsAiOpen=async function(){
  if(!lmsWorkspaceManage())return;
  const a=lmsAiState();
  try{
    const [status,drafts]=await Promise.all([lmsAiApi('/lms/ai/status'),lmsAiApi('/lms/ai/drafts')]);
    if(!lmsAiCurrent(a))return;
    a.status=status;a.drafts=drafts;
    const actions=[['Assignment','Assignment builder'],['Quiz','Quiz builder'],['LessonPlan','Lesson plan'],['Feedback','Grading assistant'],['ParentMessage','Parent message'],['Progress','Progress summary']];
    openDrawer(detailDrawer({title:'Teacher AI Studio',sub:'Plan, assess and communicate with reviewed AI drafts.',sections:[
      {h:'Quick actions',html:'<p class="muted"><b>'+studentEscape(status.provider==='gemini'?'Google Gemini':status.provider==='groq'?'Groq':'OpenAI')+'</b></p><div class="teacher-ai-actions">'+actions.map(([kind,label])=>'<button class="btn" onclick="lmsAiForm(\''+kind+'\')">'+studentEscape(label)+'</button>').join('')+'</div><p class="muted">'+(status.configured?'AI is configured. Review accuracy before applying.':'AI setup pending. School administration must configure the server provider.')+'</p>'},
      {h:'My saved drafts',html:drafts.length?drafts.map(d=>'<button class="teacher-ai-draft btn" onclick="lmsAiPreview(\''+d._id+'\')"><strong>'+studentEscape(d.content?.title||d.request.topic)+'</strong><span class="muted">'+studentEscape(d.request.kind+' · '+d.request.grade+' · '+d.status)+'</span></button>').join(''):'<p>No AI drafts yet.</p>'}
    ],footer:[['Close','closeDrawer()']]}));
  }catch(e){if(lmsAiCurrent(a))toast(e.message);}
};
window.lmsAiForm=function(kind){
  if(!lmsWorkspaceManage())return;
  const b=lmsWorkspaceState(),a=lmsAiState();
  const mappings=b.teaching.filter(t=>t.active!==false);
  if(!mappings.length){toast('Ask school leadership to assign your class and subject first');return;}
  a.choices=mappings;a.kind=kind;a.requestId=crypto.randomUUID();a.active=null;
  const labels=mappings.map(t=>t.grade+' / '+t.subject+' / '+t.academicYear);
  studentFormDrawer('Teacher AI Studio','Choose teaching context and describe what you need.',[
    {key:'scope',label:'Teaching context',opts:labels,val:labels[0],req:true},
    {key:'topic',label:'Topic / purpose',val:'',req:true,maxlen:500},
    {key:'instructions',label:'Additional instructions',area:true,val:'',maxlen:2000},
    {key:'language',label:'Output language',opts:['English','Arabic'],val:document.documentElement.lang==='ar'?'Arabic':'English'},
    ...(['Assignment','Quiz'].includes(kind)?[
      {key:'difficulty',label:'Difficulty',opts:['Support','Standard','Challenge'],val:'Standard'},
      {key:'questionCount',label:'Number of questions',type:'number',val:5,req:true},
      {key:'maxScore',label:'Maximum marks',type:'number',val:20,req:true},
    ]:[]),
    ...(kind==='LessonPlan'?[{key:'duration',label:'Lesson duration (minutes)',type:'number',val:40,req:true}]:[]),
    ...(['ParentMessage','Progress'].includes(kind)?[{key:'reportDays',label:'Attendance reporting days (7–90)',type:'number',val:30,req:true}]:[]),
    ...(kind==='Feedback'?[{key:'submission',label:'Submission to assess',opts:['Select submission'],req:true}]:[]),
  ],'Generate draft','','lmsAiGenerate');
  document.querySelector('#drawer .form-body')?.classList.add('teacher-ai-form');
  if(kind==='Feedback'){document.querySelector('#drawer [data-fkey=scope]')?.addEventListener('change',lmsAiSubmissionChoices);lmsAiSubmissionChoices();}
  if(['ParentMessage','Progress'].includes(kind)){
    const form=document.querySelector('#drawer .form-body');
    form.insertAdjacentHTML('beforeend','<label class="teacher-ai-student">Student<select id="teacherAiStudent" required><option value="">Loading students…</option></select></label>');
    const select=form.querySelector('[data-fkey="scope"]');select?.addEventListener('change',lmsAiStudents);lmsAiStudents();
  }
};
window.lmsAiStudents=async function(){
  const a=lmsAiState(),select=document.getElementById('teacherAiStudent');if(!select)return;
  const value=readForm().scope,scope=a.choices.find(t=>t.grade+' / '+t.subject+' / '+t.academicYear===value);if(!scope)return;
  select.disabled=true;select.innerHTML='<option value="">Loading students…</option>';
  try{
    const rows=await lmsAiApi('/lms/ai/students?'+new URLSearchParams({grade:scope.grade,subject:scope.subject,academicYear:scope.academicYear}));
    if(!lmsAiCurrent(a)||document.getElementById('teacherAiStudent')!==select||readForm().scope!==value)return;
    select.innerHTML='<option value="">Select student</option>'+rows.map(s=>'<option value="'+studentEscape(s._id)+'">'+studentEscape(s.name+' · '+s.refId)+'</option>').join('');select.disabled=false;localizeView(select);
  }catch(e){if(document.getElementById('teacherAiStudent')===select)select.innerHTML='<option value="">Could not load students</option>';toast(e.message);}
};
window.lmsAiGenerate=async function(v){
  const a=lmsAiState();if(a.busy)return false;
  const scope=a.choices.find(t=>t.grade+' / '+t.subject+' / '+t.academicYear===v.scope);
  if(!scope){toast('Choose a valid teaching context');return false;}
  const payload={kind:a.kind,grade:scope.grade,subject:scope.subject,academicYear:scope.academicYear,topic:v.topic,instructions:v.instructions,language:v.language,requestId:a.requestId};
  if(v.questionCount)payload.questionCount=Number(v.questionCount);
  if(v.maxScore)payload.maxScore=Number(v.maxScore);
  if(v.difficulty)payload.difficulty=v.difficulty;
  if(v.duration)payload.duration=Number(v.duration);
  if(v.reportDays)payload.reportDays=Number(v.reportDays);
  if(a.kind==='Feedback'){payload.submissionId=a.submissionChoices?.find(s=>s.label===v.submission)?.id;if(!payload.submissionId){toast('Select a submission in the selected teaching context.');return false;}}
  if(['ParentMessage','Progress'].includes(a.kind)){payload.studentId=document.getElementById('teacherAiStudent')?.value;if(!payload.studentId){toast('Select a student in the selected teaching context.');return false;}}
  // A changed request gets a new key; retrying the same request never doubles generation cost.
  const signature=JSON.stringify({...payload,requestId:undefined});
  if(a.signature&&a.signature!==signature)payload.requestId=a.requestId=crypto.randomUUID();a.signature=signature;
  const anchor=document.querySelector('#drawer')?.firstElementChild;
  a.busy=true;const button=document.querySelector('#drawer .df .btn.primary');if(button){button.disabled=true;button.textContent='Generating…';}
  try{
    const row=await lmsAiApi('/lms/ai/drafts',{method:'POST',body:JSON.stringify(payload)});
    if(lmsAiCurrent(a)&&document.querySelector('#drawer')?.firstElementChild===anchor)await lmsAiPreview(row._id);
  }catch(e){if(lmsAiCurrent(a)){toast(e.message);if(document.querySelector('#drawer')?.firstElementChild===anchor){
      const form=document.querySelector('#drawer .form-body');form?.querySelector('[data-ai-error]')?.remove();
      form?.insertAdjacentHTML('beforeend','<p role="alert" data-ai-error>'+studentEscape(e.message)+' Open My saved drafts to inspect this attempt or use Edit and retry.</p>');
    }}}finally{a.busy=false;if(button?.isConnected){button.disabled=false;button.textContent='Generate draft';}}
  return false;
};
window.lmsAiRetry=function(){
  const d=lmsAiState().active;if(!d||d.status!=='Failed')return;
  lmsAiForm(d.request.kind);
  const values={...d.request,scope:d.request.grade+' / '+d.request.subject+' / '+d.request.academicYear};
  document.querySelectorAll('#drawer [data-fkey]').forEach(el=>{if(values[el.dataset.fkey]!=null)el.value=String(values[el.dataset.fkey]);});
  if(d.request.kind==='Feedback'){
    lmsAiSubmissionChoices();const choice=lmsAiState().submissionChoices?.find(s=>s.id===d.request.submissionId);
    if(choice)document.querySelector('#drawer [data-fkey=submission]').value=choice.label;
  }
  if(['ParentMessage','Progress'].includes(d.request.kind)){
    const select=document.getElementById('teacherAiStudent');
    lmsAiStudents().then(()=>{if(document.getElementById('teacherAiStudent')===select)select.value=d.request.studentId||'';});
  }
  // A failed attempt is retained for history; only an explicit Generate starts a new provider call.
};
window.lmsAiPreview=async function(id){
  const a=lmsAiState(),anchor=document.querySelector('#drawer')?.firstElementChild;
  const drawer=document.getElementById('drawer'),wasOpen=drawer?.classList.contains('on');
  try{
    const d=await lmsAiApi('/lms/ai/drafts/'+id);if(!lmsAiCurrent(a)||document.querySelector('#drawer')?.firstElementChild!==anchor||(wasOpen&&!drawer.classList.contains('on')))return;
    a.active=d;
    if(!d.content){openDrawer(detailDrawer({title:'Teacher AI Studio',sub:d.status,sections:[{h:'Draft status',html:'<p>'+studentEscape(d.status==='Failed'?(d.failureMessage||'This older attempt failed before error details were recorded. Start a new attempt below.'):'Generation is in progress. Reopen this draft shortly.')+'</p>'}],footer:[['Back','lmsAiOpen()'],...(d.status==='Failed'?[['Edit and retry','lmsAiRetry()']]:[['Refresh','lmsAiPreview('+JSON.stringify(d._id)+')']])]}));return;}
    const esc=studentEscape,c=d.content,editable=d.status==='Draft';
    const field=(label,html)=>'<label class="teacher-ai-field"><span>'+label+'</span>'+html+'</label>';
    const input=(key,value,type='text')=>'<input dir="auto" data-ai="'+key+'" type="'+type+'" value="'+esc(value??'')+'" '+(!editable?'disabled':'')+'>';
    const area=(key,value)=>'<textarea dir="auto" data-ai="'+key+'" rows="5" '+(!editable?'disabled':'')+'>'+esc(value||'')+'</textarea>';
    const html='<div class="teacher-ai-editor">'+field('Title',input('title',c.title))+field('Draft content',area('body',c.body))+
      (d.request.kind==='Feedback'?field('Suggested score',input('suggestedScore',c.suggestedScore,'number')):'')+
      c.questions.map((q,i)=>'<section class="card pad teacher-ai-question" data-ai-question="'+i+'"><h4>Question '+(i+1)+' · '+esc(q.type)+'</h4>'+field('Question',area('prompt',q.prompt))+field('Marks',input('marks',q.marks,'number'))+(q.type==='MCQ'?field('Options (one per line)',area('options',q.options.join('\n'))):'')+field('Answer key (staff only)',area('answer',q.answer))+field('Marking rubric (staff only)',area('rubric',q.rubric))+'</section>').join('')+
      (editable?'<button class="btn" onclick="lmsAiSaveEdits()">Save reviewed changes</button>':'')+'</div>';
    const footer=[['Back','lmsAiOpen()'],['Download draft','lmsAiDownload()']];
    if(editable&&['Assignment','Quiz','Feedback','ParentMessage'].includes(d.request.kind))footer.push(['Review and apply','lmsAiApplyForm()',true]);
    openDrawer(detailDrawer({title:esc(c.title),recordTitle:true,sub:esc(d.request.grade+' · '+d.request.subject+' · '+d.status),sections:[
      {h:'Teacher review',html:'<p>AI can make mistakes. Check content, answers and suitability before applying.</p>'+c.warnings.map(w=>'<p class="muted">'+esc(w)+'</p>').join('')},
      {h:'Editable draft',html},
      {h:'Source context',html:(d.sources.length?d.sources.map(s=>'<p>'+esc(s.title)+'</p>').join(''):'<p>No matching curriculum sources.</p>')+(Object.keys(d.facts||{}).length?'<dl class="teacher-ai-facts">'+Object.entries(d.facts).map(([k,v])=>'<div><dt>'+esc(lmsAiFactLabel(k))+'</dt><dd>'+esc(v===null?'No data':v)+'</dd></div>').join('')+'</dl>':'')}
    ],footer}));
  }catch(e){if(lmsAiCurrent(a))toast(e.message);}
};
function lmsAiReadEdits(){
  const d=lmsAiState().active;if(!d?.content)return null;
  const root=document.querySelector('.teacher-ai-editor');if(!root)return null;
  const value=(key,host=root)=>host.querySelector('[data-ai="'+key+'"]')?.value;
  return {...d.content,title:value('title'),body:value('body'),suggestedScore:d.request.kind==='Feedback'?Number(value('suggestedScore')||NaN):null,
    questions:d.content.questions.map((q,i)=>{const host=root.querySelector('[data-ai-question="'+i+'"]');return {...q,prompt:value('prompt',host),marks:Number(value('marks',host)||NaN),options:q.type==='MCQ'?value('options',host).split('\n').map(s=>s.trim()).filter(Boolean):[],answer:value('answer',host),rubric:value('rubric',host)};})};
}
window.lmsAiSaveEdits=async function(){
  const a=lmsAiState(),d=a.active,content=lmsAiReadEdits();if(a.busy||!d||!content)return false;
  const anchor=document.querySelector('#drawer')?.firstElementChild;
  a.busy=true;
  try{const row=await lmsAiApi('/lms/ai/drafts/'+d._id,{method:'PATCH',body:JSON.stringify({content,expectedUpdatedAt:d.updatedAt})});if(lmsAiCurrent(a)&&a.active===d&&document.querySelector('#drawer')?.firstElementChild===anchor){a.active=row;toast('Reviewed changes saved');return true;}}
  catch(e){if(lmsAiCurrent(a))toast(e.message);}finally{a.busy=false;}return false;
};
window.lmsAiApplyForm=async function(){
  if(!await lmsAiSaveEdits())return;
  const a=lmsAiState(),d=a.active,kind=d.request.kind;
  a.applyId=d._id;
  studentFormDrawer('Review and apply','Review the saved draft. This action changes school records.',[
    ...(['Assignment','Quiz'].includes(kind)?[
      {key:'dueDate',label:'Submission deadline',type:'datetime-local',req:true},
      {key:'status',label:'Publication',opts:['Draft','Scheduled','Published'],val:'Draft'},
      {key:'publishAt',label:'Schedule time (if Scheduled)',type:'datetime-local'},
    ]:[]),
    ...(kind==='ParentMessage'?[{key:'channel',label:'Delivery channel',opts:['InApp','Email','SMS'],val:'InApp'},{note:'Teacher email and SMS requests require office approval.'}]:[]),
    {key:'reviewed',label:'Review confirmation',opts:['Select confirmation','I reviewed this draft'],req:true},
  ],'Confirm action','','lmsAiApply');
  document.querySelector('#drawer .form-body')?.classList.add('teacher-ai-form');
};
window.lmsAiApply=async function(v){
  const a=lmsAiState(),d=a.active;if(a.busy||!d)return false;
  if(v.reviewed!=='I reviewed this draft'){toast('Review confirmation is required');return false;}
  const payload={expectedUpdatedAt:d.updatedAt,reviewed:true,action:['Assignment','Quiz'].includes(d.request.kind)?'SaveAssignment':d.request.kind==='Feedback'?'Grade':'Message'};
  if(v.dueDate)payload.dueDate=new Date(v.dueDate).toISOString();
  if(v.status)payload.status=v.status;
  if(v.status==='Scheduled'&&v.publishAt)payload.publishAt=new Date(v.publishAt).toISOString();
  if(v.channel)payload.channel=v.channel;
  const anchor=document.querySelector('#drawer')?.firstElementChild;a.busy=true;
  try{const row=await lmsAiApi('/lms/ai/drafts/'+d._id+'/apply',{method:'POST',body:JSON.stringify(payload)});if(lmsAiCurrent(a)){a.active=row;await lmsWorkspaceLoad();if(document.querySelector('#drawer')?.firstElementChild===anchor){toast('Reviewed action saved');await lmsAiPreview(d._id);}}}
  catch(e){if(lmsAiCurrent(a))toast(e.message);}finally{a.busy=false;}return false;
};
window.lmsAiDownload=function(){
  const d=lmsAiState().active;if(!d?.content)return;
  const c=lmsAiReadEdits()||d.content;
  const text=[c.title,d.request.grade+' / '+d.request.subject,c.body,...c.questions.map((q,i)=>(i+1)+'. '+q.prompt+' ('+q.marks+')\n'+q.options.join('\n')+'\nAnswer: '+q.answer+'\nRubric: '+q.rubric),...c.warnings].join('\n\n');
  const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download='teacher-draft.txt';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};

function lmsAiSubmissionChoices(){
 const a=lmsAiState(),b=lmsWorkspaceState(),scope=a.choices.find(t=>t.grade+' / '+t.subject+' / '+t.academicYear===readForm().scope);
 const select=document.querySelector('#drawer [data-fkey=submission]');if(!select||!scope)return;
 a.submissionChoices=b.submissions.filter(s=>{const assignment=lmsWorkspaceSubAssignment(s);return assignment.grade===scope.grade&&assignment.subject===scope.subject&&assignment.academicYear===scope.academicYear}).map((s,i)=>({id:s._id,label:(i+1)+'. '+(s.student?.name||'Student')+' · '+lmsWorkspaceSubAssignment(s).title}));
 select.innerHTML='<option>Select submission</option>'+a.submissionChoices.map(s=>'<option>'+studentEscape(s.label)+'</option>').join('');localizeView(select);
}

window.lmsAiLaunch=function(){
 if(!lmsWorkspaceManage())return;
 const b=lmsWorkspaceState();b.openAi=true;go('lms');
 if(b.loaded&&!b.loading){b.openAi=false;lmsAiOpen();}
};

function lmsAiFactLabel(key){return ({windowStart:'Attendance period starts',windowEnd:'Attendance period ends',subject:'Subject',publishedAssignments:'Published coursework',submitted:'Submitted coursework',graded:'Graded coursework',overdueUnsubmitted:'Overdue unsubmitted coursework',averagePercent:'Average graded score (%)',recordedSessions:'Recorded attendance sessions',countedSessions:'Counted attendance sessions',presentOrLate:'Present or late sessions',absent:'Absent sessions',excused:'Excused sessions',attendancePercent:'Recorded attendance (%)',maxScore:'Maximum score',objectiveScore:'Objective marks earned',objectiveMaximum:'Maximum objective marks'})[key]||key;}

window.lmsAiFeedbackFor=function(id){
 const b=lmsWorkspaceState(),sub=b.submissions.find(s=>s._id===id);if(!sub||!lmsWorkspaceManage())return;
 const assignment=lmsWorkspaceSubAssignment(sub);lmsAiForm('Feedback');
 const scope=document.querySelector('#drawer [data-fkey=scope]');if(!scope)return;
 scope.value=assignment.grade+' / '+assignment.subject+' / '+assignment.academicYear;lmsAiSubmissionChoices();
 const choice=lmsAiState().submissionChoices.find(s=>s.id===id);if(choice)document.querySelector('#drawer [data-fkey=submission]').value=choice.label;
 document.querySelector('#drawer [data-fkey=topic]').value=assignment.title;
};
