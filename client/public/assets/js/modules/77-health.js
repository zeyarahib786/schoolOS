/* Health workspace: clinic data is loaded separately and cleared between accounts. */
function healthOffice() {
  return ["Administrator", "Principal"].includes(state.role);
}
function healthRecorder() {
  return healthOffice() || state.role === "Teacher";
}
function healthState() {
  const id = commUserId();
  if (state.health?.userId !== id)
    state.health = {
      userId: id,
      rows: [],
      loaded: false,
      loading: false,
      error: "",
      q: "",
      day: "All dates",
      severity: "All",
      outcome: "All",
      followUp: false,
      page: 1,
    };
  return state.health;
}
function healthDay(value = new Date()) {
  const zone = SCHOOLOS_ADAPTER.settings?.timezone || "Asia/Dubai",
    parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: zone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date(value)),
    get = (t) => parts.find((p) => p.type === t)?.value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}
window.healthLoad = async function () {
  const h = healthState();
  if (h.loading) return;
  h.loading = true;
  h.error = "";
  try {
    const r = await SCHOOLOS_ADAPTER.apiAll("/health-records");
    h.rows = r.data || [];
    h.loaded = true;
  } catch (e) {
    h.error = e.message;
  } finally {
    h.loading = false;
    if (state.module === "health") render();
  }
};
function healthVisitDay(r) {
  return r.visitDate || healthDay(r.createdAt);
}
function healthFiltered() {
  const h = healthState(),
    today = healthDay();
  return h.rows.filter(
    (r) =>
      (h.day !== "Today" || healthVisitDay(r) === today) &&
      (h.severity === "All" || r.severity === h.severity) &&
      (h.outcome === "All" || r.outcome === h.outcome) &&
      (!h.followUp || (r.followUpDate && r.followUpDate <= today)) &&
      (!h.q ||
        [r.student?.name, r.student?.refId, r.reason]
          .join(" ")
          .toLowerCase()
          .includes(h.q.toLowerCase())),
  );
}
window.healthSearch = function (q) {
  healthState().q = q;
  healthState().page = 1;
  render();
  const el = document.getElementById("healthSearch");
  if (el) {
    el.focus();
    el.setSelectionRange(q.length, q.length);
  }
};
M.health = () => {
  const h = healthState();
  if (!h.loaded && !h.loading && !h.error) setTimeout(healthLoad, 0);
  const today = healthDay(),
    rows = healthFiltered(),
    pages = Math.max(1, Math.ceil(rows.length / 15));
  h.page = Math.min(h.page, pages);
  const ready = h.loaded ? null : "—";
  return `<div class="page-head"><div class="ph-l"><h2>Health & Clinic</h2><p>${healthOffice() ? "Clinic register, follow-ups and recorded family contact." : state.role === "Teacher" ? "Record a clinic handover. Medical history is restricted to the school office and linked family." : "Your linked family clinic records and follow-up information."}</p></div><div class="ph-r">${healthOffice() ? '<button class="btn" onclick="healthExport()">Export filtered log</button>' : ""}${healthRecorder() ? '<button class="btn primary" onclick="healthNewVisit()">New visit</button>' : ""}</div></div><div class="grid cols-4" style="margin-bottom:18px">${kpi("health", "#17A24A", "Visits today", ready || String(h.rows.filter((r) => healthVisitDay(r) === today).length), null)}${kpi("health", "#E2920C", "Under observation", ready || String(h.rows.filter((r) => r.outcome === "Under observation").length), null)}${kpi("calendar", "#2563EB", "Follow-ups due", ready || String(h.rows.filter((r) => r.followUpDate && r.followUpDate <= today).length), null)}${kpi("comm", "#0E7C39", "Family contact recorded", ready || String(h.rows.filter((r) => r.parentContacted).length), null)}</div><div class="card pad"><div class="flex" style="gap:12px;flex-wrap:wrap;margin-bottom:14px"><div class="field" style="flex:1;min-width:180px"><input id="healthSearch" aria-label="Search clinic visits" placeholder="Search student, admission ID or reason" value="${studentEscape(h.q)}" oninput="healthSearch(this.value)"></div>${[
    ["day", ["All dates", "Today"]],
    ["severity", ["All", "Routine", "Urgent", "Emergency"]],
    [
      "outcome",
      [
        "All",
        "Returned to class",
        "Sent home",
        "Referred to hospital",
        "Under observation",
      ],
    ],
  ]
    .map(
      ([key, options]) =>
        `<div class="field sel"><select aria-label="Clinic ${key}" onchange="healthState().${key}=this.value;healthState().page=1;render()">${options.map((v) => `<option ${h[key] === v ? "selected" : ""}>${v}</option>`).join("")}</select></div>`,
    )
    .join(
      "",
    )}<label><input type="checkbox" aria-label="Due follow-ups only" ${h.followUp ? "checked" : ""} onchange="healthState().followUp=this.checked;healthState().page=1;render()"> Due follow-ups</label><button class="btn" onclick="healthLoad()">Refresh</button></div>${h.error ? `<p role="alert">${studentEscape(h.error)}</p><button class="btn" onclick="healthLoad()">Retry</button>` : h.loading ? "<p>Loading clinic records…</p>" : ""}<p class="muted">${state.role === "Teacher" ? "You can submit a handover; historical medical details are not available in this role." : "Contact recorded means a staff member confirmed contact; it does not mean an SMS or email was delivered."}</p><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Student</th><th>Visit date</th><th>Severity</th><th>Reason</th><th>Outcome</th><th>Follow-up</th><th></th></tr></thead><tbody>${
    rows
      .slice((h.page - 1) * 15, h.page * 15)
      .map(
        (r) =>
          `<tr><td>${cellUser(studentEscape(r.student?.name || "Student"), "")}<small>${studentEscape(r.student?.refId)} · ${studentEscape(r.student?.grade)}</small></td><td>${studentEscape(healthVisitDay(r))}</td><td>${chip(r.severity || "Routine", r.severity === "Emergency" ? "red" : r.severity === "Urgent" ? "amber" : "green")}</td><td>${studentEscape(r.reason)}</td><td>${studentEscape(r.outcome)}</td><td>${studentEscape(r.followUpDate || "—")}</td><td><button class="btn sm" onclick="${studentClick("healthDetail", r._id)}">View</button></td></tr>`,
      )
      .join("") ||
    '<tr><td colspan="7">No clinic visits match this view.</td></tr>'
  }</tbody></table></div><div class="flex ac jb"><button class="btn" ${h.page <= 1 ? "disabled" : ""} onclick="healthState().page--;render()">Previous</button><span>${rows.length} records · Page ${h.page} / ${pages}</span><button class="btn" ${h.page >= pages ? "disabled" : ""} onclick="healthState().page++;render()">Next</button></div></div>`;
};
window.healthNewVisit = function () {
  if (!healthRecorder()) return;
  const students = STUDENTS.filter((s) => s.status === "Active" && s.mongoId);
  healthState().choices = students.map((s) => ({
    label: s.id + " — " + s.name,
    id: s.mongoId,
  }));
  studentFormDrawer(
    "New clinic visit",
    "Record what happened and the care provided. School staff use the approved school health procedures.",
    [
      {
        key: "student",
        label: "Student",
        opts: healthState().choices.map((s) => s.label),
        req: true,
      },
      {
        key: "visitDate",
        label: "Visit date",
        type: "date",
        val: healthDay(),
        req: true,
      },
      {
        key: "severity",
        label: "Severity",
        opts: ["Routine", "Urgent", "Emergency"],
      },
      { key: "reason", label: "Reason", area: true, req: true, maxlen: 500 },
      {
        key: "treatment",
        label: "Care / action recorded",
        area: true,
        req: true,
        maxlen: 500,
      },
      {
        key: "outcome",
        label: "Outcome",
        opts: [
          "Returned to class",
          "Sent home",
          "Referred to hospital",
          "Under observation",
        ],
      },
      { key: "vitals", label: "Recorded observations / vitals", maxlen: 300 },
      { key: "medicine", label: "Medication recorded", maxlen: 300 },
      { key: "followUpDate", label: "Follow-up date (optional)", type: "date" },
      {
        key: "followUpNote",
        label: "Follow-up instructions recorded",
        area: true,
        maxlen: 500,
      },
    ],
    "Save visit",
    "",
    "healthSaveVisit",
  );
};
window.healthSaveVisit = async function (v) {
  const h = healthState();
  if (h.saving) return false;
  const student = h.choices?.find((s) => s.label === v.student);
  if (!student || !v.reason || !v.treatment || !v.visitDate)
    return toast("Student, visit date, reason and care recorded are required");
  h.saving = true;
  try {
    await SCHOOLOS_ADAPTER.api("/health-records", {
      method: "POST",
      body: JSON.stringify({
        studentId: student.id,
        reason: v.reason,
        treatment: v.treatment,
        severity: v.severity,
        outcome: v.outcome,
        visitDate: v.visitDate,
        vitals: v.vitals,
        medicine: v.medicine,
        ...(v.followUpDate ? { followUpDate: v.followUpDate } : {}),
        followUpNote: v.followUpNote,
      }),
    });
    closeDrawer();
    await healthLoad();
    toast("Clinic visit saved");
  } catch (e) {
    toast(e.message);
  } finally {
    h.saving = false;
  }
};
window.healthDetail = function (id) {
  const r = healthState().rows.find((r) => r._id === id);
  if (!r) return;
  const safe = (rows) => rows.map(([k, v]) => [k, studentEscape(v || "—")]);
  openDrawer(
    detailDrawer({
      recordTitle:true,personTitle:Boolean(r.student?.name),title:studentEscape(r.student?.name || "Clinic record"),
      sub:
        studentEscape(r.student?.refId) +
        " · " +
        studentEscape(healthVisitDay(r)),
      sections: [
        {
          h: "Clinic record",
          rows: safe([
            ["Severity", r.severity],
            ["Reason", r.reason],
            ["Care recorded", r.treatment],
            ["Outcome", r.outcome],
            ["Observations", r.vitals],
            ["Medication recorded", r.medicine],
            ["Recorded by", r.recordedBy?.name],
          ]),
        },
        {
          h: "Family contact and follow-up",
          rows: safe([
            ["Contact recorded", r.parentContacted ? "Yes" : "No"],
            [
              "Contact time",
              r.parentContactedAt ? commDate(r.parentContactedAt) : "—",
            ],
            ["Follow-up date", r.followUpDate],
            ["Follow-up note", r.followUpNote],
          ]),
        },
        {
          h: "Correction history",
          html:
            (r.history || [])
              .map(
                (x) =>
                  `<div class="card pad"><strong>${studentEscape(commDate(x.changedAt))}</strong><p>${studentEscape(x.previousOutcome)} → ${studentEscape(x.outcome)}</p><p>${studentEscape(x.reason)}</p></div>`,
              )
              .join("") || "<p>No corrections recorded.</p>",
        },
      ],
      footer: healthOffice()
        ? [["Update / follow-up", studentClick("healthEditVisit", id), true]]
        : [],
    }),
  );
};
window.healthEditVisit = function (id) {
  if (!healthOffice()) return;
  const r = healthState().rows.find((r) => r._id === id);
  if (!r) return;
  healthState().edit = { id, version: r.updatedAt };
  studentFormDrawer(
    "Update clinic record",
    "A reason is required. Previous outcomes remain in the correction history.",
    [
      {
        key: "outcome",
        label: "Outcome",
        opts: [
          "Returned to class",
          "Sent home",
          "Referred to hospital",
          "Under observation",
        ],
        val: r.outcome,
      },
      {
        key: "parentContacted",
        label: "Family contact confirmed",
        opts: ["No", "Yes"],
        val: r.parentContacted ? "Yes" : "No",
      },
      {
        key: "followUpDate",
        label: "Follow-up date (clear to finish)",
        type: "date",
        val: r.followUpDate || "",
      },
      {
        key: "followUpNote",
        label: "Follow-up note",
        area: true,
        maxlen: 500,
        val: r.followUpNote || "",
      },
      {
        key: "reason",
        label: "Update reason",
        area: true,
        req: true,
        maxlen: 500,
      },
    ],
    "Save update",
    "",
    "healthSaveUpdate",
  );
};
window.healthSaveUpdate = async function (v) {
  const h = healthState();
  if (h.saving) return false;
  if (!v.reason || v.reason.length < 3)
    return toast("Enter a clear update reason");
  h.saving = true;
  try {
    await SCHOOLOS_ADAPTER.api("/health-records/" + h.edit.id, {
      method: "PATCH",
      body: JSON.stringify({
        outcome: v.outcome,
        parentContacted: v.parentContacted === "Yes",
        followUpDate: v.followUpDate || null,
        followUpNote: v.followUpNote,
        reason: v.reason,
        expectedUpdatedAt: h.edit.version,
      }),
    });
    closeDrawer();
    await healthLoad();
    toast("Clinic record updated");
  } catch (e) {
    toast(e.message);
  } finally {
    h.saving = false;
  }
};
window.healthExport = function () {
  if (!healthOffice()) return;
  studentDownloadCSV("Clinic_log.csv", [
    [
      "Student",
      "Admission ID",
      "Class",
      "Date",
      "Severity",
      "Reason",
      "Care recorded",
      "Outcome",
      "Contact recorded",
      "Follow-up date",
      "Follow-up note",
    ],
    ...healthFiltered().map((r) => [
      r.student?.name,
      r.student?.refId,
      r.student?.grade,
      healthVisitDay(r),
      r.severity,
      r.reason,
      r.treatment,
      r.outcome,
      r.parentContacted ? "Yes" : "No",
      r.followUpDate || "",
      r.followUpNote || "",
    ]),
  ]);
};
