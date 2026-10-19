/* Parents: guardian records, owned family conversations and school meetings. */
let GUARDIANS = null;
let PARENT_BROADCASTS = [];
let MSG_THREADS = {};
let MEETINGS = [];
function buildGuardians() {
  return GUARDIANS || [];
}
function parentManager() {
  return ["Administrator", "Principal"].includes(state.role);
}
function parentAllowed() {
  return parentManager() || state.role === "Parent";
}
function parentEscape(value) {
  return studentEscape(value);
}
function parentCall(fn, ...args) {
  return parentEscape(fn + "(" + args.map(JSON.stringify).join(",") + ")");
}
function parentForm(title, subtitle, fields, label, handler) {
  return studentFormDrawer(title, subtitle, fields, label, "", handler);
}
function parentDate(value) {
  return value ? new Date(value).toLocaleString((typeof schoolLocale==='function'?schoolLocale():'en-GB')) : "Not recorded";
}
function parentConsent(value) {
  return value === true
    ? "Granted"
    : value === false
      ? "Declined"
      : "Not recorded";
}
function parentFilters() {
  if (state.parentsFilterRole !== state.role) {
    state.parentsFilters = null;
    state.parentsFilterRole = state.role;
  }
  return (
    state.parentsFilters ||
    (state.parentsFilters = {
      q: "",
      portal: "",
      grade: "",
      pickup: "",
      page: 1,
      size: 25,
    })
  );
}
function parentFilteredRows() {
  const f = parentFilters(),
    q = f.q.toLowerCase().trim();
  return buildGuardians().filter((g) => {
    const kids = g.children
      .map((id) => STUDENTS.find((s) => s.id === id))
      .filter(Boolean);
    return (
      (!q ||
        [
          g.id,
          g.name,
          studentSearchName(g,"name"),
          g.phone,
          g.email,
          ...kids.flatMap((s) => [s.name, s.id,studentSearchName(s,"name")]),
        ].some((v) =>
          String(v || "")
            .toLowerCase()
            .includes(q),
        )) &&
      (!f.portal ||
        (f.portal === "Unlinked"
          ? !g.userId
          : g.userId && g.portal === f.portal)) &&
      (!f.grade || kids.some((s) => s.grade === f.grade)) &&
      (!f.pickup || Boolean(g.pickup) === (f.pickup === "Yes"))
    );
  });
}
function parentSetFilter(key, value) {
  const f = parentFilters();
  f[key] = key === "size" ? Number(value) : value;
  f.page = 1;
  filterParents();
}
function parentResetFilters() {
  state.parentsFilters = null;
  render();
}
function filterParents() {
  const target = $("#parBody");
  if (!target) return;
  const f = parentFilters(),
    rows = parentFilteredRows(),
    pages = Math.max(1, Math.ceil(rows.length / f.size));
  f.page = Math.min(f.page, pages);
  target.innerHTML = parentRows(
    rows.slice((f.page - 1) * f.size, f.page * f.size),
  );
  $("#parCount").textContent =
    rows.length + " of " + buildGuardians().length + " guardians";
  $("#parPagination").innerHTML =
    `<button class="btn sm" ${f.page <= 1 ? "disabled" : ""} onclick="parentFilters().page--;filterParents()">Previous</button><span>Page ${f.page} of ${pages}</span><button class="btn sm" ${f.page >= pages ? "disabled" : ""} onclick="parentFilters().page++;filterParents()">Next</button>`;
  if(typeof localizeView==="function") ["#parBody","#parCount","#parPagination"].forEach(selector=>localizeView($(selector)));
}
M.parents = () => {
  if (!parentAllowed())
    return '<div class="card pad"><h2>Parents access is restricted</h2><p>This directory is available to school leadership and linked Parent accounts.</p></div>';
  if (state.parentsLoad !== "ready")
    return `<div class="card pad"><h2>Parents & Guardians</h2><p>${state.parentsLoad === "error" ? parentEscape(state.parentsError) : "Loading authenticated guardian records…"}</p>${state.parentsLoad === "error" ? '<button class="btn" onclick="refreshParents()">Retry</button>' : ""}</div>`;
  const rows = buildGuardians(),
    tab = getSubTab("parents-v", "directory");
  return `<div class="parents-hub"><style>.parents-hub .parent-toolbar{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px}.parents-hub .parent-toolbar input,.parents-hub .parent-toolbar select{min-width:0;max-width:100%;border:1px solid var(--line);border-radius:10px;padding:10px;background:var(--surface);color:inherit}.parents-hub .parent-toolbar input{flex:1 1 240px}.parents-hub .parent-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:16px}.parents-hub .parent-kpis strong{display:block;font-size:24px}.parents-hub .parent-name{background:none;border:0;padding:0;text-align:left;color:var(--brand);cursor:pointer;font:inherit;font-weight:600}.parents-hub .parent-name:focus-visible{outline:2px solid var(--brand)}@media(max-width:650px){.parents-hub .parent-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}.parents-hub .parent-toolbar>*{flex:1 1 140px}.parents-hub .page-head{flex-wrap:wrap;gap:10px}}</style>
  <div class="page-head"><div class="ph-l"><h2>${parentManager() ? "Parents & Guardians" : "My family"}</h2><p>${parentManager() ? "Guardian contacts, recorded permissions, family access and school conversations." : "Your linked family profile, school conversations and available meetings."}</p></div><div class="ph-r" style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn" onclick="refreshParents()">Refresh</button>${parentManager() ? '<button class="btn" onclick="exportParentsCSV()">Export contacts</button><button class="btn primary" onclick="guardianEditForm()">Add guardian</button><button class="btn" onclick="sendToParentsForm()">Message parents</button>' : ""}</div></div>
  <div class="parent-kpis">${[
    ["Guardian records", rows.length],
    ["Linked children", new Set(rows.flatMap((g) => g.children)).size],
    [
      "Active portals",
      rows.filter((g) => g.userId && g.portal === "Active").length,
    ],
    [
      "Booked meetings",
      MEETINGS.filter((m) => m.status !== "Available").length,
    ],
  ]
    .map(
      ([label, value]) =>
        `<div class="card pad"><span class="muted">${label}</span><strong>${value}</strong></div>`,
    )
    .join("")}</div>
  ${subTabs("parents-v", [
    ["directory", parentManager() ? "Directory" : "Family profile", "parents"],
    ["comm", "Conversations", "comm"],
    ["meetings", "Meetings", "cal"],
  ])}
  ${tab === "comm" ? parentComm() : tab === "meetings" ? parentMeetings() : parentDirectory()}</div>`;
};
function parentDirectory() {
  const f = parentFilters(),
    rows = parentFilteredRows(),
    grades = [...new Set(STUDENTS.map((s) => s.grade))].sort();
  return `<div class="card pad"><div class="parent-toolbar"><input id="parSearch" aria-label="Search guardians" placeholder="Guardian, child, admission, phone or email" value="${parentEscape(f.q)}" oninput="parentSetFilter('q',this.value)"><select aria-label="Portal filter" onchange="parentSetFilter('portal',this.value)">${["", "Active", "Suspended", "Invited", "Unlinked"].map((v) => `<option ${f.portal === v ? "selected" : ""} value="${v}">${v || "Any portal status"}</option>`).join("")}</select><select aria-label="Class filter" onchange="parentSetFilter('grade',this.value)"><option value="">Any class</option>${grades.map((v) => `<option value="${parentEscape(v)}" ${v === f.grade ? "selected" : ""}>${parentEscape(v)}</option>`).join("")}</select><select aria-label="Pickup filter" onchange="parentSetFilter('pickup',this.value)">${["", "Yes", "No"].map((v) => `<option value="${v}" ${v === f.pickup ? "selected" : ""}>${v ? "Pickup: " + v : "Any pickup permission"}</option>`).join("")}</select><select aria-label="Rows per page" onchange="parentSetFilter('size',this.value)">${[25, 50, 100].map((n) => `<option ${n === f.size ? "selected" : ""}>${n}</option>`).join("")}</select><button class="btn" onclick="parentResetFilters()">Clear filters</button></div><p id="parCount" class="muted">${rows.length} of ${buildGuardians().length} guardians</p><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Guardian</th><th>Linked children</th><th>Contact</th><th>Portal</th><th>Pickup</th></tr></thead><tbody id="parBody">${parentRows(rows.slice((f.page - 1) * f.size, f.page * f.size))}</tbody></table></div><div id="parPagination" style="display:flex;gap:10px;align-items:center;margin-top:12px"><button class="btn sm" onclick="filterParents()">Show pagination</button></div></div>`;
}
function parentRows(rows) {
  return (
    rows
      .map(
        (g) =>
          `<tr><td><button class="parent-name" onclick="${parentCall("openGuardian", g.id)}">${studentNameHtml(g)}</button><div class="muted">${studentIdentityHtml(g.id)} · <span>${parentEscape(g.relation)}</span></div></td><td>${
            g.children
              .map((id) => {
                const child = STUDENTS.find((s) => s.id === id);
                return child ? studentNameHtml(child)+" · <span>"+parentEscape(child.grade)+"</span>" : studentIdentityHtml(id);
              })
              .join("<br>") || "No children linked"
          }</td><td>${studentPhoneHtml(g.phone)}<div class="muted">${g.email?studentIdentityHtml(g.email):"No email recorded"}</div></td><td>${parentEscape(g.userId ? g.portal : "Not linked")}</td><td>${g.pickup ? "Authorized" : "Not authorized"}</td></tr>`,
      )
      .join("") ||
    '<tr><td colspan="5"><div class="empty"><h3>No guardians found</h3><p>Use Clear filters, or ask school administration to create and link your guardian record.</p></div></td></tr>'
  );
}
function openGuardian(id) {
  openDrawer(guardianDetail(id));
}
function guardianDetail(id) {
  const g = buildGuardians().find((g) => g.id === id);
  if (!g) return '<div class="db">Guardian is no longer available.</div>';
  return `<div class="dh"><div style="flex:1;min-width:0"><h3 style="overflow-wrap:anywhere">${studentNameHtml(g)}</h3><p class="muted">${studentIdentityHtml(g.id)} · <span>${parentEscape(g.relation)}</span></p></div><button class="iconbtn" aria-label="Close guardian profile" onclick="closeDrawer()">${ic("close", 20)}</button></div><div class="db">${studentInfoRows(
    [
      ["Phone", g.phone],
      ["Email", g.email],
      ["Portal", g.userId ? g.portal : "No account linked"],
      ["Last login", parentDate(g.lastLogin)],
      ["Pickup", g.pickup ? "Authorized" : "Not authorized"],
      ["Financial responsibility", g.financial ? "Yes" : "No"],
      ["Custody / access note", g.custody],
      ["Photo / media consent", parentConsent(g.consents.media)],
      ["Trips consent", parentConsent(g.consents.trips)],
      ["Medical consent", parentConsent(g.consents.medical)],
      ...(parentManager() ? [["Office note", g.note]] : []),
    ],
  )}<p class="muted">Permissions and consent reflect the school's recorded instructions. Changes require school leadership.</p><h4>Linked children</h4>${
    g.children
      .map((id) => {
        const s = STUDENTS.find((s) => s.id === id);
        return s
          ? `<button class="btn" style="white-space:normal;margin:4px" onclick="${parentCall("parentOpenChild", id)}">${studentNameHtml(s)} · <span>${parentEscape(s.grade)}</span></button>`
          : "";
      })
      .join("") || "<p>No visible children linked.</p>"
  }<div class="df" style="gap:8px;flex-wrap:wrap"><button class="btn" onclick="${parentCall("openGuardianThread", g.id)}">Conversation</button>${parentManager() ? `<button class="btn primary" onclick="${parentCall("guardianEditForm", g.id)}">Edit guardian</button><button class="btn" onclick="${parentCall("guardianAccountForm", g.id)}">Portal account</button>${g.userId ? `<button class="btn" onclick="${parentCall("toggleGuardianPortal", g.id)}">${g.portal === "Suspended" ? "Activate portal" : "Suspend portal"}</button>` : ""}` : ""}</div></div>`;
}
function parentOpenChild(id) {
  state._spTab = "overview";
  openDrawer(studentProfile(id));
}
function guardianEditForm(id) {
  if (!parentManager()) return;
  if (state.parentSaving)
    return toast("Please wait for the current save to finish");
  const g = buildGuardians().find((g) => g.id === id) || {};
  state.guardianEditId = id || null;
  state.guardianVersion = g.updatedAt;
  parentForm(
    id ? "Edit guardian" : "Add guardian",
    "Select linked children by admission number. Additional contacts do not automatically receive portal access.",
    [
      ...(!id
        ? [{ label: "Guardian reference", key: "refId", req: true, maxlen: 30 }]
        : []),
      { label: "Full name", key: "name", val: g.name, req: true },
      {
        label: "Relationship",
        key: "relation",
        opts: ["Parent", "Father", "Mother", "Guardian", "Other"],
        val: g.relation || "Parent",
      },
      { label: "Phone", key: "phone", type: "tel", req: true, val: g.phone },
      { label: "Email (optional)", key: "email", type: "email", val: g.email },
      {
        label: "Linked admission numbers (comma-separated)",
        key: "children",
        val: (g.children || []).join(", "),
        ph: "QA-001, QA-002",
      },
      {
        label: "Pickup authorized",
        key: "pickup",
        opts: ["No", "Yes"],
        val: g.pickup ? "Yes" : "No",
      },
      {
        label: "Financial responsibility",
        key: "financial",
        opts: ["No", "Yes"],
        val: g.financial ? "Yes" : "No",
      },
      {
        label: "Custody / access instructions",
        key: "custody",
        val: g.custody || "Not recorded",
        req: true,
        maxlen: 300,
      },
      ...["media", "trips", "medical"].map((key) => ({
        label:
          key === "media"
            ? "Photo / media consent"
            : key === "trips"
              ? "Trips consent"
              : "Medical treatment consent",
        key,
        opts: ["Not recorded", "Granted", "Declined"],
        val: parentConsent(g.consents?.[key]),
      })),
      {
        label: "Office note",
        key: "note",
        area: true,
        maxlen: 600,
        val: g.note,
      },
    ],
    "Save guardian",
    "saveGuardianRecord",
  );
}
async function parentSave(action, after, message = "Saved successfully") {
  if (state.parentSaving) return false;
  state.parentSaving = true;
  try {
    const result = await action();
    if (!(await refreshParents()))
      throw Error("Saved, but refresh failed. Use Refresh before retrying.");
    if (after) await after(result);
    toast(typeof message === "function" ? message(result) : message);
    return result;
  } catch (error) {
    toast(error.message);
    return false;
  } finally {
    state.parentSaving = false;
  }
}
window.saveGuardianRecord = async function (v) {
  if (!parentManager()) return false;
  const refs = String(v.children || "")
      .split(",")
      .map((r) => r.trim().toUpperCase())
      .filter(Boolean),
    students = refs.map((ref) =>
      STUDENTS.find((s) => s.id.toUpperCase() === ref),
    );
  if (students.some((s) => !s)) {
    toast("Unknown admission number. Check the Students directory.");
    return false;
  }
  const body = {
    ...v,
    studentIds: students.map((s) => s.mongoId),
    pickupAuthorized: v.pickup === "Yes",
    financialResponsible: v.financial === "Yes",
    consents: Object.fromEntries(
      ["media", "trips", "medical"].map((key) => [
        key,
        v[key] === "Granted" ? true : v[key] === "Declined" ? false : null,
      ]),
    ),
  };
  const g = buildGuardians().find((g) => g.id === state.guardianEditId);
  if (g) {
    delete body.refId;
    body.expectedUpdatedAt = state.guardianVersion;
  }
  return parentSave(
    () =>
      SCHOOLOS_ADAPTER.api("/guardians" + (g ? "/" + g.mongoId : ""), {
        method: g ? "PATCH" : "POST",
        body: JSON.stringify(body),
      }),
    (res) => {
      closeDrawer();
      openGuardian(res.data.refId);
    },
  );
};
function guardianAccountForm(id) {
  if (!parentManager()) return;
  if (state.parentSaving)
    return toast("Please wait for the current save to finish");
  const g = buildGuardians().find((g) => g.id === id);
  if (!g) return;
  state.guardianAccountId = id;
  state.guardianVersion = g.updatedAt;
  parentForm(
    "Parent portal account",
    "Use an existing active Parent login. Linking grants access to these children. A child can have one primary Parent portal account; contact records can be additional guardians.",
    [
      {
        label: "Action",
        key: "action",
        opts: ["Link existing account", "Unlink account"],
      },
      {
        label: "Parent login email",
        key: "parentEmail",
        type: "email",
        val: g.email,
      },
    ],
    "Save portal link",
    "saveGuardianAccount",
  );
}
window.saveGuardianAccount = async function (v) {
  if (!parentManager()) return false;
  const g = buildGuardians().find((g) => g.id === state.guardianAccountId);
  if (!g) return false;
  return parentSave(
    () =>
      SCHOOLOS_ADAPTER.api("/guardians/" + g.mongoId + "/account", {
        method: "PATCH",
        body: JSON.stringify({
          parentEmail: v.action === "Unlink account" ? null : v.parentEmail,
          expectedUpdatedAt: state.guardianVersion,
        }),
      }),
    async () => {
      await SCHOOLOS_ADAPTER.hydrate();
      openGuardian(g.id);
    },
  );
};
window.toggleGuardianPortal = async function (id) {
  if (!parentManager()) return;
  const g = buildGuardians().find((g) => g.id === id);
  if (!g?.userId) return;
  const status = g.portal === "Suspended" ? "Active" : "Suspended";
  if (
    !window.confirm(
      status +
        " portal access for " +
        g.name +
        "? Suspension blocks current sessions and new logins.",
    )
  )
    return;
  return parentSave(
    () =>
      SCHOOLOS_ADAPTER.api("/guardians/" + g.mongoId + "/portal", {
        method: "PATCH",
        body: JSON.stringify({ status }),
      }),
    () => openGuardian(g.id),
  );
};
window.exportParentsCSV = function () {
  if (!parentManager()) return;
  studentDownloadCSV("Guardian_contacts.csv", [
    [
      "Reference",
      "Guardian",
      "Relationship",
      "Phone",
      "Email",
      "Children",
      "Portal",
      "Pickup",
    ],
    ...parentFilteredRows().map((g) => [
      g.id,
      g.name,
      g.relation,
      g.phone,
      g.email,
      g.children.join("; "),
      g.userId ? g.portal : "Not linked",
      g.pickup ? "Authorized" : "Not authorized",
    ]),
  ]);
};
function parentComm() {
  const guardians = buildGuardians();
  return `${parentManager() ? `<div class="card pad"><h3>In-app broadcasts</h3><p class="muted">Messages saved to guardian conversations. Email/SMS delivery and read receipts are not configured.</p><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Subject</th><th>Audience</th><th>Recipients</th><th>Saved</th></tr></thead><tbody>${PARENT_BROADCASTS.map((b) => `<tr><td>${parentEscape(b.subject)}</td><td>${parentEscape(b.audienceLabel)}</td><td>${b.recipientCount}</td><td>${parentEscape(parentDate(b.createdAt))}</td></tr>`).join("") || '<tr><td colspan="4">No broadcasts yet.</td></tr>'}</tbody></table></div></div>` : ""}<div class="card pad" style="margin-top:14px"><h3>${parentManager() ? "Guardian conversations" : "Contact school administration"}</h3>${guardians.map((g) => `<button class="btn" style="display:block;width:100%;text-align:left;white-space:normal;margin-top:10px" onclick="${parentCall("openGuardianThread", g.id)}">${studentNameHtml(g)} · ${studentIdentityHtml(g.id)}</button>`).join("") || "<p>No guardian record linked. Ask school administration to link your existing Parent account.</p>"}</div>`;
}
async function openGuardianThread(id) {
  const g = buildGuardians().find((g) => g.id === id);
  if (!g || !parentAllowed()) return;
  const userId = SCHOOLOS_ADAPTER.user?._id;
  state.guardianThreadId = id;
  openDrawer(
    '<div class="dh"><h3>Conversation</h3><button class="btn" onclick="closeDrawer()">Close</button></div><div class="db" id="parentThreadLoading">Loading conversation…</div>',
  );
  const loading = $("#parentThreadLoading");
  try {
    const response = await SCHOOLOS_ADAPTER.api(
      "/guardians/" + g.mongoId + "/messages",
    );
    if (
      SCHOOLOS_ADAPTER.user?._id !== userId ||
      state.guardianThreadId !== id ||
      !loading?.isConnected ||
      !$("#drawer").classList.contains("on")
    )
      return;
    MSG_THREADS[id] = response.data;
    openDrawer(guardianThread(id));
  } catch (error) {
    toast(error.message);
  }
}
function seedThread(id) {
  return MSG_THREADS[id] || [];
}
function guardianThread(id) {
  const g = buildGuardians().find((g) => g.id === id);
  if (!g) return "";
  return `<div class="dh"><div style="flex:1"><h3>${state.role === "Parent" ? "School conversation" : studentNameHtml(g)}</h3><p class="muted">${studentIdentityHtml(g.id)} · <span>In-app messages</span></p></div><button class="iconbtn" aria-label="Close conversation" onclick="closeDrawer()">${ic("close", 20)}</button></div><div class="db" id="threadBody" style="display:flex;flex-direction:column;gap:10px">${
    seedThread(id)
      .map((m) => {
        const mine = m.direction === (state.role === "Parent" ? "in" : "out");
        return `<div style="align-self:${mine ? "flex-end" : "flex-start"};max-width:90%;overflow-wrap:anywhere"><div class="card pad" style="white-space:pre-wrap">${parentEscape(m.text)}</div><small class="muted">${parentEscape(m.from)} · ${parentEscape(parentDate(m.createdAt))}</small></div>`;
      })
      .join("") ||
    "<p>No messages yet. Start a conversation with the school.</p>"
  }</div><div class="df" style="gap:8px"><input id="threadReply" aria-label="Message text" maxlength="600" placeholder="Type a message…" style="flex:1;min-width:0"><button class="btn primary" onclick="${parentCall("sendThreadReply", id)}">Send</button></div>`;
}
window.sendThreadReply = async function (id) {
  const g = buildGuardians().find((g) => g.id === id),
    text = String($("#threadReply")?.value || "").trim();
  if (!g || !text || !parentAllowed()) return toast("Type a message first");
  return parentSave(
    () =>
      SCHOOLOS_ADAPTER.api("/guardians/" + g.mongoId + "/messages", {
        method: "POST",
        body: JSON.stringify({ text }),
      }),
    () => openGuardianThread(id),
  );
};
function sendToParentsForm() {
  if (!parentManager()) return;
  if (state.parentSaving)
    return toast("Please wait for the current save to finish");
  const grades = [
      ...new Set(STUDENTS.map((s) => s.grade.split(" · ")[0])),
    ].sort(),
    classes = [...new Set(STUDENTS.map((s) => s.grade))].sort();
  parentForm(
    "Message parents",
    "Preview the exact recipients before saving messages to their in-app conversations.",
    [
      {
        label: "Audience",
        key: "audience",
        opts: [
          "All parents",
          "By grade",
          "Single class",
          "Individual guardian",
        ],
      },
      { label: "Grade (for By grade)", key: "grade", opts: ["", ...grades] },
      { label: "Class (for Single class)", key: "cls", opts: ["", ...classes] },
      {
        label: "Guardian reference (for Individual guardian)",
        key: "guardianId",
        opts: ["", ...buildGuardians().map((g) => g.id)],
      },
      { label: "Subject", key: "subject", req: true, maxlen: 160 },
      { label: "Message", key: "message", area: true, req: true, maxlen: 600 },
    ],
    "Preview recipients",
    "sendToParents",
  );
}
window.sendToParents = function (v) {
  if (!parentManager()) return false;
  const targets = buildGuardians().filter(
    (g) =>
      v.audience === "All parents" ||
      (v.audience === "Individual guardian"
        ? g.id === v.guardianId
        : g.children.some((id) => {
            const s = STUDENTS.find((s) => s.id === id);
            return (
              s &&
              (v.audience === "By grade"
                ? s.grade.split(" · ")[0] === v.grade
                : s.grade === v.cls)
            );
          })),
  );
  if (!targets.length) {
    toast("No guardians match this audience");
    return false;
  }
  state.parentBroadcast = {
    audience: v.audience,
    grade: v.audience === "By grade" ? v.grade : undefined,
    className: v.audience === "Single class" ? v.cls : undefined,
    guardianId:
      v.audience === "Individual guardian" ? targets[0].mongoId : undefined,
    channel: "In-app only",
    subject: v.subject,
    message: v.message,
  };
  openDrawer(
    `<div class="dh"><h3>Review in-app broadcast</h3><button class="iconbtn" aria-label="Close broadcast preview" onclick="closeDrawer()">${ic("close", 20)}</button></div><div class="db"><strong>${parentEscape(v.subject)}</strong><p style="white-space:pre-wrap;overflow-wrap:anywhere">${parentEscape(v.message)}</p><p>${targets.length} guardian conversations. No email or SMS is sent.</p>${targets
      .slice(0, 20)
      .map((g) => `<div>${studentNameHtml(g)} · ${studentIdentityHtml(g.id)}</div>`)
      .join(
        "",
      )}${targets.length > 20 ? "<p>And " + (targets.length - 20) + " more</p>" : ""}<div class="df"><button class="btn" onclick="sendToParentsForm()">Change message</button><button class="btn primary" onclick="confirmParentBroadcast()">Confirm in-app broadcast</button></div></div>`,
  );
  return false;
};
window.confirmParentBroadcast = async function () {
  if (!parentManager() || !state.parentBroadcast) return;
  return parentSave(
    () =>
      SCHOOLOS_ADAPTER.api("/guardians/broadcasts", {
        method: "POST",
        body: JSON.stringify(state.parentBroadcast),
      }),
    () => {
      state.parentBroadcast = null;
      closeDrawer();
    },
    (res) => "Saved to " + res.data.recipientCount + " guardian conversations",
  );
};
function parentMeetings() {
  const date = state.parentMeetingDate || new Date().toISOString().slice(0, 10),
    rows = MEETINGS.filter((m) => m.date === date);
  return `<div class="card pad"><div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center"><h3>Parent–teacher meetings</h3><input aria-label="Meeting date" type="date" value="${parentEscape(date)}" onchange="state.parentMeetingDate=this.value;render()">${parentManager() ? '<button class="btn" onclick="newMeetingSlotForm()">New slot</button>' : ""}</div><p class="muted">Select a date to browse available slots${parentManager() ? " and confirmed bookings" : " and your own bookings"}. Video links and external reminders require a configured provider.</p><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Time</th><th>Teacher</th><th>Room</th><th>Parent / student</th><th>Status</th></tr></thead><tbody>${rows.map((m) => `<tr><td><button class="parent-name" onclick="${parentCall("parentOpenMeeting", m.id)}">${parentEscape(m.time)}</button></td><td>${m.teacher&&m.teacher!=="Unassigned"?studentNameHtml({name:m.teacher}):"Unassigned"}</td><td>${parentEscape(m.room)}</td><td>${m.parent&&m.parent!=="—"?studentNameHtml({name:m.parent}):parentEscape(m.parent)}<div>${m.student&&m.student!=="—"?studentNameHtml({name:m.student}):parentEscape(m.student)}</div></td><td>${parentEscape(m.status)}</td></tr>`).join("") || '<tr><td colspan="5">No meetings on this date. Choose another date or contact school administration.</td></tr>'}</tbody></table></div></div>`;
}
function meetingsToday() {
  return MEETINGS.filter(
    (m) => m.date === new Date().toISOString().slice(0, 10),
  );
}
function parentOpenMeeting(id) {
  openDrawer(meetingSlotDetail(id));
}
function meetingSlotDetail(id) {
  const m = MEETINGS.find((m) => m.id === id);
  if (!m) return "";
  return `<div class="dh"><h3><span>${parentEscape(m.status)}</span> <span>meeting</span></h3><button class="iconbtn" aria-label="Close meeting" onclick="closeDrawer()">${ic("close", 20)}</button></div><div class="db">${studentInfoRows(
    [
      ["Teacher", m.teacher],
      ["Date", m.date],
      ["Time", m.time],
      ["Room", m.room],
      ["Parent", m.parent],
      ["Student", m.student],
      ["Video link", m.link || "Not configured"],
    ],
  )}<div class="df" style="gap:8px;flex-wrap:wrap">${m.status === "Available" ? `<button class="btn primary" onclick="${parentCall("bookMeetingForm", id)}">Book this slot</button>` : parentManager() ? `<button class="btn" onclick="${parentCall("cancelMeeting", id)}">Cancel booking</button><button class="btn" onclick="${parentCall("rescheduleMeetingForm", id)}">Reschedule</button>${m.status === "Pending" ? `<button class="btn primary" onclick="${parentCall("confirmMeeting", id)}">Confirm booking</button>` : ""}` : '<span class="muted">Contact school administration to cancel or reschedule.</span>'}</div></div>`;
}
function bookMeetingForm(id) {
  if (!parentAllowed()) return;
  if (state.parentSaving)
    return toast("Please wait for the current save to finish");
  state._meetingSlot = id;
  const g = buildGuardians();
  parentForm(
    "Book meeting",
    "Select a child linked to the attending guardian. The server rejects mismatched links and double bookings.",
    [
      ...(parentManager()
        ? [
            {
              label: "Guardian reference",
              key: "guardianId",
              opts: g.map((g) => g.id),
              req: true,
            },
          ]
        : []),
      {
        label: "Child admission number",
        key: "studentRef",
        opts: STUDENTS.map((s) => s.id),
        req: true,
      },
      ...(parentManager()
        ? [{ label: "Note to teacher", key: "note", area: true, maxlen: 600 }]
        : []),
    ],
    "Book slot",
    "confirmBooking",
  );
}
window.confirmBooking = async function (v) {
  if (!parentAllowed()) return false;
  const student = STUDENTS.find((s) => s.id === v.studentRef),
    g = buildGuardians().find((g) => g.id === v.guardianId);
  if (
    !student ||
    (parentManager() && (!g || !g.children.includes(student.id)))
  ) {
    toast("Choose a child linked to the selected guardian");
    return false;
  }
  return parentSave(
    () =>
      SCHOOLOS_ADAPTER.api(
        "/meetings/" +
          state._meetingSlot +
          (parentManager() ? "/book-on-behalf" : "/book"),
        {
          method: "POST",
          body: JSON.stringify(
            parentManager()
              ? {
                  guardianId: g.mongoId,
                  studentId: student.mongoId,
                  note: v.note,
                }
              : { studentId: student.mongoId },
          ),
        },
      ),
    () => closeDrawer(),
    "Meeting booked",
  );
};
function newMeetingSlotForm() {
  if (!parentManager()) return;
  if (state.parentSaving)
    return toast("Please wait for the current save to finish");
  parentForm(
    "Publish meeting slot",
    "Only existing teaching staff can host a meeting.",
    [
      {
        label: "Teacher reference",
        key: "teacherId",
        opts: STAFF.filter((s) => s.type === "Teaching").map((s) => s.id),
        req: true,
      },
      { label: "Date", key: "date", type: "date", req: true },
      { label: "Start time", key: "time", type: "time", req: true },
      { label: "Room", key: "room", req: true, maxlen: 80 },
    ],
    "Publish slot",
    "saveMeetingSlot",
  );
}
window.saveMeetingSlot = async function (v) {
  if (!parentManager()) return false;
  const teacher = STAFF.find((s) => s.id === v.teacherId);
  if (!teacher?.mongoId) return toast("Select an existing teacher");
  return parentSave(
    () =>
      SCHOOLOS_ADAPTER.api("/meetings", {
        method: "POST",
        body: JSON.stringify({
          teacherStaffId: teacher.mongoId,
          date: v.date,
          startTime: v.time,
          room: v.room,
        }),
      }),
    () => closeDrawer(),
  );
};
window.cancelMeeting = async function (id) {
  if (
    !parentManager() ||
    !window.confirm("Cancel this booking and make the slot available?")
  )
    return;
  return parentSave(
    () =>
      SCHOOLOS_ADAPTER.api("/meetings/" + id + "/cancel", { method: "POST" }),
    () => closeDrawer(),
  );
};
window.confirmMeeting = async function (id) {
  if (!parentManager()) return;
  return parentSave(
    () =>
      SCHOOLOS_ADAPTER.api("/meetings/" + id + "/confirm", { method: "POST" }),
    () => closeDrawer(),
  );
};
function rescheduleMeetingForm(id) {
  if (!parentManager()) return;
  if (state.parentSaving)
    return toast("Please wait for the current save to finish");
  const current = MEETINGS.find((m) => m.id === id);
  if (!current) return;
  state._reschedFrom = id;
  const available = MEETINGS.filter(
    (m) =>
      m.status === "Available" && m.teacherMongoId === current.teacherMongoId,
  );
  if (!available.length)
    return toast("No other available slots with this teacher");
  parentForm(
    "Reschedule meeting",
    "The move is saved atomically. Existing booking details are retained.",
    [
      {
        label: "Target slot",
        key: "targetId",
        opts: available.map((m) => m.date + " " + m.time + " (" + m.id + ")"),
        req: true,
      },
    ],
    "Reschedule",
    "doReschedule",
  );
}
window.doReschedule = async function (v) {
  if (!parentManager()) return false;
  const targetId = String(v.targetId || "").match(/\(([^)]+)\)$/)?.[1];
  if (!targetId) return toast("Select a slot");
  return parentSave(
    () =>
      SCHOOLOS_ADAPTER.api("/meetings/" + state._reschedFrom + "/reschedule", {
        method: "POST",
        body: JSON.stringify({ targetSlotId: targetId }),
      }),
    () => closeDrawer(),
  );
};
