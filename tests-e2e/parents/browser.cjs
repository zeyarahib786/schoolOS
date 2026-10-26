const assert = require("assert");
const runBrowser = require("../helpers/browser.cjs");
runBrowser(
  "parents",
  async ({ role, step, api, evaluate, waitFor, fill, cdp, screenshot }) => {
    const allowed = ["Administrator", "Principal", "Parent"].includes(role),
      manager = ["Administrator", "Principal"].includes(role);
    if (allowed)
      await waitFor(
        () => evaluate("state.parentsLoad==='ready'"),
        "Parents hydration",
      );
    await step('Arabic guardian directory conversations and meetings switch reversibly',async()=>{
      if(!allowed)return {restricted:true};
      await evaluate("go('parents');setSubTab('parents-v','directory');setLanguage('ar')");
      await waitFor(()=>evaluate("state.parentsLoad==='ready' && Boolean(document.getElementById('parBody'))"),'Arabic parent directory loaded');
      const present=await evaluate('buildGuardians().length>0');
      if(present){
       await evaluate("window.parentLocaleFixture=JSON.parse(JSON.stringify(buildGuardians()[0]));Object.assign(buildGuardians()[0],{name:'Khalid Al Hashimi',phone:'+971501234567',pickup:true,translations:undefined});render()");
       assert(await evaluate("document.getElementById('view').textContent.includes('خالد الهاشمي')"),JSON.stringify(await evaluate("({role:state.role,module:state.module,load:state.parentsLoad,text:document.getElementById('view').textContent,guardians:buildGuardians().map(g=>({name:g.name,id:g.id}))})")));
       assert(!(await evaluate("document.getElementById('view').textContent.includes('Authorized')")));
       assert.deepStrictEqual(await evaluate("(()=>{const e=document.querySelector('#parBody [data-school-phone]');return [e.textContent,getComputedStyle(e).direction]})()"),['+٩٧١٥٠١٢٣٤٥٦٧','ltr']);
      }
      await evaluate("setSubTab('parents-v','comm')");assert(!(await evaluate("/In-app broadcasts|Guardian conversations|Messages saved to guardian conversations/.test(document.getElementById('view').textContent)")));
      await evaluate("setSubTab('parents-v','meetings');state.parentMeetingDate='2099-12-31';render()");assert(!(await evaluate("/Parent–teacher meetings|New slot|Select a date|Parent .* student|No meetings on this date/.test(document.getElementById('view').textContent)")));
      await screenshot('parents-arabic-meetings');
      await evaluate("setLanguage('en');setSubTab('parents-v','directory')");
      if(present){assert(await evaluate("document.getElementById('view').textContent.includes('Khalid Al Hashimi')"));await evaluate("Object.assign(buildGuardians()[0],window.parentLocaleFixture);delete window.parentLocaleFixture");}
      await evaluate("delete state.parentMeetingDate;render()");
    });
    await step("Actual role navigation and permission boundary", async () => {
      const visible = await evaluate(
        "Boolean(document.querySelector('#nav [aria-label=\"Parents\"]'))",
      );
      assert.strictEqual(visible, allowed);
      await evaluate("go('parents')");
      const result = await evaluate(
        "({role:state.role,text:document.querySelector('#view').textContent,add:document.querySelector('#view').textContent.includes('Add guardian')})",
      );
      assert.strictEqual(result.role, role);
      assert.strictEqual(result.add, manager);
      if (!allowed) {
        assert(result.text.includes("Parents access is restricted"));
        const denied = await evaluate(
          "SCHOOLOS_ADAPTER.api('/guardians').then(()=>0,e=>e.message)",
        );
        assert(String(denied).includes("requires"));
      }
      if (role === "Parent") {
        assert(result.text.includes("My family"));
        assert.strictEqual(await evaluate("buildGuardians().length"), 1);
        assert.strictEqual(
          await evaluate("buildGuardians()[0].children.length"),
          2,
        );
      }
      return { visible, manager, role };
    });
    if (allowed) {
      await step(
        "Search filters, empty state and persistent directory",
        async () => {
          await evaluate(
            "const input=document.getElementById('parSearch');input.value='NO-MATCH';input.dispatchEvent(new Event('input',{bubbles:true}))",
          );
          assert(
            await evaluate(
              "document.getElementById('parBody').textContent.includes('No guardians found')",
            ),
          );
          await evaluate(
            "parentResetFilters();parentSetFilter('q','QA-001');go('dashboard');go('parents')",
          );
          assert.strictEqual(
            await evaluate("document.getElementById('parSearch').value"),
            "QA-001",
          );
          assert.strictEqual(await evaluate("parentFilteredRows().length"), 1);
          await evaluate("parentResetFilters()");
          return { persistent: true };
        },
      );
      await step(
        "Guardian detail and child navigation use real recorded permissions",
        async () => {
          await evaluate(
            "Array.from(document.querySelectorAll('#parBody button')).find(b=>b.textContent==='QA Guardian').click()",
          );
          const text = await evaluate(
            "document.getElementById('drawer').textContent",
          );
          assert(text.includes("Not recorded"));
          assert.strictEqual(text.includes("Edit guardian"), manager);
          assert.strictEqual(text.includes("Office note"), manager);
          if (!manager) assert(!text.includes("School internal note"));
          await evaluate(
            "Array.from(document.querySelectorAll('#drawer button')).find(b=>b.textContent.includes('QA Student 00')).click()",
          );
          assert(
            await evaluate(
              "document.getElementById('drawer').textContent.includes('QA-001')",
            ),
          );
          await evaluate("closeDrawer()");
          return { realConsents: true, childProfile: true };
        },
      );
      if (role === "Principal")
        await step(
          "Leadership contact edit persists and clears optional email",
          async () => {
            const g = await evaluate(
              "buildGuardians().find(g=>g.id==='GRD-OTHER')",
            );
            await evaluate("guardianEditForm('GRD-OTHER')");
            await fill({
              note: "Edited by Principal",
              email: "",
              media: "Declined",
              trips: "Granted",
            });
            await waitFor(
              async () =>
                (await api("/guardians/" + g.mongoId)).data.note ===
                "Edited by Principal",
              "Principal saved contact",
            );
            const saved = (await api("/guardians/" + g.mongoId)).data;
            assert(!saved.email);
            assert.strictEqual(saved.consents.media, false);
            assert.strictEqual(saved.consents.trips, true);
            return { saved: true, optionalCleared: true };
          },
        );
      await step(
        "Persisted school and Parent conversations render escaped text",
        async () => {
          await evaluate("openGuardianThread('GRD-QA')");
          await waitFor(
            () => evaluate("Boolean(document.getElementById('threadReply'))"),
            "conversation loaded",
          );
          const text = role + " QA <img src=x onerror=alert(1)>";
          await evaluate(
            `document.getElementById('threadReply').value=${JSON.stringify(text)};document.querySelector('#drawer .df .btn.primary').click()`,
          );
          const g = await evaluate("buildGuardians().find(g=>g.id==='GRD-QA')");
          await waitFor(
            async () =>
              (await api("/guardians/" + g.mongoId + "/messages")).data.some(
                (m) => m.text === text,
              ),
            "persisted message",
          );
          await waitFor(
            () =>
              evaluate(
                `document.getElementById('threadBody')?.textContent.includes(${JSON.stringify(text)})`,
              ),
            "saved thread render",
          );
          assert(
            await evaluate(
              "!document.getElementById('threadBody').querySelector('img')",
            ),
          );
          await evaluate("closeDrawer()");
          return {
            persisted: true,
            safeText: true,
            direction: role === "Parent" ? "in" : "out",
          };
        },
      );
      await step(
        "Date-based meeting browsing and available slot booking",
        async () => {
          await evaluate(
            "state.parentMeetingDate='2026-12-10';setSubTab('parents-v','meetings')",
          );
          assert(
            await evaluate(
              "document.getElementById('view').textContent.includes('QA Teacher')",
            ),
          );
          if (role === "Parent") {
            const id = await evaluate(
              "MEETINGS.find(m=>m.status==='Available').id",
            );
            await evaluate(`bookMeetingForm(${JSON.stringify(id)})`);
            await fill({ studentRef: "QA-001" });
            await waitFor(
              async () =>
                (await api("/meetings?limit=100")).data.some(
                  (m) => m._id === id && m.status === "Confirmed",
                ),
              "Parent booking",
            );
            return { date: "2026-12-10", ownChildBooked: true };
          }
          return { date: "2026-12-10", realSlots: true };
        },
      );
      if (role === "Administrator") {
        await step(
          "Create guardian with multiple children and tri-state consent",
          async () => {
            await evaluate("guardianEditForm()");
            await fill({
              refId: "GRD-ADMIN",
              name: "Admin QA Guardian",
              phone: "+971501112222",
              email: "",
              children: "QA-004, QA-005",
              pickup: "Yes",
              media: "Granted",
              trips: "Not recorded",
              medical: "Declined",
            });
            await waitFor(
              async () =>
                (await api("/guardians?search=GRD-ADMIN")).data.length === 1,
              "new guardian",
            );
            await waitFor(
              () => evaluate("buildGuardians().some(g=>g.id==='GRD-ADMIN')"),
              "new guardian hydrated",
            );
            const g = (await api("/guardians?search=GRD-ADMIN")).data[0];
            assert.strictEqual(g.studentIds.length, 2);
            assert.strictEqual(g.consents.trips, null);
            assert.strictEqual(g.pickupAuthorized, true);
            return { multiChild: true, consentsStored: true };
          },
        );
        await step(
          "Link, suspend, restore and unlink an existing Parent login",
          async () => {
            await evaluate("guardianAccountForm('GRD-ADMIN')");
            await fill({ parentEmail: "newparent@example.invalid" });
            await waitFor(
              () =>
                evaluate(
                  "Boolean(buildGuardians().find(g=>g.id==='GRD-ADMIN').userId)",
                ),
              "Parent link",
            );
            await waitFor(
              () => evaluate("!state.parentSaving"),
              "link save complete",
            );
            const g = await evaluate(
              "buildGuardians().find(g=>g.id==='GRD-ADMIN')",
            );
            assert.strictEqual(
              (await api("/students?search=QA-004")).data[0].guardianUserId,
              g.userId,
            );
            await evaluate("toggleGuardianPortal('GRD-ADMIN')");
            await waitFor(
              () =>
                evaluate(
                  "buildGuardians().find(g=>g.id==='GRD-ADMIN').portal==='Suspended'",
                ),
              "suspension",
            );
            await waitFor(
              () => evaluate("!state.parentSaving"),
              "suspension complete",
            );
            const blocked = await evaluate(
              "SCHOOLOS_ADAPTER.api('/auth/login',{method:'POST',body:JSON.stringify({role:'Parent',email:'newparent@example.invalid',password:'LocalFixture123!'})}).then(()=>false,e=>e.message)",
            );
            assert(String(blocked).includes("suspended"));
            await evaluate("toggleGuardianPortal('GRD-ADMIN')");
            await waitFor(
              () =>
                evaluate(
                  "buildGuardians().find(g=>g.id==='GRD-ADMIN').portal==='Active'",
                ),
              "restored portal",
            );
            await waitFor(
              () => evaluate("!state.parentSaving"),
              "restore complete",
            );
            await evaluate("guardianAccountForm('GRD-ADMIN')");
            await fill({ action: "Unlink account" });
            await waitFor(
              () =>
                evaluate(
                  "!buildGuardians().find(g=>g.id==='GRD-ADMIN').userId",
                ),
              "unlinked",
            );
            assert(
              !(await api("/students?search=QA-004")).data[0].guardianUserId,
            );
            return {
              linked: true,
              suspensionEnforced: true,
              restored: true,
              unlinked: true,
            };
          },
        );
        await step(
          "Broadcast preview does not save until explicit confirmation",
          async () => {
            await evaluate("sendToParentsForm()");
            await fill({
              audience: "Individual guardian",
              guardianId: "GRD-QA",
              subject: "QA broadcast",
              message: "QA reviewed message",
            });
            assert(
              !(await api("/guardians/broadcasts")).data.some(
                (b) => b.subject === "QA broadcast",
              ),
            );
            await evaluate("confirmParentBroadcast()");
            await waitFor(
              async () =>
                (await api("/guardians/broadcasts")).data.some(
                  (b) => b.subject === "QA broadcast",
                ),
              "confirmed broadcast",
            );
            const saved = (await api("/guardians/broadcasts")).data.find(
              (b) => b.subject === "QA broadcast",
            );
            assert.strictEqual(saved.recipientCount, 1);
            return { previewed: true, explicitlySaved: true, recipients: 1 };
          },
        );
        await step(
          "Publish a slot, staff-book, reschedule and cancel through forms",
          async () => {
            await waitFor(
              () => evaluate("!state.parentSaving"),
              "previous save complete",
            );
            await evaluate("newMeetingSlotForm()");
            await fill({
              teacherId: "EMP-QA",
              date: "2026-12-10",
              time: "10:00",
              room: "QA room",
            });
            await waitFor(
              () => evaluate("MEETINGS.some(m=>m.time==='10:00')"),
              "published slot",
            );
            await waitFor(
              () => evaluate("!state.parentSaving"),
              "publish complete",
            );
            const id = await evaluate("MEETINGS.find(m=>m.time==='10:00').id");
            await evaluate(`bookMeetingForm(${JSON.stringify(id)})`);
            await fill({
              guardianId: "GRD-QA",
              studentRef: "QA-002",
              note: "QA booking",
            });
            await waitFor(
              () =>
                evaluate(
                  `MEETINGS.find(m=>m.id===${JSON.stringify(id)}).status==='Confirmed'`,
                ),
              "staff booking",
            );
            await waitFor(
              () => evaluate("!state.parentSaving"),
              "book complete",
            );
            await evaluate(`rescheduleMeetingForm(${JSON.stringify(id)})`);
            const target = await evaluate(
              "document.querySelector('#drawer [data-fkey=\"targetId\"]').value",
            );
            await fill({ targetId: target });
            const targetId = target.match(/\(([^)]+)\)$/)[1];
            await waitFor(
              () =>
                evaluate(
                  `MEETINGS.find(m=>m.id===${JSON.stringify(targetId)}).status==='Confirmed'`,
                ),
              "rescheduled",
            );
            await waitFor(
              () => evaluate("!state.parentSaving"),
              "move complete",
            );
            await evaluate(`cancelMeeting(${JSON.stringify(targetId)})`);
            await waitFor(
              () =>
                evaluate(
                  `MEETINGS.find(m=>m.id===${JSON.stringify(targetId)}).status==='Available'`,
                ),
              "canceled",
            );
            return {
              published: true,
              staffBooked: true,
              rescheduled: true,
              canceled: true,
            };
          },
        );
        await step(
          "Filtered guardian export produces a real download",
          async () => {
            await evaluate(
              "go('parents');setSubTab('parents-v','directory');parentSetFilter('q','GRD-ADMIN')",
            );
            const directory = "/tmp/schoolos-parents-download-" + Date.now();
            require("fs").mkdirSync(directory);
            await cdp("Page.setDownloadBehavior", {
              behavior: "allow",
              downloadPath: directory,
            });
            await evaluate("exportParentsCSV()");
            await waitFor(
              () =>
                require("fs").existsSync(directory + "/Guardian_contacts.csv"),
              "CSV download",
            );
            const csv = require("fs").readFileSync(
              directory + "/Guardian_contacts.csv",
              "utf8",
            );
            assert(csv.includes("GRD-ADMIN"));
            assert(!csv.includes("GRD-OTHER"));
            return { filteredExport: true };
          },
        );
      }
      await evaluate(
        "closeDrawer();go('parents');setSubTab('parents-v','directory');parentResetFilters()",
      );
      await cdp("Emulation.setDeviceMetricsOverride", {
        width: 1440,
        height: 1000,
        deviceScaleFactor: 1,
        mobile: false,
      });
      await screenshot("desktop");
      await step(
        "Mobile directory and guardian profile fit the viewport",
        async () => {
          await cdp("Emulation.setDeviceMetricsOverride", {
            width: 390,
            height: 844,
            deviceScaleFactor: 1,
            mobile: true,
          });
          const geometry = await evaluate(
            "({width:document.querySelector('.parents-hub').getBoundingClientRect().width,viewport:innerWidth})",
          );
          assert(geometry.width <= geometry.viewport);
          await screenshot("mobile");
          await evaluate(
            "document.querySelector('#parBody .parent-name').click()",
          );
          await waitFor(
            () =>
              evaluate(
                "Math.abs(document.getElementById('drawer').getBoundingClientRect().left)<1",
              ),
            "mobile drawer animation",
          );
          const drawer = await evaluate(
            "({width:document.getElementById('drawer').clientWidth,content:document.getElementById('drawer').scrollWidth})",
          );
          assert(drawer.content <= drawer.width + 1);
          await screenshot("profile-mobile");
          return { geometry, drawer };
        },
      );
    }
  },
).catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
