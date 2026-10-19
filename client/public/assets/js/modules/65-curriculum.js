/* Saved curriculum plans, scoped coverage and reviewed teaching history. */
let CURRIC_UNITS = [];
function curriculumWorkspaceManage() {
  return ["Administrator", "Principal", "Teacher"].includes(state.role);
}
function curriculumWorkspaceOffice() {
  return ["Administrator", "Principal"].includes(state.role);
}
function curriculumWorkspaceState() {
  const userId = commUserId();
  if (state.curriculumWorkspace?.userId !== userId)
    state.curriculumWorkspace = {
      userId,
      rows: [],
      loaded: false,
      loading: false,
      saving: false,
      error: "",
      q: "",
      grade: "All",
      academicYear: "All",
      term: "All",
      subject: "All",
      status: "All",
      archived: false,
      page: 1,
    };
  return state.curriculumWorkspace;
}
window.curriculumWorkspaceLoad = async function () {
  const b = curriculumWorkspaceState();
  if (b.loading) return;
  b.loading = true;
  b.error = "";
  try {
    const r = await SCHOOLOS_ADAPTER.apiAll(
      "/curriculum?archived=" + b.archived,
    );
    b.rows = r.data || [];
    b.loaded = true;
  } catch (e) {
    b.error = e.message;
  } finally {
    b.loading = false;
    if (state.module === "curriculum") render();
  }
};
function curriculumWorkspaceDay(v) {
  return v ? String(v).slice(0, 10) : "";
}
function curriculumWorkspaceStatus(r) {
  return r.completedDate
    ? "Completed"
    : r.plannedDate && curriculumWorkspaceDay(r.plannedDate) < healthDay()
      ? "Overdue"
      : "Planned";
}
function curriculumWorkspaceFiltered() {
  const b = curriculumWorkspaceState();
  return b.rows.filter(
    (r) =>
      ["grade", "academicYear", "term", "subject"].every(
        (k) => b[k] === "All" || r[k] === b[k],
      ) &&
      (b.status === "All" || curriculumWorkspaceStatus(r) === b.status) &&
      (!b.q ||
        [r.title, r.outcomes, r.owner, r.framework]
          .join(" ")
          .toLowerCase()
          .includes(b.q.toLowerCase())),
  );
}
window.curriculumWorkspaceFilter = function (k, v) {
  const b = curriculumWorkspaceState();
  b[k] = v;
  b.page = 1;
  if (k === "archived") {
    b.loaded = false;
    curriculumWorkspaceLoad();
  } else render();
};
window.curriculumWorkspaceSearch = function (v) {
  curriculumWorkspaceFilter("q", v);
};
window.curriculumWorkspacePage = function (v) {
  curriculumWorkspaceState().page = v;
  render();
};
function curriculumWorkspaceRow(id) {
  return curriculumWorkspaceState().rows.find((r) => r._id === id);
}
window.curriculumWorkspaceForm = function (id) {
  if (!curriculumWorkspaceManage()) return;
  const b = curriculumWorkspaceState(),
    r = id ? curriculumWorkspaceRow(id) : null;
  if (id && !r) return;
  b.editId = id || null;
  b.mode = "edit";
  studentFormDrawer(
    r ? "Edit curriculum unit" : "Add curriculum unit",
    "Plan the teaching scope and learning outcomes.",
    [
      {
        key: "subject",
        label: "Subject",
        req: true,
        val: r?.subject || "",
        half: true,
      },
      {
        key: "grade",
        label: "Grade",
        req: true,
        val: r?.grade || "All grades",
        half: true,
      },
      {
        key: "academicYear",
        label: "Academic year",
        req: true,
        val: r?.academicYear || SCHOOLOS_ADAPTER.settings?.academicYear || "",
        half: true,
      },
      {
        key: "term",
        label: "Term",
        req: true,
        val: r?.term || "Term 1",
        half: true,
      },
      { key: "title", label: "Unit title", req: true, val: r?.title || "" },
      {
        key: "outcomes",
        label: "Learning outcomes",
        area: true,
        req: true,
        val: r?.outcomes || "",
      },
      {
        key: "plannedDate",
        label: "Planned completion",
        type: "date",
        val: curriculumWorkspaceDay(r?.plannedDate),
        half: true,
      },
      {
        key: "sequenceOrder",
        label: "Sequence",
        type: "number",
        val: r?.sequenceOrder || 0,
        half: true,
      },
      {
        key: "framework",
        label: "Framework",
        val: r?.framework || "School-defined",
        half: true,
      },
      {
        key: "owner",
        label: "Coordinator",
        val: r?.owner || "Subject coordinator",
        half: true,
      },
      ...(r
        ? [{ key: "reason", label: "Reason for change", req: true, area: true }]
        : []),
    ],
    "Save unit",
    "",
    "curriculumWorkspaceSave",
  );
  const defaults={grade:'All grades',term:'Term 1',framework:'School-defined',owner:'Subject coordinator'};
  Object.entries(defaults).forEach(([key,value])=>{
    const input=document.querySelector('#drawer [data-fkey="'+key+'"]');
    if(input?.value===value)input.setAttribute('data-school-default-value',value);
  });
  if(typeof localizeView==='function')localizeView(document.getElementById('drawer'));
};
function curriculumCanonicalDefault(value,canonical){
  const translations=typeof I18N!=='undefined'?I18N[canonical]:null;
  return value===canonical||Object.values(translations||{}).includes(value)?canonical:value;
}
window.curriculumWorkspaceCoverage = function (id) {
  const r = curriculumWorkspaceRow(id);
  if (!r || r.archived || !curriculumWorkspaceManage()) return;
  const b = curriculumWorkspaceState();
  b.editId = id;
  b.mode = "coverage";
  studentFormDrawer(
    r.completedDate ? "Reopen coverage" : "Complete coverage",
    r.title,
    [
      ...(!r.completedDate
        ? [
            {
              key: "completedDate",
              label: "Actual completion date",
              req: true,
              type: "date",
              val: healthDay(),
            },
          ]
        : []),
      {
        key: "reason",
        label: "Teaching review / reason",
        req: true,
        area: true,
      },
    ],
    r.completedDate ? "Reopen unit" : "Mark completed",
    "",
    "curriculumWorkspaceSave",
  );
};
window.curriculumWorkspaceArchive = function (id) {
  const r = curriculumWorkspaceRow(id);
  if (!r || !curriculumWorkspaceOffice()) return;
  const b = curriculumWorkspaceState();
  b.editId = id;
  b.mode = "archive";
  studentFormDrawer(
    r.archived ? "Restore unit" : "Archive unit",
    r.title,
    [{ key: "reason", label: "Reason", req: true, area: true }],
    r.archived ? "Restore" : "Archive",
    "",
    "curriculumWorkspaceSave",
  );
};
window.curriculumWorkspaceSave = async function (v) {
  const b = curriculumWorkspaceState();
  if (b.saving) return false;
  const r = b.editId ? curriculumWorkspaceRow(b.editId) : null;
  let payload;
  if (b.mode === "archive") payload = { archived: !r.archived };
  else if (b.mode === "coverage")
    payload = { completedDate: r.completedDate ? null : v.completedDate };
  else {
    payload = {
      subject: v.subject,
      grade: curriculumCanonicalDefault(v.grade,"All grades"),
      academicYear: v.academicYear,
      term: curriculumCanonicalDefault(v.term,"Term 1"),
      title: v.title,
      outcomes: v.outcomes,
      sequenceOrder: Number(v.sequenceOrder || 0),
      framework: curriculumCanonicalDefault(v.framework,"School-defined"),
      owner: curriculumCanonicalDefault(v.owner,"Subject coordinator"),
    };
    if (v.plannedDate) payload.plannedDate = v.plannedDate;
    else if (r) payload.plannedDate = null;
  }
  if (r) {
    payload.expectedUpdatedAt = r.updatedAt;
    payload.reason = v.reason;
  }
  b.saving = true;
  try {
    await SCHOOLOS_ADAPTER.api(
      "/curriculum" +
        (r ? "/" + r._id : "") +
        (b.mode === "archive" ? "/archive" : ""),
      {
        method: r && b.mode !== "archive" ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      },
    );
    closeDrawer();
    await curriculumWorkspaceLoad();
    toast("Curriculum saved");
  } catch (e) {
    toast(e.message);
  } finally {
    b.saving = false;
  }
  return false;
};
window.curriculumWorkspaceDetail = function (id) {
  const r = curriculumWorkspaceRow(id);
  if (!r) return;
  const esc = studentEscape;
  openDrawer(
    detailDrawer({
      title: esc(r.title),
      sub: esc(
        r.subject + " · " + r.grade + " · " + r.academicYear + " · " + r.term,
      ),
      sections: [
        {
          h: "Teaching plan",
          rows: [
            ["Status", r.archived ? "Archived" : curriculumWorkspaceStatus(r)],
            [
              "Planned completion",
              esc(curriculumWorkspaceDay(r.plannedDate) || "Unscheduled"),
            ],
            [
              "Actual completion",
              esc(curriculumWorkspaceDay(r.completedDate) || "Pending"),
            ],
            ["Framework", esc(r.framework)],
            ["Coordinator", esc(r.owner)],
            ["Sequence", String(r.sequenceOrder)],
          ],
        },
        {
          h: "Learning outcomes",
          html:
            '<div style="white-space:pre-wrap">' + esc(r.outcomes) + "</div>",
        },
        ...(curriculumWorkspaceManage()
          ? [
              {
                h: "Review history",
                html: r.history?.length
                  ? r.history
                      .map(
                        (h) =>
                          '<div class="lrow"><div><b>' +
                          esc(commDate(h.at)) +
                          "</b><p>" +
                          esc(h.reason) +
                          '</p><span class="muted">' +
                          esc(
                            h.after?.archived
                              ? "Archived"
                              : h.after?.completedDate
                                ? "Completed"
                                : h.before?.completedDate
                                  ? "Reopened"
                                  : "Plan updated",
                          ) +
                          "</span></div></div>",
                      )
                      .join("")
                  : '<p class="muted">No changes recorded.</p>',
              },
            ]
          : []),
      ],
      footer: [
        ...(curriculumWorkspaceManage() && !r.archived
          ? [
              ["Edit plan", studentClick("curriculumWorkspaceForm", id)],
              [
                r.completedDate ? "Reopen" : "Complete",
                studentClick("curriculumWorkspaceCoverage", id),
                true,
              ],
            ]
          : []),
        ...(curriculumWorkspaceOffice()
          ? [
              [
                r.archived ? "Restore" : "Archive",
                studentClick("curriculumWorkspaceArchive", id),
              ],
            ]
          : []),
        ["Close", "closeDrawer()"],
      ],
    }),
  );
};
window.curriculumWorkspaceExport = function () {
  studentDownloadCSV("curriculum.csv", [
    [
      "Subject",
      "Grade",
      "Academic year",
      "Term",
      "Unit",
      "Outcomes",
      "Planned",
      "Completed",
      "Status",
      "Coordinator",
    ],
    ...curriculumWorkspaceFiltered().map((r) => [
      r.subject,
      r.grade,
      r.academicYear,
      r.term,
      r.title,
      r.outcomes,
      curriculumWorkspaceDay(r.plannedDate),
      curriculumWorkspaceDay(r.completedDate),
      curriculumWorkspaceStatus(r),
      r.owner,
    ]),
  ]);
};
/* Legacy dashboard links open the same reviewed workflow. */
function curricUnits(subject) {
  return curriculumWorkspaceState().rows.filter(
    (r) => !subject || r.subject === subject,
  );
}
function curricUnitDetail(subject, title) {
  const r = curricUnits(subject).find((r) => r.title === title);
  if (r) curriculumWorkspaceDetail(r._id);
  return "";
}
function addUnitForm() {
  curriculumWorkspaceForm();
}
window.markUnitDone = window.markUnitPlanned = function (subject, title) {
  const rows = curricUnits(subject).filter((r) => r.title === title);
  if (rows.length === 1) curriculumWorkspaceCoverage(rows[0]._id);
  else {
    go("curriculum");
    toast("Select the grade and academic year for this unit");
  }
};
window.markUnitDone.__apiBacked = true;
M.curriculum = () => {
  const b = curriculumWorkspaceState();
  if (!b.loaded && !b.loading && !b.error) curriculumWorkspaceLoad();
  const rows = curriculumWorkspaceFiltered(),
    done = rows.filter((r) => r.completedDate).length,
    overdue = rows.filter(
      (r) => curriculumWorkspaceStatus(r) === "Overdue",
    ).length;
  const pages = Math.max(1, Math.ceil(rows.length / 20));
  b.page = Math.min(b.page, pages);
  const esc = studentEscape;
  const selectors = ["grade", "academicYear", "term", "subject"]
    .map(
      (k) =>
        "<label>" +
        {
          grade: "Grade",
          academicYear: "Academic year",
          term: "Term",
          subject: "Subject",
        }[k] +
        " <select onchange=\"curriculumWorkspaceFilter('" +
        k +
        "',this.value)\">" +
        ["All", ...new Set(b.rows.map((r) => r[k]))]
          .map(
            (v) =>
              "<option " +
              (b[k] === v ? "selected" : "") +
              ' value="' +
              esc(v) +
              '">' +
              esc(v) +
              "</option>",
          )
          .join("") +
        "</select></label>",
    )
    .join("");
  return (
    '<div class="page-head"><div class="ph-l"><h2>Curriculum</h2><p>Teaching plans, learning outcomes and recorded completion by grade and academic year.</p></div><div class="ph-r"><button class="btn" onclick="curriculumWorkspaceExport()">Export plan</button>' +
    (curriculumWorkspaceManage()
      ? '<button class="btn primary" onclick="curriculumWorkspaceForm()">Add unit</button>'
      : "") +
    "</div></div>" +
    '<div class="grid cols-4" style="margin-bottom:18px">' +
    kpi("curric", "#17A24A", "Units", String(rows.length)) +
    kpi("classes", "#2563EB", "Completed", String(done)) +
    kpi("reports", "#B45309", "Overdue", String(overdue)) +
    kpi(
      "lms",
      "#0E7C39",
      "Coverage",
      rows.length ? Math.round((done / rows.length) * 100) + "%" : "—",
    ) +
    "</div>" +
    '<div class="card pad" style="margin-bottom:16px"><div class="flex ac" style="gap:12px;flex-wrap:wrap"><input aria-label="Search curriculum" placeholder="Search units, outcomes or coordinator" value="' +
    esc(b.q) +
    '" onchange="curriculumWorkspaceSearch(this.value)">' +
    selectors +
    "<label>Status <select onchange=\"curriculumWorkspaceFilter('status',this.value)\">" +
    ["All", "Planned", "Overdue", "Completed"]
      .map(
        (v) =>
          "<option " +
          (b.status === v ? "selected" : "") +
          ">" +
          v +
          "</option>",
      )
      .join("") +
    '</select></label><label><input type="checkbox" ' +
    (b.archived ? "checked" : "") +
    ' onchange="curriculumWorkspaceFilter(\'archived\',this.checked)"> Archived</label><button class="btn" onclick="curriculumWorkspaceLoad()">Refresh</button></div></div>' +
    (b.error ? '<div class="card pad">' + esc(b.error) + "</div>" : "") +
    '<div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Unit / subject</th><th>Scope</th><th>Planned</th><th>Status</th><th>Coordinator</th><th></th></tr></thead><tbody>' +
    rows
      .slice((b.page - 1) * 20, b.page * 20)
      .map(
        (r) =>
          "<tr><td><b>" +
          esc(r.title) +
          '</b><div class="muted">' +
          esc(r.subject) +
          "</div></td><td>" +
          esc(r.grade) +
          '<div class="muted">' +
          esc(r.academicYear + " · " + r.term) +
          "</div></td><td>" +
          esc(curriculumWorkspaceDay(r.plannedDate) || "Unscheduled") +
          "</td><td>" +
          chip(
            r.archived ? "Archived" : curriculumWorkspaceStatus(r),
            r.completedDate
              ? "green"
              : curriculumWorkspaceStatus(r) === "Overdue"
                ? "red"
                : "blue",
          ) +
          "</td><td>" +
          esc(r.owner) +
          '</td><td><button class="btn" onclick="' +
          studentClick("curriculumWorkspaceDetail", r._id) +
          '">View</button></td></tr>',
      )
      .join("") +
    "</tbody></table></div>" +
    (!rows.length
      ? '<p class="pad muted">' +
        (b.loading ? "Loading curriculum…" : "No units match this view.") +
        "</p>"
      : "") +
    '<div class="pad flex ac jb"><span>' +
    rows.length +
    " units · Page " +
    b.page +
    " of " +
    pages +
    '</span><div><button class="btn" ' +
    (b.page === 1 ? "disabled" : "") +
    ' onclick="curriculumWorkspacePage(' +
    (b.page - 1) +
    ')">Previous</button><button class="btn" ' +
    (b.page === pages ? "disabled" : "") +
    ' onclick="curriculumWorkspacePage(' +
    (b.page + 1) +
    ')">Next</button></div></div></div><p class="muted">Coverage is the share of selected units marked completed. Overdue means the planned completion date has passed. Archived units are excluded from the active plan.</p>'
  );
};
