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
  for (let n=0;n<25;n++) await api('/curriculum','POST',{
    subject:n%2?'Science':'Mathematics',grade:n%3?'Grade 7':'Grade 8',academicYear:'2026-2027',term:n%2?'Term 1':'Term 2',
    title:n===0?'QA safe <img src=x onerror=alert(1)>':'QA unit '+n,outcomes:'Fictional learning outcome '+n,
    plannedDate:'2026-01-01', ...(n%4===0?{completedDate:'2026-01-02'}:{})
  });
  fs.writeFileSync('/tmp/schoolos-curriculum-seed-ready','ready');
})().catch(e=>{console.error(e);process.exit(1);});
