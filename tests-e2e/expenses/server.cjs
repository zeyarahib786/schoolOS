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
  for (const role of ['teacher','accountant','principal','administrator']) {
    await api('/staff','POST',{refId:'QA-EXP-'+role,name:'QA '+role+' staff',designation:'Teacher',department:'QA',type:'Teaching',email:role+'@example.invalid',phone:'+971501234567',joinedDate:'2020-01-01'});
    const auth = await (await fetch(base+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:role+'@example.invalid',password:'LocalFixture123!'})})).json();
    for (let n=0;n<(role==='teacher'?25:1);n++) {
      const r=await fetch(base+'/expenses',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+auth.data.accessToken},body:JSON.stringify({category:'Travel',amount:10.25,description:n===0?'QA <img src=x> '+role+' receipt':'QA '+role+' receipt '+n,expenseDate:'2026-06-01',vendor:'Fictional vendor',receiptReference:'QA-'+role+'-'+n})});
      if(!r.ok)throw Error('Claim fixture '+await r.text());
    }
  }
  fs.writeFileSync("/tmp/schoolos-expenses-seed-ready", "ready");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
