/* ============ HELPERS ============ */
const $=s=>document.querySelector(s);
function feeBadge(s){const m={Paid:'b-green',Due:'b-amber',Overdue:'b-red'};return `<span class="badge ${m[s]||'b-gray'}"><span class="bd"></span>${s}</span>`}
function statusBadge(s){const m={Active:'b-green',Probation:'b-amber','On Leave':'b-blue',Onboarding:'b-amber',Declined:'b-red'};return `<span class="badge ${m[s]||'b-gray'}"><span class="bd"></span>${s}</span>`}
function avatar(name){const c=avc(name);return `<span class="avatar" style="background:${c}22;color:${darken(c,0.5)}">${initials(name)}</span>`}
function cellUser(name,sub){return `<div class="cell-user">${avatar(name)}<div><div class="nm" data-school-person-display>${name}</div><div class="sub">${sub||''}</div></div></div>`}

function toast(msg){const t=document.createElement('div');t.className='toast';t.innerHTML=`<span class="ti"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg></span>`;t.appendChild(document.createTextNode(String(msg)));$('#toasts').appendChild(t);localizeView(t);setTimeout(()=>{t.style.opacity=0;t.style.transform='translateY(8px)';setTimeout(()=>t.remove(),250)},2600)}
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
function exportCSV(name,headers,rows){studentDownloadCSV(name,[headers,...rows])}

function pendingApprovals(){const out=[];
 try{LEAVE.forEach((l,i)=>{if(l[4]==='Pending')out.push({kind:'staffleave',ref:String(i),title:'Leave · '+l[0],sub:l[1]+' · '+l[2],mod:'Staff & HR',c:'amber'})})}catch(e){}
 try{CERTS.forEach(c=>{if(c.status==='Pending')out.push({kind:'cert',ref:c.ref,title:'Certificate · '+c.name,sub:c.type+' · '+c.ref,mod:'Certificates',c:'blue'})})}catch(e){}
 try{HLEAVE.forEach(l=>{if(l.status==='Requested')out.push({kind:'hleave',ref:l.id,title:'Gate pass · '+l.name,sub:l.type+' · '+l.from+' → '+l.to,mod:'Hostel',c:'green'})})}catch(e){}
 try{HMAINT.forEach(m=>{if(m.status==='Open')out.push({kind:'maint',ref:m.id,title:'Maintenance · '+m.room,sub:m.issue,mod:'Hostel',c:'red'})})}catch(e){}
 try{ABSENCE_REQUESTS.forEach((r,i)=>{if(r.status==='Pending')out.push({kind:'absence',ref:String(i),title:'Absence · '+r.studentName,sub:r.type+' · '+r.from+' → '+r.to,mod:'Attendance',c:'amber'})})}catch(e){}
 return out}
function approvalDetail(kind,ref){
 if(window.SCHOOLOS_ADAPTER?.connected){const module={staffleave:'staff',cert:'certificates',hleave:'hostel',maint:'hostel',absence:'attendance'}[kind];if(!module)return '';const item=pendingApprovals().find(row=>row.kind===kind&&row.ref===ref);return detailDrawer({recordTitle:true,title:studentEscape(item?.title||'Saved request'),sub:studentEscape(item?.sub||'Review request'),sections:[{h:'Review',html:'<p>Open the saved request in its workspace to review the current version, reason and permissions before deciding.</p>'}],footer:[['Open review workspace',"closeDrawer();go('"+module+"')",true]]})}
 let d=null;
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

/* Calendar-day records are UTC-midnight containers, not timezone-specific instants. */
function schoolDateOnly(value) {
  if (!value) return '—';
  const day = String(value).slice(0, 10);
  const parsed = new Date(day + 'T00:00:00.000Z');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0,10) !== day) return '—';
  return parsed.toLocaleDateString(typeof schoolLocale==='function'?schoolLocale():'en-GB', { timeZone: 'UTC', dateStyle: 'medium' });
}

function schoolRecordText(value){return '<span data-i18n-skip="true">'+studentEscape(value)+'</span>'}

