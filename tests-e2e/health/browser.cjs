const assert = require("assert");
require("../helpers/browser.cjs")(
  "health",
  async ({ role, step, evaluate, api, waitFor, fill, cdp, screenshot }) => {
    const office = ["Administrator", "Principal"].includes(role),
      recorder = office || role === "Teacher";
    await step(
      "Role-specific health view and full paginated records",
      async () => {
        await evaluate("go('health')");
        await waitFor(() => evaluate("healthState().loaded"), "Clinic load");
        assert.strictEqual(
          await evaluate(
            "document.getElementById('view').textContent.includes('New visit')",
          ),
          recorder,
        );
        assert.strictEqual(
          await evaluate(
            "document.getElementById('view').textContent.includes('Export filtered log')",
          ),
          office,
        );
        const count = await evaluate("healthState().rows.length");
        if (office) assert(count >= 22);
        else if (["Parent", "Student"].includes(role)) {
          assert(count > 0);
          assert(
            await evaluate(
              "healthState().rows.every(r=>r.student.refId==='QA-001')",
            ),
          );
        } else assert.strictEqual(count, 0);
        assert(
          !(await evaluate(
            "document.getElementById('view').textContent.includes('97%')",
          )),
        );
      },
    );
    if (recorder)
      await step(
        "Actual clinic handover form saves date and follow-up",
        async () => {
          await evaluate("healthNewVisit()");
          const choice = await evaluate("healthState().choices[0].label"),
            today = await evaluate("healthDay()");
          await fill({
            student: choice,
            visitDate: today,
            severity: "Urgent",
            reason: "QA Visit " + role,
            treatment: "Fictional recorded action",
            outcome: "Under observation",
            followUpDate: today,
            followUpNote: "QA follow-up note",
          });
          await waitFor(() => evaluate("!healthState().saving"), "Clinic save");
          if (office)
            assert(
              await evaluate(
                "healthState().rows.some(r=>r.reason==='QA Visit '+state.role)",
              ),
            );
          else {
            assert.strictEqual(await evaluate("healthState().rows.length"), 0);
            assert(
              !(await evaluate(
                "document.getElementById('drawer').classList.contains('open')",
              )),
            );
          }
        },
      );
    if (office || ["Parent", "Student"].includes(role))
      await step(
        "Literal clinical content and real detail are safe",
        async () => {
          await evaluate(
            "healthDetail(healthState().rows.find(r=>r.reason.includes('<img'))._id)",
          );
          assert(
            await evaluate(
              "document.getElementById('drawer').textContent.includes('QA sensitive <img')",
            ),
          );
          assert(
            !(await evaluate(
              "document.querySelector('#drawer img[src=x]')!==null",
            )),
          );
          assert.strictEqual(
            await evaluate(
              "document.getElementById('drawer').textContent.includes('Update / follow-up')",
            ),
            office,
          );
          await evaluate("closeDrawer()");
        },
      );
    if (office) {
      await step(
        "Office records family contact and clears completed follow-up",
        async () => {
          await evaluate(
            "healthEditVisit(healthState().rows.find(r=>r.reason==='QA Visit '+state.role)._id)",
          );
          await fill({
            outcome: "Sent home",
            parentContacted: "Yes",
            followUpDate: "",
            followUpNote: "Guardian collected",
            reason: "QA guardian collection",
          });
          await waitFor(
            () => evaluate("!healthState().saving"),
            "Clinic update",
          );
          assert(
            await evaluate(
              "healthState().rows.find(r=>r.reason==='QA Visit '+state.role).parentContacted",
            ),
          );
          assert(
            await evaluate(
              "healthState().rows.find(r=>r.reason==='QA Visit '+state.role).history.length===1",
            ),
          );
          await evaluate(
            "healthDetail(healthState().rows.find(r=>r.reason==='QA Visit '+state.role)._id)",
          );
          assert(
            await evaluate(
              "document.getElementById('drawer').textContent.includes('QA guardian collection')",
            ),
          );
          await evaluate("closeDrawer()");
        },
      );
      await step("Search and due follow-up filter use saved data", async () => {
        await evaluate(
          "healthSearch('QA sensitive');healthState().followUp=true;render()",
        );
        assert.strictEqual(await evaluate("healthFiltered().length"), 1);
        await evaluate("healthExport()");
        await evaluate(
          "healthState().q='';healthState().followUp=false;render()",
        );
      });
      await step("Reload preserves clinic history", async () => {
        await cdp("Page.reload", { ignoreCache: true });
        await waitFor(
          () =>
            evaluate(
              "SCHOOLOS_ADAPTER.connected && SCHOOLOS_ADAPTER.live.health",
            ),
          "Hydrated after reload",
        );
        await evaluate("go('health')");
        await waitFor(() => evaluate("healthState().loaded"), "Clinic reload");
        assert(
          await evaluate(
            "healthState().rows.some(r=>r.reason==='QA Visit '+state.role&&r.history.length===1)",
          ),
        );
      });
    } else
      await step("Clinic updates remain denied for this role", async () => {
        assert(
          await evaluate(
            "SCHOOLOS_ADAPTER.api('/health-records/64b7f9c9a1b2c3d4e5f60789',{method:'PATCH',body:JSON.stringify({outcome:'Sent home'})}).then(()=>false).catch(()=>true)",
          ),
        );
      });
    await step("Responsive clinic page stays within viewport", async () => {
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
