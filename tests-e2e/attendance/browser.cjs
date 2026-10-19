const assert = require("assert");
require("../helpers/browser.cjs")(
  "attendance",
  async ({
    role,
    step,
    evaluate: rawEvaluate,
    waitFor,
    fill,
    cdp,
    screenshot,
    api,
  }) => {
    const dates = {
      Principal: "03",
      Teacher: "05",
      Administrator: "07",
      Parent: "15",
      Student: "17",
      Accountant: "19",
    };
    const registerDate = "2026-09-" + dates[role];
    const evaluate = (code) =>
      rawEvaluate(
        code
          .replaceAll("2026-09-03", registerDate)
          .replaceAll(
            "2026-09-04",
            "2026-09-" + String(Number(dates[role]) + 1).padStart(2, "0"),
          ),
      );
    const mark = ["Administrator", "Principal", "Teacher"].includes(role),
      staff = ["Administrator", "Principal", "Teacher", "Accountant"].includes(
        role,
      );
    await waitFor(
      () => evaluate("SCHOOLOS_ADAPTER.live.attendance"),
      "Attendance hydration",
    );
    await step('Arabic attendance tabs names and absence options preserve saved values',async()=>{
      await evaluate("go('attendance');setLanguage('ar')");
      for(const tab of ['daily','monthly','analytics','requests',...(staff?['staff']:[])]){
       await evaluate("setSubTab('attendance',"+JSON.stringify(tab)+")");
       assert(!(await evaluate("/Mark each class|School timezone:|active students|Blank rows are not counted|Monthly register|Attendance follow-up|Based on saved sessions|Follow-up threshold|I'm present|I'm remote|I'm late/.test(document.getElementById('view').textContent)")),tab);
      }
      if(mark||role==='Parent'){
       await evaluate("setSubTab('attendance','requests');attRequestForm()");
       const before=await evaluate("[...document.querySelector('#drawer [data-fkey=student]').options].map(o=>o.value)");
       assert(await evaluate("[...document.querySelector('#drawer [data-fkey=student]').options].every(o=>o.hasAttribute('data-school-name')&&/[\\u0600-\\u06ff]/.test(o.textContent))"));
       await evaluate("setLanguage('en')");assert.deepStrictEqual(await evaluate("[...document.querySelector('#drawer [data-fkey=student]').options].map(o=>o.value)"),before);await evaluate('closeDrawer()');
      }else await evaluate("setLanguage('en')");
      await evaluate("setSubTab('attendance','daily')");
    });
    await step("Actual navigation and scoped active roster", async () => {
      await evaluate("go('attendance')");
      assert.strictEqual(
        await evaluate(
          "document.getElementById('view').textContent.includes('Save register')",
        ),
        mark,
      );
      if (role === "Parent" || role === "Student")
        assert.strictEqual(await evaluate("attRoster().length"), 1);
      if (role === "Accountant")
        assert(
          await evaluate(
            "document.getElementById('view').textContent.includes('Staff attendance')",
          ),
        );
    });
    await step('Guardian alerts are opt-in and hidden from read-only roles',async()=>{
      assert.strictEqual(await evaluate("Boolean(document.querySelector('[aria-label=\"Guardian alert channel\"]'))"),mark);
      if(mark){assert(await evaluate("!attDraft().notifyGuardians"));await evaluate("const select=document.querySelector('[aria-label=\"Guardian alert channel\"]');select.value='SMS';select.dispatchEvent(new Event('change',{bubbles:true}))");assert.strictEqual(await evaluate('attDraft().notificationChannel'),'SMS');await evaluate("attDraft().notificationChannel='InApp';attDraft().dirty=false");}
    });
    if (role === "Accountant") {
      await step(
        "Accountant staff attendance saves and excludes student records",
        async () => {
          await evaluate("markMyAttendance('Remote')");
          await waitFor(() => evaluate("!state.attStaffSaving"), "Staff save");
          assert(
            (await api("/attendance/staff")).data.some(
              (r) => r.role === "Accountant" && r.status === "Remote",
            ),
          );
          assert.strictEqual((await api("/attendance")).data.length, 0);
        },
      );
    } else {
      await step(
        "Unmarked is explicit and family has no editing controls",
        async () => {
          await evaluate(
            "attChange('attDate','2026-09-03');attChange('attSession','PM')",
          );
          assert(await evaluate("attCounts().u.length===attRoster().length"));
          assert.strictEqual(
            await evaluate(
              "document.querySelectorAll('#attList .seg2').length>0",
            ),
            mark,
          );
        },
      );
      if (mark) {
        await step(
          "All students must be marked; optional notes survive re-render",
          async () => {
            await evaluate("submitRegister()");
            assert(
              await evaluate(
                "document.getElementById('toastArea').textContent.includes('Mark every student')",
              ).catch(() =>
                evaluate(
                  "document.body.textContent.includes('Mark every student')",
                ),
              ),
            );
            await evaluate(
              "markAll('P');attSet(attRoster()[0].mongoId,'A');attNote(attRoster()[0].mongoId,'QA attendance note');render()",
            );
            assert(
              await evaluate(
                "attDraft().rows[attRoster()[0].mongoId].notes==='QA attendance note'",
              ),
            );
          },
        );
        await step(
          "Save actual register and retain statuses on reopening",
          async () => {
            await evaluate("submitRegister()");
            await waitFor(() => evaluate("!state.attSaving"), "Register save");
            assert(
              await evaluate("attCounts().u.length===0&&!attDraft().dirty"),
            );
            assert(
              await evaluate(
                "attRecordFor(attRoster()[0],attDate(),'PM').status==='Absent'",
              ),
            );
            await evaluate("go('dashboard');go('attendance')");
            assert(await evaluate("attCounts().a.length===1"));
          },
        );
        await step(
          "Correction needs reason; stale draft cannot overwrite another editor",
          async () => {
            await evaluate(
              "attSet(attRoster()[0].mongoId,'L');submitRegister()",
            );
            await waitFor(
              () => evaluate("!state.attSaving"),
              "Missing reason rejection",
            );
            assert(
              await evaluate(
                "attRecordFor(attRoster()[0],attDate(),'PM').status==='Absent'",
              ),
            );
            await evaluate(
              "attDraft().reason='Confirmed arrival';submitRegister()",
            );
            await waitFor(
              () => evaluate("!state.attSaving"),
              "Correction save",
            );
            assert(
              await evaluate(
                "attRecordFor(attRoster()[0],attDate(),'PM').status==='Late'",
              ),
            );
            const e = await evaluate(
              "({studentId:attRoster()[0].mongoId,status:'Present',expectedUpdatedAt:attDraft().rows[attRoster()[0].mongoId].expectedUpdatedAt})",
            );
            await api("/attendance/register", "PUT", {
              date: registerDate,
              session: "PM",
              entries: [e],
              correctionReason: "Concurrent editor",
            });
            await evaluate(
              "attSet(attRoster()[0].mongoId,'A');attDraft().reason='Stale correction';submitRegister()",
            );
            await waitFor(() => evaluate("!state.attSaving"), "Stale save");
            assert(await evaluate("attDraft().dirty"));
            assert(
              (
                await api(
                  "/attendance?dateFrom=" +
                    registerDate +
                    "&dateTo=" +
                    registerDate +
                    "&session=PM&studentId=" +
                    e.studentId,
                )
              ).data[0].status === "Present",
            );
            await evaluate("attDraft().dirty=false;attReload()");
            await waitFor(
              () => evaluate("attCounts().p.length===attRoster().length"),
              "Reload",
            );
          },
        );
        await step(
          "AM and PM are distinct, and class filtering preserves draft",
          async () => {
            await evaluate(
              "attChange('attDate','2026-09-04');attChange('attSession','AM');markAll('P');attChange('attClass','Grade 7 · B')",
            );
            assert(await evaluate("attCounts().u.length===attRoster().length"));
            await evaluate("attChange('attClass','Grade 7 · A')");
            assert(await evaluate("attCounts().p.length===attRoster().length"));
            await evaluate("submitRegister()");
            await waitFor(() => evaluate("!state.attSaving"), "AM save");
          },
        );
      }
      await step(
        "Monthly summary includes full roster and honest rates",
        async () => {
          await evaluate("setSubTab('attendance','monthly')");
          assert.strictEqual(
            await evaluate(
              "document.querySelectorAll('#view tbody tr').length",
            ),
            await evaluate("attRoster().length"),
          );
          assert(
            await evaluate(
              "document.getElementById('view').textContent.includes('AM / PM')",
            ),
          );
          await evaluate("setSubTab('attendance','analytics')");
          assert(
            !(await evaluate(
              "document.getElementById('view').textContent.includes('Guardian notified')",
            )),
          );
          assert(
            await evaluate(
              "document.getElementById('view').textContent.includes('Missing registers are not absence')",
            ),
          );
        },
      );
      if (mark || role === "Parent")
        await step(
          "Create absence via real form and review/cancel workflow",
          async () => {
            await evaluate(
              "setSubTab('attendance','requests');attRequestForm()",
            );
            const student = await evaluate(
              "attRoster()[0].id+' · '+attRoster()[0].name",
            );
            const day =
              role === "Principal"
                ? "10"
                : role === "Teacher"
                  ? "11"
                  : role === "Administrator"
                    ? "12"
                    : "13";
            await fill({
              student,
              from: "2026-09-" + day,
              to: "2026-09-" + day,
              type: "Medical",
              note: "QA medical request " + role,
            });
            await waitFor(
              () => evaluate("!state.attRequestSaving"),
              "Request create",
            );
            assert(
              await evaluate(
                "ABSENCE_REQUESTS.some(r=>r.note==='QA medical request '+state.role&&r.status==='Pending')",
              ),
            );
            const id = await evaluate(
              "ABSENCE_REQUESTS.find(r=>r.note==='QA medical request '+state.role).requestId",
            );
            if (mark) {
              await evaluate(
                "attDecision(" + JSON.stringify(id) + ',"Approved")',
              );
              await fill({ note: "QA approved" });
              await waitFor(
                () => evaluate("!state.attRequestSaving"),
                "Decision",
              );
              assert(
                await evaluate(
                  "ABSENCE_REQUESTS.find(r=>r.note==='QA medical request '+state.role).status==='Approved'",
                ),
              );
            } else {
              await evaluate("attCancel(" + JSON.stringify(id) + ")");
              await waitFor(
                () =>
                  evaluate(
                    "ABSENCE_REQUESTS.find(r=>r.note==='QA medical request '+state.role).status==='Cancelled'",
                  ),
                "Cancellation",
              );
            }
          },
        );
      if (staff)
        await step("Actual staff self-mark persists", async () => {
          await evaluate(
            "setSubTab('attendance','staff');markMyAttendance('Present')",
          );
          await waitFor(() => evaluate("!state.attStaffSaving"), "Self mark");
          assert(
            (await api("/attendance/staff")).data.some(
              (r) => r.role === role && r.status === "Present",
            ),
          );
        });
    }
    if (role !== "Accountant")
      await step("Export downloads saved scoped month records", async () => {
        const fs = require("fs"),
          dir = "/tmp/schoolos-attendance-download-" + role + "-" + Date.now();
        fs.mkdirSync(dir);
        await cdp("Page.setDownloadBehavior", {
          behavior: "allow",
          downloadPath: dir,
        });
        await evaluate("attExport()");
        await waitFor(
          () => fs.existsSync(dir + "/attendance-2026-09.csv"),
          "Attendance CSV",
        );
        const csv = fs.readFileSync(dir + "/attendance-2026-09.csv", "utf8");
        assert(csv.includes("Present"));
        assert(!csv.includes("Grade 7 · B"));
        if (role === "Parent" || role === "Student") {
          assert(csv.includes("QA-001"));
          assert(!csv.includes("QA-003"));
        }
      });
    if (mark)
      await step("Saved attendance survives full browser reload", async () => {
        await cdp("Page.reload");
        await waitFor(
          () =>
            evaluate(
              "Boolean(window.SCHOOLOS_ADAPTER?.connected&&SCHOOLOS_ADAPTER.live.attendance)",
            ),
          "Reload hydration",
        );
        await evaluate(
          "go('attendance');attChange('attDate','2026-09-03');attChange('attClass','Grade 7 · A');attChange('attSession','PM')",
        );
        assert(await evaluate("attCounts().p.length===attRoster().length"));
      });
    await evaluate(
      "setSubTab('attendance','" +
        (role === "Accountant" ? "staff" : "daily") +
        "')",
    );
    await cdp("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await screenshot("desktop");
    await step(
      "Mobile register and monthly table remain within viewport",
      async () => {
        await cdp("Emulation.setDeviceMetricsOverride", {
          width: 390,
          height: 844,
          deviceScaleFactor: 1,
          mobile: true,
        });
        assert(
          await evaluate(
            'document.getElementById("view").scrollWidth<=innerWidth',
          ),
        );
        await screenshot("mobile");
        if (role !== "Accountant") {
          await evaluate("setSubTab('attendance','monthly')");
          assert(
            await evaluate(
              'document.getElementById("view").scrollWidth<=innerWidth',
            ),
          );
          await screenshot("monthly-mobile");
        }
      },
    );
  },
).catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