/* Persisted personal inbox; polling never replaces an unrelated drawer or form. */
function schoolInboxState(){
 const user=window.SCHOOLOS_ADAPTER?.user?._id;
 if(state.schoolInbox?.user!==user)state.schoolInbox={user,rows:[],page:1,unread:0,total:0,onlyUnread:false,loading:false,error:'',seq:0};
 return state.schoolInbox;
}
function schoolInboxBadge(){const b=schoolInboxState(),badge=document.getElementById('inboxBadge');if(badge){badge.textContent=b.unread?String(b.unread):'';badge.hidden=!b.unread;badge.className=b.unread?'badge b-red':'';}}
async function schoolInboxRefresh(){
 const api=window.SCHOOLOS_ADAPTER;if(!api?.connected)return;
 const b=schoolInboxState();if(b.loading)return;b.loading=true;const seq=++b.seq,page=b.page,onlyUnread=b.onlyUnread;
 try{const r=await api.api('/inbox?page='+b.page+(b.onlyUnread?'&unread=true':''));if(schoolInboxState()!==b||b.seq!==seq)return;if(b.page!==page||b.onlyUnread!==onlyUnread)return;b.rows=r.data;b.unread=r.meta.unread;b.total=r.meta.pagination.total;b.page=Math.min(b.page,Math.max(1,Math.ceil(b.total/25)));b.error='';}
 catch(e){if(schoolInboxState()===b)b.error=e.message;}
 finally{b.loading=false;if(schoolInboxState()===b){if(b.page!==page||b.onlyUnread!==onlyUnread){schoolInboxRefresh();return;}schoolInboxBadge();const root=document.getElementById('schoolInboxContent');if(root){const scroll=root.scrollTop;root.innerHTML=schoolInboxHtml();localizeView(root);root.scrollTop=scroll;}}}
}
function schoolInboxHtml(){const b=schoolInboxState(),e=studentEscape,pages=Math.max(1,Math.ceil(b.total/25));return `<div class="flex" style="gap:8px;flex-wrap:wrap"><button class="btn" onclick="schoolInboxState().onlyUnread=!schoolInboxState().onlyUnread;schoolInboxState().page=1;schoolInboxRefresh()">${b.onlyUnread?'Show all notifications':'Unread only'}</button><button class="btn" onclick="schoolInboxReadAll()">Mark all read</button><button class="btn" onclick="schoolInboxRefresh()">Refresh</button><button class="btn" onclick="schoolModuleAlerts()">Module alerts</button></div><p>${b.unread} <span>Unread notifications</span></p>${b.error?`<p role="alert">${e(b.error)}</p>`:''}${b.rows.map(n=>`<section class="card pad" style="margin:10px 0;overflow-wrap:anywhere"><strong>${e(n.title)}</strong>${n.readAt?'':' <span class="badge b-blue">Unread</span>'}<p ${n.module==='crm'?'':'data-i18n-skip="true"'}>${n.module==='crm'?studentNameHtml({name:n.body}):e(n.body)}</p><small>${e(new Date(n.createdAt).toLocaleString(typeof schoolLocale==='function'?schoolLocale():'en-GB'))}</small><div class="flex" style="gap:8px;margin-top:8px"><button class="btn" onclick="schoolInboxOpen('${n._id}')">Open record</button>${n.readAt?'':`<button class="btn" onclick="schoolInboxRead('${n._id}')">Mark read</button>`}</div></section>`).join('')||`<p>${b.loading?'Loading notifications…':'No notifications in this view.'}</p>`}<div class="flex ac" style="gap:10px"><button class="btn" ${b.page<=1?'disabled':''} onclick="schoolInboxState().page--;schoolInboxRefresh()">Previous</button><span>Page ${b.page} of ${pages}</span><button class="btn" ${b.page>=pages?'disabled':''} onclick="schoolInboxState().page++;schoolInboxRefresh()">Next</button></div>`;}
const schoolModuleAlerts=openNotifs;
openNotifs=function(){openDrawer('<div class="dh"><h3>Notifications</h3><button class="iconbtn" aria-label="Close" onclick="closeDrawer()">'+ic('close',20)+'</button></div><div class="db" id="schoolInboxContent">'+schoolInboxHtml()+'</div>');schoolInboxRefresh();};
async function schoolInboxRead(id){try{await SCHOOLOS_ADAPTER.api('/inbox/'+id+'/read',{method:'POST'});await schoolInboxRefresh();}catch(e){toast(e.message)}}
async function schoolInboxReadAll(){try{await SCHOOLOS_ADAPTER.api('/inbox/read-all',{method:'POST'});schoolInboxState().page=1;await schoolInboxRefresh();}catch(e){toast(e.message)}}
async function schoolInboxOpen(id){const anchor=document.getElementById('schoolInboxContent');const inbox=schoolInboxState();const row=inbox.rows.find(n=>n._id===id);if(!row)return;await schoolInboxRead(id);if(schoolInboxState()!==inbox||document.getElementById('schoolInboxContent')!==anchor)return;closeDrawer();go(row.module);if(row.module==='crm'){try{await SCHOOLOS_ADAPTER.hydrateCrm();if(state.module==='crm'){if(CRMLEADS.some(l=>l.mongoId===row.recordId))openDrawer(crmDetail(row.recordId));else toast('Record no longer available');}}catch(e){toast(e.message)}}else if(row.module==='lms'){await lmsWorkspaceLoad();if(state.module==='lms'){if(lmsWorkspaceAssignment(row.recordId))lmsWorkspaceAssignmentDetail(row.recordId);else toast('Record no longer available');}}else if(row.module==='attendance'){state.attTab='daily';render();}else if(row.module==='communication'){try{const messages=await SCHOOLOS_ADAPTER.apiAll('/messages?box=inbox&archived=false');if(state.module!=='communication')return;commState().tab='Inbox';commState().messages=messages.data;commState().loaded=true;render();if(messages.data.some(m=>m._id===row.recordId))await commMessageDetail(row.recordId);else toast('Record no longer available');}catch(e){toast(e.message)}}}
if(typeof window.setInterval==='function')window.setInterval(()=>{if(!document.hidden)schoolInboxRefresh();},10000);
