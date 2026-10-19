const fs = require("fs");
const os = require("os");
const path = require("path");
const assert = require("assert");
const { spawn } = require("child_process");
const WebSocket = require(
  path.resolve(__dirname, "../../client/node_modules/ws"),
);

const chromePath =
  process.env.SCHOOLOS_CHROME_PATH ||
  path.join(
    os.homedir(),
    ".cache/ms-playwright/chromium-1243/chrome-linux64/chrome",
  );
const clientUrl = "http://127.0.0.1:5179/";
const email = process.env.SCHOOLOS_SMOKE_EMAIL || "administrator@example.invalid";
const password = process.env.SCHOOLOS_SMOKE_PASSWORD || "LocalFixture123!";
const profile = fs.mkdtempSync(
  path.join(os.tmpdir(), "schoolos-documents-browser-"),
);
const chrome = spawn(
  chromePath,
  [
    "--headless=new",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--disable-gpu",
    "--remote-debugging-port=0",
    "--user-data-dir=" + profile,
    "about:blank",
  ],
  { stdio: "ignore" },
);

function waitFor(check, label, timeout = 45000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        if (await check()) return resolve();
      } catch (_) {}
      if (Date.now() - start > timeout)
        return reject(new Error("Timed out waiting for " + label));
      setTimeout(poll, 100);
    };
    poll();
  });
}

