/* ---- Theme engine (dark mode + accent) ---- */
const ACCENTS={
  green:{brand:'#17A24A',strong:'#0E7C39',deep:'#0A5E2C',soft:'rgba(23,162,74,.12)',line:'rgba(23,162,74,.30)',glow:'rgba(23,162,74,.20)',label:'Emerald'},
  blue:{brand:'#2563EB',strong:'#1D4FD7',deep:'#1E3A8A',soft:'rgba(37,99,235,.12)',line:'rgba(37,99,235,.30)',glow:'rgba(37,99,235,.22)',label:'Ocean'},
  purple:{brand:'#7C3AED',strong:'#6D28D9',deep:'#5B21B6',soft:'rgba(124,58,237,.12)',line:'rgba(124,58,237,.30)',glow:'rgba(124,58,237,.22)',label:'Violet'},
  teal:{brand:'#0D9488',strong:'#0B7A70',deep:'#115E59',soft:'rgba(13,148,136,.12)',line:'rgba(13,148,136,.30)',glow:'rgba(13,148,136,.22)',label:'Teal'},
  rose:{brand:'#E11D48',strong:'#BE123C',deep:'#9F1239',soft:'rgba(225,29,72,.12)',line:'rgba(225,29,72,.30)',glow:'rgba(225,29,72,.22)',label:'Rose'}};
const THEME={mode:'light',accent:'green'};
function applyAccent(a){const c=ACCENTS[a]||ACCENTS.green;const r=document.documentElement.style;
  r.setProperty('--brand',c.brand);r.setProperty('--brand-strong',c.strong);r.setProperty('--brand-deep',c.deep);
  r.setProperty('--brand-soft',c.soft);r.setProperty('--brand-line',c.line);r.setProperty('--brand-glow',c.glow);THEME.accent=a}
