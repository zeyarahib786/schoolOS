const fs = require("fs");
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
  const students = await api("/students?limit=100");
  students.sort((a, b) => a.refId.localeCompare(b.refId));
  const today = new Date().toISOString().slice(0, 10);
  for (let n = 0; n < 22; n++)
    await api("/health-records", "POST", {
      studentId: students[n % 3]._id,
      reason:
        n === 0
          ? "QA sensitive <img src=x onerror=alert(1)>"
          : "QA clinic visit " + n,
      treatment: "Fictional staff care",
      outcome: n % 2 ? "Returned to class" : "Under observation",
      severity: n === 0 ? "Urgent" : "Routine",
      ...(n === 0
        ? { followUpDate: today, followUpNote: "Fictional follow-up" }
        : {}),
    });
  fs.writeFileSync("/tmp/schoolos-health-seed-ready", "ready");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
