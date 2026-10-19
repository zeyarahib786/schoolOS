/* Boarding workspace: saved accommodation, gate passes and confirmed roll-call. */
function hostelWorkspaceManage() {
  return ["Administrator", "Principal", "Teacher"].includes(state.role);
}
function hostelWorkspaceFamily() {
  return ["Parent", "Student"].includes(state.role);
}
function hostelWorkspaceState() {
  const userId = commUserId();
  if (state.hostelWorkspace?.userId !== userId)
    state.hostelWorkspace = {
      userId,
      rooms: [],
      leave: [],
      roll: [],
      maintenance: [],
      students: [],
      loaded: false,
      loading: false,
      saving: false,
      error: "",
      tab: "Rooms",
      q: "",
      archived: false,
      date: healthDay(),
      page: 1,
    };
  return state.hostelWorkspace;
}
window.hostelWorkspaceLoad = async function () {
  const b = hostelWorkspaceState();
  if (b.loading) return;
  b.loading = true;
  const requestedDate = b.date;
  b.error = "";
  try {
    const r = await Promise.all([
      SCHOOLOS_ADAPTER.apiAll("/hostel/rooms"),
      SCHOOLOS_ADAPTER.apiAll("/hostel/rooms?archived=true"),
      SCHOOLOS_ADAPTER.apiAll("/hostel/leave"),
      SCHOOLOS_ADAPTER.api("/hostel/roll-call?date=" + requestedDate),
      hostelWorkspaceManage()
        ? SCHOOLOS_ADAPTER.apiAll("/hostel/maintenance")
        : Promise.resolve({ data: [] }),
      hostelWorkspaceManage()
        ? SCHOOLOS_ADAPTER.apiAll("/students")
        : Promise.resolve({ data: [] }),
    ]);
    if (requestedDate !== b.date) {
      b.loaded = false;
      return;
    }
    b.rooms = [...(r[0].data || []), ...(r[1].data || [])];
    b.leave = r[2].data || [];
    b.roll = r[3].data || [];
    b.maintenance = r[4].data || [];
    b.students = r[5].data || [];
    b.loaded = true;
  } catch (e) {
    b.error = e.message;
  } finally {
    b.loading = false;
    if (requestedDate !== b.date && !b.error) hostelWorkspaceLoad();
    if (state.module === "hostel") render();
  }
};
function hostelWorkspaceBoarders() {
  return hostelWorkspaceState().rooms.flatMap((room) =>
    room.occupants.map((s) => ({
      ...s,
      roomId: room._id,
      roomLabel: room.block + " · " + room.roomNumber,
      bedLabel:
        room.allocations.find((a) => a.student === s._id)?.bedLabel ||
        "Not configured",
    })),
  );
}
function hostelWorkspaceRollRows() {
  const b = hostelWorkspaceState();
  return hostelWorkspaceBoarders().map((s) => ({
    student: s,
    ...(b.roll.find((r) => (r.student?._id || r.student) === s._id) || {
      status: "Unmarked",
    }),
  }));
}
window.hostelWorkspaceFilter = function (k, v) {
  const b = hostelWorkspaceState();
  b[k] = v;
  if (k !== "page") b.page = 1;
  if (k === "date") {
    b.roll = [];
    b.loaded = false;
    hostelWorkspaceLoad();
  } else render();
};
function hostelWorkspaceFiltered() {
  const b = hostelWorkspaceState(),
    rows =
      b.tab === "Gate passes"
        ? b.leave
        : b.tab === "Roll-call"
          ? hostelWorkspaceRollRows()
          : b.tab === "Maintenance"
            ? b.maintenance
            : b.rooms;
  return rows.filter(
    (r) =>
      (b.tab !== "Rooms" || !!r.archived === b.archived) &&
      (!b.q ||
        [
          r.roomNumber,
          r.block,
          r.student?.name,
          r.student?.refId,
          r.reason,
          r.type,
          r.issue,
          r.refId,
          r.room?.roomNumber,
        ]
          .join(" ")
          .toLowerCase()
          .includes(b.q.toLowerCase())),
  );
}
window.hostelWorkspaceRoomForm = function (id) {
  if (!hostelWorkspaceManage()) return;
  const b = hostelWorkspaceState(),
    r = b.rooms.find((r) => r._id === id);
  b.editId = id || null;
  b.mode = "room";
  studentFormDrawer(
    r ? "Review room" : "Add room",
    "Accommodation policy and warden contacts.",
    [
      {
        key: "roomNumber",
        label: "Room number",
        req: true,
        val: r?.roomNumber || "",
        half: true,
      },
      {
        key: "block",
        label: "Block",
        req: true,
        val: r?.block || "",
        half: true,
      },
      {
        key: "capacity",
        label: "Bed capacity",
        type: "number",
        req: true,
        val: r?.capacity || 2,
        half: true,
      },
      {
        key: "genderPolicy",
        label: "Gender policy",
        opts: ["Any", "Male", "Female"],
        val: r?.genderPolicy || "Any",
        half: true,
      },
      { key: "warden", label: "Warden", val: r?.warden || "", half: true },
      {
        key: "wardenPhone",
        label: "Warden phone",
        val: r?.wardenPhone || "",
        half: true,
      },
      ...(r
        ? [
            {
              key: "status",
              label: "Availability",
              opts: ["Available", "Unavailable"],
              val: r.status,
            },
            {
              key: "archived",
              label: "Directory state",
              opts: ["Active", "Archived"],
              val: r.archived ? "Archived" : "Active",
            },
            {
              key: "reason",
              label: "Reason for review",
              req: true,
              area: true,
            },
          ]
        : []),
    ],
    "Save room",
    "",
    "hostelWorkspaceSave",
  );
};
window.hostelWorkspaceAllocateForm = function (id) {
  if (!hostelWorkspaceManage()) return;
  const b = hostelWorkspaceState(),
    r = b.rooms.find((r) => r._id === id);
  if (!r) return;
  b.editId = id;
  b.mode = "allocate";
  b.studentChoices = b.students
    .filter((s) => s.status === "Active")
    .map((s) => ({
      id: s._id,
      label: s.name + " · " + s.grade + " · " + s.refId,
    }));
  studentFormDrawer(
    "Allocate boarder",
    r.block + " · " + r.roomNumber,
    [
      {
        key: "student",
        label: "Student",
        req: true,
        opts: b.studentChoices.map((s) => s.label),
      },
      { key: "bedLabel", label: "Confirmed bed label", req: true },
    ],
    "Allocate bed",
    "",
    "hostelWorkspaceSave",
  );
};
window.hostelWorkspaceDischargeForm = function (id, studentId) {
  if (!hostelWorkspaceManage()) return;
  const b = hostelWorkspaceState();
  b.editId = id;
  b.studentId = studentId;
  b.mode = "discharge";
  studentFormDrawer(
    "Discharge boarder",
    "Active gate passes must be decided or returned first.",
    [
      {
        key: "reason",
        label: "Reason for accommodation change",
        req: true,
        area: true,
      },
    ],
    "Discharge",
    "",
    "hostelWorkspaceSave",
  );
};
window.hostelWorkspaceLeaveForm = function () {
  if (!hostelWorkspaceManage() && !hostelWorkspaceFamily()) return;
  const b = hostelWorkspaceState();
  b.editId = null;
  b.mode = "leave";
  b.boarderChoices = hostelWorkspaceBoarders().map((s) => ({
    id: s._id,
    roomId: s.roomId,
    label: s.name + " · " + s.refId + " · " + s.roomLabel,
  }));
  studentFormDrawer(
    "Request gate pass",
    "Approval records authorized pickup and guardian consent.",
    [
      {
        key: "student",
        label: "Boarder",
        req: true,
        opts: b.boarderChoices.map((s) => s.label),
      },
      {
        key: "type",
        label: "Leave type",
        opts: [
          "Day leave",
          "Weekend leave",
          "Family event",
          "Appointment",
          "Other",
        ],
      },
      {
        key: "fromDate",
        label: "From",
        req: true,
        type: "date",
        val: healthDay(),
        half: true,
      },
      {
        key: "toDate",
        label: "Until",
        req: true,
        type: "date",
        val: healthDay(),
        half: true,
      },
      { key: "reason", label: "Reason", req: true, area: true },
    ],
    "Request leave",
    "",
    "hostelWorkspaceSave",
  );
};
window.hostelWorkspaceTransitionForm = function (id) {
  if (!hostelWorkspaceManage() && !hostelWorkspaceFamily()) return;
  const b = hostelWorkspaceState(),
    r = b.leave.find((r) => r._id === id);
  if (!r || ["Returned", "Rejected", "Cancelled"].includes(r.status)) return;
  b.editId = id;
  b.mode = "transition";
  if (!hostelWorkspaceManage() && r.status !== "Requested") return;
  const actions = !hostelWorkspaceManage()
    ? ["cancel"]
    : r.status === "Requested"
      ? ["approve", "reject"]
      : r.status === "Approved"
        ? ["mark-out", "reject"]
        : ["return"];
  studentFormDrawer(
    "Review gate pass",
    r.student?.name + " · " + r.status,
    [
      { key: "action", label: "Action", opts: actions },
      ...(r.status === "Requested" && hostelWorkspaceManage()
        ? [
            {
              key: "pickupName",
              label: "Authorized pickup person",
              val: r.pickupName || "",
            },
            {
              key: "pickupPhone",
              label: "Pickup phone",
              val: r.pickupPhone || "",
            },
            {
              key: "consent",
              label: "Guardian consent verified",
              opts: ["Not confirmed", "Confirmed"],
            },
          ]
        : []),
      {
        key: "reason",
        label: "Review / physical departure or return confirmation",
        req: true,
        area: true,
      },
    ],
    "Record action",
    "",
    "hostelWorkspaceSave",
  );
};
window.hostelWorkspaceRollForm = function (studentId) {
  if (!hostelWorkspaceManage()) return;
  const b = hostelWorkspaceState(),
    s = hostelWorkspaceBoarders().find((s) => s._id === studentId),
    r = b.roll.find((r) => (r.student?._id || r.student) === studentId);
  if (!s) return;
  b.editId = studentId;
  b.mode = "roll";
  studentFormDrawer(
    r ? "Correct roll-call" : "Mark roll-call",
    s.name + " · " + b.date,
    [
      {
        key: "status",
        label: "Confirmed status",
        opts: ["Present", "Late", "On leave", "Absent"],
        val: r?.status || "Present",
      },
      ...(r
        ? [
            {
              key: "reason",
              label: "Reason for correction",
              req: true,
              area: true,
            },
          ]
        : []),
    ],
    "Save roll-call",
    "",
    "hostelWorkspaceSave",
  );
};
window.hostelWorkspaceConfirmUnmarked = async function () {
  if (
    !hostelWorkspaceManage() ||
    !confirm(
      "Confirm you physically checked all currently unmarked boarders as present? Existing marks and departed boarders will be preserved.",
    )
  )
    return;
  const b = hostelWorkspaceState();
  if (b.saving) return;
  b.saving = true;
  try {
    await SCHOOLOS_ADAPTER.api("/hostel/roll-call/all", {
      method: "PUT",
      body: JSON.stringify({ date: b.date }),
    });
    await hostelWorkspaceLoad();
    toast("Unmarked present boarders recorded");
  } catch (e) {
    toast(e.message);
  } finally {
    b.saving = false;
  }
};
window.hostelWorkspaceMaintenanceForm = function (id) {
  if (!hostelWorkspaceManage()) return;
  const b = hostelWorkspaceState(),
    r = b.maintenance.find((r) => r._id === id);
  b.editId = id || null;
  b.mode = "maintenance";
  b.roomChoices = b.rooms.map((r) => ({
    id: r._id,
    label: r.block + " · " + r.roomNumber,
  }));
  studentFormDrawer(
    r ? "Review maintenance" : "Report maintenance",
    r?.refId || "Saved hostel repair request.",
    r
      ? [
          {
            key: "status",
            label: "Work status",
            opts: ["Open", "In progress", "Resolved"],
            val: r.status,
          },
          {
            key: "resolution",
            label: "Work performed / next action",
            req: true,
            area: true,
            val: r.resolution || "",
          },
          { key: "reason", label: "Review reason", req: true, area: true },
        ]
      : [
          {
            key: "refId",
            label: "Request reference",
            req: true,
            val: "HM-" + crypto.randomUUID().slice(0, 8),
          },
          {
            key: "room",
            label: "Room",
            req: true,
            opts: b.roomChoices.map((r) => r.label),
          },
          { key: "issue", label: "Issue", req: true, area: true },
          {
            key: "category",
            label: "Category",
            req: true,
            opts: [
              "Electrical",
              "Plumbing",
              "HVAC",
              "Furniture",
              "Cleaning",
              "Other",
            ],
          },
          {
            key: "priority",
            label: "Priority",
            opts: ["High", "Medium", "Low"],
          },
        ],
    "Save maintenance",
    "",
    "hostelWorkspaceSave",
  );
};
window.hostelWorkspaceSave = async function (v) {
  const b = hostelWorkspaceState();
  if (b.saving) return false;
  let path,
    payload,
    method = "POST";
  if (b.mode === "room") {
    const r = b.rooms.find((r) => r._id === b.editId);
    path = "/hostel/rooms" + (r ? "/" + r._id : "");
    payload = {
      roomNumber: v.roomNumber,
      block: v.block,
      capacity: Number(v.capacity),
      genderPolicy: v.genderPolicy,
      warden: v.warden,
      wardenPhone: v.wardenPhone,
    };
    if (r) {
      method = "PATCH";
      Object.assign(payload, {
        status: v.status,
        archived: v.archived === "Archived",
        expectedUpdatedAt: r.updatedAt,
        reason: v.reason,
      });
    }
  } else if (b.mode === "allocate") {
    const s = b.studentChoices.find((s) => s.label === v.student);
    if (!s) {
      toast("Select an active saved student");
      return false;
    }
    path = "/hostel/rooms/" + b.editId + "/allocate";
    payload = { studentId: s.id, bedLabel: v.bedLabel };
  } else if (b.mode === "discharge") {
    path = "/hostel/rooms/" + b.editId + "/discharge";
    payload = {
      studentId: b.studentId,
      expectedUpdatedAt: b.rooms.find((r) => r._id === b.editId).updatedAt,
      reason: v.reason,
    };
  } else if (b.mode === "leave") {
    const s = b.boarderChoices.find((s) => s.label === v.student);
    if (!s) {
      toast("Select an authorized allocated boarder");
      return false;
    }
    path = "/hostel/leave";
    payload = {
      studentId: s.id,
      roomId: s.roomId,
      type: v.type,
      fromDate: v.fromDate,
      toDate: v.toDate,
      reason: v.reason,
    };
  } else if (b.mode === "transition") {
    const r = b.leave.find((r) => r._id === b.editId);
    path = "/hostel/leave/" + b.editId + "/transition";
    payload = {
      action: v.action,
      expectedUpdatedAt: r.updatedAt,
      reason: v.reason,
      ...(v.action === "approve"
        ? {
            pickupName: v.pickupName,
            pickupPhone: v.pickupPhone,
            guardianConsentConfirmed: v.consent === "Confirmed",
          }
        : {}),
    };
  } else if (b.mode === "roll") {
    const r = b.roll.find((r) => (r.student?._id || r.student) === b.editId);
    path = "/hostel/roll-call";
    method = "PUT";
    payload = {
      studentId: b.editId,
      date: b.date,
      status: v.status,
      ...(r ? { expectedUpdatedAt: r.updatedAt, reason: v.reason } : {}),
    };
  } else {
    const r = b.maintenance.find((r) => r._id === b.editId);
    path = "/hostel/maintenance" + (r ? "/" + r._id + "/resolve" : "");
    if (r)
      payload = {
        status: v.status,
        resolution: v.resolution,
        expectedUpdatedAt: r.updatedAt,
        reason: v.reason,
      };
    else {
      const room = b.roomChoices.find((r) => r.label === v.room);
      if (!room) {
        toast("Select a saved room");
        return false;
      }
      payload = {
        refId: v.refId,
        roomId: room.id,
        issue: v.issue,
        category: v.category,
        priority: v.priority,
      };
    }
  }
  b.saving = true;
  try {
    await SCHOOLOS_ADAPTER.api(path, { method, body: JSON.stringify(payload) });
    closeDrawer();
    await hostelWorkspaceLoad();
    toast("Hostel record saved");
  } catch (e) {
    toast(e.message);
  } finally {
    b.saving = false;
  }
  return false;
};
window.hostelWorkspaceDetail = function (id) {
  const b = hostelWorkspaceState(),
    r = (
      b.tab === "Gate passes"
        ? b.leave
        : b.tab === "Maintenance"
          ? b.maintenance
          : b.rooms
    ).find((r) => r._id === id);
  if (!r) return;
  const esc = studentEscape,
    staff = hostelWorkspaceManage();
  let sections,
    footer = [];
  if (b.tab === "Rooms") {
    sections = [
      {
        h: "Accommodation",
        rows: [
          ["Room", esc(r.block + " · " + r.roomNumber)],
          ["Capacity", String(r.capacity)],
          ["Status", r.archived ? "Archived" : esc(r.status)],
          ["Gender policy", esc(r.genderPolicy)],
          ["Warden", esc(r.warden || "Not configured")],
          ["Contact", esc(r.wardenPhone || "Not configured")],
        ],
      },
      {
        h: "Authorized boarders",
        html: r.occupants.length
          ? r.occupants
              .map(
                (s) =>
                  '<div class="lrow"><div><b>' +
                  esc(s.name) +
                  "</b><p>" +
                  esc(s.refId + " · " + s.grade) +
                  '</p><span class="muted">' +
                  esc(
                    r.allocations.find((a) => a.student === s._id)?.bedLabel ||
                      "Bed not configured",
                  ) +
                  "</span></div>" +
                  (staff
                    ? '<button class="btn" onclick="hostelWorkspaceDischargeForm(\'' +
                      id +
                      "','" +
                      s._id +
                      "')\">Discharge</button>"
                    : "") +
                  "</div>",
              )
              .join("")
          : '<p class="muted">No boarders assigned.</p>',
      },
      ...(staff
        ? [
            {
              h: "Room history",
              rows: r.history.map((h) => [
                esc(commDate(h.at)),
                esc(h.action + (h.reason ? " · " + h.reason : "")),
              ]),
            },
          ]
        : []),
    ];
    if (staff)
      footer.push(
        ["Review room", studentClick("hostelWorkspaceRoomForm", id)],
        ...(!r.archived && r.status === "Available"
          ? [
              [
                "Allocate boarder",
                studentClick("hostelWorkspaceAllocateForm", id),
                true,
              ],
            ]
          : []),
      );
  } else if (b.tab === "Gate passes") {
    sections = [
      {
        h: "Gate pass",
        rows: [
          ["Boarder", esc(r.student?.name || "")],
          [
            "Room",
            esc((r.room?.block || "") + " · " + (r.room?.roomNumber || "")),
          ],
          [
            "Dates",
            esc(
              curriculumWorkspaceDay(r.fromDate) +
                " → " +
                curriculumWorkspaceDay(r.toDate),
            ),
          ],
          ["Status", esc(r.status)],
          ["Reason", esc(r.reason)],
          ["Pickup person", esc(r.pickupName || "Not recorded")],
          ["Pickup phone", esc(r.pickupPhone || "Not recorded")],
          [
            "Guardian consent",
            r.guardianConsentConfirmed ? "Recorded confirmed" : "Not confirmed",
          ],
          [
            "Actual departure",
            r.departedAt ? esc(commDate(r.departedAt)) : "Not departed",
          ],
          [
            "Actual return",
            r.returnedAt ? esc(commDate(r.returnedAt)) : "Not returned",
          ],
        ],
      },
      ...(staff
        ? [
            {
              h: "Gate history",
              rows: r.history.map((h) => [
                esc(commDate(h.at)),
                esc(h.action + " · " + h.reason),
              ]),
            },
          ]
        : []),
    ];
    if (
      (staff || (hostelWorkspaceFamily() && r.status === "Requested")) &&
      !["Returned", "Rejected", "Cancelled"].includes(r.status)
    )
      footer.push([
        "Review gate pass",
        studentClick("hostelWorkspaceTransitionForm", id),
        true,
      ]);
  } else {
    sections = [
      {
        h: "Maintenance",
        rows: [
          ["Reference", esc(r.refId)],
          ["Room", esc(r.room?.roomNumber || "")],
          ["Issue", esc(r.issue)],
          ["Category", esc(r.category)],
          ["Priority", esc(r.priority)],
          ["Status", esc(r.status)],
          ["Work / next action", esc(r.resolution || "Awaiting review")],
        ],
      },
      {
        h: "Work history",
        rows: r.history.map((h) => [
          esc(commDate(h.at)),
          esc(h.status + " · " + h.reason),
        ]),
      },
    ];
    if (staff)
      footer.push([
        "Review maintenance",
        studentClick("hostelWorkspaceMaintenanceForm", id),
        true,
      ]);
  }
  openDrawer(
    detailDrawer({
      title: esc(
        r.roomNumber ? r.block + " · " + r.roomNumber : r.refId || "Gate pass",
      ),
      sub: esc(r.student?.name || r.status),
      sections,
      footer: [...footer, ["Close", "closeDrawer()"]],
    }),
  );
};
window.hostelWorkspaceExport = function () {
  const b = hostelWorkspaceState();
  studentDownloadCSV(
    "hostel-" + b.tab.toLowerCase().replace(/ /g, "-") + ".csv",
    b.tab === "Rooms"
      ? [
          ["Block", "Room", "Capacity", "Boarders in view", "Status", "Warden"],
          ...hostelWorkspaceFiltered().map((r) => [
            r.block,
            r.roomNumber,
            r.capacity,
            r.occupants.length,
            r.status,
            r.warden,
          ]),
        ]
      : b.tab === "Roll-call"
        ? [
            ["Student", "Reference", "Date", "Status"],
            ...hostelWorkspaceFiltered().map((r) => [
              r.student.name,
              r.student.refId,
              b.date,
              r.status,
            ]),
          ]
        : [
            ["Reference", "Student", "Status", "Reason / Issue"],
            ...hostelWorkspaceFiltered().map((r) => [
              r.refId || r._id,
              r.student?.name || "",
              r.status,
              r.reason || r.issue,
            ]),
          ],
  );
};
M.hostel = () => {
  const b = hostelWorkspaceState();
  if (!b.loaded && !b.loading && !b.error) hostelWorkspaceLoad();
  const rows = hostelWorkspaceFiltered(),
    pages = Math.max(1, Math.ceil(rows.length / 20));
  b.page = Math.min(b.page, pages);
  const esc = studentEscape,
    staff = hostelWorkspaceManage();
  return (
    '<div class="page-head"><div class="ph-l"><h2>Hostel</h2><p>Accommodation, authorized gate passes and confirmed boarder roll-call.</p></div><div class="ph-r">' +
    (staff
      ? '<button class="btn primary" onclick="hostelWorkspaceRoomForm()">Add room</button>'
      : "") +
    (staff || hostelWorkspaceFamily()
      ? '<button class="btn" onclick="hostelWorkspaceLeaveForm()">Request gate pass</button>'
      : "") +
    '<button class="btn" onclick="hostelWorkspaceLoad()">Refresh</button></div></div><div class="grid cols-4" style="margin-bottom:18px">' +
    kpi(
      "hostel",
      "#17A24A",
      "Rooms in view",
      String(b.rooms.filter((r) => !r.archived).length),
    ) +
    kpi(
      "students",
      "#2563EB",
      "Boarders in view",
      String(hostelWorkspaceBoarders().length),
    ) +
    kpi(
      "reports",
      "#0E7C39",
      staff ? "Available beds" : "Unmarked roll-call",
      String(
        staff
          ? b.rooms
              .filter((r) => !r.archived && r.status === "Available")
              .reduce((n, r) => n + r.capacity - r.occupants.length, 0)
          : hostelWorkspaceRollRows().filter((r) => r.status === "Unmarked")
              .length,
      ),
    ) +
    kpi(
      "comm",
      "#B45309",
      "Currently out",
      String(b.leave.filter((r) => r.status === "Out").length),
    ) +
    '</div><div class="card pad" style="margin-bottom:16px"><div class="flex ac" style="gap:10px;flex-wrap:wrap">' +
    ["Rooms", "Gate passes", "Roll-call", ...(staff ? ["Maintenance"] : [])]
      .map(
        (t) =>
          '<button class="btn ' +
          (b.tab === t ? "primary" : "") +
          "\" onclick=\"hostelWorkspaceFilter('tab','" +
          t +
          "')\">" +
          t +
          "</button>",
      )
      .join("") +
    '<input aria-label="Search hostel" placeholder="Search hostel" value="' +
    esc(b.q) +
    '" onchange="hostelWorkspaceFilter(\'q\',this.value)"><label><input type="checkbox" ' +
    (b.archived ? "checked" : "") +
    ' onchange="hostelWorkspaceFilter(\'archived\',this.checked)"> Archived rooms</label><button class="btn" onclick="hostelWorkspaceExport()">Export view</button></div>' +
    (b.tab === "Roll-call"
      ? '<div class="flex ac" style="gap:10px;margin-top:12px"><label>Roll-call date <input type="date" value="' +
        b.date +
        '" onchange="hostelWorkspaceFilter(\'date\',this.value)"></label>' +
        (staff
          ? '<button class="btn" onclick="hostelWorkspaceConfirmUnmarked()">Confirm unmarked present</button>'
          : "") +
        "</div>"
      : b.tab === "Maintenance" && staff
        ? '<button class="btn" style="margin-top:12px" onclick="hostelWorkspaceMaintenanceForm()">Report maintenance</button>'
        : "") +
    "</div>" +
    (b.error ? '<div class="card pad">' + esc(b.error) + "</div>" : "") +
    '<div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Room / boarder</th><th>Status</th><th>Details</th><th></th></tr></thead><tbody>' +
    rows
      .slice((b.page - 1) * 20, b.page * 20)
      .map(
        (r) =>
          "<tr><td><b>" +
          esc(
            b.tab === "Rooms"
              ? r.block + " · " + r.roomNumber
              : b.tab === "Maintenance"
                ? r.refId
                : r.student?.name || "",
          ) +
          '</b><div class="muted">' +
          esc(r.student?.refId || r.room?.roomNumber || r.warden || "") +
          "</div></td><td>" +
          chip(
            r.archived ? "Archived" : r.status || "Available",
            r.status === "Out" || r.status === "Absent"
              ? "amber"
              : r.status === "Unavailable"
                ? "red"
                : "blue",
          ) +
          "</td><td>" +
          esc(
            b.tab === "Rooms"
              ? r.occupants.length +
                  " boarders in view · " +
                  r.capacity +
                  " capacity"
              : b.tab === "Gate passes"
                ? curriculumWorkspaceDay(r.fromDate) +
                  " → " +
                  curriculumWorkspaceDay(r.toDate)
                : b.tab === "Roll-call"
                  ? r.student.roomLabel + " · " + r.student.bedLabel
                  : r.issue,
          ) +
          "</td><td>" +
          (b.tab === "Roll-call"
            ? staff
              ? '<button class="btn" onclick="' +
                studentClick("hostelWorkspaceRollForm", r.student._id) +
                '">' +
                (r.status === "Unmarked" ? "Mark" : "Correct") +
                "</button>"
              : ""
            : '<button class="btn" onclick="' +
              studentClick("hostelWorkspaceDetail", r._id) +
              '">View</button>') +
          "</td></tr>",
      )
      .join("") +
    "</tbody></table></div>" +
    (!rows.length
      ? '<p class="pad muted">' +
        (b.loading ? "Loading hostel…" : "No hostel records in your view.") +
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
    " onclick=\"hostelWorkspaceFilter('page'," +
    (b.page - 1) +
    ')">Previous</button><button class="btn" ' +
    (b.page === pages ? "disabled" : "") +
    " onclick=\"hostelWorkspaceFilter('page'," +
    (b.page + 1) +
    ')">Next</button></div></div></div><p class="muted">Unmarked boarders have no confirmed roll-call. Departure requires approved pickup details and recorded guardian consent.</p>'
  );
};
/* Dashboard approvals open reviewed forms instead of silently deciding a request. */
window.approveLeave =
  window.rejectLeave =
  window.returnLeave =
    function (id) {
      return hostelWorkspaceLoad().then(() => {
        go("hostel");
        hostelWorkspaceTransitionForm(id);
      });
    };
window.approveLeave.__apiBacked = true;
window.resolveMaint = function (ref) {
  return hostelWorkspaceLoad().then(() => {
    go("hostel");
    const r = hostelWorkspaceState().maintenance.find(
      (r) => r.refId === ref || r._id === ref,
    );
    if (r) hostelWorkspaceMaintenanceForm(r._id);
  });
};
window.resolveMaint.__apiBacked = true;
