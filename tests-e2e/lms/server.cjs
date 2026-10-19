// Isolated browser fixture only: deterministic provider response, never a live AI call.
const realFetch=global.fetch;
Object.assign(process.env,{TEACHER_AI_ENABLED:'true',OPENAI_API_KEY:'fictional-e2e-key',TEACHER_AI_MODEL:'fictional-e2e-model'});
global.fetch=async function(url,options){
 if(String(url)==='https://api.openai.com/v1/responses'){
  if(process.env.NODE_ENV!=='test')throw Error('AI fixture only allowed in test');
  const payload=JSON.parse(options.body),context=JSON.parse(payload.input),r=context.request;
  const questions=['Assignment','Quiz'].includes(r.kind)?Array.from({length:r.questionCount},(_,i)=>({id:'q'+(i+1),type:i%2?'ShortAnswer':'MCQ',prompt:'Fictional question '+(i+1),options:i%2?[]:['Plant','Stone'],answer:i%2?'Explain plant parts':'Plant',marks:Math.floor(r.maxScore/r.questionCount)+(i<r.maxScore%r.questionCount?1:0),rubric:'Award marks for accurate plant knowledge'})):[];
  const result={title:'AI fixture '+r.kind,body:'Fictional reviewed teaching content. Check learning and provide support.',questions,suggestedScore:r.kind==='Feedback'?(context.facts.objectiveScore??Math.min(10,context.facts.maxScore)):null,warnings:['Fictional provider fixture; not a live AI quality test.']};
  return new Response(JSON.stringify({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify(result)}]}]}));
 }
 return realFetch(url,options);
};
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
  const teacherLogin=await (await fetch(base+'/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'teacher@example.invalid',password:'LocalFixture123!'})})).json();
  const existingClasses=await api('/classes?limit=100');
  for(const section of ['A','B']){
    const cls=existingClasses.find(c=>c.grade==='Grade 7'&&c.section===section)||await api('/classes','POST',{grade:'Grade 7',section});
    for(const subject of ['Science','QA Subject'])await api('/lms/teaching-assignments','POST',{teacher:teacherLogin.data.user._id,classSection:cls._id,subject,academicYear:'2026-2027'});
  }
  for (let n = 0; n < 24; n++)
    await api("/lms/courses", "POST", {
      title: "QA course " + n,
      teacher: "QA coordinator",
      subject: "Science",
      grade: n % 2 ? "Grade 7 · B" : "Grade 7 · A",
      academicYear: "2026-2027",
    });
  let first;
  for (let n = 0; n < 26; n++) {
    const a = await api("/lms/assignments", "POST", {
      title:
        n === 0 ? "QA safe <img src=x onerror=alert(1)>" : "QA assignment " + n,
      description: "Fictional instructions " + n,
      subject: "Science",
      grade: n % 2 ? "Grade 7 · B" : "Grade 7 · A",
      dueDate: "2099-01-01",
      maxScore: 20,
      status: n === 25 ? "Draft" : "Published",
    });
    if (n === 0) first = a;
  }
  const studentLogin = await (
    await fetch(base + "/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "student@example.invalid",
        password: "LocalFixture123!",
      }),
    })
  ).json();
  const response = await fetch(
    base + "/lms/assignments/" + first._id + "/submit",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + studentLogin.data.accessToken,
      },
      body: JSON.stringify({ content: "QA work <img src=x onerror=alert(1)>" }),
    },
  );
  const submission = (await response.json()).data;
  if (!response.ok) throw Error("Seed submission failed");
  await api("/lms/submissions/" + submission._id + "/grade", "POST", {
    score: 12,
    feedback: "QA useful feedback",
    expectedUpdatedAt: submission.updatedAt,
    reason: "QA fixture assessment",
  });
  fs.writeFileSync("/tmp/schoolos-lms-seed-ready", "ready");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
