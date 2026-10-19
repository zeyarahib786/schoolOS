const assert = require("assert");
require("../helpers/browser.cjs")(
  "behaviour",
  async ({ role, step, evaluate, api, waitFor, fill, cdp, screenshot }) => {
    const staff = ["Administrator", "Principal", "Teacher"].includes(role),
      office = ["Administrator", "Principal"].includes(role);
    await step("Correct role controls and complete register load", async () => {
      await evaluate("go('behaviour')");
      await waitFor(
        () => evaluate("behaviourState().loaded"),
        "Behaviour load",
      );
      assert.strictEqual(
        await evaluate(
          "document.getElementById('view').textContent.includes('Log entry')",
        ),
        staff,
      );
      if (staff) assert(await evaluate("behaviourState().rows.length>=25"));
      else if (["Parent", "Student"].includes(role)) {
        assert(
          await evaluate(
            "behaviourState().rows.every(r=>r.student.refId==='QA-001'&&r.visibility!=='Staff only')",
          ),
        );
        assert(await evaluate("behaviourState().rows.length>0"));
      } else
        assert.strictEqual(await evaluate("behaviourState().rows.length"), 0);
      assert(
        !(await evaluate(
          "document.getElementById('view').textContent.includes('Top house')",
        )),
      );
    });
    if (staff) {
      await step(
        "Actual entry form persists case with type defaults",
        async () => {
          await evaluate("behaviourNewEntry()");
          const choice = await evaluate("behaviourState().choices[0].label");
          await fill({
            student: choice,
            type: "Incident",
            category: "Classroom",
            description: "QA Case " + role,
            incidentDate: await evaluate("healthDay()"),
            severity: "Moderate",
            points: "",
            actionTaken: "Fictional initial action",
            visibility: "Shared with family",
            followUpDate: await evaluate("healthDay()"),
          });
          await waitFor(
            () => evaluate("!behaviourState().saving"),
            "Behaviour save",
          );
          assert(
            await evaluate(
              "behaviourState().rows.some(r=>r.description==='QA Case '+state.role&&r.points===-2)",
            ),
          );
        },
      );
      await step("Decision form records escalation and history", async () => {
        await evaluate(
          "behaviourEditCase(behaviourState().rows.find(r=>r.description==='QA Case '+state.role)._id)",
        );
        await fill({
          status: "Escalated",
          reason: "QA office review requested",
          actionTaken: "Fictional school review",
          ...(office ? { assignedToEmail: "teacher@example.invalid" } : {}),
        });
        await waitFor(
          () => evaluate("!behaviourState().saving"),
          "Decision save",
        );
        assert(
          await evaluate(
            "behaviourState().rows.find(r=>r.description==='QA Case '+state.role).status==='Escalated'",
          ),
        );
        assert(
          await evaluate(
            "behaviourState().rows.find(r=>r.description==='QA Case '+state.role).history.length===1",
          ),
        );
        if (!office)
          assert(
            !(await evaluate(
              "behaviourCanUpdate(behaviourState().rows.find(r=>r.description==='QA Case '+state.role))",
            )),
          );
      });
      if (office) {
        await step("Office closes case with recorded resolution", async () => {
          await evaluate(
            "behaviourEditCase(behaviourState().rows.find(r=>r.description==='QA Case '+state.role)._id)",
          );
          await fill({
            status: "Closed",
            reason: "QA reviewed resolution",
            actionTaken: "Fictional agreed resolution",
          });
          await waitFor(
            () => evaluate("!behaviourState().saving"),
            "Case close",
          );
          assert(
            await evaluate(
              "behaviourState().rows.find(r=>r.description==='QA Case '+state.role).history.length===2",
            ),
          );
          assert(
            await evaluate(
              "behaviourState().rows.find(r=>r.description==='QA Case '+state.role).status==='Closed'",
            ),
          );
        });
      }
      await step(
        "Merit award has positive points and closed status",
        async () => {
          await evaluate("behaviourNewEntry()");
          await fill({
            student: await evaluate("behaviourState().choices[0].label"),
            type: "Merit",
            category: "Achievement",
            description: "QA Merit " + role,
            incidentDate: await evaluate("healthDay()"),
            points: "",
            visibility: "Type default",
          });
          await waitFor(
            () => evaluate("!behaviourState().saving"),
            "Merit save",
          );
          assert(
            await evaluate(
              "behaviourState().rows.some(r=>r.description==='QA Merit '+state.role&&r.points===2&&r.status==='Closed')",
            ),
          );
        },
      );
    }
    if (role !== "Accountant")
      await step("Safe detail and family witness privacy", async () => {
        await evaluate(
          "behaviourRecordDetail(behaviourState().rows.find(r=>r.description.includes('<img'))._id)",
        );
        assert(
          await evaluate(
            "document.getElementById('drawer').textContent.includes('QA shared <img')",
          ),
        );
        assert(
          !(await evaluate(
            "document.querySelector('#drawer img[src=x]')!==null",
          )),
        );
        assert.strictEqual(
          await evaluate(
            "document.getElementById('drawer').textContent.includes('Fictional staff witness')",
          ),
          staff,
        );
        await evaluate("closeDrawer()");
      });
    if (["Parent", "Student"].includes(role))
      await step(
        "Confidential pastoral notes never enter family payload",
        async () => {
          assert(
            !(await evaluate(
              "JSON.stringify(behaviourState().rows).includes('QA confidential pastoral content')",
            )),
          );
          assert(
            await evaluate(
              "behaviourState().rows.every(r=>!r.witness&&!r.assignedTo&&r.history.length===0)",
            ),
          );
        },
      );
    if (staff)
      await step("Search and reload preserve saved decisions", async () => {
        await evaluate("behaviourSearch('QA Case '+state.role)");
        assert.strictEqual(await evaluate("behaviourFiltered().length"), 1);
        if (office) await evaluate("behaviourExport()");
        await cdp("Page.reload", { ignoreCache: true });
        await waitFor(
          () => evaluate("SCHOOLOS_ADAPTER.connected"),
          "Login restore",
        );
        await evaluate("go('behaviour')");
        await waitFor(
          () => evaluate("behaviourState().loaded"),
          "Behaviour reload",
        );
        assert(
          await evaluate(
            "behaviourState().rows.some(r=>r.description==='QA Case '+state.role&&r.history.length>=1)",
          ),
        );
      });
    await step("Mobile behaviour screen fits viewport", async () => {
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
