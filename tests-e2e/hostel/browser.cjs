const assert = require("assert");
require("../helpers/browser.cjs")(
  "hostel",
  async ({ role, step, evaluate, waitFor, fill, cdp, screenshot }) => {
    const manage = ["Administrator", "Principal", "Teacher"].includes(role),
      family = ["Parent", "Student"].includes(role),
      ref =
        role === "Principal"
          ? "QA-028"
          : role === "Teacher"
            ? "QA-029"
            : "QA-030";
    await step(
      "Hostel loads all room pages and correct family payloads",
      async () => {
        await evaluate("go('hostel')");
        await waitFor(
          () => evaluate("hostelWorkspaceState().loaded"),
          "hostel loaded",
        );
        assert.strictEqual(
          await evaluate(
            "document.getElementById('view').textContent.includes('Add room')",
          ),
          manage,
        );
        if (manage) {
          assert(await evaluate("hostelWorkspaceState().rooms.length>=25"));
          await evaluate("hostelWorkspaceFilter('page',2)");
          assert(await evaluate("hostelWorkspaceState().page===2"));
        }
        if (family) {
          assert.strictEqual(
            await evaluate("hostelWorkspaceState().rooms.length"),
            1,
          );
          assert(
            await evaluate(
              "hostelWorkspaceState().rooms.every(r=>r.occupants.length===1&&r.occupants[0].refId==='QA-001'&&r.allocations.length===1&&r.history.length===0)",
            ),
          );
        }
        if (role === "Accountant")
          assert(
            await evaluate(
              "hostelWorkspaceState().rooms.length===0&&hostelWorkspaceState().leave.length===0",
            ),
          );
      },
    );
    if (role !== "Accountant")
      await step(
        "Safe room detail shows only authorized boarders and real warden contact",
        async () => {
          await evaluate(
            "hostelWorkspaceDetail(hostelWorkspaceState().rooms.find(r=>r.roomNumber.includes('<img'))._id)",
          );
          assert(
            await evaluate(
              "document.getElementById('drawer').textContent.includes('QA <img')",
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
              "document.getElementById('drawer').textContent.includes('Fictional warden')",
            ),
          );
          await evaluate("closeDrawer()");
        },
      );
    if (manage) {
      await step(
        "Room form creates and reviews actual accommodation metadata",
        async () => {
          await evaluate("hostelWorkspaceRoomForm()");
          await fill({
            roomNumber: "QA Created " + role,
            block: "QA New",
            capacity: "2",
            genderPolicy: "Any",
            warden: "QA appointed warden",
            wardenPhone: "+971501234567",
          });
          await waitFor(
            () => evaluate("!hostelWorkspaceState().saving"),
            "room created",
          );
          assert(
            await evaluate(
              "hostelWorkspaceState().rooms.some(r=>r.roomNumber==='QA Created '+state.role&&r.capacity===2)",
            ),
          );
          await evaluate(
            "hostelWorkspaceRoomForm(hostelWorkspaceState().rooms.find(r=>r.roomNumber==='QA Created '+state.role)._id)",
          );
          await fill({
            warden: "QA reviewed warden",
            reason: "QA appointment review",
          });
          await waitFor(
            () => evaluate("!hostelWorkspaceState().saving"),
            "room reviewed",
          );
          assert(
            await evaluate(
              "hostelWorkspaceState().rooms.find(r=>r.roomNumber==='QA Created '+state.role).history.length===1",
            ),
          );
        },
      );
      await step(
        "Allocation assigns an actual student and confirmed bed label",
        async () => {
          await evaluate(
            "hostelWorkspaceAllocateForm(hostelWorkspaceState().rooms.find(r=>r.roomNumber==='QA Created '+state.role)._id)",
          );
          await fill({
            student: await evaluate(
              "hostelWorkspaceState().studentChoices.find(s=>s.label.endsWith('" +
                ref +
                "')).label",
            ),
            bedLabel: "Bed A",
          });
          await waitFor(
            () => evaluate("!hostelWorkspaceState().saving"),
            "boarder allocated",
          );
          assert(
            await evaluate(
              "hostelWorkspaceState().rooms.find(r=>r.roomNumber==='QA Created '+state.role).allocations[0].bedLabel==='Bed A'",
            ),
          );
        },
      );
      await step(
        "Roll-call records actual absence and reasoned correction",
        async () => {
          await evaluate(
            "hostelWorkspaceRollForm(hostelWorkspaceBoarders().find(s=>s.refId==='" +
              ref +
              "')._id)",
          );
          await fill({ status: "Absent" });
          await waitFor(
            () => evaluate("!hostelWorkspaceState().saving"),
            "absence saved",
          );
          await evaluate(
            "hostelWorkspaceRollForm(hostelWorkspaceBoarders().find(s=>s.refId==='" +
              ref +
              "')._id)",
          );
          await fill({ status: "Late", reason: "QA late arrival verified" });
          await waitFor(
            () => evaluate("!hostelWorkspaceState().saving"),
            "roll corrected",
          );
          assert(
            await evaluate(
              "hostelWorkspaceState().roll.find(r=>r.student.refId==='" +
                ref +
                "').history.length===1",
            ),
          );
          await evaluate("hostelWorkspaceConfirmUnmarked()");
          assert(
            await evaluate(
              "hostelWorkspaceState().roll.find(r=>r.student.refId==='" +
                ref +
                "').status==='Late'",
            ),
          );
        },
      );
      await step(
        "Gate pass request approval and physical transitions persist",
        async () => {
          await evaluate("hostelWorkspaceLeaveForm()");
          await fill({
            student: await evaluate(
              "hostelWorkspaceState().boarderChoices.find(s=>s.label.includes(' · " +
                ref +
                " · ')).label",
            ),
            type: "Day leave",
            fromDate: await evaluate("healthDay()"),
            toDate: await evaluate("healthDay()"),
            reason: "QA actual gate pass " + role,
          });
          await waitFor(
            () => evaluate("!hostelWorkspaceState().saving"),
            "gate requested",
          );
          await evaluate(
            "hostelWorkspaceTransitionForm(hostelWorkspaceState().leave.find(r=>r.reason==='QA actual gate pass '+state.role)._id)",
          );
          await fill({
            action: "approve",
            pickupName: "QA authorized guardian",
            pickupPhone: "+971501234567",
            consent: "Confirmed",
            reason: "QA pickup identity and consent checked",
          });
          await waitFor(
            () => evaluate("!hostelWorkspaceState().saving"),
            "gate approved",
          );
          assert(
            await evaluate(
              "hostelWorkspaceState().leave.find(r=>r.reason==='QA actual gate pass '+state.role).guardianConsentConfirmed",
            ),
          );
          await evaluate(
            "hostelWorkspaceTransitionForm(hostelWorkspaceState().leave.find(r=>r.reason==='QA actual gate pass '+state.role)._id)",
          );
          await fill({
            action: "mark-out",
            reason: "QA physical authorized departure",
          });
          await waitFor(
            () => evaluate("!hostelWorkspaceState().saving"),
            "gate departed",
          );
          assert(
            await evaluate(
              "!!hostelWorkspaceState().leave.find(r=>r.reason==='QA actual gate pass '+state.role).departedAt",
            ),
          );
          await evaluate(
            "hostelWorkspaceTransitionForm(hostelWorkspaceState().leave.find(r=>r.reason==='QA actual gate pass '+state.role)._id)",
          );
          await fill({
            action: "return",
            reason: "QA physical return confirmed",
          });
          await waitFor(
            () => evaluate("!hostelWorkspaceState().saving"),
            "gate returned",
          );
          assert(
            await evaluate(
              "hostelWorkspaceState().leave.find(r=>r.reason==='QA actual gate pass '+state.role).status==='Returned'&&hostelWorkspaceState().leave.find(r=>r.reason==='QA actual gate pass '+state.role).history.length===3",
            ),
          );
        },
      );
      await step(
        "Maintenance forms persist repair action and resolution history",
        async () => {
          await evaluate("hostelWorkspaceMaintenanceForm()");
          await fill({
            refId: "HM-CREATED-" + role,
            room: await evaluate(
              "hostelWorkspaceState().roomChoices.find(r=>r.label==='QA New · QA Created '+state.role).label",
            ),
            issue: "QA fixture repair " + role,
            category: "Electrical",
            priority: "High",
          });
          await waitFor(
            () => evaluate("!hostelWorkspaceState().saving"),
            "maintenance created",
          );
          await evaluate(
            "hostelWorkspaceMaintenanceForm(hostelWorkspaceState().maintenance.find(r=>r.refId==='HM-CREATED-'+state.role)._id)",
          );
          await fill({
            status: "Resolved",
            resolution: "QA repair inspected",
            reason: "QA work completion",
          });
          await waitFor(
            () => evaluate("!hostelWorkspaceState().saving"),
            "maintenance resolved",
          );
          assert(
            await evaluate(
              "hostelWorkspaceState().maintenance.find(r=>r.refId==='HM-CREATED-'+state.role).history.length===1",
            ),
          );
        },
      );
      await step(
        "Discharge and empty-room archive preserve allocation history",
        async () => {
          await evaluate(
            "hostelWorkspaceDischargeForm(hostelWorkspaceState().rooms.find(r=>r.roomNumber==='QA Created '+state.role)._id,hostelWorkspaceState().rooms.find(r=>r.roomNumber==='QA Created '+state.role).occupants[0]._id)",
          );
          await fill({ reason: "QA boarding term ended" });
          await waitFor(
            () => evaluate("!hostelWorkspaceState().saving"),
            "boarder discharged",
          );
          assert(
            await evaluate(
              "hostelWorkspaceState().rooms.find(r=>r.roomNumber==='QA Created '+state.role).occupants.length===0",
            ),
          );
          await evaluate(
            "hostelWorkspaceRoomForm(hostelWorkspaceState().rooms.find(r=>r.roomNumber==='QA Created '+state.role)._id)",
          );
          await fill({ archived: "Archived", reason: "QA room retired" });
          await waitFor(
            () => evaluate("!hostelWorkspaceState().saving"),
            "room archived",
          );
          assert(
            await evaluate(
              "hostelWorkspaceState().rooms.find(r=>r.roomNumber==='QA Created '+state.role).archived",
            ),
          );
          await evaluate(
            "hostelWorkspaceRoomForm(hostelWorkspaceState().rooms.find(r=>r.roomNumber==='QA Created '+state.role)._id)",
          );
          await fill({ archived: "Active", reason: "QA room restore" });
          await waitFor(
            () => evaluate("!hostelWorkspaceState().saving"),
            "room restored",
          );
          assert(
            await evaluate(
              "!hostelWorkspaceState().rooms.find(r=>r.roomNumber==='QA Created '+state.role).archived",
            ),
          );
        },
      );
    }
    if (family)
      await step(
        "Family can request and cancel their own gate pass without approval authority",
        async () => {
          await evaluate("hostelWorkspaceLeaveForm()");
          await fill({
            student: await evaluate(
              "hostelWorkspaceState().boarderChoices[0].label",
            ),
            type: "Day leave",
            fromDate: await evaluate("healthDay()"),
            toDate: await evaluate("healthDay()"),
            reason: "QA family request " + role,
          });
          await waitFor(
            () => evaluate("!hostelWorkspaceState().saving"),
            "family requested",
          );
          assert(
            await evaluate(
              "hostelWorkspaceState().leave.some(r=>r.reason==='QA family request '+state.role&&r.status==='Requested')",
            ),
          );
          await evaluate(
            "hostelWorkspaceTransitionForm(hostelWorkspaceState().leave.find(r=>r.reason==='QA family request '+state.role)._id)",
          );
          await fill({
            action: "cancel",
            reason: "QA family outing cancelled",
          });
          await waitFor(
            () => evaluate("!hostelWorkspaceState().saving"),
            "family cancelled",
          );
          assert(
            await evaluate(
              "hostelWorkspaceState().leave.find(r=>r.reason==='QA family request '+state.role).status==='Cancelled'",
            ),
          );
        },
      );
    await step(
      "Rapid date changes retain the current roll-call register",
      async () => {
        await evaluate(
          "hostelWorkspaceFilter('date','2026-01-01');hostelWorkspaceFilter('date',healthDay())",
        );
        await waitFor(
          () =>
            evaluate(
              "!hostelWorkspaceState().loading&&hostelWorkspaceState().loaded",
            ),
          "roll date restored",
        );
        assert(
          await evaluate(
            "hostelWorkspaceState().roll.every(r=>r.date===healthDay())",
          ),
        );
      },
    );
    await step(
      "Search export and reload preserve saved Hostel records",
      async () => {
        if (role !== "Accountant") {
          await evaluate("hostelWorkspaceFilter('q','QA <img')");
          assert.strictEqual(
            await evaluate("hostelWorkspaceFiltered().length"),
            1,
          );
        }
        await evaluate("hostelWorkspaceExport()");
        await cdp("Page.reload", { ignoreCache: true });
        await waitFor(
          () => evaluate("SCHOOLOS_ADAPTER.connected"),
          "login restored",
        );
        await evaluate("go('hostel')");
        await waitFor(
          () => evaluate("hostelWorkspaceState().loaded"),
          "hostel reload",
        );
        if (manage)
          assert(
            await evaluate(
              "hostelWorkspaceState().leave.find(r=>r.reason==='QA actual gate pass '+state.role).status==='Returned'",
            ),
          );
      },
    );
    await step("Mobile Hostel view fits the screen", async () => {
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
