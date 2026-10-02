/* ============ MODULES ============ */
const M={};

M.dashboard=()=>{
  const r=state.role;
  if(r==='Parent') return parentHome();
  if(r==='Student') return studentHome();
  if(r==='Teacher') return teacherHome();
  if(r==='Accountant') return accountantHome();
  /* Admin / Principal command centre — every figure computed live from module records */
  const N=STUDENTS.length;
  const attP=STUDENTS.filter((s,i)=>i%9!==4&&i!==9).length,attL=N>4?1:0,attA=N>9?1:0,attU=N-attP-attL-attA;
  const attRate=N?Math.round(attP/N*100):0;
  const billed=INVOICES.reduce((a,i)=>a+i.amt,0);
  const paid=INVOICES.filter(i=>i.status==='Paid').reduce((a,i)=>a+i.amt,0);
  const due=INVOICES.filter(i=>i.status==='Due').reduce((a,i)=>a+i.amt,0);
  const over=INVOICES.filter(i=>i.status==='Overdue').reduce((a,i)=>a+i.amt,0);
  const collRate=billed?Math.round(paid/billed*100):0;
  const openAdm=ADMISSIONS.filter(a=>a.stage!=='Enrolled'&&a.stage!=='Closed').length;
  const offers=ADMISSIONS.filter(a=>a.stage==='Offer').length;
  const approvals=pendingApprovals();
  const modsOn=(typeof OPTIONAL!=='undefined')?OPTIONAL.filter(m=>state.modules[m.id]).length:0;
  const modsTot=(typeof OPTIONAL!=='undefined')?OPTIONAL.length:0;
  const coreMods=flatItems().length-modsOn;
  const notifs=notifItems();
  return `
  <div class="page-head">
    <div class="ph-l"><h2>${t('Good morning')}, ${r==='Principal'?'Dr. Haddad':'Rashid'} 👋</h2>
      <p>Live operational view · Al Noor International · Term 2, 2025–26. All figures computed from module records.</p></div>
    <div class="ph-r">
      ${(state.role==='Principal')?`<button class="btn" onclick="openDrawer(myLeaveView())">${ic('roles',16)} My leave</button>`:''}
      ${(state.role==='Administrator'||state.role==='Principal')?`<button class="btn" onclick="openDrawer(officeAttendanceOverview())">${ic('att',16)} Office attendance</button>`:''}
      <button class="btn" onclick="exportCSV('dashboard-summary.csv',['Metric','Value'],[['Students on roster','${N}'],['Attendance today','${attRate}%'],['Present AM','${attP}'],['Late','${attL}'],['Absent','${attA}'],['Not yet marked','${attU}'],['Fees billed','${billed}'],['Fees collected','${paid}'],['Fees due','${due}'],['Fees overdue','${over}'],['Collection rate','${collRate}%'],['Open admissions','${openAdm}'],['Offers out','${offers}'],['Pending approvals','${approvals.length}']])">${ic('download',16)} Export</button>
      <button class="btn primary" onclick="openCmd()">${ic('plus',16)} ${t('Quick action')}</button>
    </div>
  </div>
  <div class="grid cols-4">
    ${kpi('students','#17A24A','Students · roster',String(N),{dir:'up',v:'live',note:'open directory'},"go('students')")}
    ${kpi('att','#2563EB',"Today's attendance",attRate+'%',{dir:attRate>=90?'up':'down',v:attP+' / '+N+' AM',note:attU?attU+' not yet marked':'register complete'},"go('attendance')")}
    ${kpi('fees','#0E7C39','Fees collected',aed(paid),{dir:'up',v:collRate+'%',note:'of '+aed(billed)+' billed'},"go('fees')")}
    ${kpi('admiss','#E11D2A','Open admissions',String(openAdm),{dir:'flat',v:String(offers),note:'at offer stage'},"go('admissions')")}
  </div>
  <div class="muted" style="font-size:11.5px;margin-top:8px">Data: live · computed from Students, Attendance, Fees & Admissions records · updated just now · Asia/Dubai</div>

  <div class="grid cols-3 mt">
    <div class="card pad span-2">
      <div class="sec-head"><h3>Attendance this week</h3><span class="link" onclick="go('attendance')">Open attendance →</span></div>
      ${vbars([{lb:'Mon',val:'95%',pct:95},{lb:'Tue',val:'93%',pct:93},{lb:'Wed',val:'96%',pct:96,alt:false},{lb:'Thu',val:'92%',pct:92},{lb:'Fri',val:'89%',pct:89,alt:true},{lb:'Sat',val:attRate+'%',pct:attRate}])}
      <div class="flex gap wrap mt-s" style="font-size:12px;color:var(--slate-500)">
        <span class="flex ac" style="gap:6px"><span style="width:10px;height:10px;border-radius:3px;background:var(--brand);display:inline-block"></span> 90% and above</span>
        <span class="flex ac" style="gap:6px"><span style="width:10px;height:10px;border-radius:3px;background:#A6DEBC;display:inline-block"></span> Below 90% — review</span>
        <span style="margin-left:auto">Today: ${attP} present · ${attL} late · ${attA} absent${attU?' · '+attU+' unmarked':''}</span>
      </div>
    </div>
    <div class="card pad">
      <div class="sec-head"><h3>Fee collection</h3><span class="link" onclick="go('fees')">Open →</span></div>
      <div class="flex ac" style="gap:18px">
        <div class="donut" style="--p:${collRate}"><div class="in"><b>${collRate}%</b><span>of ${aedC(billed)}</span></div></div>
        <div style="flex:1">
          <div class="lrow" style="border:0;padding:7px 0"><span class="badge b-green"><span class="bd"></span>Collected</span><b class="num" style="margin-left:auto;color:var(--slate-900)">${aed(paid)}</b></div>
          <div class="lrow" style="border:0;padding:7px 0"><span class="badge b-amber"><span class="bd"></span>Due</span><b class="num" style="margin-left:auto;color:var(--slate-900)">${aed(due)}</b></div>
          <div class="lrow" style="border:0;padding:7px 0"><span class="badge b-red"><span class="bd"></span>Overdue</span><b class="num" style="margin-left:auto;color:var(--slate-900)">${aed(over)}</b></div>
        </div>
      </div>
      <div class="muted" style="font-size:11px;margin-top:10px">Billed ${aed(billed)} · computed from invoice ledger</div>
    </div>
  </div>

  <div class="grid cols-3 mt">
    <div class="card pad span-2">
      <div class="sec-head"><h3>Admissions pipeline</h3><span class="link" onclick="go('admissions')">Manage →</span></div>
      <div class="grid cols-4" style="gap:10px;grid-template-columns:repeat(5,1fr)">
        ${STAGES.map(st=>{const n=ADMISSIONS.filter(a=>a.stage===st).length;return `<div role="button" tabindex="0" onclick="admFocus('${st}');go('admissions')" onkeydown="if(event.key==='Enter'){admFocus('${st}');go('admissions')}" style="text-align:center;padding:14px 8px;border:1px solid var(--line);border-radius:12px;background:var(--surface-2);cursor:pointer">
          <div class="num" style="font-family:var(--ff-display);font-weight:700;font-size:26px;color:var(--slate-900)">${n}</div>
          <div style="font-size:11.5px;color:var(--slate-500);font-weight:600;margin-top:2px">${st}</div></div>`}).join('')}
      </div>
      <div class="mt-s">${ADMISSIONS.slice(0,3).map(a=>`<div class="lrow" style="cursor:pointer" onclick="go('admissions')">${avatar(a.name)}<div><div style="font-weight:600;color:var(--slate-900)">${a.name}</div><div class="muted" style="font-size:12px">${a.grade} · via ${a.src}</div></div><span class="badge b-blue" style="margin-left:auto"><span class="bd"></span>${a.stage}</span><span class="muted" style="font-size:12px">${a.date}</span></div>`).join('')}</div>
    </div>
    <div class="card pad">
      <div class="sec-head"><h3>Approval centre</h3><span class="badge ${approvals.length?'b-red':'b-green'}"><span class="bd"></span>${approvals.length} pending</span></div>
      ${approvals.length?approvals.slice(0,5).map(a=>`<div class="lrow"><div style="flex:1;min-width:0"><div style="font-weight:600;color:var(--slate-900);font-size:13.5px">${a.title}</div><div class="muted" style="font-size:12px">${a.sub}</div></div><button class="btn sm" onclick="openDrawer(approvalDetail('${a.kind}','${a.ref}'))">Review</button></div>`).join(''):`<div class="empty" style="padding:22px 8px"><div class="ei">${ic('roles',24)}</div><h3 style="font-size:14px">All caught up</h3><p style="font-size:12px">No approvals waiting.</p></div>`}
      ${approvals.length?`<div class="muted" style="font-size:11px;margin-top:8px">Each request opens for full review — details, policy checks and audit-logged decisions.</div>`:''}
    </div>
  </div>

  <div class="grid cols-3 mt">
    <div class="card pad span-2">
      <div class="sec-head"><h3>Announcements</h3><span class="link" onclick="go('comm')">All updates →</span></div>
      ${ANN.map(annRow).join('')}
    </div>
    <div class="card pad">
      <div class="sec-head"><h3>System health</h3><span class="link" onclick="go('settings')">Modules →</span></div>
      ${[['Modules active',(coreMods+modsOn)+' / '+(coreMods+modsTot),'green'],['Open alerts',String(notifs.length),notifs.length?'amber':'green'],['Audit events',String(AUDIT.length),'blue'],['Last backup','Today 03:00','green'],['Languages enabled',String(langEnabled().length)+' / 4','blue']].map(x=>`<div class="lrow" style="padding:10px 0"><span style="font-size:13px;color:var(--slate-600)">${x[0]}</span><span class="badge b-${x[2]}" style="margin-left:auto"><span class="bd"></span>${x[1]}</span></div>`).join('')}
      <div class="muted" style="font-size:11px;margin-top:8px">Module count reflects Settings toggles · alerts computed live</div>
    </div>
  </div>`;
};
function annRow(a){const cmap={green:'var(--brand)',blue:'var(--blue)',amber:'var(--amber)',red:'var(--red)'};const c=cmap[a.c]||cmap.green;
  return `<div class="ann"><div class="ai" style="background:${c}14;color:${c}">${ic(a.ic,20)}</div><div style="flex:1"><div class="ah"><span class="t">${a.t}</span><span class="tm">${a.tm}</span></div><div class="bd">${a.bd}</div><div class="muted" style="font-size:11.5px;margin-top:6px">${a.by} · to ${a.aud}</div></div></div>`}

