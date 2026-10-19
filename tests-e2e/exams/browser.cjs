const assert = require("assert");
require("../helpers/browser.cjs")(
  "exams",
  async ({ role, step, evaluate, api, waitFor, fill, cdp, screenshot }) => {
    const manager = ["Administrator", "Principal", "Teacher"].includes(role),
      allowed = manager || ["Parent", "Student"].includes(role);
    await waitFor(
      () => evaluate("SCHOOLOS_ADAPTER.exams!==undefined"),
      "Exam hydration",
    );
    await step("Academic roles and publication privacy", async () => {
      await evaluate("go('exams')");
      assert.strictEqual(
        await evaluate(
          "document.getElementById('view').textContent.includes('New exam scheme')",
        ),
        manager,
      );
      if (!allowed)
        assert(
          await evaluate(
            "document.getElementById('view').textContent.includes('restricted')",
          ),
        );
      else if (!manager) {
        assert.strictEqual(await evaluate("examList().length"), 1);
        assert.strictEqual(await evaluate("examResultRows().length"), 1);
        assert(
          await evaluate(
            "document.getElementById('view').textContent.includes('60%')",
          ),
        );
      }
    });
    if (!allowed) return;
    await step(
      "Exam selector, saved datesheet and genuine analysis",
      async () => {
        await evaluate(
          "examChange(SCHOOLOS_ADAPTER.exams.find(e=>e.name==='QA Published Assessment')._id);setSubTab('exams-v','schedule');render()",
        );
        assert(
          await evaluate(
            "document.getElementById('view').textContent.includes('2026-11-10')",
          ),
        );
        await evaluate("setSubTab('exams-v','analysis');render()");
        assert(
          await evaluate(
            "document.getElementById('view').textContent.includes('60%')",
          ),
        );
        await evaluate("setSubTab('exams-v','results');render()");
      },
    );
    await step(
      "View and export an issued immutable report-card snapshot",
      async () => {
        await evaluate("examOpenResult(examResultRows()[0].student._id)");
        assert(
          await evaluate(
            "document.getElementById('drawer').textContent.includes('View issued report card')",
          ),
        );
        await evaluate("examOpenCard(examResultRows()[0].student._id)");
        assert(
          await evaluate(
            "document.getElementById('drawer').textContent.includes('original issued record')",
          ),
        );
        assert(
          await evaluate(
            "(()=>{const original=studentDownloadCSV;let rows;studentDownloadCSV=(name,r)=>rows=r;examCardExport(examResultRows()[0].student._id);studentDownloadCSV=original;return rows[1].includes(60)})()",
          ),
        );
        await evaluate("closeDrawer()");
      },
    );
    if (manager) {
      await step("Create assessment with distinct subjects", async () => {
        await evaluate("examCreateForm()");
        await fill({
          name: "QA Browser " + role,
          term: "Term QA",
          subjects: "Math\nEnglish",
          max: "50",
          pass: "25",
        });
        await waitFor(() => evaluate("!state.examSaving"), "Scheme save");
        assert(
          await evaluate("examSelected().name==='QA Browser '+state.role"),
        );
      });
      await step("Save actual datesheet through form", async () => {
        await evaluate("examScheduleForm()");
        await fill({
          date0: "2026-11-20",
          time0: "09:30",
          duration0: "90",
          venue0: "QA Hall " + role,
          date1: "",
        });
        await waitFor(() => evaluate("!state.examSaving"), "Datesheet save");
        assert(
          await evaluate(
            "examSelected().schedule[0].venue==='QA Hall '+state.role",
          ),
        );
      });
      await step(
        "Save marks including zero and correct with reason/history",
        async () => {
          await evaluate("enterMarksForm()");
          await fill({
            student: "QA-001 · QA Student 00",
            mark0: "0",
            mark1: "40",
          });
          await waitFor(() => evaluate("!state.examSaving"), "Marks save");
          assert(await evaluate("examResultRows()[0].averagePercent===40"));
          await evaluate("enterMarksForm(examResultRows()[0].student._id)");
          await fill({
            mark0: "30",
            mark1: "40",
            reason: "QA moderation reason " + role,
          });
          await waitFor(() => evaluate("!state.examSaving"), "Correction save");
          assert(
            await evaluate(
              "examResultRows()[0].averagePercent===70&&examResultRows()[0].corrections.length===1",
            ),
          );
          await evaluate("examOpenResult(examResultRows()[0].student._id)");
          assert(
            await evaluate(
              "document.getElementById('drawer').textContent.includes('QA moderation reason')",
            ),
          );
          await evaluate("closeDrawer()");
        },
      );
      await step(
        "Explicit publication locks forms and issues idempotent class-filtered card",
        async () => {
          await evaluate("examPublicationReview();examPublicationSave()");
          await waitFor(() => evaluate("!state.examSaving"), "Publication");
          assert(await evaluate("examSelected().locked"));
          assert(
            !(await evaluate(
              "document.getElementById('view').textContent.includes('Enter marks')",
            )),
          );
          await evaluate("genReportCardsForm()");
          await fill({ grade: "Grade 7 · A" });
          await waitFor(() => evaluate("!state.examSaving"), "Card save");
          const cards = await api("/certificates");
          assert(
            cards.data.some(
              (c) =>
                c.assessmentSnapshot &&
                c.assessmentSnapshot.examName === "QA Browser " + role,
            ),
          );
        },
      );
      await step("Moderation reopening restores editable marks", async () => {
        await evaluate("examPublicationReview();examPublicationSave()");
        await waitFor(() => evaluate("!state.examSaving"), "Reopen");
        assert(
          await evaluate(
            "!examSelected().locked&&document.getElementById('view').textContent.includes('Enter marks')",
          ),
        );
      });
    }
    await step(
      "Filter empty state and CSV use the selected assessment",
      async () => {
        await evaluate("examFilterSearch('NO-MATCH')");
        assert(
          await evaluate(
            "document.getElementById('view').textContent.includes('No saved results')",
          ),
        );
        await evaluate("examFilterSearch('')");
        assert(
          await evaluate(
            "(()=>{const original=studentDownloadCSV;let rows;studentDownloadCSV=(name,r)=>rows=r;examExport();studentDownloadCSV=original;return rows.length===examResultRows().length+1&&rows[1][0]===examSelected().name})()",
          ),
        );
      },
    );
    await step("Reload retains saved assessment and role scope", async () => {
      await cdp("Page.reload", { ignoreCache: true });
      await waitFor(
        () =>
          evaluate(
            "SCHOOLOS_ADAPTER.connected&&SCHOOLOS_ADAPTER.exams!==undefined",
          ),
        "Reload",
      );
      await evaluate("go('exams')");
      if (manager) {
        await evaluate(
          "examChange(SCHOOLOS_ADAPTER.exams.find(e=>e.name==='QA Browser '+state.role)._id)",
        );
        assert(
          await evaluate(
            "examResultRows()[0].averagePercent===70&&examSelected().schedule.length===1",
          ),
        );
      } else assert.strictEqual(await evaluate("examList().length"), 1);
    });
    await step("Mobile results and datesheet remain usable", async () => {
      await cdp("Emulation.setDeviceMetricsOverride", {
        width: 390,
        height: 844,
        deviceScaleFactor: 1,
        mobile: true,
      });
      await evaluate("render()");
      assert(
        await evaluate("document.documentElement.scrollWidth<=innerWidth+2"),
      );
      await screenshot("mobile");
      await evaluate("setSubTab('exams-v','schedule');render()");
      await screenshot("mobile-datesheet");
    });
  },
);
