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
  const students=await api('/students?limit=100');students.sort((a,b)=>a.refId.localeCompare(b.refId));
  for(let n=0;n<25;n++)await api('/id-cards','POST',{subjectType:'Student',subjectId:students[n]._id,expiryDate:'2099-06-30'});
  const staff=await api('/staff','POST',{refId:'QA-ACCOUNTANT',name:'QA accountant staff',designation:'Accountant',department:'Finance',type:'Non-Teaching',email:'accountant@example.invalid',phone:'+971501234567',joinedDate:'2020-01-01'});
  await api('/id-cards','POST',{subjectType:'Staff',subjectId:staff._id,expiryDate:'2099-06-30'});
  fs.writeFileSync("/tmp/schoolos-idcards-seed-ready", "ready");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