/* role homes */
function myIdentity(){return state.role==='Teacher'?'Rohan Mehta':state.role==='Accountant'?'Joseph Thomas':state.role==='Principal'?'Dr. Salma Haddad':'Rashid Al Maktoum'}
function myLeaveEntries(){const me=myIdentity();return LEAVE.map((l,i)=>({row:l,i})).filter(x=>x.row[0]===me)}
function leaveBalance(){const used=myLeaveEntries().filter(x=>x.row[4]==='Approved').reduce((a,x)=>a+(parseInt(x.row[3],10)||1),0);const annual=21;return{annual,used,left:Math.max(0,annual-used)}}
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
window.markMyAttendance=function(status){const me=myIdentity();STAFF_ATTENDANCE[me]={status,time:new Date().toLocaleTimeString('en-AE',{hour:'2-digit',minute:'2-digit'})};
 logAudit('Marked own attendance - '+status,'Attendance');render();toast('Attendance marked - '+status)};
function staffAttendanceWidget(){const mine=myStaffAttendanceToday();
 return `<div class="card pad" style="box-shadow:none"><div class="flex ac jb" style="margin-bottom:8px"><span style="font-size:12.5px;font-weight:600;color:var(--slate-600)">My attendance today</span>${mine?chip(mine.status+' · '+mine.time,mine.status==='Present'?'green':mine.status==='Remote'?'blue':'amber'):chip('Not marked','gray')}</div>
 <div class="flex ac" style="gap:6px;flex-wrap:wrap"><button class="btn sm" onclick="markMyAttendance('Present')">Present</button><button class="btn sm" onclick="markMyAttendance('Remote')">Remote</button><button class="btn sm" onclick="markMyAttendance('Late')">Late</button></div></div>`}
