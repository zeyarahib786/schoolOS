function studentNameTranslations(s,field){
  return Object.fromEntries(['ar','ur','hi'].map(lang=>[lang,s.translations?.[lang]?.[field==='guardian'?'guardianName':'name']]).filter(([,value])=>value));
}
function studentNameHtml(s,field='name'){
  return `<span data-school-name="${studentEscape(s[field]||'')}" data-school-name-translations="${studentEscape(JSON.stringify(studentNameTranslations(s,field)))}" data-i18n-skip="true">${studentEscape(s[field]||'Not recorded')}</span>`;
}
function studentPhoneHtml(value){
  return value&&value!=='—'?`<bdi dir="ltr" data-i18n-skip="true" data-school-phone="${studentEscape(value)}">${studentEscape(value)}</bdi>`:'<span>Not recorded</span>';
}
function studentIdentityHtml(value){return `<bdi dir="ltr" data-i18n-skip="true">${studentEscape(value)}</bdi>`;}
function studentNameCell(s){return `<div data-school-name="${studentEscape(s.name)}" data-school-name-translations="${studentEscape(JSON.stringify(studentNameTranslations(s,'name')))}" data-school-name-container>${cellUser(studentEscape(s.name),studentIdentityHtml(s.id))}</div>`;}
function studentSearchName(s,field){return typeof schoolNameForLocale==='function'?schoolNameForLocale(s[field],studentNameTranslations(s,field)):s[field];}
/* ---- Students: role-aware directory and record workspace ---- */
function studentFormDrawer(title, sub, fields, ...rest) {
  return formDrawer(
    studentEscape(title),
    studentEscape(sub),
    fields.map((f) => ({
      ...f,
      ...(f.val !== undefined ? { val: studentEscape(f.val) } : {}),
      ...(f.opts ? { opts: f.opts.map(studentEscape) } : {}),
    })),
    ...rest,
  );
}
function studentManager() {
  return ["Administrator", "Principal"].includes(state.role);
}
function studentEscape(value) {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
}
function studentClick(fn, id) {
  return studentEscape(fn + "(" + JSON.stringify(id) + ")");
}
function studentFilters() {
  if (state.studentFilterRole !== state.role) {
    state.studentFilters = null;
    state.studentFilterRole = state.role;
    state.stuPage = 1;
  }
  return (
    state.studentFilters ||
    (state.studentFilters = {
      q: "",
      grade: "",
      status: "",
      fee: "",
      docs: "",
      sort: "name",
      size: 25,
    })
  );
}
function studentDocumentCount(s) {
  return (s.docs || []).filter((d) => d.file).length;
}
function studentFilteredRows() {
  const f = studentFilters(),
    q = f.q.toLowerCase().trim();
  return STUDENTS.filter(
    (s) =>
      (!q ||
        [s.name, s.id, s.guardian, s.phone, s.email, s.roll,studentSearchName(s,'name'),studentSearchName(s,'guardian')].some((v) =>
          String(v || "")
            .toLowerCase()
            .includes(q),
        )) &&
      (!f.grade || s.grade === f.grade) &&
      (!f.status || s.status === f.status) &&
      (!f.fee ||
        (f.fee === "Not invoiced"
          ? !s.invoiceRecords
          : s.invoiceRecords && s.fee === f.fee)) &&
      (!f.docs ||
        (f.docs === "complete"
          ? studentDocumentCount(s) === 3
          : studentDocumentCount(s) < 3)),
  ).sort((a, b) =>
    f.sort === "attendance"
      ? a.att - b.att
      : String(
          a[
            f.sort === "reference"
              ? "id"
              : f.sort === "grade"
                ? "grade"
                : "name"
          ] || "",
        ).localeCompare(
          String(
            b[
              f.sort === "reference"
                ? "id"
                : f.sort === "grade"
                  ? "grade"
                  : "name"
            ] || "",
          ),
          undefined,
          { numeric: true },
        ),
  );
}
function studentSetFilter(key, value) {
  studentFilters()[key] = key === "size" ? Number(value) : value;
  state.stuPage = 1;
  filterStudents();
}
function studentResetFilters() {
  state.studentFilters = {
    q: "",
    grade: "",
    status: "",
    fee: "",
    docs: "",
    sort: "name",
    size: 25,
  };
  state.stuPage = 1;
  render();
}
function studentOptions(values, value) {
  return values
    .map(
      (v) =>
        `<option value="${studentEscape(v)}" ${v === value ? "selected" : ""}>${studentEscape(v)}</option>`,
    )
    .join("");
}
M.students = () => {
  const f = studentFilters(),
    family = ["Parent", "Student"].includes(state.role),
    title =
      state.role === "Student"
        ? "My student profile"
        : state.role === "Parent"
          ? "My children"
          : "Students";
  const scope = family
    ? "Only records linked to your signed-in account are shown."
    : "A complete workspace for student records, contacts and enrollment.";
  const grades = [...new Set(STUDENTS.map((s) => s.grade))].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true }),
  );
  return `<div class="students-hub"><style>
 .students-hub .student-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin:18px 0}.students-hub .student-kpi{padding:18px;border:1px solid var(--line);border-radius:14px;background:var(--surface,var(--white));}.students-hub .student-kpi strong{display:block;font-size:28px;letter-spacing:-1px;margin:7px 0}.students-hub .student-toolbar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:14px}.students-hub .student-toolbar input,.students-hub .student-toolbar select{height:40px;border:1px solid var(--line);border-radius:9px;background:var(--surface,var(--white));color:var(--slate-900);padding:0 11px;max-width:100%}.students-hub .student-toolbar input{flex:1;min-width:220px}.students-hub .student-detail-note{font-size:11px;color:var(--slate-500);margin-top:4px}.students-hub .student-table{min-width:850px}.students-hub .student-name-button{background:none;border:0;text-align:left;color:inherit;padding:0;cursor:pointer}.students-hub .student-summary{padding:12px 0;display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;font-size:12px;color:var(--slate-500)}@media(max-width:650px){.students-hub .student-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.students-hub .student-toolbar input{min-width:0;flex-basis:100%}.students-hub .student-toolbar select{flex:1;min-width:120px}.students-hub .page-head{align-items:flex-start;gap:12px;flex-wrap:wrap}.students-hub .student-kpi{padding:13px}}
 </style><div class="page-head"><div class="ph-l"><h2>${title}</h2><p>${scope}</p></div><div class="ph-r">
 <button class="btn" onclick="exportStudentsCSV()">${ic("download", 16)} Export view</button>
 ${studentManager() ? '<button class="btn" onclick="studentImportForm()">' + ic("upload", 16) + " Import CSV</button>" : ""}
 ${canWrite() ? '<button class="btn primary" onclick="studentAddForm()">' + ic("plus", 16) + " Add student</button>" : ""}</div></div>
 <div class="student-kpis">${[
   ["Records in your view", STUDENTS.length, "Current accessible roster"],
   [
     "Active students",
     STUDENTS.filter((s) => s.status === "Active").length,
     "Currently enrolled",
   ],
   ["Classes & sections", grades.length, "Represented in this roster"],
   [
     state.role === "Accountant" ? "Fees overdue" : "Documents complete",
     state.role === "Accountant"
       ? STUDENTS.filter((s) => s.invoiceRecords && s.fee === "Overdue").length
       : STUDENTS.filter((s) => studentDocumentCount(s) === 3).length,
     state.role === "Accountant"
       ? "Follow up outstanding invoices"
       : "ID, birth certificate and photo",
   ],
 ]
   .map(
     (x) =>
       `<div class="student-kpi"><span class="muted">${x[0]}</span><strong>${x[1]}</strong><span class="muted" style="font-size:11px">${x[2]}</span></div>`,
   )
   .join("")}</div>
 <div class="card pad"><div class="student-toolbar"><input id="stuSearch" aria-label="Search students" placeholder="Search name, admission number or guardian" value="${studentEscape(f.q)}" oninput="studentSetFilter('q',this.value)">
 <select id="stuGrade" aria-label="Filter class" onchange="studentSetFilter('grade',this.value)"><option value="">All classes</option>${studentOptions(grades, f.grade)}</select>
 <select id="stuStatus" aria-label="Filter enrollment status" onchange="studentSetFilter('status',this.value)"><option value="">All enrollment statuses</option>${studentOptions(["Active", "Inactive", "Alumni"], f.status)}</select>
 <select id="stuFee" aria-label="Filter fee status" onchange="studentSetFilter('fee',this.value)"><option value="">All fee statuses</option>${studentOptions(["Paid", "Due", "Overdue", "Not invoiced"], f.fee)}</select>
 ${state.role !== "Accountant" ? `<select aria-label="Filter documents" onchange="studentSetFilter('docs',this.value)"><option value="">All document statuses</option><option value="complete" ${f.docs === "complete" ? "selected" : ""}>Documents complete</option><option value="missing" ${f.docs === "missing" ? "selected" : ""}>Missing documents</option></select>` : ""}
 <select aria-label="Sort students" onchange="studentSetFilter('sort',this.value)">${[
   ["name", "Name A–Z"],
   ["reference", "Admission number"],
   ["grade", "Class"],
   ["attendance", "Attendance low–high"],
 ]
   .map(
     (x) =>
       `<option value="${x[0]}" ${f.sort === x[0] ? "selected" : ""}>${x[1]}</option>`,
   )
   .join("")}</select>
 <button class="btn sm" onclick="studentResetFilters()">Reset</button></div>
 <div class="student-summary"><span id="stuCount" aria-live="polite"></span><label>Rows per page <select aria-label="Students per page" onchange="studentSetFilter('size',this.value)">${[10, 25, 50, 100].map((n) => `<option ${f.size === n ? "selected" : ""}>${n}</option>`).join("")}</select></label></div>
 <div class="tbl-wrap"><table class="tbl student-table"><thead><tr><th>Student</th><th>Class</th><th>Guardian / contact</th><th>Attendance</th><th>Fees</th><th>Enrollment</th>${state.role === "Accountant" ? "" : "<th>Documents</th>"}<th>Profile</th></tr></thead><tbody id="stuBody"></tbody></table></div><div id="stuPager" class="flex ac jb" style="margin-top:16px;gap:10px;flex-wrap:wrap"></div></div></div>`;
};
function filterStudents() {
  const rows = studentFilteredRows(),
    size = studentFilters().size,
    pages = Math.max(1, Math.ceil(rows.length / size));
  state.stuPage = Math.max(1, Math.min(state.stuPage || 1, pages));
  const pg = state.stuPage,
    view = rows.slice((pg - 1) * size, pg * size);
  if (!$("#stuBody")) return;
  $("#stuCount").textContent =
    rows.length + " matching · " + STUDENTS.length + " accessible records";
  $("#stuBody").innerHTML =
    view
      .map(
        (s) =>
          `<tr><td><button class="student-name-button" onclick="openDrawer(studentProfile(${studentEscape(JSON.stringify(s.id))}))">${studentNameCell(s)}</button></td><td>${studentEscape(s.grade)}<div class="student-detail-note">Roll ${studentEscape(s.roll)}</div></td><td>${studentNameHtml(s,"guardian")}<div class="student-detail-note">${studentPhoneHtml(s.phone)}</div></td><td>${'<span class="num">'+studentAttendanceLabel(s)+'</span>'}</td><td>${s.invoiceRecords ? feeBadge(s.fee) : '<span class="badge b-gray">Not invoiced</span>'}</td><td>${statusBadge(s.status)}</td>${state.role === "Accountant" ? "" : `<td>${studentDocumentCount(s)}/3 ${studentDocumentCount(s) === 3 ? "complete" : "uploaded"}</td>`}<td><button class="btn sm" aria-label="${studentEscape("View " + s.name)}" onclick="openDrawer(studentProfile(${studentEscape(JSON.stringify(s.id))}))">View profile</button></td></tr>`,
      )
      .join("") ||
    `<tr><td colspan="8"><div class="empty"><div class="ei">${ic("students", 26)}</div><h3>${STUDENTS.length ? "No matching students" : "No student records in your view"}</h3><p>${STUDENTS.length ? "Adjust your filters or search, then try again." : ["Parent", "Student"].includes(state.role) ? "Ask the school office to link your portal account to the correct student record." : "Add a student or import your existing roster to get started."}</p>${STUDENTS.length ? '<button class="btn" onclick="studentResetFilters()">Clear filters</button>' : ""}</div></td></tr>`;
  $("#stuPager").innerHTML =
    `<span class="muted" style="font-size:12px">${rows.length ? (pg - 1) * size + 1 : 0}–${Math.min(pg * size, rows.length)} of ${rows.length}</span><div class="flex ac" style="gap:8px"><button class="btn sm" ${pg <= 1 ? "disabled" : ""} onclick="stuGoPage(${pg - 1})">Previous</button><span class="muted">Page ${pg} of ${pages}</span><button class="btn sm" ${pg >= pages ? "disabled" : ""} onclick="stuGoPage(${pg + 1})">Next</button></div>`;
  if(typeof localizeView=== "function") ["#stuCount","#stuBody","#stuPager"].forEach(selector=>localizeView($(selector)));
}
function stuGoPage(p) {
  state.stuPage = p;
  filterStudents();
}
function studentEditForm(id) {
  if (!guardWrite("Editing a student")) return;
  const s = STUDENTS.find((x) => x.id === id);
  if (!s) return;
  state._studentEditId = id;
  studentFormDrawer(
    "Edit student",
    s.name + " · " + s.id,
    [
      { label: "Full name", key: "name", req: true, val: s.name },
      {
        label: "Grade & section",
        key: "grade",
        req: true,
        val: s.grade,
        half: true,
      },
      { label: "Roll number", key: "roll", req: true, val: s.roll, half: true },
      {
        label: "Gender",
        key: "gender",
        opts: ["Male", "Female"],
        val: s.gender === "F" ? "Female" : "Male",
        half: true,
      },
      {
        label: "Date of birth",
        key: "dob",
        type: "date",
        val: s.dob,
        half: true,
      },
      {
        label: "Nationality",
        key: "nationality",
        val: s.nationality,
        half: true,
      },
      {
        label: "Guardian name",
        key: "guardian",
        req: true,
        val: s.guardian,
        half: true,
      },
      {
        label: "Guardian relationship",
        key: "relationship",
        opts: ["Father", "Mother", "Guardian", "Other"],
        val: s.relationship || "Guardian",
        half: true,
      },
      {
        label: "Guardian phone",
        key: "phone",
        type: "tel",
        req: true,
        val: s.phone,
        half: true,
      },
      {
        label: "Student’s own email",
        key: "student_email",
        type: "email",
        val: s.studentEmail || "",
        half: true,
      },
      {
        label: "Guardian email",
        key: "email",
        type: "email",
        val: s.email,
        half: true,
      },
      {
        label: "Emergency contact",
        key: "emergency",
        type: "tel",
        val: s.emergency,
        half: true,
      },
      {
        label: "Preferred language",
        key: "pref_language",
        val: s.prefLanguage,
        half: true,
      },
      { label: "Home address", key: "address", area: true, val: s.address },
      {
        label: "Previous school",
        key: "prev_school",
        val: s.previousSchool,
        half: true,
      },
      {
        label: "Previous grade",
        key: "prev_grade",
        val: s.previousGrade,
        half: true,
      },
      { label: "Languages", key: "languages", val: s.languages },
      {
        label: "Blood group",
        key: "blood_group",
        opts: ["Unknown", "A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"],
        val: s.bloodGroup || "Unknown",
        half: true,
      },
      { label: "Allergies", key: "allergies", val: s.allergies },
      {
        label: "Medical notes",
        key: "medical",
        area: true,
        maxlen: 1000,
        val: s.medical,
      },
      {
        label: "Transport required",
        key: "transport",
        opts: ["No", "One-way", "Two-way"],
        val: s.transport || "No",
      },
    ],
    "Save changes",
    "",
    "saveStudentEdit",
  );
}
window.saveStudentEdit = function () {
  closeDrawer();
  toast("Student record updated");
  return false;
};
function guardianMessageForm(id) {
  if (!studentManager()) {
    toast("Guardian messaging is available to school administrators");
    return;
  }
  const s = STUDENTS.find((x) => x.id === id);
  if (!s || !s.email) {
    toast("Guardian email is not recorded");
    return;
  }
  state._studentMessageId = id;
  studentFormDrawer(
    "Message guardian",
    s.name + " · " + s.email,
    [
      { label: "Subject", key: "subject", req: true, maxlen: 160 },
      { label: "Message", key: "message", area: true, req: true, maxlen: 5000 },
    ],
    "Send message",
    "",
    "sendStudentGuardianMessage",
  );
}
window.sendStudentGuardianMessage = function () {
  closeDrawer();
  toast("Message sent to guardian");
  return false;
};
function staffRows(list) {
  return (
    list
      .map(
        (s) =>
          `<tr style="cursor:pointer" onclick="openDrawer(staffProfile('${s.id}'))"><td>${cellUser(s.name, s.id)}</td><td style="font-weight:600;color:var(--slate-900)">${s.role}</td><td>${s.dept}</td><td><span class="badge ${s.type === "Teaching" ? "b-blue" : "b-gray"}"><span class="bd"></span>${s.type}</span></td><td data-i18n-skip="true" class="num">${s.phone}</td><td>${statusBadge(s.status)}</td><td class="right"><span style="color:var(--slate-400)">${ic("arrow", 16)}</span></td></tr>`,
      )
      .join("") ||
    `<tr><td colspan="7"><div class="empty"><div class="ei">${ic("staff", 26)}</div><h3>No staff match</h3><p>Try a different name or department.</p></div></td></tr>`
  );
}
function filterStaff() {
  const q = ($("#stfSearch")?.value || "").toLowerCase(),
    d = $("#stfDept")?.value || "",
    st = $("#stfStatus")?.value || "";
  const rows = STAFF.filter(
    (s) =>
      (s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)) &&
      (!d || s.dept === d) &&
      (!st || s.status === st),
  );
  $("#stfCount").textContent = rows.length + " of " + STAFF.length + " shown";
  $("#stfBody").innerHTML = staffRows(rows);
}

