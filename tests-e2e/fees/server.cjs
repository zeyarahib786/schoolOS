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
  const base = "http://127.0.0.1:4400/api/v1";
  const login = await (
    await fetch(base + "/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "administrator@example.invalid",
        password: "LocalFixture123!",
      }),
    })
  ).json();
  const api = async (path, body, method = "POST") => {
    const r = await fetch(base + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + login.data.accessToken,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const j = await r.json();
    if (!r.ok) throw Error(path + JSON.stringify(j));
    return j.data;
  };
  const students = await api("/students?limit=100", null, "GET");
  for (let n = 0; n < students.length; n++)
    await api("/fees", {
      refId: "INV-QA-" + students[n].refId,
      studentId: students[n]._id,
      term: "QA Tuition",
      amount: 100.25,
      dueDate: "2020-01-01",
    });
  await api("/fees/heads", {
    name: "QA Tuition",
    amount: 100.25,
    frequency: "Term",
    appliesTo: "Grade 7",
  });
  fs.writeFileSync("/tmp/schoolos-fees-seed-ready", "ready");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
