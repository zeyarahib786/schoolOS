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
  for (let n = 0; n < 25; n++) {
    await api('/cafeteria/wallets/top-up','POST',{studentId:students[n]._id,amount:100,description:'QA fictional receipt',method:'Cash',reference:'QA-'+n,requestId:'qa-seed-receipt-'+n});
  }
  await api('/cafeteria/allergy-plans','POST',{studentId:students[0]._id,allergens:'QA <img src=x> milk',severity:'Severe',carePlan:'Fictional approved substitute'});
  await api('/cafeteria/menu/item','PUT',{day:'Sunday',meal:'Breakfast',item:'QA <img src=x> oats',calories:250,vegetarian:true,allergens:['Milk']});
  fs.writeFileSync("/tmp/schoolos-cafeteria-seed-ready", "ready");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