function studentInfoRows(rows,student) {
  return (
    '<div class="card pad" style="box-shadow:none">' +
    rows
      .map(
        (r) =>
          '<div class="lrow" style="justify-content:space-between;gap:16px"><span class="muted">' +
          studentEscape(r[0]) +
          '</span><strong style="text-align:start;max-width:65%;overflow-wrap:anywhere">' +
          (r[0]==='Guardian'&&student?studentNameHtml(student,'guardian'):['Phone','Emergency contact'].includes(r[0])?studentPhoneHtml(r[1]):['Admission number','Email'].includes(r[0])&&r[1]?studentIdentityHtml(r[1]):studentEscape(r[1] || "Not recorded")) +
          "</strong></div>",
      )
      .join("") +
    "</div>"
  );
}
function studentDocumentsHtml(s) {
  return (
    '<p class="muted" style="font-size:12px">Stored securely. PDF, images or Word documents up to 4 MB each. Upload a JPEG, PNG or WebP photo to display it in the profile header.</p>' +
    ["id", "birth", "photo"]
      .map((key) => {
        const d = (s.docs || []).find((d) => d.key === key),
          file = d && d.file;
        return `<div class="card pad" style="margin-top:10px;box-shadow:none"><strong>${studentEscape(d?.label || { id: "Identity document", birth: "Birth certificate", photo: "Student photo" }[key])}</strong><p class="muted" style="font-size:12px">${file ? studentIdentityHtml(file.name) : "No document uploaded"}</p><div class="flex ac" style="gap:8px;flex-wrap:wrap">${file ? `<button class="btn sm" onclick="stuDocView(${studentEscape(JSON.stringify(s.id))},'${key}')">View</button><button class="btn sm" onclick="stuDocDownload(${studentEscape(JSON.stringify(s.id))},'${key}')">Download</button>` : ""}${canWrite() ? `<label class="btn sm">${file ? "Replace" : "Upload"}<input aria-label="Upload ${key}" type="file" accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx" style="display:none" onchange="stuDocPick(this,${studentEscape(JSON.stringify(s.id))},'${key}')"></label>${file ? `<button class="btn sm" onclick="stuDocRemove(${studentEscape(JSON.stringify(s.id))},'${key}')">Remove</button>` : ""}` : ""}</div></div>`;
      })
      .join("")
  );
}
function studentPresent(value) {
  return Boolean(String(value ?? "").trim() && String(value).trim() !== "—");
}
function studentCompleteness(s) {
  const checks = [
    [
      "Class and roll",
      studentPresent(s.grade) && studentPresent(s.roll),
      "academics",
    ],
    [
      "Guardian name and phone",
      studentPresent(s.guardian) && studentPresent(s.phone),
      "guardians",
    ],
    ["Guardian email", studentPresent(s.email), "guardians"],
    ["Home address", studentPresent(s.address), "overview"],
  ];
  if (state.role !== "Accountant")
    checks.push(
      ["Date of birth", studentPresent(s.dob), "overview"],
      ["Emergency contact", studentPresent(s.emergency), "guardians"],
      [
        "Identity document",
        Boolean((s.docs || []).find((d) => d.key === "id" && d.file)),
        "documents",
      ],
      [
        "Birth certificate",
        Boolean((s.docs || []).find((d) => d.key === "birth" && d.file)),
        "documents",
      ],
      [
        "Student photo",
        Boolean((s.docs || []).find((d) => d.key === "photo" && d.file)),
        "documents",
      ],
    );
  if (studentManager())
    checks.push([
      "Parent portal linked",
      Boolean(s.guardianUserId),
      "accounts",
    ]);
  return checks;
}
function studentCompletenessHtml(s) {
  const checks = studentCompleteness(s),
    done = checks.filter((c) => c[1]).length;
  return `<section class="card pad" aria-label="Profile completeness" style="margin-bottom:16px"><strong><span>Profile completeness</span> · <bdi dir="ltr">${done}/${checks.length}</bdi></strong><p class="muted">Recommended record details. Missing information is not a reason to refuse admission.</p><progress aria-label="Completed profile checks" value="${done}" max="${checks.length}" style="width:100%"></progress><div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px">${checks.map(([label, complete, tab]) => `<button class="btn" style="white-space:normal;text-align:left" onclick="${tab === "accounts" ? studentClick("studentAccountsForm", s.id) : studentEscape("studentOpenTab(" + JSON.stringify(s.id) + "," + JSON.stringify(tab) + ")")}"><span aria-hidden="true">${complete ? "✓" : "○"}</span> <span>${label}</span></button>`).join("")}</div>${!canWrite() ? '<p class="muted">Contact school administration to update missing details.</p>' : ""}</section>`;
}
function studentOpenTab(id, tab) {
  state._spTab = tab;
  openDrawer(studentProfile(id));
}
function studentEmergencyHtml(s) {
  if (state.role === "Accountant") return "";
  const phoneLink = (value) =>
    /^\+?[0-9 ]{7,20}$/.test(value || "")
      ? `<a class="btn" href="tel:${studentEscape(value.replace(/ /g, ""))}"><span>Call</span> ${studentPhoneHtml(value)}</a>`
      : '<span class="muted">Not recorded</span>';
  return `<section class="card pad" aria-label="Emergency information" style="border-inline-start:4px solid var(--warning,#d99524);margin-bottom:16px;overflow-wrap:anywhere"><strong>Emergency information</strong><p><span>Guardian</span> · ${studentNameHtml(s,"guardian")} ${phoneLink(s.phone)}</p><p><span>Emergency contact</span> · ${phoneLink(s.emergency)}</p>${studentInfoRows(
    [
      ["Blood group", s.bloodGroup],
      ["Allergies", s.allergies],
      ["Medical notes", s.medical],
    ],
  )}<p class="muted">Blank medical details mean not recorded. Confirm current information with the guardian.</p></section>`;
}
function studentDuplicateCandidates(name, dob, excludeId, rows = STUDENTS) {
  const normalized = (value) =>
    String(value || "")
      .normalize("NFKC")
      .trim()
      .replace(/\s+/g, " ")
      .toLocaleLowerCase();
  if (!normalized(name) || !/^\d{4}-\d{2}-\d{2}$/.test(dob || "")) return [];
  return rows.filter(
    (s) =>
      s.id !== excludeId &&
      normalized(s.name) === normalized(name) &&
      s.dob === dob,
  );
}
function studentConfirmDuplicates(name, dob, excludeId) {
  const matches = studentDuplicateCandidates(name, dob, excludeId);
  return (
    !matches.length ||
    window.confirm(
      "Possible duplicate student: " +
        matches
          .map((s) => s.name + " (" + s.id + ", " + s.grade + ")")
          .join("; ") +
        ". Name and date of birth match. Cancel to check the existing record, or OK to save a separate student. No records will be merged.",
    )
  );
}
function studentProfile(id) {
  const s = STUDENTS.find((x) => x.id === id);
  if (!s) return '<div class="db">Student is no longer available.</div>';
  const accountant = state.role === "Accountant",
    tabs = [
      ["overview", "Overview"],
      ["guardians", "Contacts"],
      ["academics", "Academics"],
      ["attendance", "Attendance"],
      ["fees", "Fees"],
      ...(!accountant ? [["documents", "Documents"]] : []),
      ...(studentManager() ? [["history", "Enrollment history"]] : []),
    ];
  let tab = state._spTab || "overview";
  if (!tabs.some((t) => t[0] === tab)) tab = "overview";
  let body;
  if (tab === "documents") body = studentDocumentsHtml(s);
  else if (tab === "guardians")
    body = studentInfoRows([
      ["Guardian", s.guardian],
      ["Relationship", s.relationship],
      ["Phone", s.phone],
      ["Email", s.email],
      ["Emergency contact", s.emergency],
      ["Preferred language", s.prefLanguage],
      ...(studentManager()
        ? [
            [
              "Parent portal",
              s.guardianUserId
                ? "Linked to an existing Parent account"
                : "Not linked",
            ],
            [
              "Student portal",
              s.studentUserId
                ? "Linked to an existing Student account"
                : "Not linked",
            ],
          ]
        : []),
    ],s);
  else if (tab === "academics")
    body = studentInfoRows([
      ["Class / section", s.grade],
      ["Roll", s.roll],
      ["GPA", s.assessmentResults ? s.gpa : "No assessment results"],
      ["Previous school", s.previousSchool],
      ["Previous grade", s.previousGrade],
      ["Languages", s.languages],
    ]);
  else if (tab === "attendance")
    body = studentInfoRows([
      [
        "Attendance",
        studentAttendanceLabel(s),
      ],
      ["Recorded sessions", s.attendanceRecords || "0"],
    ]);
  else if (tab === "fees")
    body = studentInfoRows([
      ["Fee status", s.invoiceRecords ? s.fee : "No invoices"],
      ["Linked invoices", s.invoiceRecords || "0"],
    ]);
  else if (tab === "history")
    body = (s.enrollmentHistory || []).length
      ? '<div class="card pad">' +
        s.enrollmentHistory
          .slice()
          .reverse()
          .map(
            (e) =>
              '<div class="lrow" style="display:block"><strong>' +
              studentEscape(e.from) +
              " → " +
              studentEscape(e.to) +
              "</strong><p>" +
              studentEscape(e.reason) +
              '</p><span class="muted">Effective ' +
              studentEscape(String(e.effectiveDate).slice(0, 10)) +
              "</span></div>",
          )
          .join("") +
        "</div>"
      : '<div class="empty"><h3>No enrollment changes recorded</h3><p>Changes made through enrollment management appear here with their date and reason.</p></div>';
  else
    body = studentInfoRows([
      ["Admission number", s.id],
      ["Enrollment", s.status],
      [
        "Gender",
        s.gender === "F"
          ? "Female"
          : s.gender === "M"
            ? "Male"
            : "Not recorded",
      ],
      ["Class", s.grade],
      ["Roll", s.roll],
      ...(!accountant
        ? [
            ["Date of birth", s.dob],
            ["Nationality", s.nationality],
          ]
        : []),
      ["Address", s.address],
      ["Transport", s.transport],
    ]);
  const photo =
    !accountant &&
    (s.docs || []).find(
      (d) => d.key === "photo" && d.file && /^image\//.test(d.file.type || ""),
    );
  if (photo && typeof window.studentLoadPhoto === "function")
    setTimeout(() => window.studentLoadPhoto(id), 0);
  const initials = s.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
  return `<div class="dh"><div id="studentProfilePhoto" data-student-id="${studentEscape(id)}" role="img" aria-label="Student photo" style="width:56px;height:56px;flex-shrink:0;border-radius:14px;background:var(--surface2,#edf1f7);display:grid;place-items:center;overflow:hidden;font-weight:700">${studentEscape(initials)}</div><div style="flex:1;min-width:0"><h3 style="overflow-wrap:anywhere">${studentNameHtml(s)}</h3><div class="muted">${studentIdentityHtml(s.id)} · <span>${studentEscape(s.grade)}</span> · <span>${studentEscape(s.status || "Active")}</span></div></div><button class="iconbtn" onclick="closeDrawer()" aria-label="Close student profile">${ic("close", 20)}</button></div><div class="db"><div class="seg" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:16px">${tabs.map((t) => `<button class="${tab === t[0] ? "on" : ""}" onclick="state._spTab='${t[0]}';openDrawer(studentProfile(${studentEscape(JSON.stringify(id))}))">${t[1]}</button>`).join("")}</div>${tab === "overview" ? studentEmergencyHtml(s) + studentCompletenessHtml(s) : ""}${body}<div class="df" style="gap:8px;flex-wrap:wrap;margin-top:18px">${canWrite() ? `<button class="btn primary" onclick="${studentClick("studentEditForm", id)}">Edit record</button>` : ""}${studentManager() ? `<button class="btn" onclick="${studentClick("studentEnrollmentForm", id)}">Manage enrollment</button><button class="btn" onclick="${studentClick("studentAccountsForm", id)}">Portal links</button><button class="btn" onclick="${studentClick("guardianMessageForm", id)}">Message guardian</button>` : ""}</div></div>`;
}
function studentEnrollmentForm(id) {
  if (!studentManager()) return;
  const s = STUDENTS.find((s) => s.id === id);
  state._studentManageId = id;
  studentFormDrawer(
    "Manage enrollment",
    s.name + " · Current status: " + s.status,
    [
      {
        label: "New status",
        key: "status",
        opts: ["Active", "Inactive", "Alumni"],
        val: s.status,
      },
      {
        label: "Effective date",
        key: "effectiveDate",
        type: "date",
        req: true,
        val: new Date().toISOString().slice(0, 10),
      },
      { label: "Reason", key: "reason", area: true, req: true, maxlen: 500 },
    ],
    "Save enrollment change",
    "",
    "saveStudentEnrollment",
  );
}
function studentAccountsForm(id) {
  if (!studentManager()) return;
  const s = STUDENTS.find((s) => s.id === id);
  state._studentManageId = id;
  studentFormDrawer(
    "Portal account links",
    "Link existing active accounts. This does not create accounts or send invitations.",
    [
      {
        label: "Parent action",
        key: "parent_action",
        opts: ["Leave unchanged", "Link existing account", "Remove link"],
      },
      { label: "Parent account email", key: "parent_email", type: "email" },
      {
        label: "Student action",
        key: "student_action",
        opts: ["Leave unchanged", "Link existing account", "Remove link"],
      },
      { label: "Student account email", key: "student_email", type: "email" },
    ],
    "Save portal links",
    "",
    "saveStudentAccounts",
  );
}
function studentManagedSave(path, payload) {
  const s = STUDENTS.find((s) => s.id === state._studentManageId),
    a = window.SCHOOLOS_ADAPTER;
  if (!studentManager() || !s?.mongoId || !a) {
    toast("Student is not available");
    return false;
  }
  const id = s.id;
  a.api("/students/" + s.mongoId + path, {
    method: "PATCH",
    body: JSON.stringify(payload),
  })
    .then(() => a.hydrate())
    .then(() => {
      render();
      openDrawer(studentProfile(id));
      toast("Student record saved");
    })
    .catch((e) => toast("Not saved — " + e.message));
  return false;
}
window.saveStudentEnrollment = (v) =>
  studentManagedSave("/enrollment", {
    status: v.status,
    reason: v.reason,
    effectiveDate: v.effectiveDate,
  });
