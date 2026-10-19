/* Exams: selected schemes, protected marks and actual analysis. */
function examManager() {
  return ["Administrator", "Principal", "Teacher"].includes(state.role);
}
function examAllowed() {
  return examManager() || ["Parent", "Student"].includes(state.role);
}
function examList() {
  return (SCHOOLOS_ADAPTER.exams || []).filter(
    (e) => examManager() || e.locked,
  );
}
function examSelected() {
  const rows = examList();
  if (!rows.some((e) => e._id === state.examSelectedId))
    state.examSelectedId = rows[0]?._id;
  return rows.find((e) => e._id === state.examSelectedId) || null;
}
function examChange(id) {
  if (state.examSaving) return;
  state.examSelectedId = id;
  state.examClass = "";
  render();
}
function examResultRows() {
  const e = examSelected();
  return e
    ? (SCHOOLOS_ADAPTER.examResults || []).filter(
        (r) =>
          r.exam === e._id &&
          (!state.examClass || r.student.grade === state.examClass) &&
          [r.student.name, r.student.refId]
            .join(" ")
            .toLowerCase()
            .includes((state.examSearch || "").toLowerCase()),
      )
    : [];
}
function examCall(fn, ...args) {
  return studentEscape(fn + "(" + args.map(JSON.stringify).join(",") + ")");
}
M.exams = () => {
  if (!examAllowed())
    return '<div class="card pad">Exams and student results are restricted to teaching staff and linked families.</div>';
  const e = examSelected(),
    rows = examResultRows(),
    tab = getSubTab("exams-v", "results");
  return `<div class="page-head"><div class="ph-l"><h2>${examManager() ? "Exams & Gradebook" : "My published results"}</h2><p>Choose an assessment. Draft marks remain with teaching staff; published marks are read-only until reopened for moderation.</p></div><div class="ph-r">${examManager() ? '<button class="btn" onclick="examCreateForm()">New exam scheme</button>' : ""}${e ? '<button class="btn" onclick="examExport()">Export results</button>' : ""}${e && examManager() && !e.locked ? '<button class="btn primary" onclick="enterMarksForm()">Enter marks</button>' : ""}</div></div>${
    e
      ? `<div class="card pad" style="margin-bottom:16px"><div class="flex ac" style="gap:10px;flex-wrap:wrap"><div class="field sel" style="flex:1;min-width:180px"><select aria-label="Select exam" onchange="examChange(this.value)">${examList()
          .map(
            (ex) =>
              `<option value="${ex._id}" ${ex._id === e._id ? "selected" : ""}>${studentEscape(ex.name + " · " + ex.term + " · " + (ex.locked ? "Published" : "Draft"))}</option>`,
          )
          .join(
            "",
          )}</select></div>${chip(e.locked ? "Published / locked" : "Draft", e.locked ? "green" : "amber")}${examManager() ? `<button class="btn" onclick="examPublicationReview()">${e.locked ? "Reopen for moderation" : "Review & publish"}</button><button class="btn" onclick="manageSubjectsForm()">Subjects</button>` : ""}</div><p class="muted">Maximum ${e.maxMarks} marks per subject · pass threshold ${e.passMark} / ${e.maxMarks} (${Math.round((e.passMark / e.maxMarks) * 100)}%) · saved marks only.</p></div><div class="grid cols-4 academic-kpis" style="margin-bottom:16px">${kpi("exam", "#2563EB", "Results", rows.length, null)}${kpi("exam", "#17A24A", "Average", rows.length ? Math.round((rows.reduce((n, r) => n + r.averagePercent, 0) / rows.length) * 10) / 10 + "%" : "—", null)}${kpi("exam", "#17A24A", "Passing", rows.filter((r) => r.passing).length, null)}${kpi("exam", "#E2920C", "Needs support", rows.filter((r) => !r.passing).length, null)}</div>${subTabs(
          "exams-v",
          [
            ["results", "Results", "exam"],
            ["schedule", "Datesheet", "cal"],
            ["analysis", "Subject analysis", "reports"],
          ],
        )}<div class="card pad" style="margin-bottom:16px"><div class="flex ac" style="gap:12px;flex-wrap:wrap"><div class="field" style="flex:1;min-width:160px"><input id="examSearch" aria-label="Find exam student" value="${studentEscape(state.examSearch || "")}" placeholder="Student name or admission ID" oninput="examFilterSearch(this.value)"></div><div class="field sel"><select aria-label="Exam class" onchange="state.examClass=this.value;render()"><option value="">All visible classes</option>${[
          ...new Set(
            (SCHOOLOS_ADAPTER.examResults || [])
              .filter((r) => r.exam === e._id)
              .map((r) => r.student.grade),
          ),
        ]
          .sort()
          .map(
            (c) =>
              `<option ${c === state.examClass ? "selected" : ""}>${studentEscape(c)}</option>`,
          )
          .join(
            "",
          )}</select></div></div></div>${tab === "schedule" ? examSchedule() : tab === "analysis" ? examAnalysis() : examResults()}`
      : '<div class="card pad"><h3>No assessments available</h3><p>Teaching staff can create a scheme. Families see results after the school publishes them.</p></div>'
  }`;
};
function examFilterSearch(q) {
  state.examSearch = q;
  const pos = document.getElementById("examSearch")?.selectionStart;
  render();
  const input = document.getElementById("examSearch");
  if (input && pos !== undefined && pos !== null) {
    input.focus();
    input.setSelectionRange(pos, pos);
  }
}
function examResults() {
  return `<div id="examResultsBody">${examResultsTable()}</div>`;
}
function examResultsTable() {
  const e = examSelected(),
    rows = examResultRows().sort(
      (a, b) =>
        b.averagePercent - a.averagePercent ||
        a.student.name.localeCompare(b.student.name),
    );
  return `<div class="card pad"><div class="flex ac jb"><h3>${studentEscape(e.name)} · ${rows.length} saved results</h3>${examManager() && e.locked ? '<button class="btn" onclick="genReportCardsForm()">Register report cards</button>' : ""}</div><p class="muted">Missing marks are not treated as zero. A result includes every configured subject.</p><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Student / class</th>${e.subjects.map((s) => `<th>${studentEscape(s)}</th>`).join("")}<th>Average</th><th>Grade / pass</th><th></th></tr></thead><tbody>${rows.map((r) => `<tr><td><strong>${studentEscape(r.student.name)}</strong><div class="muted">${studentEscape(r.student.refId + " · " + r.student.grade)}</div></td>${e.subjects.map((s) => `<td class="num">${r.scores.find((v) => v.subject === s)?.marks ?? "—"}</td>`).join("")}<td>${r.averagePercent}%</td><td>${studentEscape(r.grade)} · ${r.passing ? "Pass" : "Needs support"}</td><td><button class="btn sm" onclick="${studentClick("examOpenResult", r.student._id)}">View</button>${examManager() && !e.locked ? ` <button class="btn sm" onclick="${studentClick("enterMarksForm", r.student._id)}">Correct marks</button>` : ""}</td></tr>`).join("") || `<tr><td colspan="${e.subjects.length + 4}">No saved results match this assessment/filter.</td></tr>`}</tbody></table></div></div>`;
}
function examOpenResult(id) {
  const e = examSelected(),
    r = (SCHOOLOS_ADAPTER.examResults || []).find(
      (r) => r.exam === e?._id && r.student._id === id,
    );
  if (!r) return;
  openDrawer(
    detailDrawer({
      recordTitle:true,personTitle:true,title:studentEscape(r.student.name),
      sub: studentEscape(e.name + " · " + r.student.refId),
      color: "#2563EB",
      badge: ic("exam", 18),
      sections: [
        {
          h: "Result",
          html: studentInfoRows([
            ...r.scores.map((s) => [s.subject, s.marks + " / " + e.maxMarks]),
            ["Average", r.averagePercent + "%"],
            ["Grade", r.grade],
            ["Outcome", r.passing ? "Pass" : "Needs support"],
          ]),
        },
        ...(examManager()
          ? [
              {
                h: "Correction history",
                html:
                  (r.corrections || [])
                    .map(
                      (c) =>
                        `<div class="card pad" style="margin-bottom:10px"><p>${studentEscape(c.reason)}</p><p class="muted">${studentEscape(new Date(c.changedAt).toLocaleString())}</p><p>${c.previousScores.map((s) => studentEscape(s.subject + ": " + s.marks)).join(" · ")}</p></div>`,
                    )
                    .join("") || "<p>No recorded corrections.</p>",
              },
            ]
          : []),
      ],
      footer: [
        ["Export result", studentClick("examExportStudent", id), true],
        ...(examIssuedCard(id)
          ? [["View issued report card", studentClick("examOpenCard", id)]]
          : []),
      ],
    }),
  );
}
function examCreateForm() {
  if (!examManager() || state.examSaving) return;
  studentFormDrawer(
    "Create exam scheme",
    "Enter one subject per line. A scheme cannot change its subjects after marks have been saved.",
    [
      {
        label: "Assessment name",
        key: "name",
        req: true,
        ph: "Term 1 final assessment",
      },
      {
        label: "Term / academic year",
        key: "term",
        req: true,
        val: SCHOOLOS_ADAPTER.settings?.academicYear || "",
      },
      {
        label: "Subjects — one per line",
        key: "subjects",
        area: true,
        req: true,
      },
      {
        label: "Maximum marks per subject",
        key: "max",
        type: "number",
        val: "100",
        req: true,
      },
      {
        label: "Pass marks per subject",
        key: "pass",
        type: "number",
        val: "50",
        req: true,
      },
    ],
    "Create scheme",
    "",
    "examCreateSave",
  );
}
window.examCreateSave = async function (v) {
  if (!examManager() || state.examSaving) return false;
  state.examSaving = true;
  try {
    const res = await SCHOOLOS_ADAPTER.api("/exams", {
      method: "POST",
      body: JSON.stringify({
        name: v.name,
        term: v.term,
        subjects: v.subjects
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        maxMarks: Number(v.max),
        passMark: Number(v.pass),
      }),
    });
    state.examSelectedId = res.data._id;
    await SCHOOLOS_ADAPTER.hydrate();
    closeDrawer();
    render();
    toast("Exam scheme saved");
  } catch (e) {
    toast("Not saved — " + e.message);
  } finally {
    state.examSaving = false;
  }
  return false;
};
function enterMarksForm(id) {
  const e = examSelected();
  if (!examManager() || !e || e.locked || state.examSaving) return;
  const r = (SCHOOLOS_ADAPTER.examResults || []).find(
    (r) => r.exam === e._id && r.student._id === id,
  );
  state.examEditingStudent = id || null;
  state.examExpectedVersion = r?.updatedAt || null;
  state.examEditingId = e._id;
  studentFormDrawer(
    r ? "Correct saved marks" : "Enter marks",
    "Each subject must have an explicit score. Zero is valid; blank is not.",
    [
      {
        label: "Student",
        key: "student",
        opts: STUDENTS.filter(
          (s) => s.status === "Active" && (!id || s.mongoId === id),
        ).map((s) => s.id + " · " + s.name),
        val: r ? r.student.refId + " · " + r.student.name : undefined,
        req: true,
      },
      ...e.subjects.map((subject, index) => ({
        label: subject + " / " + e.maxMarks,
        key: "mark" + index,
        type: "number",
        val: r
          ? String(r.scores.find((s) => s.subject === subject)?.marks ?? "")
          : "",
        req: true,
      })),
      ...(r
        ? [
            {
              label: "Correction reason",
              key: "reason",
              area: true,
              req: true,
              maxlen: 300,
            },
          ]
        : []),
    ],
    "Save marks",
    "",
    "examMarksSave",
  );
}
window.examMarksSave = async function (v) {
  if (!examManager() || state.examSaving) return false;
  const e = (SCHOOLOS_ADAPTER.exams || []).find(
      (e) => e._id === state.examEditingId,
    ),
    student = STUDENTS.find((s) => s.id + " · " + s.name === v.student);
  if (
    !e ||
    !student ||
    e.subjects.some(
      (s, i) =>
        v["mark" + i] === "" ||
        v["mark" + i] === undefined ||
        !Number.isFinite(Number(v["mark" + i])),
    )
  ) {
    toast("Choose a student and enter every subject score");
    return false;
  }
  const existing = (SCHOOLOS_ADAPTER.examResults || []).find(
    (r) => r.exam === e._id && r.student._id === student.mongoId,
  );
  if (!state.examEditingStudent && existing) {
    toast(
      "This student already has marks. Open Correct marks to review them first",
    );
    return false;
  }
  state.examSaving = true;
  try {
    await SCHOOLOS_ADAPTER.api("/exams/" + e._id + "/register", {
      method: "PUT",
      body: JSON.stringify({
        entries: [
          {
            studentId: student.mongoId,
            expectedUpdatedAt: state.examExpectedVersion,
            scores: e.subjects.map((subject, i) => ({
              subject,
              marks: Number(v["mark" + i]),
            })),
          },
        ],
        correctionReason: v.reason || undefined,
      }),
    });
    await SCHOOLOS_ADAPTER.hydrate();
    closeDrawer();
    render();
    toast("Marks saved");
  } catch (error) {
    toast("Not saved — " + error.message);
  } finally {
    state.examSaving = false;
  }
  return false;
};
function examPublicationReview() {
  const e = examSelected();
  if (!examManager() || !e || state.examSaving) return;
  state.examPublicationId = e._id;
  state.examPublicationLocked = e.locked;
  const results = (SCHOOLOS_ADAPTER.examResults || []).filter(
    (r) => r.exam === e._id,
  );
  openDrawer(
    detailDrawer({
      title: e.locked ? "Reopen assessment" : "Review publication",
      sub: studentEscape(e.name),
      color: "#2563EB",
      badge: ic("exam", 18),
      sections: [
        {
          h: "Confirm",
          html: e.locked
            ? "<p>Results will be hidden from families while moderation is open. Existing report-card records retain their original issued snapshot.</p>"
            : `<p>${results.length} complete results will become visible to their linked families. In-app messages go to linked Parent accounts. Students without results remain unassessed.</p><p>Subject structure and marks will lock. No email/SMS delivery is claimed.</p>`,
        },
      ],
      footer: [
        ["Cancel", "closeDrawer()"],
        [
          e.locked ? "Confirm reopen" : "Publish & lock",
          "examPublicationSave()",
          true,
        ],
      ],
    }),
  );
}
async function examPublicationSave() {
  if (state.examSaving || !examManager()) return;
  state.examSaving = true;
  try {
    const res = await SCHOOLOS_ADAPTER.api(
      "/exams/" +
        state.examPublicationId +
        "/" +
        (state.examPublicationLocked ? "reopen" : "publish"),
      { method: "POST" },
    );
    await SCHOOLOS_ADAPTER.hydrate();
    closeDrawer();
    render();
    toast(
      state.examPublicationLocked
        ? "Exam reopened"
        : res.data.notified + " in-app notices saved; exam published",
    );
  } catch (e) {
    toast("Not saved — " + e.message);
  } finally {
    state.examSaving = false;
  }
}
function manageSubjectsForm() {
  const e = examSelected();
  if (!e || !examManager() || state.examSaving) return;
  openDrawer(
    detailDrawer({
      title: "Assessment subjects",
      sub: studentEscape(e.name),
      color: "#2563EB",
      badge: ic("exam", 18),
      sections: [
        {
          h: "Configured subjects",
          html:
            e.subjects
              .map(
                (s) =>
                  `<div class="flex ac jb" style="margin-bottom:12px"><span>${studentEscape(s)}</span>${!e.locked ? `<button class="btn sm" onclick="${examCall("examRemoveSubject", s)}">Remove</button>` : ""}</div>`,
              )
              .join("") +
            '<p class="muted">Subject changes are blocked once results exist. Create a new scheme for a different assessment structure.</p>',
        },
      ],
      footer: !e.locked
        ? [["Add subject", "examSubjectForm()", true]]
        : [["Close", "closeDrawer()", true]],
    }),
  );
}
function examSubjectForm() {
  studentFormDrawer(
    "Add assessment subject",
    "Names must be unique.",
    [{ label: "Subject", key: "subject", req: true }],
    "Add subject",
    "",
    "examSubjectSave",
  );
}
window.examSubjectSave = async function (v) {
  return examSubjectChange("POST", v.subject);
};
async function examRemoveSubject(subject) {
  if (!confirm("Remove " + subject + " from the draft assessment?")) return;
  return examSubjectChange("DELETE", subject);
}
async function examSubjectChange(method, subject) {
  const e = examSelected();
  if (!examManager() || !e || state.examSaving) return false;
  state.examSaving = true;
  try {
    await SCHOOLOS_ADAPTER.api(
      "/exams/" +
        e._id +
        "/subjects" +
        (method === "DELETE" ? "/" + encodeURIComponent(subject) : ""),
      {
        method,
        ...(method === "POST" ? { body: JSON.stringify({ subject }) } : {}),
      },
    );
    await SCHOOLOS_ADAPTER.hydrate();
    closeDrawer();
    render();
    toast("Subjects saved");
  } catch (error) {
    toast("Not saved — " + error.message);
  } finally {
    state.examSaving = false;
  }
  return false;
}
function examSchedule() {
  const e = examSelected();
  return `<div class="card pad"><div class="flex ac jb"><h3>${studentEscape(e.name)} · saved datesheet</h3>${examManager() && !e.locked ? '<button class="btn" onclick="examScheduleForm()">Edit datesheet</button>' : ""}</div><p class="muted">Start times use ${studentEscape(SCHOOLOS_ADAPTER.settings?.timezone || "school timezone")}. The datesheet becomes final when the assessment is published.</p><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Subject</th><th>Date</th><th>Time</th><th>Minutes</th><th>Venue</th></tr></thead><tbody>${(e.schedule || []).map((s) => `<tr><td data-i18n-skip="true">${studentEscape(s.subject)}</td><td>${studentEscape(s.date)}</td><td>${studentEscape(s.startTime)}</td><td>${s.durationMinutes}</td><td>${studentEscape(s.venue)}</td></tr>`).join("") || '<tr><td colspan="5">No examination dates have been saved.</td></tr>'}</tbody></table></div></div>`;
}
function examScheduleForm() {
  const e = examSelected();
  if (!e || e.locked || !examManager() || state.examSaving) return;
  state.examScheduleId = e._id;
  state.examScheduleVersion = e.updatedAt;
  studentFormDrawer(
    "Edit datesheet",
    "Leave a subject date empty to remove that schedule entry.",
    e.subjects.flatMap((subject, i) => {
      const old = (e.schedule || []).find((s) => s.subject === subject);
      return [
        {
          label: subject + " · date",
          key: "date" + i,
          type: "date",
          val: old?.date || "",
        },
        {
          label: "Start time (HH:mm)",
          key: "time" + i,
          val: old?.startTime || "09:00",
          half: true,
        },
        {
          label: "Duration in minutes",
          key: "duration" + i,
          type: "number",
          val: String(old?.durationMinutes || 60),
          half: true,
        },
        { label: "Venue", key: "venue" + i, val: old?.venue || "" },
      ];
    }),
    "Save datesheet",
    "",
    "examScheduleSave",
  );
}
window.examScheduleSave = async function (v) {
  const e = (SCHOOLOS_ADAPTER.exams || []).find(
    (e) => e._id === state.examScheduleId,
  );
  if (!e || state.examSaving) return false;
  state.examSaving = true;
  try {
    await SCHOOLOS_ADAPTER.api("/exams/" + e._id, {
      method: "PATCH",
      body: JSON.stringify({
        expectedUpdatedAt: state.examScheduleVersion,
        schedule: e.subjects.flatMap((subject, i) =>
          v["date" + i]
            ? [
                {
                  subject,
                  date: v["date" + i],
                  startTime: v["time" + i],
                  durationMinutes: Number(v["duration" + i]),
                  venue: v["venue" + i],
                },
              ]
            : [],
        ),
      }),
    });
    await SCHOOLOS_ADAPTER.hydrate();
    closeDrawer();
    render();
    toast("Datesheet saved");
  } catch (error) {
    toast("Not saved — " + error.message);
  } finally {
    state.examSaving = false;
  }
  return false;
};
function examAnalysis() {
  const e = examSelected(),
    rows = examResultRows();
  return `<div class="grid cols-2"><div class="card pad"><h3>Subject averages</h3><p class="muted">Based on ${rows.length} complete results in the current filter.</p>${e.subjects
    .map((subject) => {
      const scores = rows
        .map((r) => r.scores.find((s) => s.subject === subject)?.marks)
        .filter((v) => v !== undefined);
      const average = scores.length
        ? Math.round(
            (scores.reduce((n, v) => n + v, 0) / scores.length / e.maxMarks) *
              1000,
          ) / 10
        : null;
      return `<div style="margin:16px 0"><div class="flex ac jb"><span>${studentEscape(subject)}</span><strong>${average === null ? "—" : average + "%"}</strong></div>${average === null ? "" : cbar(average, "blue")}</div>`;
    })
    .join(
      "",
    )}</div><div class="card pad"><h3>Result distribution</h3>${["A+", "A", "B", "C", "D"].map((grade) => `<p>${grade} · ${rows.filter((r) => r.grade === grade).length} results</p>`).join("")}<p class="muted">Default grade bands: A+ ≥85%, A ≥70%, B ≥60%, C ≥50%, D below 50%. Passing follows this assessment’s own pass threshold.</p></div></div>`;
}
function genReportCardsForm() {
  const e = examSelected();
  if (!e || !e.locked || !examManager() || state.examSaving) return;
  state.examReportId = e._id;
  studentFormDrawer(
    "Register report cards",
    "Creates one issued record per exam/student in Certificates, with an immutable score snapshot. This is not a signed PDF.",
    [
      {
        label: "Class",
        key: "grade",
        opts: [
          "All visible classes",
          ...[
            ...new Set(
              (SCHOOLOS_ADAPTER.examResults || [])
                .filter((r) => r.exam === e._id)
                .map((r) => r.student.grade),
            ),
          ],
        ],
      },
    ],
    "Register report cards",
    "",
    "examReportSave",
  );
}
window.examReportSave = async function (v) {
  if (!examManager() || state.examSaving) return false;
  state.examSaving = true;
  try {
    const res = await SCHOOLOS_ADAPTER.api(
      "/exams/" + state.examReportId + "/report-cards",
      {
        method: "POST",
        body: JSON.stringify(
          v.grade === "All visible classes" ? {} : { grade: v.grade },
        ),
      },
    );
    await SCHOOLOS_ADAPTER.hydrate();
    closeDrawer();
    render();
    toast(
      res.data.generated +
        " report-card records created; " +
        res.data.alreadyExisted +
        " already existed",
    );
  } catch (e) {
    toast("Not saved — " + e.message);
  } finally {
    state.examSaving = false;
  }
  return false;
};
function examCSV(rows) {
  const e = examSelected();
  return [
    [
      "Assessment",
      "Term",
      "Student ID",
      "Student",
      "Class",
      ...e.subjects,
      "Maximum per subject",
      "Average %",
      "Grade",
      "Passing",
    ],
    ...rows.map((r) => [
      e.name,
      e.term,
      r.student.refId,
      r.student.name,
      r.student.grade,
      ...e.subjects.map(
        (s) => r.scores.find((v) => v.subject === s)?.marks ?? "",
      ),
      e.maxMarks,
      r.averagePercent,
      r.grade,
      r.passing ? "Yes" : "No",
    ]),
  ];
}
function examExport() {
  if (examSelected())
    studentDownloadCSV("exam-results.csv", examCSV(examResultRows()));
}
function examExportStudent(id) {
  studentDownloadCSV(
    "exam-result.csv",
    examCSV(examResultRows().filter((r) => r.student._id === id)),
  );
}

