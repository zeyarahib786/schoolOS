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
  await api('/facilities/facilities','POST',{name:'QA Hall',type:'Hall',capacity:50});
  for(let n=0;n<25;n++) await api('/events','POST',{title:n===0?'QA <img src=x> assembly':'QA assembly '+n,description:'Fictional school event',date:'2026-10-'+String(n+1).padStart(2,'0'),audience:'All'});
  await api('/events','POST',{title:'QA staff-only meeting',description:'Fictional internal meeting',date:'2026-10-10',audience:'Staff'});
  fs.writeFileSync("/tmp/schoolos-calendar-seed-ready", "ready");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
