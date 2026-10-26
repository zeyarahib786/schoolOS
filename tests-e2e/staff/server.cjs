const fs = require("fs"),
  path = require("path");
try {
  fs.unlinkSync("/tmp/schoolos-students-seed-ready");
} catch {}
require("../students/server.cjs");
(async () => {
  for (
    let n = 0;
    n < 200 && !fs.existsSync("/tmp/schoolos-students-seed-ready");
    n++
  )
    await new Promise((r) => setTimeout(r, 200));
  if (!fs.existsSync("/tmp/schoolos-students-seed-ready"))
    throw Error("Base seed failed");
  const base = "http://127.0.0.1:4400/api/v1",
    login = await (
      await fetch(base + "/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({role:'Administrator',
          email: "administrator@example.invalid",
          password: "LocalFixture123!",
        }),
      })
    ).json();
  const api = async (p, method = "GET", body) => {
    const res = await fetch(base + p, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + login.data.accessToken,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const j = await res.json();
    if (!res.ok) throw Error(p + JSON.stringify(j));
    return j.data;
  };
  const profiles = [];
  for (let n = 0; n < 27; n++) {
    const roles = ["teacher", "accountant", "principal", "administrator"];
    profiles.push(
      await api("/staff", "POST", {
        refId: "HR-" + String(n + 1).padStart(3, "0"),
        name: n < 4 ? "QA " + roles[n] + " Employee" : "QA Employee " + n,
        designation: "Teacher",
        department: n % 2 ? "Science" : "Mathematics",
        type: "Teaching",
        email:
          n < 4
            ? roles[n] + "@example.invalid"
            : "qa-employee-" + n + "@example.invalid",
        phone: "+971501234567",
        joinedDate: "2020-01-01",
        annualLeaveRemaining: 10,
      }),
    );
  }
  const { PDFDocument } = require(
    path.resolve(__dirname, "../../server/node_modules/pdf-lib"),
  );
  const pdf = await PDFDocument.create();
  pdf.addPage().drawText("Fictional HR QA document");
  const bytes = await pdf.save();
  fs.writeFileSync("/tmp/schoolos-staff-qa.pdf", Buffer.from(bytes));
  fs.writeFileSync(
    "/tmp/schoolos-staff-qa.png",
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lT8AAAAASUVORK5CYII=",
      "base64",
    ),
  );
  for (const staff of profiles.slice(0, 2)) {
    const r = await fetch(base + "/staff/" + staff._id + "/documents/id", {
      method: "PUT",
      headers: {
        Authorization: "Bearer " + login.data.accessToken,
        "Content-Type": "application/pdf",
        "X-File-Name": "fictional-hr.pdf",
      },
      body: bytes,
    });
    if (!r.ok) throw Error("HR document fixture failed");
  }
  for (const staff of profiles.slice(0, 2))
    await api("/payroll", "POST", {
      staffId: staff._id,
      month: "2026-09",
      basicSalary: 1000.1,
      allowances: 50.2,
      deductions: 0.1,
    });
  fs.writeFileSync("/tmp/schoolos-staff-seed-ready", "ready");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
