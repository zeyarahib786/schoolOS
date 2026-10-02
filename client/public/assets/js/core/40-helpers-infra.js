/* ============ HELPERS ============ */
const $=s=>document.querySelector(s);
function feeBadge(s){const m={Paid:'b-green',Due:'b-amber',Overdue:'b-red'};return `<span class="badge ${m[s]||'b-gray'}"><span class="bd"></span>${s}</span>`}
function statusBadge(s){const m={Active:'b-green',Probation:'b-amber','On Leave':'b-blue',Onboarding:'b-amber',Declined:'b-red'};return `<span class="badge ${m[s]||'b-gray'}"><span class="bd"></span>${s}</span>`}
function avatar(name){const c=avc(name);return `<span class="avatar" style="background:${c}22;color:${darken(c,0.5)}">${initials(name)}</span>`}
function cellUser(name,sub){return `<div class="cell-user">${avatar(name)}<div><div class="nm">${name}</div><div class="sub">${sub||''}</div></div></div>`}

function toast(msg){const t=document.createElement('div');t.className='toast';t.innerHTML=`<span class="ti"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg></span>${msg}`;$('#toasts').appendChild(t);setTimeout(()=>{t.style.opacity=0;t.style.transform='translateY(8px)';setTimeout(()=>t.remove(),250)},2600)}
/* ===== Live audit + export + approvals + notifications infrastructure ===== */
/* ---- Role-based write access: Student/Parent/Accountant are read-only on academic operational records ---- */
const WRITE_ROLES=['Administrator','Principal','Teacher'];
function canWrite(){return WRITE_ROLES.indexOf(state.role)>=0}
function guardWrite(what){if(!canWrite()){toast((what||'This action')+' requires Teacher or Admin access - you are viewing in read-only mode');return false}return true}
function myStudent(){
  if(window.SCHOOLOS_ADAPTER?.connected)return STUDENTS[0]||null;
  return STUDENTS.find(s=>s.name==='Fatima Al Hashimi')||STUDENTS[0]||null;
}
function myTeacherName(){return 'Rohan Mehta'}
function myGrade(){return myStudent().grade}
function gradeToClsCode(g){const m=(g||'').match(/Grade\s*(\d+)\s*·\s*([A-Za-z]+)/);if(m)return m[1]+'-'+m[2];const k=(g||'').match(/KG\s*(\d+)\s*·\s*([A-Za-z]+)/);if(k)return 'KG'+k[1]+'-'+k[2];return g}
function roleScopedCourses(){if(state.role==='Teacher')return COURSES.filter(c=>c.teacher===myTeacherName());
 if(state.role==='Student'||state.role==='Parent')return COURSES.filter(c=>c.cls===gradeToClsCode(myGrade()));
 return COURSES}
function logAudit(action,module){if(window.SCHOOLOS_ADAPTER?.connected)return;try{AUDIT.unshift({user:state.role==='Principal'?'Dr. Salma Haddad':state.role==='Accountant'?'Joseph Thomas':state.role==='Teacher'?'Rohan Mehta':'Rashid Al Maktoum',action,module:module||'System',time:'Just now'})}catch(e){}}
function exportCSV(name,headers,rows){try{const esc=v=>{v=String(v==null?'':v);return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v};
  const csv=[headers.map(esc).join(',')].concat(rows.map(r=>r.map(esc).join(','))).join('\n');
  const blob=new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();
  setTimeout(()=>{a.remove();URL.revokeObjectURL(url)},150);logAudit('Exported '+name,'Reports');toast('Downloaded · '+name)}catch(e){toast('Export ready')}}
function pendingApprovals(){const out=[];
 try{LEAVE.forEach((l,i)=>{if(l[4]==='Pending')out.push({kind:'staffleave',ref:String(i),title:'Leave · '+l[0],sub:l[1]+' · '+l[2],mod:'Staff & HR',c:'amber'})})}catch(e){}
 try{CERTS.forEach(c=>{if(c.status==='Pending')out.push({kind:'cert',ref:c.ref,title:'Certificate · '+c.name,sub:c.type+' · '+c.ref,mod:'Certificates',c:'blue'})})}catch(e){}
 try{HLEAVE.forEach(l=>{if(l.status==='Requested')out.push({kind:'hleave',ref:l.id,title:'Gate pass · '+l.name,sub:l.type+' · '+l.from+' → '+l.to,mod:'Hostel',c:'green'})})}catch(e){}
 try{HMAINT.forEach(m=>{if(m.status==='Open')out.push({kind:'maint',ref:m.id,title:'Maintenance · '+m.room,sub:m.issue,mod:'Hostel',c:'red'})})}catch(e){}
 try{ABSENCE_REQUESTS.forEach((r,i)=>{if(r.status==='Pending')out.push({kind:'absence',ref:String(i),title:'Absence · '+r.studentName,sub:r.type+' · '+r.from+' → '+r.to,mod:'Attendance',c:'amber'})})}catch(e){}
 return out}