function prefersDark(){return window.matchMedia&&window.matchMedia('(prefers-color-scheme:dark)').matches}
function applyMode(m){THEME.mode=m;const dark=m==='dark'||(m==='system'&&prefersDark());document.documentElement.setAttribute('data-theme',dark?'dark':'light')}
function saveTheme(){try{localStorage.setItem('sos-theme',JSON.stringify(Object.assign({},THEME,{lang:LANG,langEnabled:LANG_ENABLED})))}catch(e){}}
function loadTheme(){try{const t=JSON.parse(localStorage.getItem('sos-theme')||'null');if(t){THEME.mode=t.mode||'light';THEME.accent=t.accent||'green';if(Array.isArray(t.langEnabled)&&t.langEnabled.length)LANG_ENABLED=t.langEnabled.filter(c=>LANGS[c]);if(t.lang&&LANGS[t.lang])LANG=t.lang;}}catch(e){}if(!LANG_ENABLED.length)LANG_ENABLED=['en'];if(LANG_ENABLED.indexOf(LANG)<0)LANG=LANG_ENABLED[0]||'en';applyAccent(THEME.accent);applyMode(THEME.mode);if(LANG!=='en'){const L=LANGS[LANG];document.documentElement.setAttribute('dir',L.dir);document.documentElement.lang=LANG;CFG.language=L.native;CFG.dir=L.dir}}
function setThemeMode(m){applyMode(m);saveTheme();render();toast('Appearance · '+({light:'Light',dark:'Dark',system:'System'}[m]||m))}
function setAccent(a){applyAccent(a);saveTheme();render();toast('Accent · '+(ACCENTS[a]||{}).label)}
function toggleTheme(){const d=document.documentElement.getAttribute('data-theme')==='dark';setThemeMode(d?'light':'dark')}
/* ---- downloadable documents (offline, print-ready) ---- */
function downloadDoc(filename,html){try{const blob=new Blob([html],{type:'text/html;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=filename;document.body.appendChild(a);a.click();setTimeout(()=>{document.body.removeChild(a);URL.revokeObjectURL(url)},120);toast('Downloaded · '+filename)}catch(e){toast('Document ready')}}
function docShell(title,meta,body){const today=new Date().toLocaleDateString((typeof schoolLocale==='function'?schoolLocale():'en-GB'),{day:'2-digit',month:'long',year:'numeric'});
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title} · Solvagence SchoolOS</title>
  <style>*{box-sizing:border-box;margin:0;padding:0}body{font-family:'Segoe UI',system-ui,-apple-system,Arial,sans-serif;color:#0C1015;background:#eef1f6;padding:32px}
  .sheet{max-width:780px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 8px 40px rgba(16,24,40,.12)}
  .hd{background:linear-gradient(135deg,#0A5E2C,#17A24A);color:#fff;padding:26px 34px;display:flex;align-items:center;gap:16px}
  .logo{width:46px;height:46px;border-radius:12px;background:rgba(255,255,255,.18);display:grid;place-items:center;font-weight:800;font-size:22px}
  .hd h1{font-size:20px;font-weight:700}.hd .sub{font-size:12.5px;opacity:.92;margin-top:3px}
  .doc-t{padding:22px 34px 6px}.doc-t .k{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:#17A24A;font-weight:700}
  .doc-t h2{font-size:22px;margin-top:4px}.doc-t .m{color:#667085;font-size:12.5px;margin-top:4px}.bd{padding:16px 34px 28px}
  table{width:100%;border-collapse:collapse;margin:14px 0}th,td{text-align:left;padding:10px 12px;font-size:13px;border-bottom:1px solid #EAECF0}
  th{background:#F7F9FC;color:#475467;font-size:11px;letter-spacing:.04em;text-transform:uppercase}td.r,th.r{text-align:right}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 26px;margin:10px 0 18px}
  .f{display:flex;justify-content:space-between;font-size:13px;padding:6px 0;border-bottom:1px dashed #EAECF0}.f span:first-child{color:#667085}.f b{color:#0C1015}
  .badge{display:inline-block;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:700}.g{background:#E9F8EF;color:#0A5E2C}.a{background:#FEF3E2;color:#B45309}.rr{background:#FEECEC;color:#B42318}
  .sign{display:flex;justify-content:space-between;margin-top:46px}.sign div{text-align:center;font-size:12px;color:#667085;width:42%}.sign .ln{border-top:1.5px solid #98A2B3;margin-bottom:6px;padding-top:10px}
  .ft{padding:14px 34px;border-top:1px solid #EAECF0;color:#98A2B3;font-size:11px;display:flex;justify-content:space-between}
  .note{background:#F7F9FC;border:1px solid #EAECF0;border-radius:10px;padding:12px 14px;font-size:12.5px;color:#475467;margin:12px 0}
  .pr{margin:22px auto 0;max-width:780px;text-align:center}.pr button{background:#17A24A;color:#fff;border:0;padding:11px 24px;border-radius:10px;font-weight:600;font-size:14px;cursor:pointer}
  @media print{body{background:#fff;padding:0}.sheet{box-shadow:none;border-radius:0;max-width:100%}.pr{display:none}}</style></head><body>
  <div class="sheet"><div class="hd"><div class="logo">S</div><div><h1>Al Noor International School</h1><div class="sub">Solvagence SchoolOS · Dubai, UAE · Term 2 · 2025–26</div></div></div>
  <div class="doc-t"><div class="k">${meta}</div><h2>${title}</h2><div class="m">Issued ${today}</div></div>
  <div class="bd">${body}</div><div class="ft"><span>Solvagence SchoolOS</span><span>System-generated document</span></div></div>
  <div class="pr"><button onclick="window.print()">Print / Save as PDF</button></div></body></html>`}
function reportCardHTML(s){const er=(typeof EXAMRESULTS!=='undefined')?EXAMRESULTS.find(x=>x.name===s.name):null;
  const subs=er?[['Mathematics',er.mat],['Science',er.sci],['English',er.eng]]:[['Mathematics',88],['Science',84],['English',86],['Arabic',90],['Social Studies',82]];
  const grd=m=>m>=90?'A+':m>=80?'A':m>=70?'B':m>=60?'C':'D';const avg=Math.round(subs.reduce((a,b)=>a+b[1],0)/subs.length);
  const rows=subs.map(x=>`<tr><td>${x[0]}</td><td class="r">${x[1]}/100</td><td class="r"><span class="badge ${x[1]>=80?'g':x[1]>=60?'a':'rr'}">${grd(x[1])}</span></td></tr>`).join('');
  return docShell('Academic Report Card','Progress Report · Term 2',`
    <div class="grid"><div class="f"><span>Student</span><b>${s.name}</b></div><div class="f"><span>Admission no.</span><b>${s.id}</b></div>
    <div class="f"><span>Grade & section</span><b>${s.grade}</b></div><div class="f"><span>Roll number</span><b>${s.roll}</b></div>
    <div class="f"><span>Guardian</span><b>${s.guardian}</b></div><div class="f"><span>Attendance</span><b>${s.att}%</b></div></div>
    <table><thead><tr><th>Subject</th><th class="r">Marks</th><th class="r">Grade</th></tr></thead><tbody>${rows}
    <tr><td><b>Overall average</b></td><td class="r"><b>${avg}/100</b></td><td class="r"><span class="badge ${avg>=80?'g':'a'}">${grd(avg)}</span></td></tr></tbody></table>
    <div class="grid"><div class="f"><span>Term GPA</span><b>${s.gpa}</b></div><div class="f"><span>Class rank</span><b>${er?'#'+er.rank:'—'}</b></div></div>
    <div class="note"><b>Class teacher's remark:</b> ${s.name.split(' ')[0]} has shown ${avg>=85?'excellent':'steady'} progress this term${avg>=85?' and consistently demonstrates strong understanding across subjects.':'. With continued focus, further improvement is well within reach.'}</div>
    <div class="sign"><div><div class="ln"></div>Class Teacher</div><div><div class="ln"></div>Principal</div></div>`)}
function downloadReportCard(id){
 if(window.SCHOOLOS_ADAPTER?.connected){dashboardDownloadAssessment(id);return}
 const s=STUDENTS.find(x=>x.id===id);if(s)downloadDoc('ReportCard_'+s.name.replace(/\s+/g,'_')+'.html',reportCardHTML(s))
}
function certBody(type,name,cls){const m={
  'Transfer Certificate':`This is to certify that <b>${name}</b>${cls?' of '+cls:''} was a bona fide student of this school and is hereby granted a Transfer Certificate. The student bore a good moral character and all dues have been cleared.`,
  'Bonafide Letter':`This is to certify that <b>${name}</b>${cls?', '+cls+',':''} is a bona fide student of Al Noor International School for the academic year 2025–26. This certificate is issued upon request for official purposes.`,
  'Character Certificate':`This is to certify that <b>${name}</b>${cls?' of '+cls:''} has been a student of good conduct and character throughout their association with Al Noor International School.`,
  'Report Card · Term 2':`This document certifies the academic performance record of <b>${name}</b>${cls?', '+cls+',':''} for Term 2 of the 2025–26 academic year.`};
  return m[type]||`This is to certify that <b>${name}</b> is associated with Al Noor International School. Document type: ${type}.`}
function certificateHTML(name,type,ref,cls){return docShell(type,'Official Document'+(ref?' · '+ref:''),`
  <p style="font-size:14px;line-height:1.85;color:#1D2939;margin:8px 0 22px">${certBody(type,name,cls)}</p>
  <div class="grid"><div class="f"><span>Reference</span><b>${ref||'—'}</b></div><div class="f"><span>Date of issue</span><b>${new Date().toLocaleDateString((typeof schoolLocale==='function'?schoolLocale():'en-GB'))}</b></div></div>
  <div class="note">Verify this document's authenticity by quoting the reference number to the school registrar.</div>
  <div class="sign"><div><div class="ln"></div>Registrar</div><div><div class="ln"></div>Principal</div></div>`)}
function downloadCertificate(name,type,ref,cls){
 if(window.SCHOOLOS_ADAPTER?.connected){
  if(!window.SCHOOLOS_ADAPTER.live.certificates){toast('Certificate records unavailable');return}
  const student=STUDENTS.find(s=>s.name===name&&(!cls||s.grade===cls))||STUDENTS.find(s=>s.name===name);
  const cert=ref?CERTS.find(c=>c.ref===ref):student&&CERTS.find(c=>String(c.studentId)===String(student.mongoId)&&c.kind==='Bonafide');
  const owner=cert&&STUDENTS.find(s=>String(s.mongoId)===String(cert.studentId));
  if(!cert||!owner||cert.status!=='Issued'){toast('No issued certificate record found');return}
  const issueDate=String(cert.issuedAt||'').slice(0,10)||cert.date;
  const rows='<table><tr><th>Field</th><th>Recorded value</th></tr>'+
    '<tr><td>Certificate type</td><td>'+escHtml(cert.type)+'</td></tr>'+
    '<tr><td>Reference</td><td>'+escHtml(cert.ref)+'</td></tr>'+
    '<tr><td>Issue date</td><td>'+escHtml(issueDate)+'</td></tr>'+
    '<tr><td>Recorded by</td><td>'+escHtml(cert.issuedBy||'School staff')+'</td></tr>'+
    (cert.purpose?'<tr><td>Purpose / notes</td><td>'+escHtml(cert.purpose)+'</td></tr>':'')+'</table>'+
    '<p>School office: verify the student record and any required clearances before releasing a signed certificate.</p>'+
    '<p style="margin-top:36px">Authorized school signature and seal: __________________________</p>'+
    '<button onclick="window.print()" style="margin-top:18px;padding:9px 14px">Print / Save as PDF</button>';
  downloadDoc('CertificateRecord_'+cert.ref.replace(/[^A-Za-z0-9-]/g,'_')+'.html',
    dashboardRecordHtml('Certificate record for school signature',owner,rows));
  return;
 }
 downloadDoc(type.replace(/[^A-Za-z]+/g,'_').replace(/^_|_$/g,'')+'_'+name.replace(/\s+/g,'_')+'.html',certificateHTML(name,type,ref,cls))
}
function feeStatementHTML(s){const tuition=8400,transport=1200,activity=600,total=tuition+transport+activity;const paid=s.fee==='Paid'?total:0;const bal=total-paid;
  return docShell('Fee Statement','Statement of Account · Term 2',`
    <div class="grid"><div class="f"><span>Student</span><b>${s.name}</b></div><div class="f"><span>Admission no.</span><b>${s.id}</b></div>
    <div class="f"><span>Grade</span><b>${s.grade}</b></div><div class="f"><span>Guardian</span><b>${s.guardian}</b></div></div>
    <table><thead><tr><th>Description</th><th class="r">Amount (AED)</th></tr></thead><tbody>
      <tr><td>Tuition fee · Term 2</td><td class="r">${tuition.toLocaleString()}</td></tr><tr><td>Transport</td><td class="r">${transport.toLocaleString()}</td></tr>
      <tr><td>Activities & resources</td><td class="r">${activity.toLocaleString()}</td></tr>
      <tr><td><b>Total billed</b></td><td class="r"><b>${total.toLocaleString()}</b></td></tr>
      <tr><td>Amount paid</td><td class="r">${paid.toLocaleString()}</td></tr>
      <tr><td><b>Balance ${bal>0?'due':''}</b></td><td class="r"><b>${bal.toLocaleString()}</b></td></tr></tbody></table>
    <div class="f" style="border:0"><span>Account status</span><span class="badge ${s.fee==='Paid'?'g':s.fee==='Due'?'a':'rr'}">${s.fee}</span></div>
    <div class="f" style="border:0"><span>Tax treatment</span><b style="font-size:12px">${(COMPLIANCE[CFG.country]||{}).tax||'As per local regulation'}</b></div>
    <div class="note">Settle any outstanding balance via the Parent portal or the accounts office. Quote ${s.id} on all payments. Issued by Al Noor International, ${CFG.country} · governed by ${(COMPLIANCE[CFG.country]||{}).privacy||'applicable data-protection law'}.</div>`)}
function downloadFeeStatement(id){
 if(window.SCHOOLOS_ADAPTER?.connected){dashboardDownloadFeeStatement(id);return}
 const s=STUDENTS.find(x=>x.id===id);if(s)downloadDoc('FeeStatement_'+s.name.replace(/\s+/g,'_')+'.html',feeStatementHTML(s))
}
function exportStudentsCSV(){const rows=[['ID','Name','Grade','Roll','Guardian','Phone','Attendance','GPA','Fee','Status']].concat(STUDENTS.map(s=>[s.id,s.name,s.grade,s.roll,s.guardian,s.phone,s.att+'%',s.gpa,s.fee,s.status]));
  const csv=rows.map(r=>r.map(c=>`"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  try{const blob=new Blob([csv],{type:'text/csv'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='Students_AlNoor.csv';document.body.appendChild(a);a.click();setTimeout(()=>{document.body.removeChild(a);URL.revokeObjectURL(url)},120);toast('Exported '+STUDENTS.length+' students · CSV')}catch(e){toast('Export ready')}}
