/* Classes: persisted sections and complete, authorized student rosters. */
function classAllowed() {
  return ["Administrator", "Principal", "Teacher"].includes(state.role);
}
function classManager() {
  return ["Administrator", "Principal"].includes(state.role);
}
function classFilters() {
  return (
    state.classFilters ||
    (state.classFilters = { q: "", stream: "", status: "Active" })
  );
}
function classRows() {
  const f = classFilters();
  return CLASSES.filter(
    (c) =>
      (!f.status || c.status === f.status) &&
      (!f.stream || c.stream === f.stream) &&
      [c.cls, c.teacher, c.room]
        .join(" ")
        .toLowerCase()
        .includes(f.q.toLowerCase()),
  ).sort((a, b) => a.cls.localeCompare(b.cls, undefined, { numeric: true }));
}
function classFilter(key, value) {
  classFilters()[key] = value;
  filterClasses();
}
M.classes = () => {
  if (!classAllowed())
    return '<div class="card pad">Classes management is restricted to school staff.</div>';
  const f = classFilters(),
    rows = classRows(),
    active = CLASSES.filter((c) => c.status === "Active");
  return `<div class="page-head"><div class="ph-l"><h2>Classes & Sections</h2><p>Organise teaching groups, rooms and class teachers. Live occupancy comes from active student records.</p></div><div class="ph-r"><button class="btn" onclick="classExport()">${ic("download", 16)} Export sections</button><button class="btn primary" onclick="addSectionForm()">${ic("plus", 16)} Add section</button></div></div>
 <div class="grid cols-3 class-kpis" style="margin-bottom:16px">${kpi("classes", "#2563EB", "Active sections", active.length, null)}${kpi(
   "students",
   "#17A24A",
   "Active enrolments",
   active.reduce((n, c) => n + c.filled, 0),
   null,
 )}${kpi("staff", "#E2920C", "Teachers unassigned", active.filter((c) => !c.teacherStaffId).length, null)}</div>
 <div class="card pad" style="margin-bottom:16px"><div class="flex ac" style="gap:12px;flex-wrap:wrap"><div class="field" style="flex:1;min-width:180px"><input aria-label="Search classes" id="clsSearch" value="${studentEscape(f.q)}" placeholder="Search class, teacher or room" oninput="classFilter('q',this.value)"></div><div class="field sel"><select aria-label="Stream" onchange="classFilter('stream',this.value)"><option value="">All streams</option>${["Foundation", "Primary", "General", "Commerce", "Science", "Arts"].map((s) => `<option ${f.stream === s ? "selected" : ""}>${s}</option>`).join("")}</select></div><div class="field sel"><select aria-label="Section status" onchange="classFilter('status',this.value)">${["Active", "Archived", ""].map((s) => `<option value="${s}" ${f.status === s ? "selected" : ""}>${s || "All statuses"}</option>`).join("")}</select></div><span id="clsCount" class="muted">${rows.length} sections</span></div></div><div id="clsGrid" class="grid cols-3">${classCards(rows)}</div>`;
};
function classCards(rows) {
  return (
    rows
      .map(
        (c) =>
          `<div class="card pad" style="overflow-wrap:anywhere"><div class="flex ac jb"><h3>${studentEscape(c.cls)}</h3>${chip(c.status, c.status === "Archived" ? "gray" : "blue")}</div><p class="muted">${studentEscape(c.stream)} · Room ${studentEscape(c.room || "not assigned")}</p><p>Class teacher · <strong>${studentEscape(c.teacher)}</strong></p><div class="flex ac jb"><span class="muted">Active students</span><strong>${c.filled} / ${c.cap}</strong></div><progress aria-label="Section occupancy" value="${Math.min(c.filled, c.cap)}" max="${c.cap}" style="width:100%;margin:10px 0"></progress><p class="muted">${Math.max(0, c.cap - c.filled)} <span>available places</span>${c.filled > c.cap ? " · Over capacity — review enrolments" : ""}</p><button class="btn" onclick="${studentClick("classOpen", c.cls)}">View full roster</button>${classManager() ? ` <button class="btn" onclick="${studentClick("classEdit", c.mongoId)}">Edit section</button>` : ""}</div>`,
      )
      .join("") ||
    '<div class="card pad" style="grid-column:1/-1">No sections match. Change your filters or create a section.</div>'
  );
}
function filterClasses() {
  if (!document.getElementById("clsGrid")) return;
  const rows = classRows();
  document.getElementById("clsGrid").innerHTML = classCards(rows);
  document.getElementById("clsCount").textContent = rows.length + " sections";
}
function classOpen(cls) {
  if (classAllowed()) openDrawer(classDetail(cls));
}
function classDetail(cls) {
  const c = CLASSES.find((c) => c.cls === cls);
  if (!c) return "";
  const roster = STUDENTS.filter((s) => s.grade === cls).sort((a, b) =>
    String(a.roll).localeCompare(String(b.roll), undefined, { numeric: true }),
  );
  return detailDrawer({
    title: studentEscape(cls),
    sub: studentEscape(c.stream) + " · " + roster.length + " student records",
    color: "#2563EB",
    badge: ic("classes", 18),
    sections: [
      {
        h: "Section information",
        html: studentInfoRows([
          ["Class teacher", c.teacher],
          ["Room", c.room],
          ["Status", c.status],
          ["Capacity", c.cap],
          ["Active enrolments", c.filled],
        ]),
      },
      {
        h: "Full roster",
        html: `<p class="muted">Includes inactive and alumni records; only Active enrolments count towards capacity.</p><div class="field" style="margin-bottom:12px"><input aria-label="Search class roster" placeholder="Find student or roll" oninput="classRosterSearch(this.value)"></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Student</th><th>Roll</th><th>Status</th></tr></thead><tbody>${roster.map((s) => `<tr><td><button class="btn sm" onclick="${studentClick("classStudent", s.id)}">${studentEscape(s.name)}</button><div class="muted">${studentEscape(s.id)}</div></td><td>${studentEscape(s.roll)}</td><td>${studentEscape(s.status)}</td></tr>`).join("") || '<tr><td colspan="3">No students assigned.</td></tr>'}</tbody></table></div>`,
      },
    ],
    footer: [
      ["Take attendance", studentClick("classAttendance", cls), true],
      ["Export roster", studentClick("classRosterExport", cls)],
    ],
  });
}
function classStudent(id) {
  openDrawer(studentProfile(id));
}
function classAttendance(cls) {
  closeDrawer();
  state.attClass = cls;
  go("attendance");
}
function classExport() {
  studentDownloadCSV("class-sections.csv", [
    [
      "Section",
      "Stream",
      "Teacher",
      "Room",
      "Status",
      "Active students",
      "Capacity",
    ],
    ...classRows().map((c) => [
      c.cls,
      c.stream,
      c.teacher,
      c.room,
      c.status,
      c.filled,
      c.cap,
    ]),
  ]);
}
function classRosterExport(cls) {
  studentDownloadCSV("class-roster.csv", [
    ["Student ID", "Student", "Roll", "Section", "Status"],
    ...STUDENTS.filter((s) => s.grade === cls).map((s) => [
      s.id,
      s.name,
      s.roll,
      s.grade,
      s.status,
    ]),
  ]);
}
function classEdit(id) {
  if (!classManager() || state.classSaving) return;
  state.editClass = CLASSES.find((c) => c.mongoId === id);
  classForm();
}
function addSectionForm() {
  if (!classAllowed() || state.classSaving) return;
  state.editClass = null;
  classForm();
}
function classForm() {
  const c = state.editClass;
  const teachers = STAFF.filter(
    (s) => s.type === "Teaching" && s.status === "Active",
  );
  studentFormDrawer(
    c ? "Edit section" : "Add section",
    "Section identity stays stable to preserve enrolment and timetable references.",
    [
      ...(!c
        ? [
            {
              label: "Grade",
              key: "grade",
              opts: [
                "KG 1",
                "KG 2",
                ...Array.from({ length: 12 }, (_, i) => "Grade " + (i + 1)),
              ],
              req: true,
              half: true,
            },
            {
              label: "Section",
              key: "section",
              opts: ["A", "B", "C", "D", "E", "F"],
              half: true,
            },
          ]
        : []),
      {
        label: "Stream",
        key: "stream",
        opts: [
          "Foundation",
          "Primary",
          "General",
          "Commerce",
          "Science",
          "Arts",
        ],
        val: c?.stream || "General",
        half: true,
      },
      {
        label: "Class teacher",
        key: "teacher",
        opts: ["Unassigned", ...teachers.map((s) => s.name + " · " + s.id)],
        val: teachers.find((s) => s.mongoId === c?.teacherStaffId)
          ? teachers.find((s) => s.mongoId === c?.teacherStaffId).name +
            " · " +
            teachers.find((s) => s.mongoId === c?.teacherStaffId).id
          : "Unassigned",
        half: true,
      },
      {
        label: "Room",
        key: "room",
        val: c?.room || "",
        ph: "e.g. Building A · 204",
      },
      {
        label: "Capacity",
        type: "number",
        key: "cap",
        val: String(c?.cap || 30),
        req: true,
      },
      ...(c
        ? [
            {
              label: "Status",
              key: "status",
              opts: ["Active", "Archived"],
              val: c.status,
            },
          ]
        : []),
    ],
    c ? "Save section" : "Create section",
    "",
    "classSave",
  );
}
window.classSave = async function (v) {
  if (state.classSaving || !classAllowed()) return false;
  const c = state.editClass,
    cap = Number(v.cap);
  if (!Number.isInteger(cap) || cap < 1 || cap > 100) {
    toast("Capacity must be 1–100");
    return false;
  }
  const teacher = STAFF.find(
    (s) =>
      s.name + " · " + s.id === v.teacher &&
      s.type === "Teaching" &&
      s.status === "Active",
  );
  state.classSaving = true;
  try {
    await SCHOOLOS_ADAPTER.api("/classes" + (c ? "/" + c.mongoId : ""), {
      method: c ? "PATCH" : "POST",
      body: JSON.stringify({
        ...(c
          ? { status: v.status, expectedUpdatedAt: c.updatedAt }
          : { grade: v.grade, section: v.section }),
        stream: v.stream,
        room: v.room,
        capacity: cap,
        teacherStaffId: teacher?.mongoId || (c ? null : undefined),
      }),
    });
    await SCHOOLOS_ADAPTER.hydrate();
    closeDrawer();
    render();
    toast(c ? "Section updated" : "Section created");
  } catch (e) {
    toast("Not saved — " + e.message);
  } finally {
    state.classSaving = false;
  }
  return false;
};

function classRosterSearch(value) {
  document
    .querySelectorAll("#drawer tbody tr")
    .forEach(
      (row) =>
        (row.style.display = row.textContent
          .toLowerCase()
          .includes(value.toLowerCase())
          ? ""
          : "none"),
    );
}
