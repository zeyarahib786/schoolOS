/* ============ MODULES ============ */
const M={};

function dashboardLocalDate() {
  const timezone=window.SCHOOLOS_ADAPTER?.settings?.timezone||'UTC';
  try {
    const parts=new Intl.DateTimeFormat('en-GB',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
    const value=key=>parts.find(part=>part.type===key)?.value||'';
    return value('year')+'-'+value('month')+'-'+value('day');
  } catch(e) { return new Date().toISOString().slice(0,10); }
}
function dashboardAttendance() {
  const api=window.SCHOOLOS_ADAPTER;
  if(!api?.live?.attendance)return {loaded:false,present:0,late:0,absent:0,unmarked:0,rate:null,history:[]};
  const today=dashboardLocalDate();
  const am=(api.attendance||[]).filter(row=>row.session==='AM');
  const todayRows=am.filter(row=>row.date===today);
  const count=status=>todayRows.filter(row=>row.status===status).length;
  const present=count('Present'),late=count('Late'),absent=count('Absent');
  const eligible=present+late+absent;
  const marked=new Set(todayRows.map(row=>row.studentId));
  const unmarked=api.live.students?STUDENTS.filter(s=>s.status==='Active'&&!marked.has(s.mongoId)).length:0;
  const dates=[...new Set(am.map(row=>row.date).filter(date=>date<=today))].sort().slice(-6);
  const history=dates.map(date=>{
    const rows=am.filter(row=>row.date===date);
    const yes=rows.filter(row=>row.status==='Present'||row.status==='Late').length;
    const all=rows.filter(row=>row.status!=='Excused').length;
    const rate=all?Math.round(yes/all*100):0;
    return {lb:date.slice(5),val:rate+'% · '+all+' marked',pct:rate,alt:rate<90};
  });
  return {loaded:true,present,late,absent,unmarked,rate:eligible?Math.round((present+late)/eligible*100):null,history};
}
function dashboardFees() {
  if(!window.SCHOOLOS_ADAPTER?.live?.fees)return {loaded:false,billed:0,paid:0,due:0,over:0,rate:null};
  const billed=INVOICES.reduce((sum,i)=>sum+(Number(i.amt)||0),0);
  const paid=INVOICES.reduce((sum,i)=>sum+(Number(i.paid)||0),0);
  const balance=status=>INVOICES.filter(i=>i.status===status).reduce((sum,i)=>sum+(Number(i.balance)||0),0);
  return {loaded:true,billed,paid,due:balance('Due'),over:balance('Overdue'),rate:billed?Math.round(paid/billed*100):null};
}
function exportDashboardSummary() {
  const api=window.SCHOOLOS_ADAPTER;
  const att=dashboardAttendance(),fees=dashboardFees();
  const rows=[['Students on roster',api?.live?.students?STUDENTS.length:'Unavailable'],
    ['Attendance date',dashboardLocalDate()],['AM attendance rate',att.rate===null?'No marked register':att.rate+'%'],
    ['Present AM',att.loaded?att.present:'Unavailable'],['Late AM',att.loaded?att.late:'Unavailable'],
    ['Absent AM',att.loaded?att.absent:'Unavailable'],['Not yet marked',att.loaded?att.unmarked:'Unavailable'],
    ['Fees billed',fees.loaded?fees.billed:'Unavailable'],['Fees collected',fees.loaded?fees.paid:'Unavailable'],
    ['Fees due balance',fees.loaded?fees.due:'Unavailable'],['Fees overdue balance',fees.loaded?fees.over:'Unavailable'],
    ['Open admissions',api?.live?.ADMISSIONS?ADMISSIONS.filter(a=>a.stage!=='Enrolled'&&a.stage!=='Closed').length:'Unavailable']];
  exportCSV('dashboard-summary.csv',['Metric','Value'],rows);
}

M.dashboard=()=>{
  const r=state.role;
  if(r==='Parent') return parentHome();
  if(r==='Student') return studentHome();
  if(r==='Teacher') return teacherHome();
  if(r==='Accountant') return accountantHome();
  const api=window.SCHOOLOS_ADAPTER;
  const N=api?.live?.students?STUDENTS.length:0;
  const att=dashboardAttendance();
  const fees=dashboardFees();
  const attP=att.present,attL=att.late,attA=att.absent,attU=att.unmarked,attRate=att.rate;
  const billed=fees.billed,paid=fees.paid,due=fees.due,over=fees.over,collRate=fees.rate;
  const admissionsLoaded=Boolean(api?.live?.ADMISSIONS);
  const openAdm=admissionsLoaded?ADMISSIONS.filter(a=>a.stage!=='Enrolled'&&a.stage!=='Closed').length:0;
  const offers=admissionsLoaded?ADMISSIONS.filter(a=>a.stage==='Offer').length:0;
  const approvalSources={staffleave:'LEAVE',cert:'certificates',hleave:'HLEAVE',maint:'HMAINT',absence:'absenceRequests'};
  const approvals=pendingApprovals().filter(item=>!api?.connected||Boolean(api.live[approvalSources[item.kind]]));
  const modsOn=(typeof OPTIONAL!=='undefined')?OPTIONAL.filter(m=>state.modules[m.id]).length:0;
  const modsTot=(typeof OPTIONAL!=='undefined')?OPTIONAL.length:0;
  const coreMods=flatItems().length-modsOn;
  const visibleAlerts=(fees.loaded?INVOICES.filter(i=>i.status==='Overdue').length:0)
    +(att.loaded?STUDENTS.filter(s=>s.status==='Active'&&(s.attendanceEligibleRecords??s.attendanceRecords)>0&&s.att<85).length:0)
    +approvals.length;
  return `
  <div class="page-head">
    <div class="ph-l"><h2>${t('Welcome')}, <span data-i18n-skip="true">${escHtml(api?.user?.name||r)}</span> 👋</h2>
      <p>${t('Operational view')} · <span data-i18n-skip="true">${escHtml(state.schoolProfile?.legalName||'SchoolOS')}</span> · ${dashboardLocalDate()}. ${t('Figures below use available server records.')}</p></div>
    <div class="ph-r">
      ${(state.role==='Principal')?`<button class="btn" onclick="openDrawer(myLeaveView())">${ic('roles',16)} ${t('My leave')}</button>`:''}
      ${(state.role==='Administrator'||state.role==='Principal')?`<button class="btn" onclick="openDrawer(officeAttendanceOverview())">${ic('att',16)} ${t('Office attendance')}</button>`:''}
      <button class="btn" onclick="exportDashboardSummary()">${ic('download',16)} ${t('Export')}</button>
      <button class="btn primary" onclick="openCmd()">${ic('plus',16)} ${t('Quick action')}</button>
    </div>
  </div>
  <div class="grid cols-4">
    ${kpi('students','#17A24A',t('Students · roster'),api?.live?.students?String(N):'—',null,"go('students')")}
    ${kpi('att','#2563EB',t("Today's AM attendance"),attRate===null?t('Not marked'):attRate+'%',att.loaded?{dir:'flat',v:String(attP+attL)+' '+t('marked present/late'),note:attU+' '+t('unmarked')}:null,"go('attendance')")}
    ${kpi('fees','#0E7C39',t('Fees collected'),fees.loaded?aed(paid):'—',fees.loaded?{dir:'flat',v:collRate===null?t('No invoices'):collRate+'%',note:t('of')+' '+aed(billed)+' '+t('billed')}:null,"go('fees')")}
    ${kpi('admiss','#E11D2A',t('Open admissions'),admissionsLoaded?String(openAdm):'—',admissionsLoaded?{dir:'flat',v:String(offers),note:t('at offer stage')}:null,"go('admissions')")}
  </div>
  <div class="muted" style="font-size:11.5px;margin-top:8px">${t('Data: available Students, Attendance, Fees & Admissions records · school timezone:')} ${escHtml(t(api?.settings?.timezone||'UTC'))}</div>

  <div class="grid cols-3 mt">
    <div class="card pad span-2">
      <div class="sec-head"><h3>${t('Recent AM attendance')}</h3><span class="link" onclick="go('attendance')">${t('Open attendance')} →</span></div>
      ${att.history.length?vbars(att.history):`<div class="muted" style="padding:22px 0">${t('No AM attendance records available yet.')}</div>`}
      <div class="flex gap wrap mt-s" style="font-size:12px;color:var(--slate-500)">
        <span class="flex ac" style="gap:6px"><span style="width:10px;height:10px;border-radius:3px;background:var(--brand);display:inline-block"></span> ${t('90% and above')}</span>
        <span class="flex ac" style="gap:6px"><span style="width:10px;height:10px;border-radius:3px;background:#A6DEBC;display:inline-block"></span> ${t('Below 90% — review')}</span>
        <span style="margin-left:auto">${t('Today')}: ${att.loaded?attP+' '+t('present')+' · '+attL+' '+t('late')+' · '+attA+' '+t('absent')+' · '+attU+' '+t('unmarked'):t('attendance unavailable')}</span>
      </div>
    </div>
    <div class="card pad">
      <div class="sec-head"><h3>${t('Fee collection')}</h3><span class="link" onclick="go('fees')">${t('Open')} →</span></div>
      <div class="flex ac" style="gap:18px">
        <div class="donut" style="--p:${collRate||0}"><div class="in"><b>${collRate===null?'—':collRate+'%'}</b><span>${t('of')} ${fees.loaded?aedC(billed):t('unavailable')}</span></div></div>
        <div style="flex:1">
          <div class="lrow" style="border:0;padding:7px 0"><span class="badge b-green"><span class="bd"></span>${t('Collected')}</span><b class="num" style="margin-left:auto;color:var(--slate-900)">${aed(paid)}</b></div>
          <div class="lrow" style="border:0;padding:7px 0"><span class="badge b-amber"><span class="bd"></span>${t('Due')}</span><b class="num" style="margin-left:auto;color:var(--slate-900)">${aed(due)}</b></div>
          <div class="lrow" style="border:0;padding:7px 0"><span class="badge b-red"><span class="bd"></span>${t('Overdue')}</span><b class="num" style="margin-left:auto;color:var(--slate-900)">${aed(over)}</b></div>
        </div>
      </div>
      <div class="muted" style="font-size:11px;margin-top:10px">${fees.loaded?t('Billed')+' '+aed(billed)+' · '+t('collected is sum of payments; due/overdue are outstanding balances'):t('Fee ledger unavailable')}</div>
    </div>
  </div>

  <div class="grid cols-3 mt">
    <div class="card pad span-2">
      <div class="sec-head"><h3>${t('Admissions pipeline')}</h3><span class="link" onclick="go('admissions')">${t('Manage')} →</span></div>
      <div class="grid cols-4" style="gap:10px;grid-template-columns:repeat(5,1fr)">
        ${STAGES.map(st=>{const n=admissionsLoaded?ADMISSIONS.filter(a=>a.stage===st).length:null;return `<div role="button" tabindex="0" onclick="admFocus('${st}');go('admissions')" onkeydown="if(event.key==='Enter'){admFocus('${st}');go('admissions')}" style="text-align:center;padding:14px 8px;border:1px solid var(--line);border-radius:12px;background:var(--surface-2);cursor:pointer">
          <div class="num" style="font-family:var(--ff-display);font-weight:700;font-size:26px;color:var(--slate-900)">${n===null?'—':n}</div>
          <div style="font-size:11.5px;color:var(--slate-500);font-weight:600;margin-top:2px">${t(st)}</div></div>`}).join('')}
      </div>
      <div class="mt-s">${admissionsLoaded?ADMISSIONS.slice(0,3).map(a=>`<div class="lrow" style="cursor:pointer" onclick="go('admissions')">${avatar(escHtml(t(a.name)))}<div><div style="font-weight:600;color:var(--slate-900)">${escHtml(t(a.name))}</div><div class="muted" style="font-size:12px">${escHtml(t(a.grade))} · ${t('via')} ${escHtml(t(a.src))}</div></div><span class="badge b-blue" style="margin-left:auto"><span class="bd"></span>${escHtml(t(a.stage))}</span><span class="muted" style="font-size:12px">${escHtml(a.date)}</span></div>`).join(''):`<div class="muted">${t('Admissions data unavailable.')}</div>`}</div>
    </div>
    <div class="card pad">
      <div class="sec-head"><h3>${t('Action centre')}</h3><span class="badge ${approvals.length?'b-red':'b-green'}"><span class="bd"></span>${approvals.length} ${t('visible')}</span></div>
      ${approvals.length?approvals.slice(0,5).map(a=>`<div class="lrow"><div style="flex:1;min-width:0"><div style="font-weight:600;color:var(--slate-900);font-size:13.5px">${escHtml(t(a.title))}</div><div class="muted" style="font-size:12px">${escHtml(t(a.sub))}</div></div><button class="btn sm" onclick="openDrawer(approvalDetail('${a.kind}','${a.ref}'))">${t('Review')}</button></div>`).join(''):`<div class="empty" style="padding:22px 8px"><div class="ei">${ic('roles',24)}</div><h3 style="font-size:14px">${t('No visible actions')}</h3><p style="font-size:12px">${t('Nothing pending in the modules currently loaded.')}</p></div>`}
      ${approvals.length?`<div class="muted" style="font-size:11px;margin-top:8px">${t('Each request opens for full review — details, policy checks and audit-logged decisions.')}</div>`:''}
    </div>
  </div>

  <div class="grid cols-3 mt">
    <div class="card pad span-2">
      <div class="sec-head"><h3>${t('Announcements')}</h3><span class="link" onclick="go('comm')">${t('All updates')} →</span></div>
      ${api?.live?.ANN?(ANN.filter(a=>a.status==='Published').slice(0,5).map(annRow).join('')||`<div class="muted">${t('No published announcements.')}</div>`):`<div class="muted">${t('Announcements unavailable.')}</div>`}
    </div>
    <div class="card pad">
      <div class="sec-head"><h3>${t('System health')}</h3><span class="link" onclick="go('settings')">${t('Modules')} →</span></div>
      ${[['Modules active',(coreMods+modsOn)+' / '+(coreMods+modsTot),'green'],['Visible alerts',String(visibleAlerts),visibleAlerts?'amber':'green'],['Audit events',api?.live?.audit?String(AUDIT.length):t('Unavailable'),'blue'],['Backup status',t('Not verified'),'amber'],['Languages enabled',String(langEnabled().length)+' / 4','blue']].map(x=>`<div class="lrow" style="padding:10px 0"><span style="font-size:13px;color:var(--slate-600)">${t(x[0])}</span><span class="badge b-${x[2]}" style="margin-left:auto"><span class="bd"></span>${t(x[1])}</span></div>`).join('')}
      <div class="muted" style="font-size:11px;margin-top:8px">${t('Module count reflects Settings toggles. Backup verification needs an external process.')}</div>
    </div>
  </div>`;
};
function annRow(a){const cmap={green:'var(--brand)',blue:'var(--blue)',amber:'var(--amber)',red:'var(--red)'};const c=cmap[a.c]||cmap.green;
  return `<div class="ann"><div class="ai" style="background:${c}14;color:${c}">${ic(a.ic,20)}</div><div style="flex:1"><div class="ah"><span class="t">${escHtml(a.t)}</span><span class="tm">${escHtml(a.tm)}</span></div><div class="bd">${escHtml(a.bd)}</div><div class="muted" style="font-size:11.5px;margin-top:6px">${escHtml(a.by)} · to ${escHtml(a.aud)}</div></div></div>`}

/* role homes */
function myIdentity(){return window.SCHOOLOS_ADAPTER?.connected?window.SCHOOLOS_ADAPTER.user?.name||'Staff member':state.role==='Teacher'?'Rohan Mehta':state.role==='Accountant'?'Joseph Thomas':state.role==='Principal'?'Dr. Salma Haddad':'Rashid Al Maktoum'}
function dashboardLinkedStudent(){
 if(window.SCHOOLOS_ADAPTER?.connected)return STUDENTS[0]||null;
 return myStudent()||null;
}
function dashboardGrades(student){
 const api=window.SCHOOLOS_ADAPTER;
 if(!api?.live?.examResults||!api.exam?.locked||!student?.mongoId)return [];
 const row=EXAMRESULTS.find(result=>String(result.studentId)===String(student.mongoId));
 if(!row)return [];
 return EXAMSCHEMES[0].subjects.map(subject=>({subject,score:row[subjKey(subject)],max:EXAMSCHEMES[0].maxMarks}))
   .filter(result=>Number.isFinite(result.score));
}
function dashboardStudentSlots(student){
 const api=window.SCHOOLOS_ADAPTER;
 if(!api?.live?.timetable||!student)return [];
 const day=new Intl.DateTimeFormat('en-GB',{weekday:'long',timeZone:api.settings?.timezone||'UTC'}).format(new Date());
 return (api.timetableSlots||[]).filter(slot=>slot.grade===student.grade&&slot.dayOfWeek===day&&slot.status==='Published')
   .sort((a,b)=>a.periodNumber-b.periodNumber);
}
function dashboardRecordHtml(title,student,content){
 const api=window.SCHOOLOS_ADAPTER;
 const school=api?.settings?.schoolName||state.schoolProfile?.legalName||'School';
 return '<!doctype html><html><head><meta charset="utf-8"><title>'+escHtml(title)+'</title>'+
  '<style>body{font-family:Arial,sans-serif;max-width:780px;margin:40px auto;color:#18202a}h1{font-size:22px}table{width:100%;border-collapse:collapse;margin-top:20px}th,td{border:1px solid #ddd;padding:9px;text-align:left}.note{background:#f3f5f7;padding:12px;margin-top:18px}</style>'+
  '</head><body><h1>'+escHtml(school)+'</h1><h2>'+escHtml(title)+'</h2><p>Student: '+escHtml(student.name)+' · '+escHtml(student.id)+' · '+escHtml(student.grade)+'</p>'+
  '<p>Generated '+escHtml(new Date().toISOString())+'</p>'+content+
  '<p class="note">Data copy from SchoolOS records. This is not a signed or certified school document; request an official copy from the school office.</p></body></html>';
}
function dashboardDownloadAssessment(studentId){
 const student=STUDENTS.find(s=>s.id===studentId),grades=dashboardGrades(student);
 if(!student||!grades.length){toast('No published assessment marks available for download');return}
 const rows=grades.map(row=>'<tr><td data-i18n-skip="true">'+escHtml(row.subject)+'</td><td>'+row.score+'</td><td>'+row.max+'</td></tr>').join('');
 downloadDoc('Assessment_'+student.id.replace(/[^A-Za-z0-9-]/g,'_')+'.html',
  dashboardRecordHtml('Published assessment summary',student,'<p>'+escHtml(window.SCHOOLOS_ADAPTER.exam.name)+'</p><table><tr><th>Subject</th><th>Marks</th><th>Maximum</th></tr>'+rows+'</table>'));
}
function dashboardDownloadFeeStatement(studentId){
 const api=window.SCHOOLOS_ADAPTER,student=STUDENTS.find(s=>s.id===studentId);
 if(!student||!api?.live?.fees){toast('Fee ledger unavailable');return}
 const invoices=INVOICES.filter(i=>String(i.studentId)===String(student.mongoId));
 if(!invoices.length){toast('No invoices found for this student');return}
 const rows=invoices.map(i=>'<tr><td>'+escHtml(i.id)+'</td><td>'+escHtml(i.term)+'</td><td>'+Number(i.amt)+'</td><td>'+Number(i.paid)+'</td><td>'+Number(i.balance)+'</td></tr>').join('');
 const currency=escHtml(api.settings?.currency||CFG.currency||'');
 downloadDoc('Fees_'+student.id.replace(/[^A-Za-z0-9-]/g,'_')+'.html',
  dashboardRecordHtml('Fee ledger statement',student,'<p>Currency: '+currency+'</p><table><tr><th>Invoice</th><th>Term</th><th>Billed</th><th>Paid</th><th>Balance</th></tr>'+rows+'</table>'));
}
function dashboardDownloadCertificateRecord(studentId){
 const api=window.SCHOOLOS_ADAPTER,student=STUDENTS.find(s=>s.id===studentId);
 if(!student||!api?.live?.certificates){toast('Certificate records unavailable');return}
 const cert=CERTS.find(c=>String(c.studentId)===String(student.mongoId)&&c.kind==='Bonafide');
 if(!cert){toast('No issued bonafide certificate record found');return}
 downloadDoc('CertificateRecord_'+student.id.replace(/[^A-Za-z0-9-]/g,'_')+'.html',
  dashboardRecordHtml('Issued certificate record',student,'<table><tr><th>Type</th><th>Reference</th><th>Issued</th></tr><tr><td>'+escHtml(cert.type)+'</td><td>'+escHtml(cert.ref)+'</td><td>'+escHtml(cert.date)+'</td></tr></table>'));
}
function myLeaveEntries(){const me=myIdentity();return LEAVE.map((l,i)=>({row:l,i})).filter(x=>x.row[0]===me)}
function leaveBalance(){
 const annual=window.SCHOOLOS_ADAPTER?.settings?.defaultAnnualLeave||21;
 const staff=window.SCHOOLOS_ADAPTER?.live?.staff?STAFF.find(s=>s.name===myIdentity()):null;
 const left=Number.isFinite(staff?.leaveBalance)?staff.leaveBalance:null;
 return {annual,used:left===null?null:Math.max(0,annual-left),left};
}
/* ---- Student/Parent absence (leave) requests, mapped to attendance ---- */
let ABSENCE_REQUESTS=[];
let EXCUSED_DATES={};
function absenceRequestsFor(studentId){return ABSENCE_REQUESTS.map((r,i)=>({row:r,i})).filter(x=>x.row.studentId===studentId)}
function myAbsenceStudent(){return myStudent()}
function openAbsenceRequestForm(){const st=myAbsenceStudent();formDrawer('Request leave / absence',st.name+' - '+st.grade+' - requires approval, links to attendance once approved',[
 {label:'From',key:'from',type:'date',req:true,half:true},{label:'To',key:'to',type:'date',req:true,half:true},
 {label:'Reason',key:'type',opts:['Medical','Family event','Travel','Religious observance','Other'],half:true},
 {label:'Requested by',key:'by',val:state.role,half:true},
 {label:'Notes',key:'note',area:true,req:true,aiContext:'absence-note',maxlen:400}],'Submit request','','submitAbsenceRequest')}
window.submitAbsenceRequest=function(v){const st=myAbsenceStudent();if(!v.from||!v.to){toast('Select a date range');return false}
 let days=1;try{const d=Math.round((new Date(v.to)-new Date(v.from))/86400000)+1;if(d>0)days=d}catch(e){}
 ABSENCE_REQUESTS.unshift({studentId:st.id,studentName:st.name,grade:st.grade,by:state.role,from:v.from,to:v.to,days,type:v.type||'Other',note:v.note,status:'Pending'});
 logAudit('Requested absence - '+st.name+' ('+(v.type||'Other')+', '+days+'d)','Attendance');closeDrawer();render();toast('Absence request submitted - pending approval');return false};
function myAbsenceView(){const st=myAbsenceStudent();const mine=absenceRequestsFor(st.id);const approved=mine.filter(x=>x.row.status==='Approved');
 return detailDrawer({title:'Leave / absence requests',sub:st.name+' - '+st.grade,color:'#2563EB',badge:ic('att',18),
  stats:[['Requests',String(mine.length),'blue'],['Approved',String(approved.length),'green'],['Pending',String(mine.filter(x=>x.row.status==='Pending').length),'amber'],['Excused days',String(approved.reduce((a,x)=>a+x.row.days,0)),'gray']],
  sections:[{h:'My requests',html:mine.length?'<div class="card pad" style="box-shadow:none">'+mine.map(x=>{const r=x.row;return '<div class="lrow" style="border-bottom:1px solid var(--line-soft);padding:9px 0"><div style="flex:1"><div style="font-weight:600;color:var(--slate-900);font-size:13px">'+r.type+'</div><div class="muted" style="font-size:11px">'+r.from+' to '+r.to+' - '+r.days+'d</div></div>'+chip(r.status,r.status==='Approved'?'green':r.status==='Rejected'?'red':'amber')+(r.status==='Pending'?'<button class="btn sm" style="margin-left:8px" onclick="cancelAbsenceRequest('+x.i+')">Cancel</button>':'')+'</div>'}).join('')+'</div>':'<div class="muted" style="font-size:12.5px">No requests yet.</div>'}],
  footer:[['Request leave / absence',"closeDrawer();openAbsenceRequestForm()",true]]})}
window.cancelAbsenceRequest=function(i){if(ABSENCE_REQUESTS[i]){ABSENCE_REQUESTS.splice(i,1);logAudit('Cancelled absence request','Attendance')}closeDrawer();render();openDrawer(myAbsenceView());toast('Request cancelled')};
window.approveAbsence=function(i){const r=ABSENCE_REQUESTS[i];if(!r)return;r.status='Approved';
 EXCUSED_DATES[r.studentId]=EXCUSED_DATES[r.studentId]||[];let d=new Date(r.from);const end=new Date(r.to);
 while(d<=end){EXCUSED_DATES[r.studentId].push(d.toISOString().slice(0,10));d.setDate(d.getDate()+1)}
 logAudit('Approved absence - '+r.studentName+' ('+r.days+'d) - marked Excused in attendance','Attendance');closeDrawer();render();toast('Approved - attendance updated to Excused for '+r.days+' day(s)')};
window.rejectAbsence=function(i){const r=ABSENCE_REQUESTS[i];if(r)r.status='Rejected';logAudit('Rejected absence request - '+(r?r.studentName:''),'Attendance');closeDrawer();render();toast('Request rejected')};
function studentExcusedToday(studentId){const today=new Date().toISOString().slice(0,10);return(EXCUSED_DATES[studentId]||[]).includes(today)}
/* ---- Staff (incl. office roles) daily attendance self-mark ---- */
let STAFF_ATTENDANCE={};
function myStaffAttendanceToday(){const me=myIdentity();return STAFF_ATTENDANCE[me]||null}
window.markMyAttendance=function(status){const me=myIdentity();STAFF_ATTENDANCE[me]={status,time:new Date().toLocaleTimeString((typeof schoolLocale==='function'?schoolLocale():'en-GB'),{hour:'2-digit',minute:'2-digit'})};
 logAudit('Marked own attendance - '+status,'Attendance');render();toast('Attendance marked - '+status)};
function staffAttendanceWidget(){const mine=myStaffAttendanceToday();
 return `<div class="card pad" style="box-shadow:none"><div class="flex ac jb" style="margin-bottom:8px"><span style="font-size:12.5px;font-weight:600;color:var(--slate-600)">My attendance today</span>${mine?chip(mine.status+' · '+mine.time,mine.status==='Present'?'green':mine.status==='Remote'?'blue':'amber'):chip('Not marked','gray')}</div>
 <div class="flex ac" style="gap:6px;flex-wrap:wrap"><button class="btn sm" onclick="markMyAttendance('Present')">Present</button><button class="btn sm" onclick="markMyAttendance('Remote')">Remote</button><button class="btn sm" onclick="markMyAttendance('Late')">Late</button></div></div>`}
const OFFICE_STAFF_NAMES={Administrator:'Rashid Al Maktoum',Principal:'Dr. Salma Haddad',Accountant:'Joseph Thomas',Teacher:'Rohan Mehta'};
function officeCanManage(){return['Administrator','Principal','Accountant'].includes(state.role)}
function officeAttendancePeople(){
 if(!window.SCHOOLOS_ADAPTER?.connected)return Object.entries(OFFICE_STAFF_NAMES).map(([role,name])=>({role,name}));
 const people=window.SCHOOLOS_ADAPTER.live.staff?STAFF.filter(s=>s.status==='Active').map(s=>({role:s.role,name:s.name,phone:s.phone,email:s.email})):[];
 const own=window.SCHOOLOS_ADAPTER.user;
 if(own&&!people.some(p=>p.name===own.name))people.unshift({role:own.role,name:own.name});
 return people;
}
function officeAttendanceOverview(){state._officeSel=state._officeSel||[];const canManage=officeCanManage();
 const rows=officeAttendancePeople();const notMarked=rows.filter(person=>!STAFF_ATTENDANCE[person.name]).map(person=>person.name);
 return detailDrawer({title:'Office & staff attendance today',sub:'Recorded self-marks; unmarked staff may not have portal accounts',color:'#2563EB',badge:ic('att',18),
  stats:[['Marked',String(rows.length-notMarked.length)+'/'+rows.length,'blue'],['Not marked',String(notMarked.length),notMarked.length?'amber':'green']],
  sections:[{h:'Today',html:'<div class="card pad" style="box-shadow:none">'+(canManage?'<div class="flex ac jb" style="margin-bottom:10px;flex-wrap:wrap;gap:8px"><button class="btn sm" onclick="officeSelectNotMarked()">Select not-marked</button>'+(window.SCHOOLOS_ADAPTER?.connected?'<span class="muted">Use Communication to send staff reminders.</span>':'<button class="btn sm primary" onclick="officeSendReminder()">Send reminder to selected</button>')+'</div>':'')+
   rows.map(person=>{const {role,name}=person;const a=STAFF_ATTENDANCE[name];const checked=state._officeSel.includes(name);
    return '<div class="lrow" style="border-bottom:1px solid var(--line-soft);gap:10px">'+(canManage?'<input type="checkbox" '+(checked?'checked':'')+' onchange="officeToggleSel('+JSON.stringify(name).replace(/"/g,'&quot;')+')" aria-label="Select '+escHtml(name)+'">':'')+
    '<div style="flex:1"><div style="font-weight:600;color:var(--slate-900);font-size:13px">'+escHtml(name)+'</div><div class="muted" style="font-size:11px">'+escHtml(role)+'</div></div>'+
    (a?chip(a.status+' · '+a.time,a.status==='Present'?'green':a.status==='Remote'?'blue':'amber'):chip('Not marked','gray'))+
    (canManage?'<div class="flex ac" style="gap:4px;margin-left:8px">'+(person.phone&&person.phone!=='—'?'<a class="btn sm" href="tel:'+encodeURIComponent(person.phone)+'" aria-label="Call '+escHtml(name)+'">'+ic('phone',12)+'</a>':'')+(person.email?'<a class="btn sm" href="mailto:'+encodeURIComponent(person.email)+'" aria-label="Email '+escHtml(name)+'">'+ic('mail',12)+'</a>':'')+'</div>':'')+
    '</div>'}).join('')+'</div>'}],
  footer:[['Close','closeDrawer()',true]]})}
window.officeToggleSel=function(name){const i=state._officeSel.indexOf(name);if(i>=0)state._officeSel.splice(i,1);else state._officeSel.push(name);openDrawer(officeAttendanceOverview())};
window.officeSelectNotMarked=function(){state._officeSel=officeAttendancePeople().map(p=>p.name).filter(n=>!STAFF_ATTENDANCE[n]);openDrawer(officeAttendanceOverview())};
window.officeSendReminder=function(){if(!officeCanManage()){toast('Only Administrator, Principal or Accountant can send reminders');return}
 if(window.SCHOOLOS_ADAPTER?.connected){toast('Not sent — use Communication to send a real staff reminder');return}
 const sel=state._officeSel;if(!sel.length){toast('Select at least one person, or use "Select not-marked"');return}
 logAudit('Sent attendance reminder to '+sel.length+' - '+sel.join(', '),'Staff & HR');state._officeSel=[];toast('Reminder sent to '+sel.length+' staff member'+(sel.length>1?'s':''));openDrawer(officeAttendanceOverview())};
function myLeaveView(){const mine=myLeaveEntries();const bal=leaveBalance();
 return detailDrawer({title:'My leave',sub:myIdentity()+' · '+state.role,color:'#2563EB',badge:ic('att',18),
  stats:[['Annual entitlement',bal.annual+' days','blue'],['Used',bal.used===null?'Not available':bal.used+' days','amber'],['Remaining',bal.left===null?'Not available':bal.left+' days',bal.left!==null&&bal.left>5?'green':'red'],['Pending',String(mine.filter(x=>x.row[4]==='Pending').length),'gray']],
  sections:[{h:'Today',html:staffAttendanceWidget()},{h:'My requests',html:mine.length?'<div class="card pad" style="box-shadow:none">'+mine.map(x=>{const l=x.row;return '<div class="lrow" style="border-bottom:1px solid var(--line-soft);padding:9px 0"><div style="flex:1"><div style="font-weight:600;color:var(--slate-900);font-size:13px">'+l[1]+'</div><div class="muted" style="font-size:11px">'+l[2]+' · '+l[3]+'</div></div>'+chip(l[4],l[5])+(l[4]==='Pending'?'<button class="btn sm" style="margin-left:8px" onclick="cancelMyLeave('+x.i+')">Cancel</button>':'')+'</div>'}).join('')+'</div>':'<div class="muted" style="font-size:12.5px">No leave requests yet.</div>'}],
  footer:[['Apply for leave',"openMyLeaveForm()",true]]})}
window.cancelMyLeave=function(i){if(LEAVE[i]){LEAVE.splice(i,1);logAudit('Cancelled own leave request - '+myIdentity(),'Staff & HR')}closeDrawer();render();openDrawer(myLeaveView());toast('Leave request cancelled')};
function openMyLeaveForm(){const left=leaveBalance().left;formDrawer('Apply for leave',myIdentity()+' · '+(left===null?'balance unavailable':left+' days remaining'),[
 {label:'Leave type',key:'type',opts:['Casual leave','Sick leave','Annual leave','Unpaid leave']},
 {label:'From',type:'date',key:'from',half:true},{label:'To',type:'date',key:'to',half:true},
 {label:'Reason',area:true,key:'reason',req:true,aiContext:'absence-note',maxlen:400}],'Submit request','','submitMyLeave')}
window.submitMyLeave=function(v){const emp=myIdentity();const from=v.from||'',to=v.to||'';const range=from&&to?(from+' \u2013 '+to):(from||to||'Today');
 let dur='1 day';try{if(from&&to){const d=Math.round((new Date(to)-new Date(from))/86400000)+1;if(d>0)dur=d+(d>1?' days':' day')}}catch(e){}
 LEAVE.unshift([emp,v.type||'Casual leave',range,dur,'Pending','amber']);logAudit('Applied for leave - '+emp+' ('+(v.type||'Casual leave')+')','Staff & HR');
 closeDrawer();render();openDrawer(myLeaveView());toast('Leave request submitted - pending approval');return false};
function teacherHome(){
 const api=window.SCHOOLOS_ADAPTER;
 const day=new Intl.DateTimeFormat('en-GB',{weekday:'long',timeZone:api?.settings?.timezone||'UTC'}).format(new Date());
 const slots=api?.live?.timetable?(api.timetableSlots||[]).filter(slot=>slot.dayOfWeek===day&&slot.status==='Published'&&slot.teacherName===myIdentity()).sort((a,b)=>a.periodNumber-b.periodNumber):[];
 const grades=new Set(slots.map(slot=>slot.grade));
 const students=api?.live?.students?STUDENTS.filter(s=>s.status==='Active'&&grades.has(s.grade)).length:null;
 const marked=api?.live?.attendance?(api.attendance||[]).filter(row=>row.date===dashboardLocalDate()&&row.session==='AM'):[];
 const pending=api?.live?.attendance?([...grades].filter(grade=>!marked.some(row=>row.grade===grade)).length):null;
 const grading=api?.live?.lmsSubmissions?(api.lmsSubmissions||[]).filter(row=>row.status!=='Graded').length:null;
 return `
  <div class="page-head"><div class="ph-l"><h2>Welcome, ${escHtml(myIdentity())}</h2><p>${api?.live?.timetable?'Published timetable for '+day:'Timetable unavailable'} · school records only.</p></div>
  <div class="ph-r"><button class="btn" onclick="lmsAiLaunch()">Teacher AI Studio</button><button class="btn" onclick="openDrawer(myLeaveView())">${ic('roles',16)} My leave</button><button class="btn primary" onclick="go('attendance')">${ic('att',16)} Take attendance</button></div></div>
  <div class="grid cols-4">
    ${kpi('classes','#2563EB','My classes today',api?.live?.timetable?String(slots.length):'—',null,"go('timetable')")}
    ${kpi('students','#17A24A','Students in today\'s classes',students===null?'—':String(students),null,"go('students')")}
    ${kpi('att','#E11D2A','Classes without AM register',pending===null?'—':String(pending),null,"go('attendance')")}
    ${kpi('exam','#B45309','Ungraded submissions',grading===null?'—':String(grading),null,"go('lms')")}
  </div>
  <div class="grid cols-3 mt">
    <div class="card pad span-2"><div class="sec-head"><h3>Today's schedule</h3><span class="link" onclick="go('timetable')">Full timetable →</span></div>
      ${slots.length?slots.map(slot=>`<div class="lrow"><b class="num" style="width:65px;color:var(--slate-900)">Period ${slot.periodNumber}</b><div style="flex:1"><div style="font-weight:600;color:var(--slate-900)">${escHtml(slot.subject)}</div><div class="muted" style="font-size:12px">${escHtml(slot.grade)} · ${escHtml(slot.room||'Room not set')}</div></div><span class="badge b-green"><span class="bd"></span>Class</span></div>`).join(''):'<div class="muted">No published classes today.</div>'}
    </div>
    <div class="card pad"><div class="sec-head"><h3>Quick actions</h3></div>
      ${[['att','Take attendance','attendance'],['exam','Enter grades','exams'],['comm','Message parents','comm'],['lms','Post assignment','lms']].map(q=>`<button class="lrow" style="width:100%;text-align:left" onclick="go('${q[2]}')"><span class="kp-ic" style="background:var(--brand-soft);color:var(--brand-strong);width:34px;height:34px">${ic(q[0],18)}</span><span style="font-weight:600;color:var(--slate-900)">${q[1]}</span><span style="margin-left:auto;color:var(--slate-400)">${ic('arrow',16)}</span></button>`).join('')}
    </div>
  </div>`}
function parentHome(){const s=dashboardLinkedStudent();if(!s)return '<div class="card pad"><h2>No linked student record</h2><p>Ask the school administrator to link your account to your child. No other student data is shown.</p></div>';const grades=dashboardGrades(s);return `
  <div class="page-head"><div class="ph-l"><h2>Hello, ${escHtml(window.SCHOOLOS_ADAPTER?.user?.name||s.guardian)}</h2><p>A summary for ${escHtml(s.name)} — ${escHtml(s.grade)}.</p></div>
  <div class="ph-r"><button class="btn" onclick="openDrawer(myAbsenceView())">${ic('att',16)} Leave / absence</button><button class="btn" onclick="dashboardDownloadFeeStatement(dashboardLinkedStudent()?.id)">${ic('download',16)} Fee statement</button><button class="btn primary" onclick="dashboardDownloadAssessment(dashboardLinkedStudent()?.id)">${ic('download',16)} Assessment summary</button></div></div>
  <div class="grid cols-4">
    ${kpi('att','#17A24A','Attendance',studentAttendanceLabel(s),null,"go('attendance')")}
    ${kpi('exam','#2563EB','Assessment GPA',s.assessmentResults?String(s.gpa):'No results',null,"go('exams')")}
    ${kpi('fees','#0E7C39','Fee status',s.invoiceRecords?s.fee:'No invoices',null,"go('fees')")}
    ${kpi('comm','#B45309','Messages','View',null,"go('comm')")}
  </div>
  <div class="grid cols-3 mt">
    <div class="card pad span-2"><div class="sec-head"><h3>Latest assessment marks</h3><span class="link" onclick="dashboardDownloadAssessment(dashboardLinkedStudent()?.id)">Download data copy →</span></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Subject</th><th>Assessment</th><th class="right">Score</th><th>Maximum</th></tr></thead><tbody>
      ${grades.length?grades.map(x=>`<tr><td data-i18n-skip="true" style="font-weight:600;color:var(--slate-900)">${escHtml(x.subject)}</td><td data-i18n-skip="true">${escHtml(window.SCHOOLOS_ADAPTER?.exam?.name||'Latest assessment')}</td><td class="right num">${x.score}</td><td>${x.max}</td></tr>`).join(''):'<tr><td colspan="4" class="muted">No published assessment marks available.</td></tr>'}
      </tbody></table></div>
    </div>
    <div class="card pad"><div class="sec-head"><h3>Documents</h3></div>
    ${[['Assessment summary','exam','dashboardDownloadAssessment'],['Fee statement','fees','dashboardDownloadFeeStatement'],['Certificate record','cert','dashboardDownloadCertificateRecord']].map(d=>`<div class="lrow" style="padding:10px 0"><span class="kp-ic" style="width:30px;height:30px;background:var(--brand-soft);color:var(--brand)">${ic(d[1],15)}</span><div style="flex:1;font-weight:600;color:var(--slate-800);font-size:13px">${d[0]}</div><button class="btn sm" onclick="${d[2]}(dashboardLinkedStudent()?.id)">${ic('download',13)}</button></div>`).join('')}</div>
  </div>`}
function studentHome(){const me=dashboardLinkedStudent();if(!me)return '<div class="card pad"><h2>No linked student record</h2><p>Ask the school administrator to link your login to your student record.</p></div>';
 const api=window.SCHOOLOS_ADAPTER;
 const dueList=api?.live?.lmsAssignments&&api.live.lmsSubmissions?(api.lmsAssignments||[]).filter(a=>a.grade===me.grade&&new Date(a.dueDate)>=new Date()&&!(api.lmsSubmissions||[]).some(s=>String((s.assignment&&s.assignment._id)||s.assignment)===String(a._id))):[];
 const loans=api?.live?.LIBLOANS?LIBLOANS.filter(l=>String(l.studentId)===String(me.mongoId)&&l.status==='On loan'):[];
 const slots=dashboardStudentSlots(me);
 return `
  <div class="page-head"><div class="ph-l"><h2>Hi, ${escHtml(me.name.split(' ')[0])} 🎓</h2><p>Your school records at a glance.</p></div>
  <div class="ph-r"><button class="btn" onclick="openDrawer(myAbsenceView())">${ic('att',16)} Leave / absence</button><button class="btn primary" onclick="dashboardDownloadAssessment(dashboardLinkedStudent()?.id)">${ic('download',16)} My assessment summary</button></div></div>
  <div class="grid cols-4">
    ${kpi('exam','#17A24A','My GPA',me.assessmentResults?String(me.gpa):'No results',null,"go('exams')")}
    ${kpi('att','#2563EB','Attendance',studentAttendanceLabel(me),null,"go('attendance')")}
    ${kpi('lms','#B45309','Assignments due',api?.live?.lmsAssignments&&api.live.lmsSubmissions?String(dueList.length):'—',null,"go('lms')")}
    ${kpi('lib','#7C3AED','Library',api?.live?.LIBLOANS?loans.length+' on loan':'—',null,"go('library')")}
  </div>
  <div class="grid cols-3 mt">
    <div class="card pad span-2"><div class="sec-head"><h3>Today's classes</h3></div>
    ${slots.length?slots.map(slot=>`<div class="lrow"><b class="num" style="width:65px;color:var(--slate-900)">Period ${slot.periodNumber}</b><div style="flex:1;font-weight:600;color:var(--slate-900)">${escHtml(slot.subject)}</div><span class="muted" style="font-size:12px">${escHtml(slot.room||'Room not set')}</span></div>`).join(''):'<div class="muted">No published classes for today.</div>'}</div>
    <div class="card pad"><div class="sec-head"><h3>My documents</h3></div>
    ${[['Assessment summary','exam','dashboardDownloadAssessment'],['Fee statement','fees','dashboardDownloadFeeStatement'],['Certificate record','cert','dashboardDownloadCertificateRecord']].map(d=>`<div class="lrow" style="padding:10px 0"><span class="kp-ic" style="width:30px;height:30px;background:var(--brand-soft);color:var(--brand)">${ic(d[1],15)}</span><div style="flex:1;font-weight:600;color:var(--slate-800);font-size:13px">${d[0]}</div><button class="btn sm" onclick="${d[2]}(dashboardLinkedStudent()?.id)">${ic('download',13)}</button></div>`).join('')}</div>
  </div>`}
function dashboardPaymentBars(){
 const api=window.SCHOOLOS_ADAPTER;
 if(!api?.live?.feePayments)return [];
 const now=new Date();
 return Array.from({length:6},(_,i)=>{
  const date=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-5+i,1));
  const month=date.toISOString().slice(0,7);
  const amount=(api.feePayments||[]).filter(p=>String(p.paidAt||'').slice(0,7)===month).reduce((sum,p)=>sum+(Number(p.amount)||0),0);
  return {lb:date.toLocaleString((typeof schoolLocale==='function'?schoolLocale():'en-GB'),{month:'short'}),val:aed(amount),pct:0,amount};
 }).map((row,_,rows)=>({...row,pct:rows.some(r=>r.amount)?Math.round(row.amount/Math.max(...rows.map(r=>r.amount))*100):0}));
}
function exportAccountantSummary(){
 const api=window.SCHOOLOS_ADAPTER,fees=dashboardFees(),month=dashboardLocalDate().slice(0,7);
 const payroll=api?.live?.PAYRUN?PAYRUN.filter(p=>p.month===month):[];
 exportCSV('finance-summary.csv',['Metric','Value'],[
  ['Month',month],['Invoices billed',fees.loaded?fees.billed:'Unavailable'],
  ['Payments collected',fees.loaded?fees.paid:'Unavailable'],
  ['Due balance',fees.loaded?fees.due:'Unavailable'],['Overdue balance',fees.loaded?fees.over:'Unavailable'],
  ['Payroll net',api?.live?.PAYRUN?payroll.reduce((sum,p)=>sum+p.gross-p.ded,0):'Unavailable']
 ]);
}
function accountantHome(){
 const api=window.SCHOOLOS_ADAPTER,fees=dashboardFees(),month=dashboardLocalDate().slice(0,7);
 const payrun=api?.live?.PAYRUN?PAYRUN.filter(p=>p.month===month):[];
 const net=payrun.reduce((sum,p)=>sum+p.gross-p.ded,0);
 const bars=dashboardPaymentBars();
 const overdue=fees.loaded?INVOICES.filter(i=>i.status==='Overdue'):[];
 return `
  <div class="page-head"><div class="ph-l"><h2>Finance overview</h2><p>Recorded collections, outstanding balances and payroll for ${month}.</p></div>
  <div class="ph-r"><button class="btn" onclick="openDrawer(myLeaveView())">${ic('roles',16)} My leave</button><button class="btn" onclick="exportAccountantSummary()">${ic('download',16)} Statement</button><button class="btn primary" onclick="go('fees')">${ic('fees',16)} Record payment</button></div></div>
  <div class="grid cols-4">
    ${kpi('fees','#17A24A','Collected · all invoices',fees.loaded?aed(fees.paid):'—',null,"go('fees')")}
    ${kpi('expense','#E11D2A','Outstanding balance',fees.loaded?aed(fees.due+fees.over):'—',fees.loaded?{dir:'flat',v:String(overdue.length),note:'overdue invoices'}:null,"go('fees')")}
    ${kpi('payroll','#2563EB','Payroll net · '+month,api?.live?.PAYRUN?aed(net):'—',null,"go('payroll')")}
    ${kpi('reports','#B45309','Invoices',fees.loaded?String(INVOICES.length):'—',null,"go('fees')")}
  </div>
  <div class="grid cols-2 mt">
    <div class="card pad"><div class="sec-head"><h3>Collections — last 6 months</h3></div>${bars.length?vbars(bars):'<div class="muted">Payment history unavailable.</div>'}</div>
    <div class="card pad"><div class="sec-head"><h3>Overdue invoices</h3><span class="link" onclick="go('fees')">Open →</span></div>
    ${overdue.length?overdue.map(i=>`<div class="lrow">${avatar(escHtml(i.student))}<div style="flex:1"><div style="font-weight:600;color:var(--slate-900);font-size:13.5px">${escHtml(i.student)}</div><div class="muted" style="font-size:12px">${escHtml(i.id)} · due ${escHtml(i.due)}</div></div><b class="num" style="color:var(--red)">${aed(i.balance)}</b></div>`).join(''):'<div class="muted">No overdue invoices loaded.</div>'}
    </div>
  </div>`}