function examIssuedCard(studentId) {
  const e = examSelected();
  return (SCHOOLOS_ADAPTER.certificates || []).find(
    (c) =>
      c.type === "ReportCard" &&
      c.status === "Issued" &&
      c.purpose === "Exam:" + e?._id &&
      (c.student?._id || c.student) === studentId &&
      c.assessmentSnapshot,
  );
}
function examOpenCard(studentId) {
  if (!examAllowed()) return;
  const card = examIssuedCard(studentId);
  if (!card) return;
  const s = card.assessmentSnapshot;
  openDrawer(
    detailDrawer({
      title: studentEscape(s.studentName),
      sub: studentEscape(s.examName + " · issued report-card snapshot"),
      color: "#2563EB",
      badge: ic("cert", 18),
      sections: [
        {
          h: "Issued record",
          html: studentInfoRows([
            ["Record number", card.certNumber],
            ["Issued date", String(card.issuedDate || "").slice(0, 10)],
            ["Student ID", s.studentRef],
            ["Class", s.grade],
            ["Term", s.term],
            ...s.scores.map((score) => [
              score.subject,
              score.marks + " / " + s.maxMarks,
            ]),
            ["Average", s.averagePercent + "%"],
            ["Grade", s.letterGrade],
            ["Pass threshold", s.passMark + " / " + s.maxMarks],
          ]),
        },
        {
          h: "Snapshot",
          html: "<p>This is the original issued record. Later moderation does not rewrite it. The CSV is an unsigned record, not a signed report PDF.</p>",
        },
      ],
      footer: [
        [
          "Download issued CSV",
          studentClick("examCardExport", studentId),
          true,
        ],
        ["Close", "closeDrawer()"],
      ],
    }),
  );
}
function examCardExport(studentId) {
  const card = examIssuedCard(studentId);
  if (!card) return;
  const s = card.assessmentSnapshot;
  studentDownloadCSV("issued-report-card.csv", [
    [
      "Record number",
      "Issued date",
      "Assessment",
      "Term",
      "Student ID",
      "Student",
      "Class",
      ...s.scores.map((score) => score.subject),
      "Maximum per subject",
      "Average %",
      "Grade",
    ],
    [
      card.certNumber,
      card.issuedDate,
      s.examName,
      s.term,
      s.studentRef,
      s.studentName,
      s.grade,
      ...s.scores.map((score) => score.marks),
      s.maxMarks,
      s.averagePercent,
      s.letterGrade,
    ],
  ]);
}
