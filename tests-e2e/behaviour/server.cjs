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
        body: JSON.stringify({
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
  for (let n = 0; n < 24; n++)
    await api("/behaviour", "POST", {
      studentId: students[n % 3]._id,
      category: "Classroom",
      description:
        n === 0 ? "QA shared <img src=x onerror=alert(1)>" : "QA entry " + n,
      type: n % 4 === 1 ? "Merit" : "Incident",
      severity: "Minor",
      witness: "Fictional staff witness",
    });
  await api("/behaviour", "POST", {
    studentId: students[0]._id,
    category: "Pastoral",
    description: "QA confidential pastoral content",
    type: "Pastoral note",
  });
  fs.writeFileSync("/tmp/schoolos-behaviour-seed-ready", "ready");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
