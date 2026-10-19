const assert = require("assert");
require("../helpers/browser.cjs")(
  "classes",
  async ({ role, step, evaluate, waitFor, fill, cdp, screenshot }) => {
    const allowed = ["Administrator", "Principal", "Teacher"].includes(role),
      manager = ["Administrator", "Principal"].includes(role);
    await waitFor(
      () => evaluate("SCHOOLOS_ADAPTER.live.classes"),
      "Classes hydration",
    );
    await step('Class cards and timetable instructions translate to Arabic and back',async()=>{
      await evaluate("go('classes');setLanguage('ar')");
      assert(!(await evaluate("/Room not assigned|available places|Edit section/.test(document.getElementById('view').textContent)")));
      await evaluate("go('timetable')");
      assert(!(await evaluate("/highlighted as today|click a period to edit|drag one period|conflicts re-check instantly|view only - editing requires/.test(document.getElementById('view').textContent)")));
      await screenshot('classes-timetable-arabic');await evaluate("setLanguage('en');go('classes')");
    });
    await step("Role navigation and management boundary", async () => {
      assert.strictEqual(
        await evaluate(
          "Boolean(document.querySelector('#nav [aria-label=\"Classes & Sections\"]'))",
        ),
        allowed,
      );
      await evaluate("go('classes')");
      assert.strictEqual(
        await evaluate(
          "document.getElementById('view').textContent.includes('Add section')",
        ),
        allowed,
      );
      if (!allowed)
        assert(
          await evaluate(
            "document.getElementById('view').textContent.includes('restricted')",
          ),
        );
    });
    if (!allowed) return;
    await step("Live counts and full roster beyond six students", async () => {
      assert(
        await evaluate("CLASSES.find(c=>c.cls==='Grade 7 · A').filled===16"),
      );
      await evaluate("classOpen('Grade 7 · A')");
      assert.strictEqual(
        await evaluate("document.querySelectorAll('#drawer tbody tr').length"),
        16,
      );
      await evaluate("closeDrawer()");
    });
    await step("Persistent search and truthful empty state", async () => {
      await evaluate("classFilter('q','NO-MATCH')");
      assert(
        await evaluate(
          "document.getElementById('clsGrid').textContent.includes('No sections match')",
        ),
      );
      await evaluate("go('dashboard');go('classes')");
      assert.strictEqual(
        await evaluate("document.getElementById('clsSearch').value"),
        "NO-MATCH",
      );
      await evaluate("classFilter('q','')");
    });
    await step("Create section through real form and persist", async () => {
      await evaluate("addSectionForm()");
      await fill({
        grade: "Grade 9",
        section: role === "Principal" ? "A" : role === "Teacher" ? "B" : "C",
        stream: "Science",
        teacher: "Unassigned",
        room: "QA lab " + role,
        cap: "25",
      });
      await waitFor(() => evaluate("!state.classSaving"), "Section save");
      assert(
        await evaluate(
          "CLASSES.some(c=>c.room==='QA lab '+state.role&&c.cap===25)",
        ),
      );
    });
    if (manager)
      await step(
        "Edit room, teacher clearing and archive/restore",
        async () => {
          await evaluate(
            "classEdit(CLASSES.find(c=>c.room==='QA lab '+state.role).mongoId)",
          );
          await fill({
            stream: "Arts",
            teacher: "Unassigned",
            room: "QA updated " + role,
            cap: "28",
            status: "Archived",
          });
          await waitFor(() => evaluate("!state.classSaving"), "Edit save");
          assert(
            await evaluate(
              "CLASSES.some(c=>c.room==='QA updated '+state.role&&c.status==='Archived')",
            ),
          );
          await evaluate("classFilter('status','Archived')");
          assert(
            await evaluate(
              "document.getElementById('clsGrid').textContent.includes('QA updated '+state.role)",
            ),
          );
          await evaluate(
            "classEdit(CLASSES.find(c=>c.room==='QA updated '+state.role).mongoId)",
          );
          await fill({
            stream: "Arts",
            teacher: "Unassigned",
            room: "QA updated " + role,
            cap: "28",
            status: "Active",
          });
          await waitFor(() => evaluate("!state.classSaving"), "Restore");
          await evaluate("classFilter('status','Active')");
        },
      );
    await step("Class to attendance opens selected class", async () => {
      await evaluate("classAttendance('Grade 7 · B')");
      assert.strictEqual(await evaluate("attSelectedClass()"), "Grade 7 · B");
      await evaluate("go('classes')");
    });
    await step("Real full-roster CSV download", async () => {
      const fs = require("fs"),
        dir = "/tmp/schoolos-classes-download-" + role + "-" + Date.now();
      fs.mkdirSync(dir);
      await cdp("Page.setDownloadBehavior", {
        behavior: "allow",
        downloadPath: dir,
      });
      await evaluate("classRosterExport('Grade 7 · A')");
      await waitFor(
        () => fs.existsSync(dir + "/class-roster.csv"),
        "Roster CSV",
      );
      const csv = fs.readFileSync(dir + "/class-roster.csv", "utf8");
      assert(csv.includes("QA-031"));
      assert(!csv.includes("QA-002"));
      assert.strictEqual(csv.split("\r\n").length, 17);
    });
    await step("Sections survive full browser reload", async () => {
      await cdp("Page.reload");
      await waitFor(
        () =>
          evaluate(
            "Boolean(window.SCHOOLOS_ADAPTER?.connected&&SCHOOLOS_ADAPTER.live.classes)",
          ),
        "Reload hydration",
      );
      assert(
        await evaluate(
          "CLASSES.some(c=>c.room==='QA lab '+state.role||c.room==='QA updated '+state.role)",
        ),
      );
      await evaluate("go('classes')");
    });
    await cdp("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await screenshot("desktop");
    await step("Mobile list and complete roster fit viewport", async () => {
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
      await evaluate("classOpen('Grade 7 · A')");
      await screenshot("roster-mobile");
      assert(
        await evaluate(
          'document.getElementById("drawer").scrollWidth<=innerWidth',
        ),
      );
    });
  },
).catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