(async () => {
  let ws;
  try {
    await waitFor(
      () => fs.existsSync(path.join(profile, "DevToolsActivePort")),
      "Chromium debugger",
    );
    const port = Number(
      fs
        .readFileSync(path.join(profile, "DevToolsActivePort"), "utf8")
        .split("\n")[0],
    );
    const targets = await (
      await fetch(`http://127.0.0.1:${port}/json/list`)
    ).json();
    const page = targets.find((target) => target.type === "page");
    assert(page, "Chromium page target missing");
    ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.once("open", resolve);
      ws.once("error", reject);
    });
    const issues = [];
    ws.on("message", (raw) => {
      const m = JSON.parse(String(raw));
      if (m.method === "Runtime.exceptionThrown")
        issues.push({
          type: "javascript",
          detail: m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text,
        });
      if (m.method === "Network.loadingFailed")
        issues.push({ type: "network", detail: m.params.errorText });
      if (
        m.method === "Network.responseReceived" &&
        m.params.response.status >= 400
      )
        issues.push({
          type: "http",
          url: m.params.response.url,
          status: m.params.response.status,
        });
    });
    let nextId = 0;
    const pending = new Map();
    ws.on("message", (raw) => {
      const message = JSON.parse(String(raw));
      const callback = pending.get(message.id);
      if (callback) {
        pending.delete(message.id);
        callback(message);
      }
    });
    const cdp = (method, params = {}) =>
      new Promise((resolve, reject) => {
        const id = ++nextId;
        pending.set(id, (message) =>
          message.error
            ? reject(new Error(message.error.message))
            : resolve(message.result),
        );
        ws.send(JSON.stringify({ id, method, params }));
      });
    const dialogResponses = [],
      dialogMessages = [];
    ws.on("message", (raw) => {
      const message = JSON.parse(String(raw));
      if (message.method === "Page.javascriptDialogOpening") {
        dialogMessages.push(message.params.message);
        cdp("Page.handleJavaScriptDialog", {
          accept: dialogResponses.shift() === true,
        }).catch(() => {});
      }
    });
    const evaluate = async (expression) => {
      const response = await cdp("Runtime.evaluate", {
        expression,
        returnByValue: true,
        awaitPromise: true,
      });
      if (response.exceptionDetails)
        throw new Error(
          response.exceptionDetails.exception?.description ||
            response.exceptionDetails.text,
        );
      return response.result.value;
    };
    await cdp("Network.enable");
    await cdp("Page.enable");
    await cdp("Runtime.enable");
    await cdp("Page.navigate", { url: clientUrl });
    await waitFor(
      () => evaluate('typeof window.enterApp === "function"'),
      "SchoolOS boot",
    );
    await waitFor(
      () => evaluate("Boolean(window.SCHOOLOS_ADAPTER)"),
      "runtime ready",
    );
    const startup = await evaluate(
      `({readyMs:performance.now(),paint:performance.getEntriesByType('paint').map(p=>({name:p.name,ms:p.startTime})),scripts:performance.getEntriesByType('resource').filter(r=>r.initiatorType==='script').map(r=>({url:r.name,start:r.startTime,duration:r.duration,transferred:r.transferSize}))})`,
    );
    const requests = [];
    ws.on("message", (raw) => {
      const m = JSON.parse(String(raw));
      if (
        m.method === "Network.responseReceived" &&
        m.params.response.url.includes("api.schoolos")
      )
        requests.push({
          url: m.params.response.url,
          status: m.params.response.status,
        });
    });
    await evaluate(
      `document.getElementById('lxEmail').value=${JSON.stringify(email)};document.getElementById('lxPass').value=${JSON.stringify(password)};window.enterApp();`,
    );
    await waitFor(
      () => evaluate("Boolean(window.SCHOOLOS_ADAPTER?.connected)"),
      "authenticated login",
    );
    await new Promise((r) => setTimeout(r, 3000));
    const role = process.env.SCHOOLOS_TEST_ROLE || "Administrator",
      cases = [];
    const api = (route, method = "GET", body) =>
      evaluate(
        `SCHOOLOS_ADAPTER.api(${JSON.stringify(route)},{method:${JSON.stringify(method)}${body ? ",body:JSON.stringify(" + JSON.stringify(body) + ")" : ""}})`,
      );
    const step = async (name, fn) => {
      try {
        cases.push({ name, pass: true, details: await fn() });
      } catch (e) {
        cases.push({ name, pass: false, error: e.message });
      }
      console.log(JSON.stringify({ role, ...cases.at(-1) }));
    };
    const fill = (values) =>
      evaluate(
        `(()=>{for(const [k,v] of Object.entries(${JSON.stringify(values)})){const e=document.querySelector('#drawer [data-fkey="'+k+'"]');if(!e)throw Error('Missing field '+k);e.value=v;e.dispatchEvent(new Event('change',{bubbles:true}));}document.querySelector('#drawer .df .btn.primary').click()})()`,
      );
    await step("Actual authenticated role and scoped directory", async () => {
      await evaluate("go('students')");
      const result = await evaluate(
        "({role:state.role,count:STUDENTS.length,heading:document.querySelector('#view h2').textContent,add:document.querySelector('#view').textContent.includes('Add student'),import:document.querySelector('#view').textContent.includes('Import CSV')})",
      );
      if (
        result.role !== role ||
        result.count !== (["Parent", "Student"].includes(role) ? 1 : 31) ||
        result.add !==
          ["Administrator", "Principal", "Teacher"].includes(role) ||
        result.import !== ["Administrator", "Principal"].includes(role)
      )
        throw Error(JSON.stringify(result));
      return result;
    });
    await step("Profile role controls and leading-zero roll", async () => {
      await evaluate(
        "document.querySelector('#stuBody .student-name-button').click()",
      );
      const r = await evaluate(
        "({text:document.querySelector('#drawer').textContent,edit:document.querySelector('#drawer').textContent.includes('Edit record'),manage:document.querySelector('#drawer').textContent.includes('Manage enrollment'),docs:document.querySelector('#drawer').textContent.includes('Documents')})",
      );
      if (
        r.edit !== ["Administrator", "Principal", "Teacher"].includes(role) ||
        r.manage !== ["Administrator", "Principal"].includes(role) ||
        r.docs !== (role !== "Accountant")
      )
        throw Error("Incorrect profile actions");
      return { edit: r.edit, manage: r.manage, docs: r.docs };
    });
    await step(
      "Actionable completeness and authorized emergency panel",
      async () => {
        const result = await evaluate(
          "({checklist:!!document.querySelector('[aria-label=\"Profile completeness\"]'),emergency:!!document.querySelector('[aria-label=\"Emergency information\"]'),photo:!!document.getElementById('studentProfilePhoto'),text:document.querySelector('#drawer').textContent})",
        );
        assert(result.checklist && result.photo, "Missing profile refinements");
        if (role !== "Accountant")
          await waitFor(
            () =>
              evaluate(
                "Boolean(document.querySelector('#studentProfilePhoto img')?.naturalWidth)",
              ),
            "authorized role photo",
          );
        else
          assert(
            await evaluate(
              "!document.querySelector('#studentProfilePhoto img')",
            ),
            "Accounting photo privacy failed",
          );

        assert.strictEqual(result.emergency, role !== "Accountant");
        assert.strictEqual(
          result.text.includes("Parent portal linked"),
          ["Administrator", "Principal"].includes(role),
        );
        if (role !== "Accountant") {
          await evaluate(
            "Array.from(document.querySelectorAll('[aria-label=\"Profile completeness\"] button')).find(b=>b.textContent.includes('Student photo')).click()",
          );
          assert(
            await evaluate(
              "state._spTab==='documents' && document.querySelector('#drawer').textContent.includes('Passport-size photo')",
            ),
            "Checklist did not open Documents",
          );
        }
        await evaluate(
          "state._spTab='overview';openDrawer(studentProfile('QA-001'))",
        );
        return { checklist: true, emergency: result.emergency, role };
      },
    );
    await step("Uploaded document View uses an authenticated image preview", async () => {
      if (role === "Accountant") {
        assert(await evaluate("!document.querySelector('#drawer button[onclick*=\"stuDocView\"]')"));
        return { hiddenForAccountant: true };
      }
      await evaluate("state._spTab='documents';openDrawer(studentProfile('QA-001'));document.querySelector('#drawer button[onclick*=\"stuDocView\"]').click()");
      await waitFor(() => evaluate("Boolean(document.querySelector('.doc-lightbox img')?.naturalWidth)"), "protected image document preview");
      assert(await evaluate("document.querySelector('.doc-lightbox img').src.startsWith('blob:')"), "Preview must use the authenticated file blob");
      await evaluate("document.querySelector('[aria-label=\"Close preview\"]').click()");
      assert(await evaluate("!document.querySelector('.doc-lightbox')"));
      return { authenticatedImageViewed: true, closed: true };
    });
    await step("Real search control and empty-state reset", async () => {
      await evaluate(
        "closeDrawer();const input=document.getElementById('stuSearch');input.value='NOT-A-STUDENT';input.dispatchEvent(new Event('input',{bubbles:true}))",
      );
      if (
        !(await evaluate(
          "document.querySelector('#stuBody').textContent.includes('No matching students')",
        ))
      )
        throw Error("Missing empty state");
      await evaluate(
        "Array.from(document.querySelectorAll('#stuBody button')).find(b=>b.textContent.includes('Clear filters')).click()",
      );
      return { restored: await evaluate("studentFilteredRows().length") };
    });
    if (["Principal", "Teacher"].includes(role))
      await step("Actual role edit persists through its UI form", async () => {
        const row = await evaluate("STUDENTS.find(s=>s.id==='QA-001')");
        await evaluate("studentEditForm('QA-001')");
        await fill({ address: "Address updated by " + role });
        await waitFor(async () => {
          const res = await api("/students/" + row.mongoId);
          return res.data.address === "Address updated by " + role;
        }, "role edit");
        return { role, saved: true };
      });
    if (role === "Administrator") {
      let row = await evaluate("STUDENTS.find(s=>s.id==='QA-001')");
      await step(
        "Complete edit persists and clears optional fields",
        async () => {
          await evaluate("studentEditForm('QA-001')");
          await fill({
            name: "QA Student 00",
            grade: "Grade 7 · A",
            roll: "007",
            gender: "Female",
            guardian: "QA Guardian",
            phone: "+971501234567",
            email: "",
            emergency: "",
            address: "Updated QA address",
            nationality: "QA nationality",
            dob: "2012-01-02",
            allergies: "QA allergy",
            medical: "QA note",
          });
          await waitFor(async () => {
            const res = await api("/students/" + row.mongoId);
            return res.data.address === "Updated QA address";
          }, "edited student");
          const res = await api("/students/" + row.mongoId);
          if (res.data.guardianEmail) throw Error("Cleared email remained");
          return {
            roll: res.data.roll,
            address: res.data.address,
            nationality: res.data.nationality,
          };
        },
      );
      await step("Enrollment form transitions and dated history", async () => {
        await evaluate("studentEnrollmentForm('QA-001')");
        await fill({
          status: "Inactive",
          reason: "Fictional QA transfer",
          effectiveDate: "2020-01-01",
        });
        await waitFor(async () => {
          const res = await api("/students/" + row.mongoId);
          return res.data.status === "Inactive";
        }, "inactive");
        await evaluate("studentEnrollmentForm('QA-001')");
        await fill({
          status: "Active",
          reason: "Fictional QA return",
          effectiveDate: "2020-02-01",
        });
        await waitFor(async () => {
          const res = await api("/students/" + row.mongoId);
          return (
            res.data.enrollmentHistory.length === 2 &&
            res.data.status === "Active"
          );
        }, "reactivated");
        return { events: 2 };
      });
      await step(
        "Portal links form uses existing active accounts",
        async () => {
          await evaluate("studentAccountsForm('QA-001')");
          await fill({
            parent_action: "Link existing account",
            parent_email: "parent@example.invalid",
            student_action: "Link existing account",
            student_email: "student@example.invalid",
          });
          await waitFor(async () => {
            const res = await api("/students/" + row.mongoId);
            return Boolean(res.data.guardianUserId && res.data.studentUserId);
          }, "linked accounts");
          return { linked: true };
        },
      );
      await step(
        "Document upload, download and reload persistence",
        async () => {
          await evaluate(
            "state._spTab='documents';openDrawer(studentProfile('QA-001'))",
          );
          await evaluate(
            `(()=>{const input=document.querySelector('#drawer input[aria-label="Upload photo"]');const dt=new DataTransfer();dt.items.add(new File([Uint8Array.from(atob('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jE5kAAAAASUVORK5CYII='),c=>c.charCodeAt(0))],'QA-photo.png',{type:'image/png'}));input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`,
          );
          await waitFor(async () => {
            const res = await api("/students/" + row.mongoId);
            return res.data.documents.some(
              (d) => d.key === "photo" && d.filename === "QA-photo.png",
            );
          }, "uploaded photo");
          await cdp("Page.reload");
          await waitFor(
            () => evaluate("Boolean(window.SCHOOLOS_ADAPTER?.connected)"),
            "reloaded login",
          );
          await evaluate(
            "go('students');state._spTab='documents';openDrawer(studentProfile('QA-001'))",
          );
          if (
            !(await evaluate(
              "document.querySelector('#drawer').textContent.includes('QA-photo.png')",
            ))
          )
            throw Error("Missing uploaded filename after reload");
          const result = await evaluate(
            `fetch('http://127.0.0.1:4400/api/v1/students/'+${JSON.stringify(row.mongoId)}+'/documents/photo',{headers:{Authorization:'Bearer '+SCHOOLOS_ADAPTER.token}}).then(async r=>({status:r.status,type:r.headers.get('content-type'),bytes:(await r.arrayBuffer()).byteLength}))`,
          );
          if (result.status !== 200 || result.bytes !== 68)
            throw Error(JSON.stringify(result));
          await waitFor(
            () =>
              evaluate(
                "Boolean(document.querySelector('#studentProfilePhoto img')?.naturalWidth)",
              ),
            "authenticated profile photo",
          );
          await evaluate(
            "state._spTab='overview';openDrawer(studentProfile('QA-001'))",
          );
          await waitFor(
            () =>
              evaluate(
                "Boolean(document.querySelector('#studentProfilePhoto img')?.naturalWidth)",
              ),
            "overview profile photo",
          );
          assert(
            await evaluate(
              "document.querySelector('[aria-label=\"Emergency information\"]').textContent.includes('QA allergy')",
            ),
            "Emergency allergy missing",
          );
          return {
            persisted: true,
            authenticatedPhotoRendered: true,
            ...result,
          };
        },
      );
      await step("Uploaded PDF opens in the authenticated document preview", async () => {
        const objects = [
          "<< /Type /Catalog /Pages 2 0 R >>",
          "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
          "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Resources << >> /Contents 4 0 R >>",
          "<< /Length 0 >>\nstream\n\nendstream",
        ];
        let pdf = "%PDF-1.4\n", offsets = [0];
        objects.forEach((object, i) => { offsets.push(pdf.length); pdf += (i + 1) + " 0 obj\n" + object + "\nendobj\n"; });
        const xref = pdf.length;
        pdf += "xref\n0 5\n0000000000 65535 f \n" + offsets.slice(1).map(n => String(n).padStart(10, "0") + " 00000 n \n").join("") + "trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n" + xref + "\n%%EOF\n";
        await evaluate(`SCHOOLOS_ADAPTER.api('/students/'+${JSON.stringify(row.mongoId)}+'/documents/birth',{method:'PUT',headers:{'Content-Type':'application/pdf','X-File-Name':'QA-birth.pdf'},body:${JSON.stringify(pdf)}}).then(()=>SCHOOLOS_ADAPTER.hydrate())`);
        await evaluate("state._spTab='documents';openDrawer(studentProfile('QA-001'));Array.from(document.querySelectorAll('#drawer button')).find(b=>(b.getAttribute('onclick')||'').includes('stuDocView')&&(b.getAttribute('onclick')||'').includes(\"'birth'\")).click()");
        await waitFor(() => evaluate("Boolean(document.querySelector('.doc-lightbox iframe'))"), "authenticated PDF preview");
        const result = await evaluate("(()=>{const frame=document.querySelector('.doc-lightbox iframe');return {title:frame.title,blob:frame.src.startsWith('blob:')}})()");
        assert.strictEqual(result.title, "QA-birth.pdf");
        assert(result.blob);
        await evaluate("document.dispatchEvent(new KeyboardEvent('keydown',{key:'Escape'}))");
        assert(await evaluate("!document.querySelector('.doc-lightbox')"));
        return { ...result, closedWithEscape: true };
      });
      await step(
        "Duplicate-person warning cancels or explicitly saves a separate record",
        async () => {
          const other = await evaluate("STUDENTS.find(s=>s.id==='QA-002')");
          dialogResponses.push(false);
          await evaluate("studentEditForm('QA-002')");
          await fill({ name: "QA Student 00", dob: "2012-01-02" });
          const unchanged = await api("/students/" + other.mongoId);
          assert.strictEqual(unchanged.data.name, other.name);
          assert(
            dialogMessages.at(-1).includes("QA-001"),
            "Existing admission absent from warning",
          );
          dialogResponses.push(true);
          await fill({ name: "QA Student 00", dob: "2012-01-02" });
          await waitFor(
            async () =>
              (await api("/students/" + other.mongoId)).data.name ===
              "QA Student 00",
            "confirmed duplicate warning",
          );
          assert.strictEqual(
            (await api("/students/" + other.mongoId)).data.refId,
            "QA-002",
          );
          await api("/students/" + other.mongoId, "PATCH", {
            name: other.name,
            clearFields: ["dateOfBirth"],
          });
          await evaluate("SCHOOLOS_ADAPTER.hydrate()");
          return {
            cancelledWithoutSaving: true,
            explicitOverride: true,
            recordsMerged: false,
          };
        },
      );
      await step(
        "New admission duplicate warning prevents accidental creation",
        async () => {
          await evaluate("studentAddForm()");
          dialogResponses.push(false);
          const values = {
            first_name: "QA Student 00",
            admission_no: "DUP-CREATE",
            dob: "2012-01-02",
            gender: "Female",
            grade: "Grade 7 · A",
            guardian: "QA Guardian",
            phone: "+971501234567",
          };
          await fill(values);
          assert.strictEqual(
            (await api("/students?search=DUP-CREATE")).data.length,
            0,
          );
          dialogResponses.push(true);
          await fill(values);
          await waitFor(
            async () =>
              (await api("/students?search=DUP-CREATE")).data.length === 1,
            "confirmed new admission",
          );
          const created = (await api("/students?search=DUP-CREATE")).data[0];
          await api("/students/" + created._id, "DELETE");
          await evaluate("SCHOOLOS_ADAPTER.hydrate()");
          return { cancelled: true, explicitlyCreated: true, cleanedUp: true };
        },
      );
      await step(
        "CSV duplicate-person preview requires explicit acknowledgment",
        async () => {
          await evaluate("studentImportForm()");
          const csv =
            "refId,name,grade,gender,roll,guardianName,phone,dateOfBirth\nDUP-CSV,QA Student 00,Grade 7 · A,Female,010,QA Guardian,+971501234567,2012-01-02";
          await evaluate(
            `studentImportPreview({files:[new File([${JSON.stringify(csv)}],'duplicates.csv',{type:'text/csv'})]})`,
          );
          assert(
            await evaluate(
              "document.getElementById('studentImportPreview').textContent.includes('Possible duplicate people')",
            ),
          );
          dialogResponses.push(false);
          await evaluate(
            "document.getElementById('studentImportConfirm').click()",
          );
          assert.strictEqual(
            (await api("/students?search=DUP-CSV")).data.length,
            0,
          );
          dialogResponses.push(true);
          await evaluate(
            "document.getElementById('studentImportConfirm').click()",
          );
          await waitFor(
            async () =>
              (await api("/students?search=DUP-CSV")).data.length === 1,
            "confirmed duplicate import",
          );
          const created = (await api("/students?search=DUP-CSV")).data[0];
          await api("/students/" + created._id, "DELETE");
          await evaluate("SCHOOLOS_ADAPTER.hydrate()");
          return {
            previewWarning: true,
            cancelled: true,
            explicitImport: true,
            cleanedUp: true,
          };
        },
      );
      await step(
        "CSV preview and explicit confirmation persist two records",
        async () => {
          await evaluate("studentImportForm()");
          await evaluate(
            `(()=>{const input=document.querySelector('[aria-label="Student CSV file"]');const dt=new DataTransfer();dt.items.add(new File(['refId,name,grade,gender,roll,guardianName,phone\\nCSV-001,Imported QA One,Grade 7 · A,Female,008,QA Guardian,+971501234567\\nCSV-002,Imported QA Two,Grade 7 · B,Male,009,QA Guardian,+971501234568'.replace(/\\\\n/g,'\\n')],'QA.csv',{type:'text/csv'}));input.files=dt.files;input.dispatchEvent(new Event('change',{bubbles:true}));})()`,
          );
          await waitFor(
            () =>
              evaluate(
                "Boolean(document.getElementById('studentImportConfirm'))",
              ),
            "CSV preview",
          );
          const before = await api("/students?search=CSV-");
          if (before.data.length) throw Error("Saved before confirmation");
          await evaluate(
            "document.getElementById('studentImportConfirm').click()",
          );
          await waitFor(async () => {
            const res = await api("/students?search=CSV-");
            return res.data.length === 2;
          }, "CSV persisted");
          return { created: 2 };
        },
      );
      await step("Filtered export creates an actual CSV download", async () => {
        await evaluate("go('students');studentSetFilter('q','CSV-001')");
        const dir = "/tmp/schoolos-students-download-" + Date.now();
        fs.mkdirSync(dir);
        await cdp("Page.setDownloadBehavior", {
          behavior: "allow",
          downloadPath: dir,
        });
        await evaluate(
          "Array.from(document.querySelectorAll('#view button')).find(b=>b.textContent.includes('Export view')).click()",
        );
        await waitFor(
          () => fs.existsSync(dir + "/Students.csv"),
          "filtered CSV",
          10000,
        );
        const csv = fs.readFileSync(dir + "/Students.csv", "utf8");
        if (!csv.includes("CSV-001") || csv.includes("CSV-002"))
          throw Error("Export does not match filtered view");
        return { file: dir + "/Students.csv" };
      });
    }
    await evaluate("go('students');studentResetFilters();closeDrawer()");
    await cdp("Emulation.setDeviceMetricsOverride", {
      width: 1440,
      height: 1000,
      deviceScaleFactor: 1,
      mobile: false,
    });
    await new Promise((r) => setTimeout(r, 600));
    const desktop = await cdp("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(
      "/tmp/schoolos-students-" + role + "-desktop.png",
      Buffer.from(desktop.data, "base64"),
    );
    await evaluate("go('students');studentResetFilters()");
    await cdp("Emulation.setDeviceMetricsOverride", {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    });
    await new Promise((r) => setTimeout(r, 600));
    await step("Mobile directory remains usable", async () => {
      const r = await evaluate(
        "({width:document.querySelector('.students-hub').getBoundingClientRect().width,viewport:innerWidth,searchWidth:document.querySelector('#stuSearch').getBoundingClientRect().width})",
      );
      if (r.width > r.viewport + 1 || r.searchWidth <= 0)
        throw Error(JSON.stringify(r));
      return r;
    });
    const shot = await cdp("Page.captureScreenshot", { format: "png" });
    fs.writeFileSync(
      "/tmp/schoolos-students-" + role + ".png",
      Buffer.from(shot.data, "base64"),
    );
    await step(
      "Mobile profile checklist and emergency panel fit the drawer",
      async () => {
        await evaluate(
          "state._spTab='overview';openDrawer(studentProfile('QA-001'))",
        );
        await new Promise((r) => setTimeout(r, 300));
        const geometry = await evaluate(
          "({width:document.getElementById('drawer').clientWidth,content:document.getElementById('drawer').scrollWidth,viewport:innerWidth})",
        );
        assert(
          geometry.width <= geometry.viewport &&
            geometry.content <= geometry.width + 1,
          JSON.stringify(geometry),
        );
        const profileShot = await cdp("Page.captureScreenshot", {
          format: "png",
        });
        fs.writeFileSync(
          "/tmp/schoolos-students-" + role + "-profile-mobile.png",
          Buffer.from(profileShot.data, "base64"),
        );
        return geometry;
      },
    );
    fs.writeFileSync(
      "/tmp/schoolos-students-browser-" + role + ".json",
      JSON.stringify({ role, cases, issues }, null, 2),
    );
    if (
      cases.some((c) => !c.pass) ||
      issues.some((i) => i.type === "javascript")
    )
      process.exitCode = 1;
  } finally {
    if (ws) ws.close();
    chrome.kill();
  }
})().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