window.saveStudentAccounts = function (v) {
  const payload = {};
  for (const key of ["parent", "student"]) {
    if (v[key + "_action"] === "Remove link") payload[key + "Email"] = null;
    else if (v[key + "_action"] === "Link existing account") {
      if (!(v[key + "_email"] || "").trim()) {
        toast("Enter the " + key + " account email");
        return false;
      }
      payload[key + "Email"] = v[key + "_email"].trim();
    }
  }
  if (!Object.keys(payload).length) {
    toast("Choose an account action");
    return false;
  }
  return studentManagedSave("/accounts", payload);
};
function studentDownloadCSV(filename, rows) {
  const cell = (v) => {
    let t = String(v ?? "");
    if (/^[=+@\-\t\r]/.test(t)) t = "'" + t;
    return '"' + t.replace(/"/g, '""') + '"';
  };
  const url = URL.createObjectURL(
    new Blob(["\uFEFF" + rows.map((r) => r.map(cell).join(",")).join("\r\n")], {
      type: "text/csv;charset=utf-8",
    }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
window.exportStudentsCSV = function () {
  const rows = studentFilteredRows();
  studentDownloadCSV("Students.csv", [
    [
      "Admission number",
      "Name",
      "Class",
      "Roll",
      "Guardian",
      "Phone",
      "Attendance",
      "Fee status",
      "Enrollment",
    ],
    ...rows.map((s) => [
      s.id,
      s.name,
      s.grade,
      s.roll,
      s.guardian,
      s.phone,
      studentAttendanceLabel(s),
      s.invoiceRecords ? s.fee : "Not invoiced",
      s.status,
    ]),
  ]);
  toast("Exported " + rows.length + " matching records");
};
const STUDENT_CSV_COLUMNS = [
  "refId",
  "name",
  "grade",
  "gender",
  "roll",
  "guardianName",
  "phone",
  "guardianEmail",
  "dateOfBirth",
  "emergencyContact",
  "address",
  "status",
];
function studentCSVParse(text) {
  const rows = [];
  let row = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (quoted || cell === "") quoted = !quoted;
      else throw Error("Unexpected quote in CSV");
    } else if (c === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((v) => v.trim())) rows.push(row);
      row = [];
      cell = "";
    } else cell += c;
  }
  if (quoted) throw Error("Unclosed quoted value");
  row.push(cell);
  if (row.some((v) => v.trim())) rows.push(row);
  if (!rows.length) throw Error("CSV is empty");
  const headers = rows.shift().map((v) => v.replace(/^\uFEFF/, "").trim());
  if (new Set(headers).size !== headers.length)
    throw Error("Duplicate CSV columns");
  for (const key of STUDENT_CSV_COLUMNS.slice(0, 7))
    if (!headers.includes(key)) throw Error("Missing column: " + key);
  if (headers.some((h) => !STUDENT_CSV_COLUMNS.includes(h)))
    throw Error("Use the downloadable template columns");
  if (rows.length > 200) throw Error("Import up to 200 students at a time");
  return rows.map((r, i) => {
    if (r.length !== headers.length)
      throw Error("Row " + (i + 2) + " has an unexpected number of columns");
    return Object.fromEntries(
      headers.flatMap((h, j) => (r[j].trim() ? [[h, r[j].trim()]] : [])),
    );
  });
}
function studentCSVValidate(rows) {
  const errors = [],
    refs = new Set();
  rows.forEach((r, i) => {
    const label = "Row " + (i + 2) + ": ";
    for (const [key, min, max] of [
      ["refId", 1, 30],
      ["name", 2, 120],
      ["grade", 1, 60],
      ["roll", 1, 20],
      ["guardianName", 2, 120],
    ])
      if (!r[key] || r[key].length < min || r[key].length > max)
        errors.push(label + "check " + key);
    if (!["Male", "Female"].includes(r.gender))
      errors.push(label + "gender must be Male or Female");
    if (!/^\+?[0-9 ]{7,20}$/.test(r.phone || ""))
      errors.push(label + "invalid phone");
    if (r.emergencyContact && !/^\+?[0-9 ]{7,20}$/.test(r.emergencyContact))
      errors.push(label + "invalid emergency contact");
    if (r.guardianEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.guardianEmail))
      errors.push(label + "invalid guardian email");
    if (r.status && !["Active", "Inactive", "Alumni"].includes(r.status))
      errors.push(label + "invalid status");
    if (
      r.dateOfBirth &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(r.dateOfBirth) ||
        Number.isNaN(Date.parse(r.dateOfBirth)) ||
        new Date(r.dateOfBirth) > new Date())
    )
      errors.push(label + "invalid date of birth");
    const ref = (r.refId || "").toUpperCase();
    if (
      refs.has(ref) ||
      STUDENTS.some((s) => String(s.id).toUpperCase() === ref)
    )
      errors.push(label + "duplicate admission number " + ref);
    refs.add(ref);
  });
  return errors;
}
function studentImportForm() {
  if (!studentManager()) return;
  state._studentImportRows = null;
  openDrawer(
    `<div class="dh"><h3>Import students</h3><button class="iconbtn" onclick="closeDrawer()" aria-label="Close import">${ic("close", 20)}</button></div><div class="db"><p class="muted">Upload a UTF-8 CSV exported from your spreadsheet. Up to 200 students. Admission numbers must be unique; no existing record is overwritten. Gender: Male or Female. Dates: YYYY-MM-DD. Status: Active, Inactive or Alumni.</p><button class="btn" onclick="studentDownloadCSV('Student_import_template.csv',[STUDENT_CSV_COLUMNS])">Download template</button><p><label>Choose CSV <input aria-label="Student CSV file" type="file" accept=".csv,text/csv" onchange="studentImportPreview(this)"></label></p><div id="studentImportPreview" aria-live="polite"></div></div>`,
  );
}
window.studentImportPreview = async function (input) {
  const target = $("#studentImportPreview");
  try {
    const file = input.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) throw Error("CSV must be smaller than 1 MB");
    const rows = studentCSVParse(await file.text());
    if (!rows.length) throw Error("CSV has no student rows");
    const errors = studentCSVValidate(rows);
    if (errors.length)
      throw Error(
        errors.slice(0, 10).join(" · ") +
          (errors.length > 10
            ? " · and " + (errors.length - 10) + " more errors"
            : ""),
      );
    const duplicateWarnings = rows.flatMap((r, i) => {
      const previous = rows
        .slice(0, i)
        .map((p) => ({
          id: p.refId,
          name: p.name,
          dob: p.dateOfBirth,
          grade: p.grade,
        }));
      const matches = studentDuplicateCandidates(
        r.name,
        r.dateOfBirth,
        null,
        STUDENTS.concat(previous),
      );
      return matches.length
        ? [r.refId + " matches " + matches.map((s) => s.id).join(", ")]
        : [];
    });
    state._studentImportWarnings = duplicateWarnings;
    state._studentImportRows = rows;
    target.innerHTML = `<h4>${rows.length} students ready for server validation</h4>${duplicateWarnings.length ? `<p role="alert">Possible duplicate people (same name and birth date): ${studentEscape(duplicateWarnings.join("; "))}. Review these records before confirming.</p>` : ""}<p class="muted">Nothing has been saved yet. The complete import is rejected if any row is invalid or duplicated.</p><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Admission</th><th>Name</th><th>Class</th></tr></thead><tbody>${rows
      .slice(0, 10)
      .map(
        (r) =>
          `<tr><td data-i18n-skip="true">${studentEscape(r.refId)}</td><td>${studentEscape(r.name)}</td><td>${studentEscape(r.grade)}</td></tr>`,
      )
      .join(
        "",
      )}</tbody></table></div><button id="studentImportConfirm" class="btn primary" onclick="studentImportConfirm()">Import ${rows.length} students</button>`;
  } catch (e) {
    state._studentImportRows = null;
    target.textContent = e.message;
  }
};
window.studentImportConfirm = async function () {
  if (!studentManager() || !state._studentImportRows) return;
  if (
    (state._studentImportWarnings || []).length &&
    !window.confirm(
      "Possible duplicate students: " +
        state._studentImportWarnings.join("; ") +
        ". Cancel to review, or OK to import separate records. No records will be merged.",
    )
  )
    return;
  const button = $("#studentImportConfirm");
  button.disabled = true;
  try {
    const res = await SCHOOLOS_ADAPTER.api("/students/import", {
      method: "POST",
      body: JSON.stringify({ students: state._studentImportRows }),
    });
    state._studentImportRows = null;
    await SCHOOLOS_ADAPTER.hydrate();
    closeDrawer();
    render();
    toast("Imported " + res.data.count + " students");
  } catch (e) {
    button.disabled = false;
    toast("Import rejected — " + e.message);
  }
};

function studentAttendanceLabel(s){return !s.attendanceRecords?'Not recorded':(s.attendanceEligibleRecords??s.attendanceRecords)===0?'Excused only':s.att+'%'}
