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
  const { PDFDocument }=require('../../server/node_modules/pdf-lib');
  const pdf=await PDFDocument.create();pdf.addPage().drawText('Fictional school policy PDF');const bytes=Buffer.from(await pdf.save());
  fs.writeFileSync('/tmp/schoolos-documents-qa.pdf',bytes);
  const first=await fetch(base+'/documents/file',{method:'POST',headers:{Authorization:'Bearer '+login.data.accessToken,'Content-Type':'application/pdf','X-File-Name':'fictional-policy.pdf','X-Document-Code':'POL-001','X-Document-Title':encodeURIComponent('QA <img src=x> policy'),'X-Document-Category':'Policy','X-Document-Description':'Fictional%20school%20policy'},body:bytes});
  if(!first.ok)throw Error('PDF fixture failed '+await first.text());
  for(let n=2;n<=25;n++)await api('/documents','POST',{code:'POL-'+String(n).padStart(3,'0'),title:'QA policy '+n,category:'Policy',description:'Fictional saved policy '+n});
  fs.writeFileSync("/tmp/schoolos-documents-seed-ready", "ready");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
