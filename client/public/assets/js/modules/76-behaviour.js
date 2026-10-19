/* Behaviour register: saved merits, private pastoral notes and reviewed case outcomes. */
function behaviourStaff() {
  return ["Administrator", "Principal", "Teacher"].includes(state.role);
}
function behaviourOffice() {
  return ["Administrator", "Principal"].includes(state.role);
}
function behaviourState() {
  const id = commUserId();
  if (state.behaviour?.userId !== id)
    state.behaviour = {
      userId: id,
      rows: [],
      loaded: false,
      loading: false,
      error: "",
      q: "",
      type: "All",
      status: "All",
      due: false,
      page: 1,
    };
  return state.behaviour;
}
window.behaviourLoad = async function () {
  const b = behaviourState();
  if (b.loading) return;
  b.loading = true;
  b.error = "";
  try {
    const r = await SCHOOLOS_ADAPTER.apiAll("/behaviour");
    b.rows = r.data || [];
    b.loaded = true;
  } catch (e) {
    b.error = e.message;
  } finally {
    b.loading = false;
    if (state.module === "behaviour") render();
  }
};
function behaviourCanUpdate(r) {
  return (
    r.type !== "Merit" &&
    (behaviourOffice() ||
      (state.role === "Teacher" &&
        (r.reportedBy?._id || r.reportedBy) === commUserId() &&
        r.status === "Logged"))
  );
}
function behaviourFiltered() {
  const b = behaviourState(),
    today = healthDay();
  return b.rows.filter(
    (r) =>
      (b.type === "All" || r.type === b.type) &&
      (b.status === "All" || r.status === b.status) &&
      (!b.due || (r.followUpDate && r.followUpDate <= today)) &&
      (!b.q ||
        [r.student?.name, r.student?.refId, r.description, r.category]
          .join(" ")
          .toLowerCase()
          .includes(b.q.toLowerCase())),
  );
}
window.behaviourSearch = function (q) {
  behaviourState().q = q;
  behaviourState().page = 1;
  render();
  const el = document.getElementById("behaviourSearch");
  if (el) {
    el.focus();
    el.setSelectionRange(q.length, q.length);
  }
};
M.behaviour = () => {
  const b = behaviourState();
  if (!b.loaded && !b.loading && !b.error) setTimeout(behaviourLoad, 0);
  const rows = behaviourFiltered(),
    pages = Math.max(1, Math.ceil(rows.length / 15));
  b.page = Math.min(b.page, pages);
  const count = (predicate) =>
    b.loaded ? String(b.rows.filter(predicate).length) : "—";
  return `<div class="page-head"><div class="ph-l"><h2>Behaviour & Pastoral Care</h2><p>${behaviourStaff() ? "Recognize achievements, review incidents and keep dated follow-up decisions." : "Shared records for your linked student profile. Confidential staff notes remain private."}</p></div><div class="ph-r">${behaviourOffice() ? '<button class="btn" onclick="behaviourExport()">Export filtered entries</button>' : ""}${behaviourStaff() ? '<button class="btn primary" onclick="behaviourNewEntry()">Log entry</button>' : ""}</div></div><div class="grid cols-4" style="margin-bottom:18px">${kpi(
    "behaviour",
    "#17A24A",
    "Merits",
    count((r) => r.type === "Merit"),
    null,
  )}${kpi(
    "behaviour",
    "#E2920C",
    "Open cases",
    count((r) => r.type !== "Merit" && r.status !== "Closed"),
    null,
  )}${kpi(
    "reports",
    "#E11D48",
    "Escalated",
    count((r) => r.status === "Escalated"),
    null,
  )}${kpi(
    "calendar",
    "#2563EB",
    "Follow-ups due",
    count((r) => r.followUpDate && r.followUpDate <= healthDay()),
    null,
  )}</div><div class="card pad"><div class="flex" style="gap:12px;flex-wrap:wrap;margin-bottom:14px"><div class="field" style="flex:1;min-width:180px"><input id="behaviourSearch" aria-label="Search behaviour entries" placeholder="Search student, admission ID or entry" value="${studentEscape(b.q)}" oninput="behaviourSearch(this.value)"></div>${[
    ["type", ["All", "Merit", "Incident", "Detention", "Pastoral note"]],
    ["status", ["All", "Logged", "Escalated", "Closed"]],
  ]
    .map(
      ([key, options]) =>
        `<div class="field sel"><select aria-label="Behaviour ${key}" onchange="behaviourState().${key}=this.value;behaviourState().page=1;render()">${options.map((v) => `<option ${b[key] === v ? "selected" : ""}>${v}</option>`).join("")}</select></div>`,
    )
    .join(
      "",
    )}<label><input type="checkbox" aria-label="Due behaviour follow-ups" ${b.due ? "checked" : ""} onchange="behaviourState().due=this.checked;render()"> Due follow-ups</label><button class="btn" onclick="behaviourLoad()">Refresh</button></div><p class="muted">${behaviourStaff() ? "Staff-only entries are excluded from family views. Escalated cases require school office review. Points are recorded per entry; house assignments are not inferred." : "Only entries explicitly shared with family appear here."}</p>${b.error ? `<p role="alert">${studentEscape(b.error)}</p><button class="btn" onclick="behaviourLoad()">Retry</button>` : b.loading ? "<p>Loading behaviour records…</p>" : ""}<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Student</th><th>Type</th><th>Entry</th><th>Points</th><th>Status</th><th>Follow-up</th><th></th></tr></thead><tbody>${
    rows
      .slice((b.page - 1) * 15, b.page * 15)
      .map(
        (r) =>
          `<tr><td>${cellUser(studentEscape(r.student?.name || "Student"), "")}<small>${studentEscape(r.student?.refId)} · ${studentEscape(r.student?.grade)}</small></td><td>${chip(r.type, r.type === "Merit" ? "green" : r.type === "Pastoral note" ? "blue" : "amber")}</td><td>${studentEscape(r.category)}<br><small>${studentEscape(r.description.slice(0, 90))}</small></td><td class="num">${r.points > 0 ? "+" : ""}${Number(r.points) || 0}</td><td>${studentEscape(r.status)}</td><td>${studentEscape(r.followUpDate || "—")}${behaviourStaff() && r.assignedTo ? `<br><small>${studentEscape(r.assignedTo.name)}</small>` : ""}</td><td><button class="btn sm" onclick="${studentClick("behaviourRecordDetail", r._id)}">View</button></td></tr>`,
      )
      .join("") ||
    '<tr><td colspan="7">No behaviour entries match this view.</td></tr>'
  }</tbody></table></div><div class="flex ac jb"><button class="btn" ${b.page <= 1 ? "disabled" : ""} onclick="behaviourState().page--;render()">Previous</button><span>${rows.length} entries · Page ${b.page} / ${pages}</span><button class="btn" ${b.page >= pages ? "disabled" : ""} onclick="behaviourState().page++;render()">Next</button></div></div>`;
};
window.behaviourNewEntry = function () {
  if (!behaviourStaff()) return;
  const b = behaviourState();
  b.choices = STUDENTS.filter((s) => s.status === "Active" && s.mongoId).map(
    (s) => ({ label: s.id + " — " + s.name, id: s.mongoId }),
  );
  studentFormDrawer(
    "Log behaviour entry",
    "Select a real student. Leave points blank for the type default. Pastoral notes default to Staff only.",
    [
      {
        key: "student",
        label: "Student",
        opts: b.choices.map((s) => s.label),
        req: true,
      },
      {
        key: "type",
        label: "Entry type",
        opts: ["Incident", "Merit", "Detention", "Pastoral note"],
      },
      { key: "category", label: "Category", req: true },
      {
        key: "description",
        label: "Description",
        area: true,
        maxlen: 1000,
        req: true,
      },
      {
        key: "incidentDate",
        label: "Entry date",
        type: "date",
        val: healthDay(),
        req: true,
      },
      {
        key: "severity",
        label: "Severity",
        opts: ["Minor", "Moderate", "Serious"],
      },
      {
        key: "points",
        label: "Points (optional type default)",
        type: "number",
      },
      { key: "location", label: "Location" },
      { key: "witness", label: "Staff witness (private)" },
      {
        key: "actionTaken",
        label: "Action recorded",
        area: true,
        maxlen: 1000,
      },
      {
        key: "visibility",
        label: "Family visibility",
        opts: ["Type default", "Shared with family", "Staff only"],
      },
      { key: "followUpDate", label: "Follow-up date (optional)", type: "date" },
    ],
    "Save entry",
    "",
    "behaviourSaveEntry",
  );
};
window.behaviourSaveEntry = async function (v) {
  const b = behaviourState();
  if (b.saving) return false;
  const student = b.choices?.find((s) => s.label === v.student);
  if (!student || !v.category || !v.description || !v.incidentDate)
    return toast("Student, category, description and date are required");
  b.saving = true;
  try {
    await SCHOOLOS_ADAPTER.api("/behaviour", {
      method: "POST",
      body: JSON.stringify({
        studentId: student.id,
        type: v.type,
        category: v.category,
        description: v.description,
        incidentDate: v.incidentDate,
        severity: v.severity,
        ...(v.points !== "" ? { points: Number(v.points) } : {}),
        location: v.location,
        witness: v.witness,
        actionTaken: v.actionTaken,
        ...(v.visibility !== "Type default"
          ? { visibility: v.visibility }
          : {}),
        ...(v.followUpDate ? { followUpDate: v.followUpDate } : {}),
      }),
    });
    closeDrawer();
    await behaviourLoad();
    toast("Behaviour entry saved");
  } catch (e) {
    toast(e.message);
  } finally {
    b.saving = false;
  }
};
window.behaviourRecordDetail = function (id) {
  const r = behaviourState().rows.find((r) => r._id === id);
  if (!r) return;
  const safe = (rows) => rows.map(([k, v]) => [k, studentEscape(v ?? "—")]);
  openDrawer(
    detailDrawer({
      recordTitle:true,personTitle:Boolean(r.student?.name),title:studentEscape(r.student?.name || "Behaviour record"),
      sub:
        studentEscape(r.type) +
        " · " +
        studentEscape(r.incidentDate || healthDay(r.createdAt)),
      sections: [
        {
          h: "Entry",
          rows: safe([
            ["Category", r.category],
            ["Description", r.description],
            ["Severity", r.severity],
            ["Points", r.points],
            ["Location", r.location],
            ["Status", r.status],
            ["Action recorded", r.actionTaken],
            ["Follow-up", r.followUpDate],
          ]),
        },
        ...(behaviourStaff()
          ? [
              {
                h: "Staff review",
                rows: safe([
                  ["Visibility", r.visibility || "Shared with family"],
                  ["Reporter", r.reportedBy?.name],
                  ["Witness", r.witness],
                  ["Owner", r.assignedTo?.name],
                ]),
              },
              {
                h: "Decision history",
                html:
                  (r.history || [])
                    .map(
                      (x) =>
                        `<div class="card pad"><strong>${studentEscape(commDate(x.changedAt))}</strong><p>${studentEscape(x.from)} → ${studentEscape(x.to)}</p><p>${studentEscape(x.reason)}</p><p>${studentEscape(x.actionTaken || "")}</p></div>`,
                    )
                    .join("") || "<p>No decisions recorded.</p>",
              },
            ]
          : []),
      ],
      footer: behaviourCanUpdate(r)
        ? [["Review / follow-up", studentClick("behaviourEditCase", id), true]]
        : [],
    }),
  );
};
window.behaviourEditCase = function (id) {
  const b = behaviourState(),
    r = b.rows.find((r) => r._id === id);
  if (!r || !behaviourCanUpdate(r)) return;
  b.edit = { id, version: r.updatedAt };
  studentFormDrawer(
    "Review behaviour case",
    "A reason is required. Closing requires a recorded resolution. Office can reopen a case.",
    [
      {
        key: "status",
        label: "Status",
        opts: behaviourOffice()
          ? ["Logged", "Escalated", "Closed"]
          : ["Escalated", "Closed"],
        val: r.status,
      },
      {
        key: "reason",
        label: "Decision reason",
        area: true,
        maxlen: 500,
        req: true,
      },
      {
        key: "actionTaken",
        label: "Action / resolution",
        area: true,
        maxlen: 1000,
        val: r.actionTaken || "",
      },
      {
        key: "followUpDate",
        label: "Follow-up date",
        type: "date",
        val: r.followUpDate || "",
      },
      ...(behaviourOffice()
        ? [
            {
              key: "assignedToEmail",
              label: "Follow-up owner account email (optional)",
              type: "email",
              val: r.assignedTo?.email || "",
            },
          ]
        : []),
    ],
    "Save decision",
    "",
    "behaviourSaveDecision",
  );
};
window.behaviourSaveDecision = async function (v) {
  const b = behaviourState();
  if (b.saving) return false;
  if (!v.reason || v.reason.length < 3)
    return toast("Enter a clear decision reason");
  if (v.status === "Closed" && !v.actionTaken)
    return toast("Record the resolution before closing");
  b.saving = true;
  try {
    await SCHOOLOS_ADAPTER.api("/behaviour/" + b.edit.id + "/status", {
      method: "PATCH",
      body: JSON.stringify({
        status: v.status,
        reason: v.reason,
        actionTaken: v.actionTaken,
        followUpDate: v.followUpDate || null,
        expectedUpdatedAt: b.edit.version,
        ...(behaviourOffice()
          ? { assignedToEmail: v.assignedToEmail || null }
          : {}),
      }),
    });
    closeDrawer();
    await behaviourLoad();
    toast("Behaviour decision saved");
  } catch (e) {
    toast(e.message);
  } finally {
    b.saving = false;
  }
};
window.behaviourExport = function () {
  if (!behaviourOffice()) return;
  studentDownloadCSV("Behaviour_entries.csv", [
    [
      "Student",
      "Admission ID",
      "Type",
      "Category",
      "Description",
      "Points",
      "Status",
      "Visibility",
      "Follow-up",
    ],
    ...behaviourFiltered().map((r) => [
      r.student?.name,
      r.student?.refId,
      r.type,
      r.category,
      r.description,
      r.points,
      r.status,
      r.visibility,
      r.followUpDate || "",
    ]),
  ]);
};
