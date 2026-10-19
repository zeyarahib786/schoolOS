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
  await api("/announcements", {
    title: "QA Public Notice",
    body: "School portal notice for every role",
    audience: "All",
    status: "Published",
  });
  await api("/announcements", {
    title: "QA Parents Notice",
    body: "Parents and staff oversight",
    audience: "Parents",
    status: "Published",
  });
  for (const role of [
    "Principal",
    "Teacher",
    "Accountant",
    "Parent",
    "Student",
  ])
    await api("/messages", {
      recipientEmail: role.toLowerCase() + "@example.invalid",
      subject: "QA Welcome " + role,
      body: "Fictional private QA message",
    });
  const p = await (
    await fetch(base + "/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "parent@example.invalid",
        password: "LocalFixture123!",
      }),
    })
  ).json();
  await fetch(base + "/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + p.data.accessToken,
    },
    body: JSON.stringify({
      recipientEmail: "administrator@example.invalid",
      subject: "QA Welcome Administrator",
      body: "Fictional private QA message",
    }),
  });
  fs.writeFileSync("/tmp/schoolos-communication-seed-ready", "ready");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
