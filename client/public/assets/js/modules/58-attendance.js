/* Attendance: explicit marking, session-based rates and durable absence decisions. */
function attCanMark() {
  return ["Administrator", "Principal", "Teacher"].includes(state.role);
}
function attIsStaff() {
  return ["Administrator", "Principal", "Teacher", "Accountant"].includes(
    state.role,
  );
}
function attToday() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: SCHOOLOS_ADAPTER.settings?.timezone || "Asia/Dubai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  return ["year", "month", "day"]
    .map((type) => parts.find((p) => p.type === type).value)
    .join("-");
}
function attDate() {
  return state.attDate || (state.attDate = attToday());
}
function attLabelDate(d) {
  return new Date(d + "T00:00:00Z").toLocaleDateString((typeof schoolLocale==='function'?schoolLocale():'en-GB'), {
    timeZone: "UTC",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
function attRecordFor(s, date, session) {
  return (
    SCHOOLOS_ADAPTER.attendanceByKey?.[
      s.mongoId + "|" + date + "|" + session
    ] || null
  );
}
function attStatusCode(s) {
  return { Present: "P", Absent: "A", Late: "L", Excused: "E" }[s] || "";
}
function attStatusName(s) {
  return (
    { P: "Present", A: "Absent", L: "Late", E: "Excused" }[s] || "Not marked"
  );
}
function attClassNames() {
  return [
    ...new Set(
      STUDENTS.filter((s) => s.status === "Active").map((s) => s.grade),
    ),
  ].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}
function attSelectedClass() {
  const classes = attClassNames();
  if (!classes.includes(state.attClass)) state.attClass = classes[0] || "";
  return state.attClass;
}
function attRoster() {
  return STUDENTS.filter(
    (s) => s.status === "Active" && s.grade === attSelectedClass(),
  ).sort((a, b) =>
    String(a.roll).localeCompare(String(b.roll), undefined, { numeric: true }),
  );
}
function attDraftKey() {
  return [
    state.role,
    attSelectedClass(),
    attDate(),
    state.attSession || "AM",
  ].join("|");
}
function attDraft() {
  const key = attDraftKey();
  state.attDrafts = state.attDrafts || {};
  if (!state.attDrafts[key] || !state.attDrafts[key].dirty) {
    const rows = {};
    attRoster().forEach((s) => {
      const rec = attRecordFor(s, attDate(), state.attSession || "AM");
      rows[s.mongoId] = {
        status: rec ? attStatusCode(rec.status) : "",
        notes: rec?.notes || "",
        expectedUpdatedAt: rec?.updatedAt || null,
      };
    });
    state.attDrafts[key] = { rows, dirty: false, reason: "" };
  }
  return state.attDrafts[key];
}
function attChange(key, value) {
  if (state.attSaving) return;
  if (
    attDraft().dirty &&
    !confirm("Keep this unsaved draft and switch register?")
  )
    return;
  state[key] = value;
  render();
}
function attSet(id, code) {
  if (!attCanMark() || state.attSaving) return;
  const d = attDraft();
  if (d.rows[id]) {
    d.rows[id].status = code;
    d.dirty = true;
    render();
  }
}
function attNote(id, value) {
  if (!attCanMark() || state.attSaving) return;
  const draft = attDraft();
  draft.rows[id].notes = value;
  draft.dirty = true;
  const note = document.getElementById("attSaveState");
  if (note) note.textContent = "Unsaved changes";
}
function attInitialStatus(i) {
  const s = STUDENTS[i];
  return (s && attDraft().rows[s.mongoId]?.status) || "";
}
function mark(i, v) {
  const s = STUDENTS[i];
  if (s) attSet(s.mongoId, v);
}
function markAll(v) {
  if (!attCanMark() || state.attSaving) return;
  const draft = attDraft();
  Object.values(draft.rows).forEach((r) => (r.status = v));
  draft.dirty = true;
  render();
}
function attCounts() {
  const d = attDraft();
  return {
    p: attRoster().filter((s) => d.rows[s.mongoId]?.status === "P"),
    l: attRoster().filter((s) => d.rows[s.mongoId]?.status === "L"),
    a: attRoster().filter((s) => d.rows[s.mongoId]?.status === "A"),
    e: attRoster().filter((s) => d.rows[s.mongoId]?.status === "E"),
    u: attRoster().filter((s) => !d.rows[s.mongoId]?.status),
  };
}
function attRate(rows) {
  const counted = rows.filter((r) => r.status !== "Excused");
  return counted.length
    ? Math.round(
        (counted.filter((r) => ["Present", "Late"].includes(r.status)).length /
          counted.length) *
          100,
      ) + "%"
    : "—";
}
M.attendance = () => {
  let tab = getSubTab("attendance", "daily");
  if (state.role === "Accountant" && tab !== "staff") tab = "staff";
  const head = `<div class="page-head"><div class="ph-l"><h2>Attendance</h2><p><span>${state.role === "Parent" || state.role === "Student" ? "Your linked family records." : "Mark each class and session; blanks remain unmarked."}</span> <span>School timezone:</span> <bdi dir="ltr" data-i18n-skip>${studentEscape(SCHOOLOS_ADAPTER.settings?.timezone || "Asia/Dubai")}</bdi>.</p></div><div class="ph-r">${tab === "daily" && attCanMark() ? `<button class="btn" onclick="markAll('P')" ${state.attSaving ? "disabled" : ""}>Mark class present</button><button class="btn primary" onclick="submitRegister()" ${state.attSaving ? "disabled" : ""}>${state.attSaving ? "Saving…" : "Save register"}</button>` : tab !== "staff" ? '<button class="btn" onclick="attExport()">Export saved records</button>' : ""}</div></div>`;
  const tabs =
    state.role === "Accountant"
      ? [["staff", "Staff attendance", "staff"]]
      : [
          ["daily", "Daily register", "att"],
          ["monthly", "Monthly summary", "cal"],
          ["analytics", "Follow-up", "reports"],
          ["requests", "Absence requests", "cal"],
          ...(attIsStaff() ? [["staff", "Staff attendance", "staff"]] : []),
        ];
  return (
    head +
    subTabs("attendance", tabs) +
    (tab === "staff"
      ? attStaffView()
      : attControls() +
        (tab === "monthly"
          ? attMonthly()
          : tab === "analytics"
            ? attAnalytics()
            : tab === "requests"
              ? attRequests()
              : attDaily()))
  );
};
function attControls() {
  return `<div class="card pad" style="margin-bottom:16px"><div class="flex ac" style="gap:12px;flex-wrap:wrap"><div class="field sel"><select aria-label="Attendance class" onchange="attChange('attClass',this.value)">${attClassNames()
    .map(
      (c) =>
        `<option ${c === attSelectedClass() ? "selected" : ""}>${studentEscape(c)}</option>`,
    )
    .join(
      "",
    )}</select></div><div class="field"><input aria-label="Register date" type="date" value="${attDate()}" onchange="attChange('attDate',this.value)"></div><div class="seg">${["AM", "PM"].map((s) => `<button class="${(state.attSession || "AM") === s ? "on" : ""}" onclick="attChange('attSession','${s}')">${s}</button>`).join("")}</div><span class="muted">${attRoster().length} <span>active students</span></span></div></div>`;
}
function attAlertOption(key,value){if(!attCanMark())return;const draft=attDraft();draft[key]=value;draft.dirty=true;}
function attDaily() {
  const c = attCounts(),
    draft = attDraft();
  return `<div class="grid cols-4 attendance-kpis" style="margin-bottom:16px">${kpi("att", "#17A24A", "Present", c.p.length, null)}${kpi("att", "#E2920C", "Late", c.l.length, null)}${kpi("att", "#E11D2A", "Absent", c.a.length, null)}${kpi("att", "#2563EB", "Not marked", c.u.length, null)}</div><div class="card pad"><div class="flex ac jb" style="gap:10px;flex-wrap:wrap"><h3>${studentEscape(attSelectedClass() || "No linked class")} · ${state.attSession || "AM"} · ${attLabelDate(attDate())}</h3><span id="attSaveState" class="muted">${draft.dirty ? "Unsaved changes" : "Saved records / not marked"}</span></div><p class="muted">${c.e.length} <span>excused.</span> <span>Blank rows are not counted as Present. All active students must be explicitly marked before saving.</span></p><div class="field" style="margin-bottom:12px"><input aria-label="Find student" placeholder="Find student or ID" oninput="attSearch(this.value)"></div><div id="attList">${
    attRoster()
      .map((s) => {
        const r = draft.rows[s.mongoId];
        return `<div class="card pad att-row" data-search="${studentEscape((s.name + " " + studentSearchName(s,"name") + " " + s.id).toLowerCase())}" style="display:block;margin:8px 0;box-shadow:none"><div class="flex ac jb" style="gap:8px;flex-wrap:wrap"><div><strong>${studentNameHtml(s)}</strong><div class="muted">${studentIdentityHtml(s.id)} · <span>Roll ${studentEscape(s.roll)}</span></div></div>${attCanMark() ? `<div class="seg2" data-i="${STUDENTS.indexOf(s)}">${["P", "L", "A", "E"].map((code) => `<button aria-label="${attStatusName(code)} for ${studentEscape(s.name)}" class="${code}${r.status === code ? " on" : ""}" onclick="${studentEscape("attSet(" + JSON.stringify(s.mongoId) + "," + JSON.stringify(code) + ")")}" ${state.attSaving ? "disabled" : ""}>${code}</button>`).join("")}</div>` : `<strong>${attStatusName(r.status)}</strong>`}</div>${attCanMark() ? `<div class="field" style="margin-top:8px"><input aria-label="Attendance note for ${studentEscape(s.name)}" maxlength="300" placeholder="Optional attendance note" value="${studentEscape(r.notes)}" oninput="${studentEscape("attNote(" + JSON.stringify(s.mongoId) + ",this.value)")}"></div>` : r.notes ? `<p>${studentEscape(r.notes)}</p>` : ""}<span class="muted">${attStatusName(r.status)}</span></div>`;
      })
      .join("") || "<p>No active students are linked to this class.</p>"
  }</div>${attCanMark() ? `<div class="field att-alert-options" style="margin-top:16px"><label><input type="checkbox" ${draft.notifyGuardians?"checked":""} onchange="attAlertOption('notifyGuardians',this.checked)"> Notify guardians for saved Absent/Late records</label><select aria-label="Guardian alert channel" onchange="attAlertOption('notificationChannel',this.value)">${["InApp","Email","SMS"].map(v=>`<option value="${v}" ${(draft.notificationChannel||"InApp")===v?"selected":""}>${v==="InApp"?"In-app only":v+" request"}</option>`).join("")}</select><p class="muted">Only today’s confirmed records. Teacher external requests require office approval.</p><label>Reason for correcting saved attendance</label><input id="attCorrection" maxlength="300" value="${studentEscape(draft.reason)}" oninput="attDraft().reason=this.value" placeholder="Required when changing a saved status or note"></div><button class="btn" style="margin-top:12px" onclick="attReload()">Reload saved register</button>` : ""}</div>`;
}
function attSearch(q) {
  document
    .querySelectorAll(".att-row")
    .forEach(
      (r) =>
        (r.style.display = r.dataset.search.includes(q.toLowerCase())
          ? "block"
          : "none"),
    );
}
async function attReload() {
  if (state.attSaving) return;
  if (attDraft().dirty && !confirm("Discard this unsaved register and reload?"))
    return;
  try {
    await SCHOOLOS_ADAPTER.hydrate();
    delete state.attDrafts[attDraftKey()];
    render();
  } catch (e) {
    toast("Reload failed — " + e.message);
  }
}
window.submitRegister = async function () {
  if (!attCanMark() || state.attSaving) return false;
  const key = attDraftKey(),
    d = attDraft(),
    roster = attRoster();
  if (!roster.length || roster.some((s) => !d.rows[s.mongoId]?.status)) {
    toast("Mark every student before saving");
    return false;
  }
  state.attSaving = true;
  render();
  try {
    await SCHOOLOS_ADAPTER.api("/attendance/register", {
      method: "PUT",
      body: JSON.stringify({
        date: attDate(),
        session: state.attSession || "AM",
        correctionReason: d.reason || undefined,
        notifyGuardians:!!d.notifyGuardians,notificationChannel:d.notificationChannel||'InApp',
        entries: roster.map((s) => ({
          studentId: s.mongoId,
          status: attStatusName(d.rows[s.mongoId].status),
          notes: d.rows[s.mongoId].notes,
          expectedUpdatedAt: d.rows[s.mongoId].expectedUpdatedAt,
        })),
      }),
    });
    await SCHOOLOS_ADAPTER.hydrate();
    delete state.attDrafts[key];
    toast(d.notifyGuardians?"Register saved; eligible guardian alerts will be processed in the background":"Register saved");
  } catch (e) {
    toast("Not saved — " + e.message);
  } finally {
    state.attSaving = false;
    render();
  }
  return false;
};
window.submitRegister.__apiBacked = true;
function attMonthRecords(s) {
  const month = attDate().slice(0, 7);
  return (SCHOOLOS_ADAPTER.attendance || []).filter(
    (r) => r.studentId === s.mongoId && r.date.startsWith(month),
  );
}
function attMonthly() {
  const month = attDate().slice(0, 7),
    days = new Date(
      Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)), 0),
    ).getUTCDate();
  return `<div class="card pad"><h3><span>Monthly register</span> · <bdi dir="ltr">${month}</bdi></h3><p class="muted">Each cell shows AM / PM. — means not marked. Rates use saved sessions: Present/Late count as attended; Excused is excluded.</p><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Student</th>${Array.from({ length: days }, (_, i) => `<th>${i + 1}</th>`).join("")}<th>Rate</th></tr></thead><tbody>${
    attRoster()
      .map(
        (s) =>
          `<tr><td>${studentNameHtml(s)}</td>${Array.from(
            { length: days },
            (_, i) => {
              const date = month + "-" + String(i + 1).padStart(2, "0");
              return `<td style="white-space:nowrap">${["AM", "PM"].map((session) => attStatusCode(attRecordFor(s, date, session)?.status) || "—").join(" / ")}</td>`;
            },
          ).join("")}<td>${attRate(attMonthRecords(s))}</td></tr>`,
      )
      .join("") || "<tr><td>No active students</td></tr>"
  }</tbody></table></div></div>`;
}
function attAnalytics() {
  const rows = attRoster().map((s) => ({ s, records: attMonthRecords(s) }));
  const follow = rows.filter(
    (r) =>
      r.records.filter((v) => v.status !== "Excused").length >= 10 &&
      parseInt(attRate(r.records), 10) < 85,
  );
  return `<div class="card pad"><h3><span>Attendance follow-up</span> · <bdi dir="ltr">${attDate().slice(0, 7)}</bdi></h3><p class="muted"><span>Based on saved sessions for</span> <span>${studentEscape(attSelectedClass())}</span>. <span>Follow-up threshold: below 85%, with at least 10 counted sessions. Missing registers are not absence.</span></p><div class="grid cols-3 attendance-kpis" style="margin:16px 0">${kpi("att", "#17A24A", "Recorded rate", attRate(rows.flatMap((r) => r.records)), null)}${kpi("att", "#E2920C", "Needs follow-up", follow.length, null)}${kpi(
    "att",
    "#2563EB",
    "Saved sessions",
    rows.reduce((n, r) => n + r.records.length, 0),
    null,
  )}</div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Student</th><th>Saved sessions</th><th>Absent</th><th>Rate</th><th>Follow-up</th></tr></thead><tbody>${rows.map((r) => `<tr><td>${studentNameHtml(r.s)}</td><td>${r.records.length}</td><td>${r.records.filter((v) => v.status === "Absent").length}</td><td>${attRate(r.records)}</td><td>${follow.includes(r) ? "Review with guardian" : r.records.length ? "No flag" : "Awaiting registers"}</td></tr>`).join("")}</tbody></table></div></div>`;
}
function attExport() {
  const ids = new Set(attRoster().map((s) => s.mongoId));
  studentDownloadCSV("attendance-" + attDate().slice(0, 7) + ".csv", [
    ["Student ID", "Student", "Class", "Date", "Session", "Status", "Note"],
    ...(SCHOOLOS_ADAPTER.attendance || [])
      .filter(
        (r) => ids.has(r.studentId) && r.date.startsWith(attDate().slice(0, 7)),
      )
      .map((r) => [
        r.refId,
        r.student,
        r.grade,
        r.date,
        r.session,
        r.status,
        r.notes,
      ]),
  ]);
}
function attStaffView() {
  const rows = Object.entries(STAFF_ATTENDANCE);
  return `<div class="card pad"><h3>Staff attendance · today</h3><p class="muted">Actual self-marked records for the school timezone. Unsubmitted staff are not assumed present. Teachers see their own record.</p><div class="flex ac" style="gap:8px;flex-wrap:wrap">${["Present", "Remote", "Late"].map((s) => `<button class="btn" onclick="markMyAttendance('${s}')">I'm ${s.toLowerCase()}</button>`).join("")}</div><div class="tbl-wrap" style="margin-top:16px"><table class="tbl"><thead><tr><th>Name</th><th>Status</th><th>Marked at</th></tr></thead><tbody>${rows.map(([name, r]) => `<tr><td>${studentNameHtml({name})}</td><td>${studentEscape(r.status)}</td><td>${studentEscape(r.time)}</td></tr>`).join("") || '<tr><td colspan="3">No staff attendance marked today.</td></tr>'}</tbody></table></div></div>`;
}
window.markMyAttendance = async function (status) {
  if (!attIsStaff() || state.attStaffSaving) return;
  state.attStaffSaving = true;
  try {
    await SCHOOLOS_ADAPTER.api("/attendance/staff/me", {
      method: "PUT",
      body: JSON.stringify({ status }),
    });
    await SCHOOLOS_ADAPTER.hydrate();
    render();
    toast("Your staff attendance is saved");
  } catch (e) {
    toast("Not saved — " + e.message);
  } finally {
    state.attStaffSaving = false;
  }
};
window.markMyAttendance.__apiBacked = true;
function attRequests() {
  const rows = ABSENCE_REQUESTS.filter((r) => r.grade === attSelectedClass());
  return `<div class="card pad"><div class="flex ac jb"><h3>Absence requests</h3>${attCanMark() || state.role === "Parent" ? '<button class="btn primary" onclick="attRequestForm()">Request absence</button>' : ""}</div><p class="muted">Approval fills unmarked or Absent sessions as Excused. Existing Present/Late records are preserved. No external notification is sent.</p>${rows.map((r) => `<div class="card pad" style="margin-top:12px;overflow-wrap:anywhere"><strong>${studentNameHtml({name:r.studentName})}</strong> ${chip(r.status, r.status === "Approved" ? "green" : "gray")}<p>${studentEscape(r.from)} – ${studentEscape(r.to)} · ${studentEscape(r.type)}</p><p>${studentEscape(r.note)}</p>${r.decisionNote ? `<p>Decision: ${studentEscape(r.decisionNote)}</p>` : ""}${r.status === "Pending" ? (attCanMark() ? `<button class="btn" onclick="${studentEscape("attDecision(" + JSON.stringify(r.requestId) + ',"Approved")')}">Approve</button> <button class="btn" onclick="${studentEscape("attDecision(" + JSON.stringify(r.requestId) + ',"Rejected")')}">Reject</button>` : state.role === "Parent" && r.requestedById === (SCHOOLOS_ADAPTER.user?._id || SCHOOLOS_ADAPTER.user?.id) ? `<button class="btn" onclick="${studentClick("attCancel", r.requestId)}">Cancel request</button>` : "") : ""}</div>`).join("") || "<p>No absence requests for this class.</p>"}</div>`;
}
function attRequestForm() {
  if (!(attCanMark() || state.role === "Parent") || state.attRequestSaving)
    return;
  studentFormDrawer(
    "Request absence",
    "The school reviews this request before attendance changes.",
    [
      {
        label: "Student",
        key: "student",
        opts: attRoster().map((s) => s.id + " · " + s.name),
        req: true,
      },
      { label: "From", key: "from", type: "date", req: true, half: true },
      { label: "To", key: "to", type: "date", req: true, half: true },
      {
        label: "Reason",
        key: "type",
        opts: [
          "Medical",
          "Family event",
          "Travel",
          "Religious observance",
          "Other",
        ],
      },
      { label: "Details", key: "note", area: true, req: true, maxlen: 400 },
    ],
    "Submit request",
    "",
    "attRequestSave",
  );
  const select=document.querySelector('#drawer [data-fkey="student"]');
  if(select){
    [...select.options].forEach(option=>{
      const student=attRoster().find(s=>s.id+' · '+s.name===option.value);
      if(!student)return;
      option.setAttribute('data-school-name',student.name);
      option.setAttribute('data-school-name-prefix',student.id);
      option.setAttribute('data-school-name-translations',JSON.stringify(studentNameTranslations(student,'name')));
      option.setAttribute('data-i18n-skip','true');
    });
    if(typeof localizeView==='function')localizeView(select);
  }
}
window.attRequestSave = async function (v) {
  const student = attRoster().find((s) => s.id + " · " + s.name === v.student);
  if (!student || !v.note || !v.from || !v.to) {
    toast("Student, dates and details are required");
    return false;
  }
  if (state.attRequestSaving) return false;
  state.attRequestSaving = true;
  try {
    await SCHOOLOS_ADAPTER.api("/attendance/absence-requests", {
      method: "POST",
      body: JSON.stringify({
        studentId: student.mongoId,
        fromDate: v.from,
        toDate: v.to,
        type: v.type,
        note: v.note,
      }),
    });
    await SCHOOLOS_ADAPTER.hydrate();
    closeDrawer();
    render();
    toast("Absence request saved");
  } catch (e) {
    toast("Not saved — " + e.message);
  } finally {
    state.attRequestSaving = false;
  }
  return false;
};
function attDecision(id, decision) {
  if (!attCanMark()) return;
  state.attDecisionId = id;
  state.attDecisionValue = decision;
  studentFormDrawer(
    decision === "Approved" ? "Approve absence" : "Reject absence",
    "Recorded decisions remain in the request history.",
    [{ label: "Decision note", key: "note", area: true, maxlen: 300 }],
    "Confirm decision",
    "",
    "attDecisionSave",
  );
}
window.attDecisionSave = async function (v) {
  if (state.attRequestSaving) return false;
  state.attRequestSaving = true;
  try {
    await SCHOOLOS_ADAPTER.api(
      "/attendance/absence-requests/" + state.attDecisionId + "/decision",
      {
        method: "POST",
        body: JSON.stringify({
          decision: state.attDecisionValue,
          note: v.note,
        }),
      },
    );
    await SCHOOLOS_ADAPTER.hydrate();
    Object.keys(state.attDrafts || {}).forEach((key) => {
      if (!state.attDrafts[key].dirty) delete state.attDrafts[key];
    });
    closeDrawer();
    render();
    toast("Decision saved");
  } catch (e) {
    toast("Not saved — " + e.message);
  } finally {
    state.attRequestSaving = false;
  }
  return false;
};
async function attCancel(id) {
  if (!confirm("Cancel this pending request?")) return;
  try {
    await SCHOOLOS_ADAPTER.api(
      "/attendance/absence-requests/" + id + "/cancel",
      { method: "POST" },
    );
    await SCHOOLOS_ADAPTER.hydrate();
    closeDrawer();
    render();
    toast("Request cancelled");
  } catch (e) {
    toast("Not saved — " + e.message);
  }
}

/* Dashboard entry points use the same persisted, escaped workflows. */
window.openAbsenceRequestForm = attRequestForm;
function myAbsenceView() {
  return detailDrawer({
    title: "Leave / absence requests",
    sub: "Recorded school decisions",
    color: "#2563EB",
    badge: ic("att", 18),
    sections: [{ h: "Requests", html: attRequests() }],
    footer: [["Close", "closeDrawer()", true]],
  });
}
window.approveAbsence = function (index) {
  const r = ABSENCE_REQUESTS[index];
  if (r) attDecision(r.requestId, "Approved");
};
window.approveAbsence.__apiBacked = true;
window.rejectAbsence = function (index) {
  const r = ABSENCE_REQUESTS[index];
  if (r) attDecision(r.requestId, "Rejected");
};
window.rejectAbsence.__apiBacked = true;
window.cancelAbsenceRequest = function (index) {
  const r = ABSENCE_REQUESTS[index];
  if (r) return attCancel(r.requestId);
};
window.cancelAbsenceRequest.__apiBacked = true;
window.addEventListener('beforeunload', function(event){
 if(Object.values(state.attDrafts||{}).some(draft=>draft.dirty)){
  event.preventDefault();event.returnValue='';
 }
});
