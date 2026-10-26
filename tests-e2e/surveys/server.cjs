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
  for(let n=0;n<25;n++){const survey=await api('/surveys','POST',{title:'QA active survey '+n,description:'Fictional survey purpose',audience:'All',questions:[{questionText:'QA school service?',options:['Good','Improve']}]});await api('/surveys/'+survey._id+'/activate','POST',{});}
  await api('/surveys','POST',{title:'QA internal draft',description:'Fictional draft content',audience:'Staff',questions:[{questionText:'QA draft?',options:['Yes','No']}]});
  fs.writeFileSync("/tmp/schoolos-surveys-seed-ready", "ready");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
