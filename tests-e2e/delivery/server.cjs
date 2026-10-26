const fs = require("fs"),
  path = require("path"),
  os = require("os");
const root = path.resolve(__dirname, "../../server");
const {execFileSync}=require('child_process');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'schoolos-signing-qa-'));
execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-keyout',path.join(dir,'key.pem'),'-out',path.join(dir,'cert.pem'),'-days','1','-subj','/CN=Fictional SchoolOS QA - not production','-addext','keyUsage=digitalSignature'],{stdio:'ignore'});
execFileSync('openssl',['pkcs12','-export','-inkey',path.join(dir,'key.pem'),'-in',path.join(dir,'cert.pem'),'-out',path.join(dir,'qa.p12'),'-passout','pass:FixtureOnly123!'],{stdio:'ignore'});
Object.assign(process.env, {
  NOTIFICATIONS_ENABLED: "true",
  RESEND_API_KEY: "fictional-unused-fixture-key",
  RESEND_FROM_EMAIL: "qa@example.invalid",
  SMS_PROVIDER: "disabled",
  PDF_SIGNING_P12_PATH: path.join(dir, "qa.p12"),
  PDF_SIGNING_P12_PASSPHRASE: "FixtureOnly123!",
});
process.on("exit", () => fs.rmSync(dir, { recursive: true, force: true }));
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
  const students = await api("/students?limit=100");
  const own = students.find((s) => s.refId === "QA-001");
  await api("/certificates", "POST", {
    studentId: own._id,
    type: "Bonafide",
    purpose: "Fictional QA verification",
  });
  // createApp fixtures intentionally do not start the production delivery worker.
  fs.writeFileSync("/tmp/schoolos-delivery-seed-ready", "ready");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
