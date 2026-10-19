/* Staff workspace: real directory, HR documents, self-service and approved leave. */
let LEAVE = [];
function staffWorkspaceOffice() {
  return ["Administrator", "Principal"].includes(state.role);
}
function staffWorkspaceRole() {
  return ["Administrator", "Principal", "Teacher", "Accountant"].includes(
    state.role,
  );
}
function staffWorkspaceState() {
  const id = commUserId();
  if (state.staffWorkspace?.userId !== id)
    state.staffWorkspace = {
      userId: id,
      rows: [],
      leave: [],
      attendance: [],
      loaded: false,
      loading: false,
      error: "",
      tab: "Directory",
      q: "",
      department: "All",
      status: "All",
      page: 1,
    };
  return state.staffWorkspace;
}
window.staffWorkspaceLoad = async function () {
  const s = staffWorkspaceState();
  if (s.loading) return;
  s.loading = true;
  s.error = "";
  try {
    const [rows, leave, attendance] = await Promise.all([
      SCHOOLOS_ADAPTER.apiAll("/staff"),
      SCHOOLOS_ADAPTER.apiAll("/leave"),
      staffWorkspaceRole()
        ? SCHOOLOS_ADAPTER.api("/attendance/staff?date=" + healthDay())
        : Promise.resolve({ data: [] }),
    ]);
    s.rows = rows.data || [];
    s.leave = leave.data || [];
    s.attendance = attendance.data || [];
    s.loaded = true;
  } catch (e) {
    s.error = e.message;
  } finally {
    s.loading = false;
    if (state.module === "staff") render();
  }
};
function staffWorkspaceFiltered() {
  const s = staffWorkspaceState();
  return s.rows.filter(
    (r) =>
      (s.department === "All" || r.department === s.department) &&
      (s.status === "All" || r.status === s.status) &&
      (s.tab !== "Onboarding" || r.status === "Onboarding") &&
      (!s.q ||
        [r.name, r.refId, r.email, r.designation,studentSearchName(r,"name"),typeof schoolTranslateText==="function"?schoolTranslateText(r.designation):r.designation]
          .join(" ")
          .toLowerCase()
          .includes(s.q.toLowerCase())),
  );
}
window.staffWorkspaceSearch = function (q) {
  staffWorkspaceState().q = q;
  staffWorkspaceState().page = 1;
  render();
  const el = document.getElementById("staffWorkspaceSearch");
  if (el) {
    el.focus();
    el.setSelectionRange(q.length, q.length);
  }
};
M.staff = () => {
  const s = staffWorkspaceState();
  if (!s.loaded && !s.loading && !s.error) setTimeout(staffWorkspaceLoad, 0);
  const today = healthDay(),
    rows = staffWorkspaceFiltered(),
    pages = Math.max(1, Math.ceil(rows.length / 15));
  s.page = Math.min(s.page, pages);
  const value = (v) => (s.loaded ? String(v) : "—");
  return `<div class="page-head"><div class="ph-l"><h2>Staff & HR</h2><p>${staffWorkspaceOffice() ? "Employee directory, onboarding and recorded leave decisions." : state.role === "Accountant" ? "Staff directory for payroll and your own leave requests." : "Your linked staff profile and leave requests."}</p></div><div class="ph-r">${staffWorkspaceOffice() ? '<button class="btn" onclick="staffWorkspaceExport()">Export filtered directory</button><button class="btn primary" onclick="staffWorkspaceForm()">Add employee</button>' : ""}</div></div><div class="grid cols-4" style="margin-bottom:16px">${kpi("staff", "#17A24A", "Visible employees", value(s.rows.length), null)}${kpi("att", "#2563EB", "Recorded attendance today", value(s.attendance.length), null)}${kpi("cal", "#E2920C", "Approved leave today", value(s.leave.filter((r) => r.status === "Approved" && r.fromDate.slice(0, 10) <= today && r.toDate.slice(0, 10) >= today).length), null)}${kpi("roles", "#0E7C39", "Pending leave requests", value(s.leave.filter((r) => r.status === "Pending").length), null)}</div><div class="flex" style="gap:8px;margin-bottom:16px">${["Directory", ...(staffWorkspaceOffice() ? ["Onboarding"] : []), "Leave & attendance"].map((t) => `<button class="btn ${s.tab === t ? "primary" : ""}" onclick="staffWorkspaceState().tab='${t}';staffWorkspaceState().page=1;render()">${t}</button>`).join("")}</div>${s.error ? `<p role="alert">${studentEscape(s.error)}</p><button class="btn" onclick="staffWorkspaceLoad()">Retry</button>` : s.loading ? "<p>Loading staff records…</p>" : ""}${
    s.tab === "Leave & attendance"
      ? staffWorkspaceLeaveView()
      : `<div class="card pad"><div class="flex" style="gap:12px;flex-wrap:wrap;margin-bottom:14px"><div class="field" style="flex:1;min-width:180px"><input id="staffWorkspaceSearch" aria-label="Search staff" placeholder="Search employee, reference or email" value="${studentEscape(s.q)}" oninput="staffWorkspaceSearch(this.value)"></div><div class="field sel"><select aria-label="Staff department" onchange="staffWorkspaceState().department=this.value;render()">${["All", ...new Set(s.rows.map((r) => r.department))].map((v) => `<option ${s.department === v ? "selected" : ""}>${studentEscape(v)}</option>`).join("")}</select></div><div class="field sel"><select aria-label="Staff status" onchange="staffWorkspaceState().status=this.value;render()">${["All", "Active", "Onboarding", "On Leave", "Inactive"].map((v) => `<option ${s.status === v ? "selected" : ""}>${v}</option>`).join("")}</select></div><button class="btn" onclick="staffWorkspaceLoad()">Refresh</button></div><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Employee</th><th>Designation</th><th>Department</th><th>Contact</th><th>Status</th><th></th></tr></thead><tbody>${
          rows
            .slice((s.page - 1) * 15, s.page * 15)
            .map(
              (r) =>
                `<tr><td>${studentNameCell({...r,id:r.refId})}</td><td>${studentEscape(r.designation)}</td><td>${studentEscape(r.department)}</td><td>${studentIdentityHtml(r.email)}<br><small>${studentPhoneHtml(r.phone)}</small></td><td>${chip(r.status, r.status === "Active" ? "green" : r.status === "Inactive" ? "gray" : "amber")}</td><td><button class="btn sm" onclick="${studentClick("staffWorkspaceDetail", r._id)}">View profile</button></td></tr>`,
            )
            .join("") ||
          '<tr><td colspan="6">No employees match this view.</td></tr>'
        }</tbody></table></div><div class="flex ac jb"><button class="btn" ${s.page <= 1 ? "disabled" : ""} onclick="staffWorkspaceState().page--;render()">Previous</button><span>${rows.length} employees · Page ${s.page} / ${pages}</span><button class="btn" ${s.page >= pages ? "disabled" : ""} onclick="staffWorkspaceState().page++;render()">Next</button></div></div>`
  }`;
};
window.staffWorkspaceForm = function (id) {
  if (!staffWorkspaceOffice()) return;
  const s = staffWorkspaceState(),
    r = id ? s.rows.find((r) => r._id === id) : null;
  s.edit = r ? { id, version: r.updatedAt } : null;
  studentFormDrawer(
    r ? "Edit employee" : "Add employee",
    "Office-managed profile. Existing active staff-role accounts may link by matching email; other roles do not.",
    [
      {
        key: "refId",
        label: "Employee reference",
        val: r?.refId || "",
        req: true,
      },
      { key: "name", label: "Full name", val: r?.name || "", req: true },
      {
        key: "designation",
        label: "Designation",
        val: r?.designation || "",
        req: true,
      },
      {
        key: "department",
        label: "Department",
        val: r?.department || "",
        req: true,
      },
      {
        key: "type",
        label: "Staff type",
        opts: ["Teaching", "Non-Teaching"],
        val: r?.type || "Teaching",
      },
      {
        key: "status",
        label: "Employment status",
        opts: ["Onboarding", "Active", "On Leave", "Inactive"],
        val: r?.status || "Onboarding",
      },
      {
        key: "email",
        label: "Email",
        type: "email",
        val: r?.email || "",
        req: true,
      },
      { key: "phone", label: "Phone", val: r?.phone || "", req: true },
      {
        key: "joinedDate",
        label: "Joining date",
        type: "date",
        val: r?.joinedDate?.slice(0, 10) || healthDay(),
        req: true,
      },
      {
        key: "annualLeaveRemaining",
        label: "Annual leave remaining (calendar days)",
        type: "number",
        val: String(r?.annualLeaveRemaining ?? 30),
      },
      ...(r
        ? [
            {
              key: "changeReason",
              label: "Change reason",
              area: true,
              req: true,
              maxlen: 500,
            },
          ]
        : []),
    ],
    "Save employee",
    "",
    "staffWorkspaceSave",
  );
};
window.staffWorkspaceSave = async function (v) {
  const s = staffWorkspaceState();
  if (s.saving) return false;
  if (
    !v.refId ||
    !v.name ||
    !v.email ||
    !v.phone ||
    !v.designation ||
    !v.department ||
    !v.joinedDate
  )
    return toast("Complete the required employee fields");
  if (s.edit && (!v.changeReason || v.changeReason.length < 3))
    return toast("Enter a clear change reason");
  s.saving = true;
  try {
    await SCHOOLOS_ADAPTER.api("/staff" + (s.edit ? "/" + s.edit.id : ""), {
      method: s.edit ? "PATCH" : "POST",
      body: JSON.stringify({
        ...v,
        annualLeaveRemaining: Number(v.annualLeaveRemaining),
        ...(s.edit ? { expectedUpdatedAt: s.edit.version } : {}),
      }),
    });
    closeDrawer();
    await staffWorkspaceLoad();
    await SCHOOLOS_ADAPTER.hydrate();
    toast("Employee saved");
  } catch (e) {
    toast(e.message);
  } finally {
    s.saving = false;
  }
};
window.staffWorkspaceDetail = function (id) {
  const s = staffWorkspaceState(),
    r = s.rows.find((r) => r._id === id);
  if (!r) return;
  const owns = (r.userId?._id || r.userId) === commUserId(),
    docs = staffWorkspaceOffice() || owns;
  const safe = (rows) => rows.map(([k, v]) => [k, k==="Phone"?studentPhoneHtml(v):k==="Email"?studentIdentityHtml(v):studentEscape(v ?? "—")]);
  openDrawer(
    detailDrawer({
      recordTitle:true,title:studentNameHtml(r),color:avc(r.name),badge:studentEscape(initials(r.name)),
      sub: studentIdentityHtml(r.refId) + " · <span>" + studentEscape(r.designation) + "</span>",
      sections: [
        {
          h: "Employee profile",
          rows: safe([
            ["Department", r.department],
            ["Employment status", r.status],
            ["Email", r.email],
            ["Phone", r.phone],
            ["Joined", r.joinedDate?.slice(0, 10)],
            [
              "Annual leave remaining",
              r.annualLeaveRemaining + " calendar days",
            ],
            ["Portal account", r.userId ? "Linked" : "Not linked"],
          ]),
        },
        ...(docs
          ? [
              {
                h: "Uploaded documents",
                html: `${(r.documents || []).map((d) => `<div class="lrow"><span>${studentEscape(d.label)}<br><small>${studentIdentityHtml(d.filename)}</small></span><button class="btn sm" onclick="staffWorkspaceDocument('${r._id}','${d.key}',true)">View</button><button class="btn sm" onclick="staffWorkspaceDocument('${r._id}','${d.key}',false)">Download</button>${staffWorkspaceOffice() ? `<button class="btn sm" onclick="staffWorkspaceRemoveDocument('${r._id}','${d.key}')">Remove</button>` : ""}</div>`).join("") || "<p>No documents uploaded.</p>"}${staffWorkspaceOffice() ? `<p><select id="staffWorkspaceDocumentKey" aria-label="Staff document type">${Object.entries({id:"Identity document",degree:"Degree certificate",photo:"Employee photo",experience:"Experience certificate",visa:"Visa",attestation:"Attestation"}).map(([key,label]) => `<option value="${key}">${label}</option>`).join("")}</select><label class="btn">Upload document<input aria-label="Upload staff document" type="file" style="display:none" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" onchange="staffWorkspaceUpload('${r._id}',this)"></label></p>` : ""}`,
              },
              {
                h: "Joining checklist",
                html:
                  (r.onboarding || [])
                    .map(
                      (t) =>
                        `<div class="lrow"><span><span>${studentEscape(t.label)}</span> · <span>${t.done ? "Completed" : "Pending"}</span></span>${staffWorkspaceOffice() && r.status === "Onboarding" ? `<button class="btn sm" onclick="staffWorkspaceToggle('${r._id}','${t.key}')">${t.done ? "Reopen" : "Complete"}</button>` : ""}</div>`,
                    )
                    .join("") || "<p>No checklist available.</p>",
              },
              {
                h: "Profile history",
                html:
                  (r.profileHistory || [])
                    .map(
                      (x) =>
                        `<div class="card pad"><strong>${studentEscape(commDate(x.changedAt))}</strong><p>${studentEscape(x.fromStatus)} → ${studentEscape(x.toStatus)}</p><p>${studentEscape(x.reason)}</p></div>`,
                    )
                    .join("") || "<p>No profile changes recorded.</p>",
              },
            ]
          : []),
      ],
      footer: staffWorkspaceOffice()
        ? [
            ["Edit employee", studentClick("staffWorkspaceForm", id), true],
            [
              "Link / unlink account",
              studentClick("staffWorkspaceAccountForm", id),
            ],
          ]
        : [],
    }),
  );
};
window.staffWorkspaceAccountForm = function (id) {
  const r = staffWorkspaceState().rows.find((r) => r._id === id);
  if (!r || !staffWorkspaceOffice()) return;
  staffWorkspaceState().edit = { id, version: r.updatedAt };
  studentFormDrawer(
    "Staff account link",
    "Use an existing active Administrator, Principal, Teacher or Accountant account. Clear email to unlink.",
    [
      { key: "email", label: "Account email", type: "email" },
      {
        key: "reason",
        label: "Link change reason",
        area: true,
        req: true,
        maxlen: 500,
      },
    ],
    "Save account link",
    "",
    "staffWorkspaceAccountSave",
  );
};
window.staffWorkspaceAccountSave = async function (v) {
  const s = staffWorkspaceState();
  if (s.saving) return false;
  if (v.reason.length < 3) return toast("Enter a clear reason");
  s.saving = true;
  try {
    await SCHOOLOS_ADAPTER.api("/staff/" + s.edit.id + "/account", {
      method: "PATCH",
      body: JSON.stringify({
        email: v.email || null,
        reason: v.reason,
        expectedUpdatedAt: s.edit.version,
      }),
    });
    closeDrawer();
    await staffWorkspaceLoad();
    toast("Account link saved");
  } catch (e) {
    toast(e.message);
  } finally {
    s.saving = false;
  }
};
window.staffWorkspaceUpload = async function (id, input) {
  const file = input.files?.[0],
    s = staffWorkspaceState();
  if (!file || s.saving) return;
  if (file.size > 4 * 1024 * 1024)
    return toast("Maximum document size is 4 MB");
  const key = document.getElementById("staffWorkspaceDocumentKey").value;
  s.saving = true;
  try {
    await SCHOOLOS_ADAPTER.api("/staff/" + id + "/documents/" + key, {
      method: "PUT",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
        "X-File-Name": encodeURIComponent(file.name),
      },
      body: await file.arrayBuffer(),
    });
    await staffWorkspaceLoad();
    staffWorkspaceDetail(id);
    toast("Document saved");
  } catch (e) {
    toast(e.message);
  } finally {
    s.saving = false;
    input.value = "";
  }
};
window.staffWorkspaceDocument = async function (id, key, view) {
  const record = staffWorkspaceState().rows.find((r) => r._id === id),
    doc = record?.documents.find((d) => d.key === key);
  if (!doc) return;
  let popup = view ? window.open("about:blank", "_blank") : null;
  try {
    const blob = await SCHOOLOS_ADAPTER.apiBlob(
        "/staff/" + id + "/documents/" + key,
      ),
      url = URL.createObjectURL(blob);
    if (
      view &&
      ["application/pdf", "image/png", "image/jpeg", "image/webp"].includes(
        blob.type,
      ) &&
      popup
    ) {
      popup.opener = null;
      popup.location.href = url;
    } else {
      popup?.close();
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
    }
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (e) {
    popup?.close();
    toast(e.message);
  }
};
window.staffWorkspaceRemoveDocument = async function (id, key) {
  if (!confirm("Remove this uploaded HR document?")) return;
  try {
    await SCHOOLOS_ADAPTER.api("/staff/" + id + "/documents/" + key, {
      method: "DELETE",
    });
    await staffWorkspaceLoad();
    staffWorkspaceDetail(id);
  } catch (e) {
    toast(e.message);
  }
};
window.staffWorkspaceToggle = async function (id, key) {
  try {
    await SCHOOLOS_ADAPTER.api(
      "/staff/" + id + "/onboarding/" + key + "/toggle",
      { method: "POST" },
    );
    await staffWorkspaceLoad();
    staffWorkspaceDetail(id);
  } catch (e) {
    toast(e.message);
  }
};
window.staffWorkspaceExport = function () {
  if (!staffWorkspaceOffice()) return;
  studentDownloadCSV("Staff_directory.csv", [
    [
      "Reference",
      "Employee",
      "Designation",
      "Department",
      "Status",
      "Email",
      "Phone",
      "Joined",
      "Annual leave remaining",
    ],
    ...staffWorkspaceFiltered().map((r) => [
      r.refId,
      r.name,
      r.designation,
      r.department,
      r.status,
      r.email,
      r.phone,
      r.joinedDate?.slice(0, 10),
      r.annualLeaveRemaining,
    ]),
  ]);
};
function staffWorkspaceLeaveView() {
  const s = staffWorkspaceState(),
    own = s.rows.find((r) => (r.userId?._id || r.userId) === commUserId());
  return `<div class="card pad"><div class="flex ac jb"><h3>Leave & attendance</h3>${staffWorkspaceRole() && (own || staffWorkspaceOffice()) ? '<button class="btn primary" onclick="staffWorkspaceLeaveForm()">Apply for leave</button>' : ""}</div><p class="muted">Leave counts calendar days, including weekends. Annual leave changes the stored annual balance; other types have no automatic balance deduction.</p>${own ? `<p>Your annual leave remaining: <strong>${own.annualLeaveRemaining}</strong> days</p>` : ""}${staffWorkspaceRole() ? `<p>Your attendance today: ${studentEscape(s.attendance.find((r) => (r.user?._id || r.user) === commUserId())?.status || "Not recorded")} <button class="btn sm" onclick="staffWorkspaceMarkAttendance()">Mark my attendance</button></p>` : ""}<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Employee</th><th>Type</th><th>Dates</th><th>Days</th><th>Status</th><th></th></tr></thead><tbody>${s.leave.map((r) => `<tr><td>${r.staff?.name?studentNameHtml(r.staff):"Employee"}</td><td>${studentEscape(r.type || "Annual leave")}</td><td>${r.fromDate.slice(0, 10)} → ${r.toDate.slice(0, 10)}</td><td>${r.days}</td><td>${chip(r.status, r.status === "Approved" ? "green" : r.status === "Denied" ? "red" : "amber")}</td><td><button class="btn sm" onclick="${studentClick("staffWorkspaceLeaveDetail", r._id)}">View</button>${staffWorkspaceOffice() && r.status === "Pending" ? `<button class="btn sm" onclick="staffWorkspaceLeaveReview('${r._id}','Denied')">Deny</button><button class="btn sm primary" onclick="staffWorkspaceLeaveReview('${r._id}','Approved')">Approve</button>` : ""}${r.status === "Pending" || (r.status === "Approved" && staffWorkspaceOffice()) ? `<button class="btn sm" onclick="${studentClick("staffWorkspaceLeaveCancelForm", r._id)}">Cancel</button>` : ""}</td></tr>`).join("") || '<tr><td colspan="6">No leave requests in this view.</td></tr>'}</tbody></table></div></div>`;
}
window.staffWorkspaceLeaveForm = function () {
  const s = staffWorkspaceState();
  s.choices = s.rows
    .filter(
      (r) =>
        r.status !== "Inactive" &&
        (staffWorkspaceOffice() ||
          (r.userId?._id || r.userId) === commUserId()),
    )
    .map((r) => ({ label: r.refId + " — " + r.name, id: r._id }));
  studentFormDrawer(
    "Apply for leave",
    "Stored calendar-day request. Office approval is required.",
    [
      {
        key: "employee",
        label: "Employee",
        opts: s.choices.map((r) => r.label),
        req: true,
      },
      {
        key: "type",
        label: "Leave type",
        opts: ["Annual leave", "Sick leave", "Casual leave", "Unpaid leave"],
      },
      { key: "fromDate", label: "From date", type: "date", req: true },
      { key: "toDate", label: "To date", type: "date", req: true },
      { key: "reason", label: "Reason", area: true, req: true, maxlen: 500 },
    ],
    "Submit request",
    "",
    "staffWorkspaceLeaveSave",
  );
};
window.staffWorkspaceLeaveSave = async function (v) {
  const s = staffWorkspaceState(),
    employee = s.choices.find((r) => r.label === v.employee);
  if (s.saving) return false;
  if (!employee || !v.fromDate || !v.toDate || v.reason.length < 3)
    return toast("Employee, dates and a clear reason are required");
  s.saving = true;
  try {
    await SCHOOLOS_ADAPTER.api("/leave", {
      method: "POST",
      body: JSON.stringify({
        staffId: employee.id,
        type: v.type,
        fromDate: v.fromDate,
        toDate: v.toDate,
        reason: v.reason,
      }),
    });
    closeDrawer();
    await staffWorkspaceLoad();
    toast("Leave requested");
  } catch (e) {
    toast(e.message);
  } finally {
    s.saving = false;
  }
};
window.staffWorkspaceLeaveDetail = function (id) {
  const r = staffWorkspaceState().leave.find((r) => r._id === id);
  if (!r) return;
  openDrawer(
    detailDrawer({
      recordTitle:true,personTitle:true,title:studentEscape(r.staff?.name || "Leave request"),
      sub: studentEscape(r.type || "Annual leave"),
      sections: [
        {
          h: "Request",
          rows: [
            ["Dates", r.fromDate.slice(0, 10) + " → " + r.toDate.slice(0, 10)],
            ["Days", r.days],
            ["Status", studentEscape(r.status)],
            ["Reason", studentEscape(r.reason)],
            ["Office note", studentEscape(r.decisionNote || "—")],
          ],
        },
        {
          h: "Decision history",
          html:
            (r.history || [])
              .map(
                (x) =>
                  `<p>${studentEscape(commDate(x.at))} · ${studentEscape(x.from)} → ${studentEscape(x.to)}<br>${studentEscape(x.reason)}</p>`,
              )
              .join("") || "<p>No decisions recorded.</p>",
        },
      ],
    }),
  );
};
window.staffWorkspaceLeaveReview = function (id, decision) {
  staffWorkspaceState().leaveEdit = { id, decision };
  studentFormDrawer(
    "Review leave request",
    "Annual approval deducts balance once; your own leave requires another office approver.",
    [{ key: "note", label: "Office decision note", area: true, maxlen: 500 }],
    "Confirm " + decision.toLowerCase(),
    "",
    "staffWorkspaceLeaveDecision",
  );
};
window.staffWorkspaceLeaveDecision = async function (v) {
  const s = staffWorkspaceState();
  if (s.saving) return false;
  s.saving = true;
  try {
    await SCHOOLOS_ADAPTER.api("/leave/" + s.leaveEdit.id + "/decide", {
      method: "POST",
      body: JSON.stringify({ decision: s.leaveEdit.decision, note: v.note }),
    });
    closeDrawer();
    await staffWorkspaceLoad();
    toast("Leave decision saved");
  } catch (e) {
    toast(e.message);
  } finally {
    s.saving = false;
  }
};
window.staffWorkspaceLeaveCancelForm = function (id) {
  staffWorkspaceState().leaveEdit = { id };
  studentFormDrawer(
    "Cancel leave",
    "Approved annual leave cancellation restores its deducted days once.",
    [
      {
        key: "reason",
        label: "Cancellation reason",
        area: true,
        req: true,
        maxlen: 500,
      },
    ],
    "Cancel leave",
    "",
    "staffWorkspaceLeaveCancel",
  );
};
window.staffWorkspaceLeaveCancel = async function (v) {
  const s = staffWorkspaceState();
  if (s.saving) return false;
  if (v.reason.length < 3) return toast("Enter a clear cancellation reason");
  s.saving = true;
  try {
    await SCHOOLOS_ADAPTER.api("/leave/" + s.leaveEdit.id + "/cancel", {
      method: "POST",
      body: JSON.stringify({ reason: v.reason }),
    });
    closeDrawer();
    await staffWorkspaceLoad();
    toast("Leave cancelled");
  } catch (e) {
    toast(e.message);
  } finally {
    s.saving = false;
  }
};
window.staffWorkspaceMarkAttendance = function () {
  studentFormDrawer(
    "Mark my attendance",
    "Records your actual account for today.",
    [
      {
        key: "status",
        label: "Attendance status",
        opts: ["Present", "Remote", "Late"],
      },
    ],
    "Save attendance",
    "",
    "staffWorkspaceAttendanceSave",
  );
};
window.staffWorkspaceAttendanceSave = async function (v) {
  try {
    await SCHOOLOS_ADAPTER.api("/attendance/staff/me", {
      method: "PUT",
      body: JSON.stringify({ status: v.status }),
    });
    closeDrawer();
    await staffWorkspaceLoad();
    toast("Attendance saved");
  } catch (e) {
    toast(e.message);
  }
};