function approvalDetail(kind,ref){let d=null;
 if(kind==='staffleave'){const l=LEAVE[parseInt(ref,10)];if(!l)return '';d={title:l[0],sub:'Staff leave request',rows:[['Type',l[1]],['Dates',l[2]],['Duration',l[3]],['Status',l[4]],['Policy check','Reviewer must verify balance and cover']],ok:"approveStaffLeave("+ref+");closeDrawer()",no:"rejectStaffLeave("+ref+");closeDrawer()"};}
 else if(kind==='cert'){const c=CERTS.find(x=>x.ref===ref);if(!c)return '';d={title:c.name,sub:c.type+' · '+c.ref,rows:[['Class',c.cls],['Requested',c.date],['Reference',c.ref],['Policy check','Reviewer must verify holds and authorization']],ok:"approveCert('"+ref+"')",no:"rejectCert('"+ref+"')"};}
 else if(kind==='hleave'){const l=HLEAVE.find(x=>x.id===ref);if(!l)return '';d={title:l.name,sub:'Gate pass · '+l.id,rows:[['Type',l.type],['From',l.from],['To',l.to],['Room',l.room],['Reason',l.reason],['Guardian consent','Reviewer must verify']],ok:"approveLeave('"+ref+"')",no:"rejectLeave('"+ref+"')"};}
 else if(kind==='maint'){const m=HMAINT.find(x=>x.id===ref);if(!m)return '';d={title:m.room+' · '+m.id,sub:'Maintenance request',rows:[['Issue',m.issue],['Category',m.cat],['Priority',m.prio],['Raised by',m.by],['Logged',m.date]],ok:"resolveMaint('"+ref+"');closeDrawer()",no:"closeDrawer()"};}
 else if(kind==='absence'){const r=ABSENCE_REQUESTS[parseInt(ref,10)];if(!r)return '';d={title:r.studentName,sub:'Absence request · '+r.grade,rows:[['Type',r.type],['From',r.from],['To',r.to],['Duration',r.days+' day(s)'],['Requested by',r.by],['Note',r.note],['Impact on attendance','Marks these dates Excused, not Absent']],ok:"approveAbsence("+ref+")",no:"rejectAbsence("+ref+")"};}
 if(!d)return '';
 return detailDrawer({title:d.title,sub:d.sub,color:'#2563EB',badge:ic('roles',18),
   sections:[{h:'Request details',rows:d.rows},{h:'Approval chain',rows:[['Requested by',d.title.split(' · ')[0]],['Reviewer',state.role],['Audit','Logged on decision']]}],
   footer:[['Reject / return',d.no],['Approve',d.ok,true]]})}
function notifItems(){const n=[];const ap=pendingApprovals().length;
 try{if(ap)n.push({t:ap+' approval'+(ap>1?'s':'')+' pending',sub:'Leave, certificates, gate passes & maintenance',m:'dashboard',ic:'roles',c:'amber'})}catch(e){}
 try{const ov=INVOICES.filter(i=>i.status==='Overdue');if(ov.length)n.push({t:ov.length+' overdue invoice'+(ov.length>1?'s':''),sub:aed(ov.reduce((a,b)=>a+b.amt,0))+' outstanding',m:'fees',ic:'fees',c:'red'})}catch(e){}
 try{const due=crmActive().filter(l=>l.follow!=null&&l.follow<=0).length;if(due)n.push({t:due+' CRM follow-up'+(due>1?'s':'')+' due',sub:'Enrolment pipeline needs attention',m:'crm',ic:'crm',c:'blue'})}catch(e){}
 try{const low=WALLETS.filter(w=>w.bal<20).length;if(low)n.push({t:low+' low wallet balance'+(low>1?'s':''),sub:'Cafeteria wallets under AED 20',m:'cafeteria',ic:'cafeteria',c:'amber'})}catch(e){}
 try{const st=CAFESTOCK.filter(x=>x.stock<x.min).length;if(st)n.push({t:st+' kitchen item'+(st>1?'s':'')+' to reorder',sub:'Stock below minimum threshold',m:'cafeteria',ic:'inv',c:'red'})}catch(e){}
 try{const ch=STUDENTS.filter(x=>x.att<85).length;if(ch)n.push({t:ch+' student'+(ch>1?'s':'')+' below 85% attendance',sub:'Chronic-absence review recommended',m:'attendance',ic:'att',c:'red'})}catch(e){}
 return n}
function openNotifs(){const items=notifItems();logAudit('Viewed notifications','System');
 openDrawer(`<div class="dh"><div style="flex:1"><h3>Notifications</h3><div class="muted" style="font-size:12.5px">${items.length} open item${items.length===1?'':'s'} · live from module records</div></div><button class="iconbtn" onclick="closeDrawer()"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button></div>
 <div class="db">${items.length?items.map(n=>`<button class="lrow" style="width:100%;text-align:left;cursor:pointer" onclick="closeDrawer();go('${n.m}')"><span class="kp-ic" style="width:34px;height:34px;background:${CVAR[n.c]}1a;color:${CVAR[n.c]}">${ic(n.ic,17)}</span><div style="flex:1"><div style="font-weight:600;color:var(--slate-900);font-size:13.5px">${n.t}</div><div class="muted" style="font-size:12px">${n.sub}</div></div><span style="color:var(--slate-400)">${ic('arrow',15)}</span></button>`).join(''):`<div class="empty"><div class="ei">${ic('bell',26)}</div><h3>All clear</h3><p>No open alerts right now.</p></div>`}</div>`)}