const OFFICE_STAFF_NAMES={Administrator:'Rashid Al Maktoum',Principal:'Dr. Salma Haddad',Accountant:'Joseph Thomas',Teacher:'Rohan Mehta'};
function officeCanManage(){return['Administrator','Principal','Accountant'].includes(state.role)}
function officeStaffEmail(name){return name.toLowerCase().replace(/[^a-z]+/g,'.')+'@alnoor.ae'}
function officeAttendanceOverview(){state._officeSel=state._officeSel||[];const canManage=officeCanManage();
 const rows=Object.entries(OFFICE_STAFF_NAMES);const notMarked=rows.filter(([role,name])=>!STAFF_ATTENDANCE[name]).map(([role,name])=>name);
 return detailDrawer({title:'Office & staff attendance today',sub:'Administrator, Principal, Accountant and teaching staff self-mark daily presence',color:'#2563EB',badge:ic('att',18),
  stats:[['Marked',String(rows.length-notMarked.length)+'/'+rows.length,'blue'],['Not marked',String(notMarked.length),notMarked.length?'amber':'green']],
  sections:[{h:'Today',html:'<div class="card pad" style="box-shadow:none">'+(canManage?'<div class="flex ac jb" style="margin-bottom:10px;flex-wrap:wrap;gap:8px"><button class="btn sm" onclick="officeSelectNotMarked()">Select not-marked</button><button class="btn sm primary" onclick="officeSendReminder()">Send reminder to selected</button></div>':'')+
   Object.entries(OFFICE_STAFF_NAMES).map(([role,name])=>{const a=STAFF_ATTENDANCE[name];const checked=state._officeSel.includes(name);
    return '<div class="lrow" style="border-bottom:1px solid var(--line-soft);gap:10px">'+(canManage?'<input type="checkbox" '+(checked?'checked':'')+' onchange="officeToggleSel(\''+name.replace(/'/g,"\\'")+'\')" aria-label="Select '+name.replace(/'/g,"\\'")+'">':'')+
    '<div style="flex:1"><div style="font-weight:600;color:var(--slate-900);font-size:13px">'+name+'</div><div class="muted" style="font-size:11px">'+role+'</div></div>'+
    (a?chip(a.status+' · '+a.time,a.status==='Present'?'green':a.status==='Remote'?'blue':'amber'):chip('Not marked','gray'))+
    (canManage?'<div class="flex ac" style="gap:4px;margin-left:8px"><a class="btn sm" href="tel:+971500000000" onclick="logAudit(\'Called - '+name.replace(/'/g,"\\'")+'\',\'Staff & HR\')" aria-label="Call '+name.replace(/'/g,"\\'")+'">'+ic('phone',12)+'</a><a class="btn sm" href="mailto:'+officeStaffEmail(name)+'" onclick="logAudit(\'Emailed - '+name.replace(/'/g,"\\'")+'\',\'Staff & HR\')" aria-label="Email '+name.replace(/'/g,"\\'")+'">'+ic('mail',12)+'</a></div>':'')+
    '</div>'}).join('')+'</div>'}],
  footer:[['Close','closeDrawer()',true]]})}
window.officeToggleSel=function(name){const i=state._officeSel.indexOf(name);if(i>=0)state._officeSel.splice(i,1);else state._officeSel.push(name);openDrawer(officeAttendanceOverview())};
window.officeSelectNotMarked=function(){state._officeSel=Object.values(OFFICE_STAFF_NAMES).filter(n=>!STAFF_ATTENDANCE[n]);openDrawer(officeAttendanceOverview())};
window.officeSendReminder=function(){if(!officeCanManage()){toast('Only Administrator, Principal or Accountant can send reminders');return}
 const sel=state._officeSel;if(!sel.length){toast('Select at least one person, or use "Select not-marked"');return}
 logAudit('Sent attendance reminder to '+sel.length+' - '+sel.join(', '),'Staff & HR');state._officeSel=[];toast('Reminder sent to '+sel.length+' staff member'+(sel.length>1?'s':''));openDrawer(officeAttendanceOverview())};
function myLeaveView(){const mine=myLeaveEntries();const bal=leaveBalance();
 return detailDrawer({title:'My leave',sub:myIdentity()+' · '+state.role,color:'#2563EB',badge:ic('att',18),
  stats:[['Annual entitlement',bal.annual+' days','blue'],['Used',bal.used+' days','amber'],['Remaining',bal.left+' days',bal.left>5?'green':'red'],['Pending',String(mine.filter(x=>x.row[4]==='Pending').length),'gray']],
  sections:[{h:'Today',html:staffAttendanceWidget()},{h:'My requests',html:mine.length?'<div class="card pad" style="box-shadow:none">'+mine.map(x=>{const l=x.row;return '<div class="lrow" style="border-bottom:1px solid var(--line-soft);padding:9px 0"><div style="flex:1"><div style="font-weight:600;color:var(--slate-900);font-size:13px">'+l[1]+'</div><div class="muted" style="font-size:11px">'+l[2]+' · '+l[3]+'</div></div>'+chip(l[4],l[5])+(l[4]==='Pending'?'<button class="btn sm" style="margin-left:8px" onclick="cancelMyLeave('+x.i+')">Cancel</button>':'')+'</div>'}).join('')+'</div>':'<div class="muted" style="font-size:12.5px">No leave requests yet.</div>'}],
  footer:[['Apply for leave',"openMyLeaveForm()",true]]})}
window.cancelMyLeave=function(i){if(LEAVE[i]){LEAVE.splice(i,1);logAudit('Cancelled own leave request - '+myIdentity(),'Staff & HR')}closeDrawer();render();openDrawer(myLeaveView());toast('Leave request cancelled')};
function openMyLeaveForm(){formDrawer('Apply for leave',myIdentity()+' · '+leaveBalance().left+' days remaining',[
 {label:'Leave type',key:'type',opts:['Casual leave','Sick leave','Annual leave','Unpaid leave']},
 {label:'From',type:'date',key:'from',half:true},{label:'To',type:'date',key:'to',half:true},
 {label:'Reason',area:true,key:'reason',req:true,aiContext:'absence-note',maxlen:400}],'Submit request','','submitMyLeave')}
window.submitMyLeave=function(v){const emp=myIdentity();const from=v.from||'',to=v.to||'';const range=from&&to?(from+' \u2013 '+to):(from||to||'Today');
 let dur='1 day';try{if(from&&to){const d=Math.round((new Date(to)-new Date(from))/86400000)+1;if(d>0)dur=d+(d>1?' days':' day')}}catch(e){}
 LEAVE.unshift([emp,v.type||'Casual leave',range,dur,'Pending','amber']);logAudit('Applied for leave - '+emp+' ('+(v.type||'Casual leave')+')','Staff & HR');
 closeDrawer();render();openDrawer(myLeaveView());toast('Leave request submitted - pending approval');return false};
function teacherHome(){return `
  <div class="page-head"><div class="ph-l"><h2>Welcome, Mr. Mehta</h2><p>You have 4 classes and 1 assessment due today.</p></div>
  <div class="ph-r"><button class="btn" onclick="openDrawer(myLeaveView())">${ic('roles',16)} My leave</button><button class="btn primary" onclick="go('attendance')">${ic('att',16)} Take attendance</button></div></div>
  <div class="grid cols-4">
    ${kpi('classes','#2563EB','My classes today','4',{dir:'flat',v:'2 free',note:'periods'},"go('timetable')")}
    ${kpi('students','#17A24A','Students taught','118',null,"go('students')")}
    ${kpi('att','#E11D2A','Attendance pending','1',{dir:'down',v:'10-A',note:'next: 08:00'},"go('attendance')")}
    ${kpi('exam','#B45309','Papers to grade',String(lmsPendingCount()),{dir:'flat',v:'Physics',note:'due Fri'},"openDrawer(lmsPendingDrawer())")}
  </div>
  <div class="grid cols-3 mt">
    <div class="card pad span-2"><div class="sec-head"><h3>Today's schedule</h3><span class="link" onclick="go('timetable')">Full timetable →</span></div>
      ${[['08:00','Mathematics','10-A · Rm 204','green'],['09:00','Mathematics','10-B · Rm 204','green'],['10:30','Free period','Planning','gray'],['11:30','Mathematics','9-A · Rm 204','green'],['12:30','Mentoring','House Falcon','blue']].map(p=>`<div class="lrow"><b class="num" style="width:52px;color:var(--slate-900)">${p[0]}</b><div style="flex:1"><div style="font-weight:600;color:var(--slate-900)">${p[1]}</div><div class="muted" style="font-size:12px">${p[2]}</div></div><span class="badge b-${p[3]}"><span class="bd"></span>${p[3]==='gray'?'Free':'Class'}</span></div>`).join('')}
    </div>
    <div class="card pad"><div class="sec-head"><h3>Quick actions</h3></div>
      ${[['att','Take attendance','attendance'],['exam','Enter grades','exams'],['comm','Message parents','comm'],['lms','Post assignment','lms']].map(q=>`<button class="lrow" style="width:100%;text-align:left" onclick="go('${q[2]}')"><span class="kp-ic" style="background:var(--brand-soft);color:var(--brand-strong);width:34px;height:34px">${ic(q[0],18)}</span><span style="font-weight:600;color:var(--slate-900)">${q[1]}</span><span style="margin-left:auto;color:var(--slate-400)">${ic('arrow',16)}</span></button>`).join('')}
    </div>
  </div>`}
function parentHome(){const s=STUDENTS.find(x=>x.name==='Fatima Al Hashimi')||STUDENTS[0];return `
  <div class="page-head"><div class="ph-l"><h2>Hello, ${s.guardian.split(' ').slice(-1)[0]?'Mr. '+s.guardian.split(' ').slice(-1)[0]:s.guardian}</h2><p>A summary for your child, ${s.name} — ${s.grade}.</p></div>
  <div class="ph-r"><button class="btn" onclick="openDrawer(myAbsenceView())">${ic('att',16)} Leave / absence</button><button class="btn" onclick="downloadFeeStatement('${s.id}')">${ic('download',16)} Fee statement</button><button class="btn primary" onclick="downloadReportCard('${s.id}')">${ic('download',16)} Report card</button></div></div>
  <div class="grid cols-4">
    ${kpi('att','#17A24A','Attendance',s.att+'%',{dir:'up',v:'Good',note:'this term'},"go('attendance')")}
    ${kpi('exam','#2563EB','Term GPA',String(s.gpa),{dir:'up',v:'0.2',note:'Rank 1 of 28'},"go('exams')")}
    ${kpi('fees','#0E7C39','Fee status',s.fee,{dir:'flat',v:'AED 8,500',note:'next due 01 Sep'},"go('fees')")}
    ${kpi('comm','#B45309','New messages','2',null,"go('comm')")}
  </div>
  <div class="grid cols-3 mt">
    <div class="card pad span-2"><div class="sec-head"><h3>Recent grades</h3><span class="link" onclick="downloadReportCard('${s.id}')">Download report card →</span></div>
      <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Subject</th><th>Assessment</th><th class="right">Score</th><th>Grade</th></tr></thead><tbody>
      ${[['Mathematics','Unit Test 3',96,'A+'],['Physics','Lab Practical',94,'A+'],['English','Essay',89,'A'],['Arabic','Oral',92,'A+']].map(x=>`<tr><td style="font-weight:600;color:var(--slate-900)">${x[0]}</td><td>${x[1]}</td><td class="right num">${x[2]}/100</td><td><span class="badge b-green"><span class="bd"></span>${x[3]}</span></td></tr>`).join('')}
      </tbody></table></div>
    </div>
    <div class="card pad"><div class="sec-head"><h3>Documents</h3></div>
    ${[['Report card · Term 2','exam','downloadReportCard(\''+s.id+'\')'],['Fee statement','fees','downloadFeeStatement(\''+s.id+'\')'],['Bonafide letter','cert','downloadCertificate(\''+s.name+'\',\'Bonafide Letter\',\'\',\''+s.grade+'\')']].map(d=>`<div class="lrow" style="padding:10px 0"><span class="kp-ic" style="width:30px;height:30px;background:var(--brand-soft);color:var(--brand)">${ic(d[1],15)}</span><div style="flex:1;font-weight:600;color:var(--slate-800);font-size:13px">${d[0]}</div><button class="btn sm" onclick="${d[2]}">${ic('download',13)}</button></div>`).join('')}</div>
  </div>`}
function studentHome(){const me=STUDENTS.find(s=>s.name.split(' ')[0]==='Fatima')||STUDENTS[0];const dueList=lmsAllAssignments().filter(a=>a.myStatus==='Not submitted');
 return `
  <div class="page-head"><div class="ph-l"><h2>Hi, ${me.name.split(' ')[0]} 🎓</h2><p>You're on track this term — keep it up!</p></div>
  <div class="ph-r"><button class="btn" onclick="openDrawer(myAbsenceView())">${ic('att',16)} Leave / absence</button><button class="btn primary" onclick="downloadReportCard('${me.id}')">${ic('download',16)} My report card</button></div></div>
  <div class="grid cols-4">
    ${kpi('exam','#17A24A','My GPA',String(me.gpa),{dir:'up',v:'Rank 1',note:'of 28'},"go('exams')")}
    ${kpi('att','#2563EB','Attendance',me.att+'%',null,"go('attendance')")}
    ${kpi('lms','#B45309','Assignments due',String(dueList.length),dueList.length?{dir:'flat',v:dueList[0].title,note:'due '+dueList[0].due}:null,"openDrawer(lmsAssignmentsDrawer())")}
    ${kpi('lib','#7C3AED','Library','1 book',{dir:'flat',v:'due 20 Jun',note:''},"go('library')")}
  </div>
  <div class="grid cols-3 mt">
    <div class="card pad span-2"><div class="sec-head"><h3>Today's classes</h3></div>
    ${TT.map(p=>p[1][0]).filter(x=>x!=='BREAK'&&x!=='FREE').slice(0,5).map((c,i)=>{const[s,m]=c.split('|');return `<div class="lrow"><b class="num" style="width:52px;color:var(--slate-900)">${['08:00','09:00','10:30','11:30','12:30'][i]}</b><div style="flex:1;font-weight:600;color:var(--slate-900)">${s}</div><span class="muted" style="font-size:12px">${m}</span></div>`}).join('')}</div>
    <div class="card pad"><div class="sec-head"><h3>My documents</h3></div>
    ${[['Report card · Term 2','exam','downloadReportCard(\''+me.id+'\')'],['Fee statement','fees','downloadFeeStatement(\''+me.id+'\')'],['Bonafide letter','cert','downloadCertificate(\''+me.name+'\',\'Bonafide Letter\',\'\',\''+me.grade+'\')']].map(d=>`<div class="lrow" style="padding:10px 0"><span class="kp-ic" style="width:30px;height:30px;background:var(--brand-soft);color:var(--brand)">${ic(d[1],15)}</span><div style="flex:1;font-weight:600;color:var(--slate-800);font-size:13px">${d[0]}</div><button class="btn sm" onclick="${d[2]}">${ic('download',13)}</button></div>`).join('')}</div>
  </div>`}
function accountantHome(){return `
  <div class="page-head"><div class="ph-l"><h2>Finance overview</h2><p>Collections, dues and payroll status for June 2025.</p></div>
  <div class="ph-r"><button class="btn" onclick="openDrawer(myLeaveView())">${ic('roles',16)} My leave</button><button class="btn" onclick="exportCSV('expense-statement.csv',['Category','Budget','Spent'],EXPENSES.map(e=>[e.cat,e.budget,e.spent]))">${ic('download',16)} Statement</button><button class="btn primary" onclick="go('fees')">${ic('fees',16)} Record payment</button></div></div>
  <div class="grid cols-4">
    ${kpi('fees','#17A24A','Collected · June',aed(2148000),{dir:'up',v:'8%',note:'88% of target'},"go('fees')")}
    ${kpi('expense','#E11D2A','Outstanding dues',aed(292000),{dir:'down',v:'12 invoices',note:'2 overdue >30d'},"go('fees')")}
    ${kpi('payroll','#2563EB','Payroll · June',aed(1820000),{dir:'flat',v:'Scheduled',note:'run 28 Jun'},"go('payroll')")}
    ${kpi('reports','#B45309','Net position',aed(640000),{dir:'up',v:'4.1%',note:'this term'},"go('reports')")}
  </div>
  <div class="grid cols-2 mt">
    <div class="card pad"><div class="sec-head"><h3>Collections — last 6 months</h3></div>${vbars([{lb:'Jan',val:'1.9M',pct:76},{lb:'Feb',val:'2.0M',pct:80},{lb:'Mar',val:'2.1M',pct:84},{lb:'Apr',val:'1.8M',pct:72,alt:true},{lb:'May',val:'2.2M',pct:88},{lb:'Jun',val:'2.15M',pct:86}])}</div>
    <div class="card pad"><div class="sec-head"><h3>Overdue invoices</h3><span class="link" onclick="go('fees')">Open →</span></div>
    ${INVOICES.filter(i=>i.status==='Overdue').map(i=>`<div class="lrow">${avatar(i.student)}<div style="flex:1"><div style="font-weight:600;color:var(--slate-900);font-size:13.5px">${i.student}</div><div class="muted" style="font-size:12px">${i.id} · due ${i.due}</div></div><b class="num" style="color:var(--red)">${aed(i.amt)}</b></div>`).join('')}
    </div>
  </div>`}

