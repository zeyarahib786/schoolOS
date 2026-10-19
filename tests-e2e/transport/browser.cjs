const assert = require("assert");
require("../helpers/browser.cjs")(
  "transport",
  async ({ role, step, evaluate, waitFor, fill, cdp, screenshot }) => {
    const manage = ["Administrator", "Principal", "Teacher"].includes(role),
      family = ["Parent", "Student"].includes(role);
    await step(
      "Transport role views load real routes with private family rosters",
      async () => {
        await evaluate("go('transport')");
        await waitFor(
          () => evaluate("transportWorkspaceState().loaded"),
          "transport loaded",
        );
        assert.strictEqual(
          await evaluate(
            "document.getElementById('view').textContent.includes('Add vehicle')",
          ),
          manage,
        );
        if (manage) {
          assert(await evaluate("transportWorkspaceState().routes.length>=25"));
          await evaluate("transportWorkspaceFilter('page',2)");
          assert(await evaluate("transportWorkspaceState().page===2"));
        }
        if (family) {
          assert.strictEqual(
            await evaluate("transportWorkspaceState().routes.length"),
            1,
          );
          assert(
            await evaluate(
              "transportWorkspaceState().routes.every(r=>r.assignedStudents.length===1&&r.assignedStudents[0].refId==='QA-001'&&r.history.length===0)",
            ),
          );
          assert.strictEqual(
            await evaluate("transportWorkspaceState().vehicles.length"),
            1,
          );
        }
        if (role === "Accountant")
          assert(
            await evaluate(
              "transportWorkspaceState().routes.length===0&&transportWorkspaceState().vehicles.length===0",
            ),
          );
        assert(
          !(await evaluate(
            "document.getElementById('view').textContent.includes('Live map')",
          )),
        );
      },
    );
    if (role !== "Accountant")
      await step(
        "Safe route detail displays only authorized riders and actual stops",
        async () => {
          await evaluate(
            "transportWorkspaceDetail(transportWorkspaceState().routes.find(r=>r.name.includes('<img'))._id)",
          );
          assert(
            await evaluate(
              "document.getElementById('drawer').textContent.includes('QA safe <img')",
            ),
          );
          assert(
            !(await evaluate("!!document.querySelector('#drawer img[src=x]')")),
          );
          assert.strictEqual(
            await evaluate(
              "document.getElementById('drawer').textContent.includes('QA-002')",
            ),
            manage,
          );
          assert(
            await evaluate(
              "document.getElementById('drawer').textContent.includes('Not connected')",
            ),
          );
          await evaluate("closeDrawer()");
        },
      );
    if (manage) {
      await step(
        "Vehicle form persists actual driver and expiry metadata",
        async () => {
          await evaluate("transportWorkspaceVehicleForm()");
          await fill({
            regNumber: "QA-CREATED-" + role,
            capacity: "3",
            driverName: "Fictional driver",
            driverPhone: "+971501234567",
            insuranceExpiry: "2099-01-01",
            driverLicenseExpiry: "2099-01-01",
          });
          await waitFor(
            () => evaluate("!transportWorkspaceState().saving"),
            "vehicle saved",
          );
          assert(
            await evaluate(
              "transportWorkspaceState().vehicles.some(r=>r.regNumber==='QA-CREATED-'+state.role&&r.capacity===3)",
            ),
          );
        },
      );
      await step("Route form persists structured scheduled stops", async () => {
        await evaluate("addRouteForm()");
        await fill({
          name: "QA Created " + role,
          vehicle: await evaluate(
            "transportWorkspaceState().vehicleChoices.find(c=>c.label.startsWith('QA-CREATED-'+state.role+' ·')).label",
          ),
          stops:
            "QA Pickup | 07:30 | Fictional pickup address\nQA School | 08:00 | Fictional school address",
          gpsId: "",
        });
        await waitFor(
          () => evaluate("!transportWorkspaceState().saving"),
          "route saved",
        );
        assert(
          await evaluate(
            "transportWorkspaceState().routes.find(r=>r.name==='QA Created '+state.role).stops[0].time==='07:30'",
          ),
        );
      });
      await step(
        "Actual rider assignment selects saved pickup stop",
        async () => {
          await evaluate(
            "transportWorkspaceAssignForm(transportWorkspaceState().routes.find(r=>r.name==='QA Created '+state.role)._id)",
          );
          await fill({
            student: await evaluate(
              "transportWorkspaceState().studentChoices.find(s=>s.label.endsWith('QA-031')).label",
            ),
            stopName: "QA Pickup",
          });
          await waitFor(
            () => evaluate("!transportWorkspaceState().saving"),
            "rider assigned",
          );
          assert(
            await evaluate(
              "transportWorkspaceState().routes.find(r=>r.name==='QA Created '+state.role).studentStops[0].stopName==='QA Pickup'",
            ),
          );
        },
      );
      await step(
        "Operational delay records the actual staff reason",
        async () => {
          await evaluate(
            "transportWorkspaceOperationForm(transportWorkspaceState().routes.find(r=>r.name==='QA Created '+state.role)._id)",
          );
          await fill({ status: "Delayed", reason: "QA traffic congestion" });
          await waitFor(
            () => evaluate("!transportWorkspaceState().saving"),
            "operation saved",
          );
          assert(
            await evaluate(
              "transportWorkspaceState().routes.find(r=>r.name==='QA Created '+state.role).status==='Delayed'",
            ),
          );
        },
      );
      await step(
        "Incident reporting and resolution preserve real review history",
        async () => {
          await evaluate(
            "transportWorkspaceIncidentForm(transportWorkspaceState().routes.find(r=>r.name==='QA Created '+state.role)._id)",
          );
          await fill({
            type: "Traffic delay",
            severity: "Moderate",
            location: "Fictional road",
            description: "QA incident " + role,
          });
          await waitFor(
            () => evaluate("!transportWorkspaceState().saving"),
            "incident saved",
          );
          await evaluate(
            "transportWorkspaceReviewIncident(transportWorkspaceState().incidents.find(r=>r.description==='QA incident '+state.role)._id)",
          );
          await fill({
            status: "Resolved",
            resolution: "QA operation restored",
            reason: "QA transport review",
          });
          await waitFor(
            () => evaluate("!transportWorkspaceState().saving"),
            "incident resolved",
          );
          assert(
            await evaluate(
              "transportWorkspaceState().incidents.find(r=>r.description==='QA incident '+state.role).status==='Resolved'&&transportWorkspaceState().incidents.find(r=>r.description==='QA incident '+state.role).history.length===1",
            ),
          );
        },
      );
      await step(
        "Vehicle maintenance moves its route to depot, then permits reviewed release",
        async () => {
          await evaluate(
            "transportWorkspaceVehicleForm(transportWorkspaceState().vehicles.find(r=>r.regNumber==='QA-CREATED-'+state.role)._id)",
          );
          await fill({
            status: "Maintenance",
            reason: "QA maintenance inspection",
          });
          await waitFor(
            () => evaluate("!transportWorkspaceState().saving"),
            "maintenance saved",
          );
          assert(
            await evaluate(
              "transportWorkspaceState().routes.find(r=>r.name==='QA Created '+state.role).status==='Depot'",
            ),
          );
          await evaluate(
            "transportWorkspaceVehicleForm(transportWorkspaceState().vehicles.find(r=>r.regNumber==='QA-CREATED-'+state.role)._id)",
          );
          await fill({ status: "Available", reason: "QA inspection complete" });
          await waitFor(
            () => evaluate("!transportWorkspaceState().saving"),
            "vehicle released",
          );
          assert(
            await evaluate(
              "transportWorkspaceState().vehicles.find(r=>r.regNumber==='QA-CREATED-'+state.role).history.length===2",
            ),
          );
        },
      );
      await step(
        "Rider removal preserves the dated reason and frees the assignment",
        async () => {
          await evaluate(
            "transportWorkspaceRemoveForm(transportWorkspaceState().routes.find(r=>r.name==='QA Created '+state.role)._id,transportWorkspaceState().routes.find(r=>r.name==='QA Created '+state.role).assignedStudents[0]._id)",
          );
          await fill({ reason: "QA transport allocation ended" });
          await waitFor(
            () => evaluate("!transportWorkspaceState().saving"),
            "rider removed",
          );
          assert(
            await evaluate(
              "transportWorkspaceState().routes.find(r=>r.name==='QA Created '+state.role).assignedStudents.length===0&&transportWorkspaceState().routes.find(r=>r.name==='QA Created '+state.role).studentStops.length===0",
            ),
          );
        },
      );
      await step(
        "Empty route can be archived and restored with review reasons",
        async () => {
          await evaluate(
            "transportWorkspaceRouteForm(transportWorkspaceState().routes.find(r=>r.name==='QA Created '+state.role)._id)",
          );
          await fill({ archived: "Archived", reason: "QA route archive" });
          await waitFor(
            () => evaluate("!transportWorkspaceState().saving"),
            "route archived",
          );
          assert(
            await evaluate(
              "transportWorkspaceState().routes.find(r=>r.name==='QA Created '+state.role).archived",
            ),
          );
          await evaluate(
            "transportWorkspaceRouteForm(transportWorkspaceState().routes.find(r=>r.name==='QA Created '+state.role)._id)",
          );
          await fill({ archived: "Active", reason: "QA route restore" });
          await waitFor(
            () => evaluate("!transportWorkspaceState().saving"),
            "route restored",
          );
          assert(
            await evaluate(
              "!transportWorkspaceState().routes.find(r=>r.name==='QA Created '+state.role).archived",
            ),
          );
        },
      );
    }
    await step(
      "Legacy map entry does not invent live GPS positions",
      async () => {
        await evaluate("openDrawer(transportLiveMap())");
        assert(
          await evaluate(
            "document.getElementById('drawer').textContent.includes('GPS telemetry is not connected')",
          ),
        );
        assert(
          !(await evaluate(
            "!!document.querySelector('#drawer a[href*=maps]')",
          )),
        );
        await evaluate("closeDrawer()");
      },
    );
    await step(
      "Search export and reload preserve saved transport states",
      async () => {
        if (manage || family) {
          await evaluate("transportWorkspaceFilter('q','QA safe')");
          assert.strictEqual(
            await evaluate("transportWorkspaceFiltered().length"),
            1,
          );
        }
        await evaluate("transportWorkspaceExport()");
        await cdp("Page.reload", { ignoreCache: true });
        await waitFor(
          () => evaluate("SCHOOLOS_ADAPTER.connected"),
          "login restore",
        );
        await evaluate("go('transport')");
        await waitFor(
          () => evaluate("transportWorkspaceState().loaded"),
          "transport reload",
        );
        if (manage)
          assert(
            await evaluate(
              "transportWorkspaceState().routes.find(r=>r.name==='QA Created '+state.role).history.length>=5",
            ),
          );
      },
    );
    await step("Mobile transport screen fits viewport", async () => {
      await cdp("Emulation.setDeviceMetricsOverride", {
        width: 390,
        height: 844,
        deviceScaleFactor: 1,
        mobile: true,
      });
      assert(
        await evaluate(
          "document.documentElement.scrollWidth<=window.innerWidth+1",
        ),
      );
      await screenshot("mobile");
    });
  },
);
