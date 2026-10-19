const fs = require("fs");
try {
  fs.unlinkSync("/tmp/schoolos-students-seed-ready");
} catch {}
require("../students/server.cjs");
(async () => {
  for (
    let i = 0;
    i < 200 && !fs.existsSync("/tmp/schoolos-students-seed-ready");
    i++
  )
    await new Promise((r) => setTimeout(r, 200));
  if (!fs.existsSync("/tmp/schoolos-students-seed-ready"))
    throw Error("Base fixture failed");
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
  const api = async (path, body) => {
    const r = await fetch(base + path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + login.data.accessToken,
      },
      body: JSON.stringify(body),
    });
    const result = await r.json();
    if (!r.ok) throw Error(path + JSON.stringify(result));
    return result.data;
  };
  const teacher = await api("/staff", {
    refId: "EMP-CLS",
    name: "QA Teacher",
    designation: "Teacher",
    department: "Secondary",
    type: "Teaching",
    status: "Active",
    email: "teacher@example.invalid",
    phone: "123456789",
    joinedDate: "2026-08-01",
  });
  for (const section of ["A", "B"])
    await api("/classes", {
      grade: "Grade 7",
      section,
      capacity: 30,
      stream: "General",
      room: "Room " + section,
      teacherStaffId: teacher._id,
    });
  fs.writeFileSync("/tmp/schoolos-timetable-seed-ready", "ready");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
