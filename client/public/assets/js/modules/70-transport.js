/* Transport is a saved operations register. GPS telemetry is never simulated. */
let TRANS_INCIDENTS = [];
function transportWorkspaceManage() {
  return ["Administrator", "Principal", "Teacher"].includes(state.role);
}
function transportWorkspaceState() {
  const userId = commUserId();
  if (state.transportWorkspace?.userId !== userId)
    state.transportWorkspace = {
      userId,
      routes: [],
      vehicles: [],
      incidents: [],
      students: [],
      loaded: false,
      loading: false,
      saving: false,
      error: "",
      tab: "Routes",
      q: "",
      archived: false,
      page: 1,
    };
  return state.transportWorkspace;
}
window.transportWorkspaceLoad = async function () {
  const b = transportWorkspaceState();
  if (b.loading) return;
  b.loading = true;
  b.error = "";
  try {
    const r = await Promise.all([
      SCHOOLOS_ADAPTER.apiAll("/transport/routes"),
      SCHOOLOS_ADAPTER.apiAll("/transport/routes?archived=true"),
      SCHOOLOS_ADAPTER.api("/transport/vehicles"),
      SCHOOLOS_ADAPTER.apiAll("/transport/incidents"),
      transportWorkspaceManage()
        ? SCHOOLOS_ADAPTER.apiAll("/students")
        : Promise.resolve({ data: [] }),
    ]);
    b.routes = [...(r[0].data || []), ...(r[1].data || [])];
    b.vehicles = r[2].data || [];
    b.incidents = r[3].data || [];
    b.students = r[4].data || [];
    b.loaded = true;
  } catch (e) {
    b.error = e.message;
  } finally {
    b.loading = false;
    if (state.module === "transport") render();
  }
};
window.transportWorkspaceFilter = function (k, v) {
  const b = transportWorkspaceState();
  b[k] = v;
  if (k !== "page") b.page = 1;
  render();
};
function transportWorkspaceFiltered() {
  const b = transportWorkspaceState(),
    rows =
      b.tab === "Vehicles"
        ? b.vehicles
        : b.tab === "Incidents"
          ? b.incidents
          : b.routes;
  return rows.filter(
    (r) =>
      (b.tab !== "Routes" || !!r.archived === b.archived) &&
      (!b.q ||
        [
          r.name,
          r.regNumber,
          r.driverName,
          r.route?.name,
          r.description,
          r.type,
        ]
          .join(" ")
          .toLowerCase()
          .includes(b.q.toLowerCase())),
  );
}
function transportWorkspaceRoute(id) {
  return transportWorkspaceState().routes.find((r) => r._id === id);
}
window.transportWorkspaceVehicleForm = function (id) {
  if (!transportWorkspaceManage()) return;
  const b = transportWorkspaceState(),
    r = b.vehicles.find((r) => r._id === id);
  b.editId = id || null;
  b.mode = "vehicle";
  studentFormDrawer(
    r ? "Review vehicle" : "Add vehicle",
    "Driver contacts and configured expiry dates.",
    [
      {
        key: "regNumber",
        label: "Registration",
        req: true,
        val: r?.regNumber || "",
        half: true,
      },
      {
        key: "capacity",
        label: "Capacity",
        req: true,
        type: "number",
        val: r?.capacity || 30,
        half: true,
      },
      {
        key: "driverName",
        label: "Driver name",
        req: true,
        val: r?.driverName || "",
        half: true,
      },
      {
        key: "driverPhone",
        label: "Driver phone",
        req: true,
        val: r?.driverPhone || "",
        half: true,
      },
      {
        key: "insuranceExpiry",
        label: "Insurance expiry",
        type: "date",
        val: curriculumWorkspaceDay(r?.insuranceExpiry),
        half: true,
      },
      {
        key: "driverLicenseExpiry",
        label: "Driver licence expiry",
        type: "date",
        val: curriculumWorkspaceDay(r?.driverLicenseExpiry),
        half: true,
      },
      ...(r
        ? [
            {
              key: "status",
              label: "Vehicle state",
              opts: ["Available", "Maintenance"],
              val: r.status,
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
    "Save vehicle",
    "",
    "transportWorkspaceSave",
  );
};
window.transportWorkspaceRouteForm = function (id) {
  if (!transportWorkspaceManage()) return;
  const b = transportWorkspaceState(),
    r = transportWorkspaceRoute(id);
  b.editId = id || null;
  b.mode = "route";
  b.vehicleChoices = b.vehicles.map((v) => ({
    id: v._id,
    label: v.regNumber + " · " + v.capacity + " seats · " + v.status,
  }));
  studentFormDrawer(
    r ? "Review route" : "Add route",
    "Stops: one per line; optional time/address: Stop | HH:mm | Address.",
    [
      { key: "name", label: "Route name", req: true, val: r?.name || "" },
      {
        key: "vehicle",
        label: "Vehicle",
        req: true,
        opts: b.vehicleChoices.map((v) => v.label),
        val: b.vehicleChoices.find(
          (v) => v.id === (r?.vehicle?._id || r?.vehicle),
        )?.label,
      },
      {
        key: "stops",
        label: "Scheduled stops",
        req: true,
        area: true,
        val:
          r?.stops
            .map((s) => [s.name, s.time || "", s.address || ""].join(" | "))
            .join("\n") || "",
      },
      {
        key: "gpsId",
        label: "GPS device reference (no telemetry integration)",
        val: r?.gpsId || "",
      },
      ...(r
        ? [
            {
              key: "archived",
              label: "Route directory state",
              opts: ["Active", "Archived"],
              val: r.archived ? "Archived" : "Active",
            },
            {
              key: "reason",
              label: "Reason for plan review",
              req: true,
              area: true,
            },
          ]
        : []),
    ],
    "Save route",
    "",
    "transportWorkspaceSave",
  );
};
window.transportWorkspaceAssignForm = function (id) {
  if (!transportWorkspaceManage()) return;
  const b = transportWorkspaceState(),
    r = transportWorkspaceRoute(id);
  if (!r) return;
  b.editId = id;
  b.mode = "assign";
  b.studentChoices = b.students
    .filter((s) => s.status === "Active")
    .map((s) => ({
      id: s._id,
      label: s.name + " · " + s.grade + " · " + s.refId,
    }));
  studentFormDrawer(
    "Assign rider",
    r.name,
    [
      {
        key: "student",
        label: "Student",
        req: true,
        opts: b.studentChoices.map((s) => s.label),
      },
      {
        key: "stopName",
        label: "Pickup stop",
        req: true,
        opts: r.stops.map((s) => s.name),
      },
    ],
    "Assign rider",
    "",
    "transportWorkspaceSave",
  );
};
window.transportWorkspaceRemoveForm = function (id, studentId) {
  if (!transportWorkspaceManage()) return;
  const b = transportWorkspaceState(),
    r = transportWorkspaceRoute(id);
  b.editId = id;
  b.studentId = studentId;
  b.mode = "remove";
  studentFormDrawer(
    "Remove rider",
    r.name,
    [
      {
        key: "reason",
        label: "Reason for transport change",
        req: true,
        area: true,
      },
    ],
    "Remove rider",
    "",
    "transportWorkspaceSave",
  );
};
window.transportWorkspaceOperationForm = function (id) {
  if (!transportWorkspaceManage()) return;
  const b = transportWorkspaceState(),
    r = transportWorkspaceRoute(id);
  if (!r) return;
  b.editId = id;
  b.mode = "operation";
  studentFormDrawer(
    "Route operation",
    r.name,
    [
      {
        key: "status",
        label: "Current operation",
        opts: ["Depot", "On road", "Delayed"],
        val: r.status,
      },
      {
        key: "reason",
        label: "Operational note / reason",
        req: true,
        area: true,
      },
    ],
    "Save operation",
    "",
    "transportWorkspaceSave",
  );
};
window.transportWorkspaceIncidentForm = function (id) {
  if (!transportWorkspaceManage()) return;
  const b = transportWorkspaceState(),
    r = transportWorkspaceRoute(id);
  if (!r) return;
  b.editId = id;
  b.mode = "incident";
  studentFormDrawer(
    "Report incident",
    r.name,
    [
      {
        key: "type",
        label: "Type",
        opts: [
          "Mechanical issue",
          "Traffic delay",
          "Accident (minor)",
          "Student behaviour",
          "Route deviation",
        ],
      },
      {
        key: "severity",
        label: "Severity",
        opts: ["Minor", "Moderate", "Serious"],
      },
      {
        key: "occurredAt",
        label: "Occurred at (ISO timestamp with offset)",
        req: true,
        val: new Date().toISOString(),
      },
      { key: "location", label: "Location" },
      {
        key: "description",
        label: "Incident description",
        req: true,
        area: true,
      },
    ],
    "Log incident",
    "",
    "transportWorkspaceSave",
  );
};
window.transportWorkspaceReviewIncident = function (id) {
  if (!transportWorkspaceManage()) return;
  const b = transportWorkspaceState(),
    r = b.incidents.find((r) => r._id === id);
  if (!r) return;
  b.editId = id;
  b.mode = "reviewIncident";
  studentFormDrawer(
    "Review incident",
    r.route?.name || "Transport",
    [
      {
        key: "status",
        label: "Status",
        opts: ["Open", "Resolved"],
        val: r.status,
      },
      {
        key: "resolution",
        label: "Resolution / follow-up action",
        req: true,
        area: true,
        val: r.resolution || "",
      },
      { key: "reason", label: "Review reason", req: true, area: true },
    ],
    "Save review",
    "",
    "transportWorkspaceSave",
  );
};
window.transportWorkspaceSave = async function (v) {
  const b = transportWorkspaceState();
  if (b.saving) return false;
  let path,
    payload,
    method = "POST";
  if (b.mode === "vehicle") {
    const r = b.vehicles.find((r) => r._id === b.editId);
    path = "/transport/vehicles" + (r ? "/" + r._id : "");
    payload = {
      regNumber: v.regNumber,
      capacity: Number(v.capacity),
      driverName: v.driverName,
      driverPhone: v.driverPhone,
      insuranceExpiry: v.insuranceExpiry || null,
      driverLicenseExpiry: v.driverLicenseExpiry || null,
    };
    if (r) {
      method = "PATCH";
      Object.assign(payload, {
        status: v.status,
        expectedUpdatedAt: r.updatedAt,
        reason: v.reason,
      });
    }
  } else if (b.mode === "route") {
    const r = transportWorkspaceRoute(b.editId),
      vehicle = b.vehicleChoices.find((c) => c.label === v.vehicle);
    if (!vehicle) {
      toast("Select a saved vehicle");
      return false;
    }
    path = "/transport/routes" + (r ? "/" + r._id : "");
    payload = {
      name: v.name,
      vehicleId: vehicle.id,
      gpsId: v.gpsId,
      stops: String(v.stops || "")
        .split("\n")
        .filter((s) => s.trim())
        .map((line) => {
          const [name, time, address] = line.split("|").map((s) => s.trim());
          return {
            name,
            ...(time ? { time } : {}),
            ...(address ? { address } : {}),
          };
        }),
    };
    if (r) {
      method = "PATCH";
      Object.assign(payload, {
        archived: v.archived === "Archived",
        expectedUpdatedAt: r.updatedAt,
        reason: v.reason,
      });
    }
  } else if (b.mode === "assign") {
    const student = b.studentChoices.find((s) => s.label === v.student);
    if (!student) {
      toast("Select an active saved student");
      return false;
    }
    path = "/transport/routes/" + b.editId + "/assign";
    payload = { studentId: student.id, stopName: v.stopName };
  } else if (b.mode === "remove") {
    path = "/transport/routes/" + b.editId + "/remove";
    payload = {
      studentId: b.studentId,
      expectedUpdatedAt: transportWorkspaceRoute(b.editId).updatedAt,
      reason: v.reason,
    };
  } else if (b.mode === "operation") {
    path = "/transport/routes/" + b.editId + "/operational-status";
    method = "PATCH";
    payload = {
      status: v.status,
      expectedUpdatedAt: transportWorkspaceRoute(b.editId).updatedAt,
      reason: v.reason,
    };
  } else if (b.mode === "incident") {
    path = "/transport/routes/" + b.editId + "/incidents";
    payload = {
      type: v.type,
      severity: v.severity,
      occurredAt: v.occurredAt,
      location: v.location,
      description: v.description,
    };
  } else {
    path = "/transport/incidents/" + b.editId;
    method = "PATCH";
    payload = {
      status: v.status,
      resolution: v.resolution,
      reason: v.reason,
      expectedUpdatedAt: b.incidents.find((r) => r._id === b.editId).updatedAt,
    };
  }
  b.saving = true;
  try {
    await SCHOOLOS_ADAPTER.api(path, { method, body: JSON.stringify(payload) });
    closeDrawer();
    await transportWorkspaceLoad();
    toast("Transport record saved");
  } catch (e) {
    toast(e.message);
  } finally {
    b.saving = false;
  }
  return false;
};
window.transportWorkspaceDetail = function (id) {
  const b = transportWorkspaceState(),
    r = (
      b.tab === "Vehicles"
        ? b.vehicles
        : b.tab === "Incidents"
          ? b.incidents
          : b.routes
    ).find((r) => r._id === id);
  if (!r) return;
  const esc = studentEscape,
    staff = transportWorkspaceManage();
  let sections,
    footer = [];
  if (b.tab === "Vehicles") {
    sections = [
      {
        h: "Vehicle",
        rows: [
          ["Registration", esc(r.regNumber)],
          ["Driver", esc(r.driverName)],
          ["Phone", esc(r.driverPhone)],
          ["Capacity", String(r.capacity)],
          ["Status", esc(r.status)],
          [
            "Insurance expiry",
            esc(curriculumWorkspaceDay(r.insuranceExpiry) || "Not configured"),
          ],
          [
            "Licence expiry",
            esc(
              curriculumWorkspaceDay(r.driverLicenseExpiry) || "Not configured",
            ),
          ],
        ],
      },
    ];
    if (staff)
      footer.push([
        "Review vehicle",
        studentClick("transportWorkspaceVehicleForm", id),
        true,
      ]);
  } else if (b.tab === "Incidents") {
    sections = [
      {
        h: "Incident",
        rows: [
          ["Route", esc(r.route?.name || "")],
          ["Type", esc(r.type)],
          ["Severity", esc(r.severity)],
          ["Occurred", esc(commDate(r.occurredAt || r.createdAt))],
          ["Location", esc(r.location || "—")],
          ["Description", esc(r.description)],
          ["Status", esc(r.status)],
          ["Resolution", esc(r.resolution || "Awaiting review")],
        ],
      },
      {
        h: "Review history",
        rows: (r.history || []).map((h) => [
          esc(commDate(h.at)),
          esc(h.status + " · " + h.reason),
        ]),
      },
    ];
    if (staff)
      footer.push([
        "Review incident",
        studentClick("transportWorkspaceReviewIncident", id),
        true,
      ]);
  } else {
    sections = [
      {
        h: "Route operation",
        rows: [
          ["Vehicle", esc(r.vehicle?.regNumber || "")],
          ["Driver", esc(r.vehicle?.driverName || "")],
          ["Phone", esc(r.vehicle?.driverPhone || "")],
          ["Status", esc(r.status)],
          ["Riders in your view", String(r.assignedStudents.length)],
          ["Capacity", String(r.vehicle?.capacity || 0)],
          ["GPS telemetry", "Not connected"],
        ],
      },
      {
        h: "Scheduled stops",
        rows: r.stops.map((s) => [
          esc(s.name),
          esc(
            [s.time || "Time not set", s.address || ""]
              .filter(Boolean)
              .join(" · "),
          ),
        ]),
      },
      {
        h: "Authorized riders",
        html: r.assignedStudents.length
          ? r.assignedStudents
              .map(
                (s) =>
                  '<div class="lrow"><div><b>' +
                  esc(s.name) +
                  "</b><p>" +
                  esc(s.refId + " · " + s.grade) +
                  '</p><span class="muted">' +
                  esc(
                    r.studentStops?.find((x) => x.student === s._id)
                      ?.stopName || "Stop not configured",
                  ) +
                  "</span></div>" +
                  (staff
                    ? '<button class="btn" onclick="transportWorkspaceRemoveForm(\'' +
                      id +
                      "','" +
                      s._id +
                      "')\">Remove</button>"
                    : "") +
                  "</div>",
              )
              .join("")
          : '<p class="muted">No riders assigned.</p>',
      },
      ...(staff
        ? [
            {
              h: "Operational history",
              rows: (r.history || []).map((h) => [
                esc(commDate(h.at)),
                esc(h.action + (h.reason ? " · " + h.reason : "")),
              ]),
            },
          ]
        : []),
    ];
    if (staff)
      footer.push(
        ["Review route", studentClick("transportWorkspaceRouteForm", id)],
        ...(!r.archived
          ? [
              [
                "Assign rider",
                studentClick("transportWorkspaceAssignForm", id),
              ],
              [
                "Operation",
                studentClick("transportWorkspaceOperationForm", id),
                true,
              ],
              [
                "Report incident",
                studentClick("transportWorkspaceIncidentForm", id),
              ],
            ]
          : []),
      );
  }
  openDrawer(
    detailDrawer({
      title: esc(r.name || r.regNumber || r.type),
      sub: esc(r.route?.name || r.status),
      sections,
      footer: [...footer, ["Close", "closeDrawer()"]],
    }),
  );
};
window.transportWorkspaceExport = function () {
  const b = transportWorkspaceState();
  studentDownloadCSV("transport.csv", [
    ["Route", "Vehicle", "Status", "Riders in view", "Capacity"],
    ...b.routes
      .filter((r) => !r.archived)
      .map((r) => [
        r.name,
        r.vehicle?.regNumber,
        r.status,
        r.assignedStudents.length,
        r.vehicle?.capacity,
      ]),
  ]);
};
M.transport = () => {
  const b = transportWorkspaceState();
  if (!b.loaded && !b.loading && !b.error) transportWorkspaceLoad();
  const rows = transportWorkspaceFiltered(),
    pages = Math.max(1, Math.ceil(rows.length / 20));
  b.page = Math.min(b.page, pages);
  const esc = studentEscape,
    staff = transportWorkspaceManage();
  return (
    '<div class="page-head"><div class="ph-l"><h2>Transport</h2><p>Saved routes, authorized riders, driver contacts and reviewed incidents.</p></div><div class="ph-r">' +
    (staff
      ? '<button class="btn" onclick="transportWorkspaceVehicleForm()">Add vehicle</button><button class="btn primary" onclick="transportWorkspaceRouteForm()">Add route</button>'
      : "") +
    '<button class="btn" onclick="transportWorkspaceLoad()">Refresh</button></div></div><div class="grid cols-4" style="margin-bottom:18px">' +
    kpi(
      "trans",
      "#17A24A",
      "Active routes",
      String(b.routes.filter((r) => !r.archived).length),
    ) +
    kpi(
      "students",
      "#2563EB",
      "Riders in view",
      String(b.routes.reduce((n, r) => n + r.assignedStudents.length, 0)),
    ) +
    kpi(
      "comm",
      "#E2920C",
      "Delayed routes",
      String(b.routes.filter((r) => r.status === "Delayed").length),
    ) +
    kpi(
      "reports",
      "#0E7C39",
      staff ? "Open incidents" : "Assigned vehicles",
      String(
        staff
          ? b.incidents.filter((r) => r.status === "Open").length
          : b.vehicles.length,
      ),
    ) +
    '</div><div class="card pad" style="margin-bottom:16px"><div class="flex ac" style="gap:10px;flex-wrap:wrap">' +
    ["Routes", "Vehicles", ...(staff ? ["Incidents"] : [])]
      .map(
        (t) =>
          '<button class="btn ' +
          (b.tab === t ? "primary" : "") +
          "\" onclick=\"transportWorkspaceFilter('tab','" +
          t +
          "')\">" +
          t +
          "</button>",
      )
      .join("") +
    '<input aria-label="Search transport" placeholder="Search transport" value="' +
    esc(b.q) +
    '" onchange="transportWorkspaceFilter(\'q\',this.value)"><label><input type="checkbox" ' +
    (b.archived ? "checked" : "") +
    ' onchange="transportWorkspaceFilter(\'archived\',this.checked)"> Archived routes</label><button class="btn" onclick="transportWorkspaceExport()">Export routes</button></div></div>' +
    (b.error ? '<div class="card pad">' + esc(b.error) + "</div>" : "") +
    '<div class="card"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Route / vehicle</th><th>Operation</th><th>Details</th><th></th></tr></thead><tbody>' +
    rows
      .slice((b.page - 1) * 20, b.page * 20)
      .map(
        (r) =>
          "<tr><td><b>" +
          esc(r.name || r.regNumber || r.type) +
          '</b><div class="muted">' +
          esc(r.route?.name || r.vehicle?.regNumber || r.driverName || "") +
          "</div></td><td>" +
          chip(
            r.archived ? "Archived" : r.status,
            r.status === "Delayed" || r.status === "Open"
              ? "amber"
              : r.status === "Maintenance"
                ? "red"
                : "blue",
          ) +
          "</td><td>" +
          esc(
            b.tab === "Vehicles"
              ? r.capacity + " seats · " + r.driverPhone
              : b.tab === "Incidents"
                ? r.severity + " · " + commDate(r.occurredAt || r.createdAt)
                : r.assignedStudents.length +
                  " riders in view · " +
                  r.stops.length +
                  " stops",
          ) +
          '</td><td><button class="btn" onclick="' +
          studentClick("transportWorkspaceDetail", r._id) +
          '">View</button></td></tr>',
      )
      .join("") +
    "</tbody></table></div>" +
    (!rows.length
      ? '<p class="pad muted">' +
        (b.loading
          ? "Loading transport…"
          : "No transport records in your view.") +
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
    " onclick=\"transportWorkspaceFilter('page'," +
    (b.page - 1) +
    ')">Previous</button><button class="btn" ' +
    (b.page === pages ? "disabled" : "") +
    " onclick=\"transportWorkspaceFilter('page'," +
    (b.page + 1) +
    ')">Next</button></div></div></div><p class="muted">Operations are recorded by staff. GPS telemetry, boarding events and on-time performance are not connected. Families see only their own linked riders.</p>'
  );
};
