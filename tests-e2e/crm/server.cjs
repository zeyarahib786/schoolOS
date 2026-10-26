// Fictional provider config only; this fixture starts the app without the delivery worker.
Object.assign(process.env,{NOTIFICATIONS_ENABLED:'true',RESEND_API_KEY:'fictional-crm-key',RESEND_FROM_EMAIL:'school@example.invalid'});
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
  for(let n=0;n<105;n++)await api('/crm','POST',{name:'QA CRM '+String(n).padStart(3,'0'),grade:'Grade 7',source:'Website',owner:'QA admissions office'});
  for(let n=0;n<2;n++)await api('/crm','POST',{name:'QA duplicate lead',phone:'12345678'+n,grade:'Grade 7',source:'Website',owner:'QA '+n});
  fs.writeFileSync("/tmp/schoolos-crm-seed-ready", "ready");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
