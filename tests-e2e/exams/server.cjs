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
  const students = (await api("/students?limit=100", null, "GET")).sort((a,b)=>a.refId.localeCompare(b.refId));
  const e = await api("/exams", {
    name: "QA Published Assessment",
    term: "Term 1",
    subjects: ["Math", "English"],
    maxMarks: 50,
    passMark: 25,
  });
  await api(
    "/exams/" + e._id,
    {
      expectedUpdatedAt: e.updatedAt,
      schedule: [
        {
          subject: "Math",
          date: "2026-11-10",
          startTime: "09:00",
          durationMinutes: 60,
          venue: "Room A",
        },
      ],
    },
    "PATCH",
  );
  await api(
    "/exams/" + e._id + "/register",
    {
      entries: students.slice(0, 3).map((s) => ({
        studentId: s._id,
        scores: [
          { subject: "Math", marks: 30 },
          { subject: "English", marks: 30 },
        ],
        expectedUpdatedAt: null,
      })),
    },
    "PUT",
  );
  await api("/exams/" + e._id + "/publish", {});
  await api("/exams/" + e._id + "/report-cards", {});
  await api("/exams", {
    name: "QA Draft Assessment",
    term: "Term 2",
    subjects: ["Science"],
    maxMarks: 100,
    passMark: 50,
  });
  fs.writeFileSync("/tmp/schoolos-exams-seed-ready", "ready");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
