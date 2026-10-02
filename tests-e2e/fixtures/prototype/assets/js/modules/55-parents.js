/* ---- Parents ---- */
/* Guardians modelled independently from students — multi-child linkage, custody & consent flags */
let GUARDIANS=null;
function buildGuardians(){if(GUARDIANS)return GUARDIANS;const map={};
 STUDENTS.forEach(st=>{const g=(st.guardian||'—').trim();if(g==='—')return;
  if(!map[g])map[g]={id:'GRD-'+String(Object.keys(map).length+101),name:g,relation:'Parent',phone:st.phone,email:g.toLowerCase().replace(/[^a-z]+/g,'.')+'@family.ae',children:[],portal:'Active',lastLogin:['Today','Yesterday','3d ago','1w ago'][Object.keys(map).length%4],pickup:true,financial:true,custody:'Full',consents:{media:Object.keys(map).length%3!==0,trips:true,medical:true}};
  map[g].children.push(st.id)});
 GUARDIANS=Object.values(map);
 if(GUARDIANS.length>1&&GUARDIANS[0].children.length===1){const donor=GUARDIANS.pop();GUARDIANS[0].children=GUARDIANS[0].children.concat(donor.children);GUARDIANS[0].note='Linked siblings across grades';}
 GUARDIANS[1]&&(GUARDIANS[1].portal='Invited',GUARDIANS[1].lastLogin='—');
 GUARDIANS[2]&&(GUARDIANS[2].custody='Court order on file',GUARDIANS[2].pickup=false);
 return GUARDIANS}
function guardianDetail(gid){const g=buildGuardians().find(x=>x.id===gid);if(!g)return '';const kids=g.children.map(id=>STUDENTS.find(s=>s.id===id)).filter(Boolean);
 return detailDrawer({title:g.name,sub:g.id+' · '+g.relation+' · '+g.children.length+' linked child'+(g.children.length>1?'ren':''),color:avc(g.name),
  stats:[['Portal',g.portal,g.portal==='Active'?'green':'amber'],['Last login',g.lastLogin,'blue'],['Custody',g.custody==='Full'?'Full':'Restricted',g.custody==='Full'?'green':'red'],['Pickup',g.pickup?'Authorised':'Not authorised',g.pickup?'green':'red']],
  sections:[
   {h:'Linked children',html:'<div class="card pad" style="box-shadow:none">'+ (kids.length?kids.map(k=>'<div class="lrow" style="cursor:pointer" onclick="openDrawer(studentProfile(\''+k.id+'\'))">'+avatar(k.name)+'<div style="flex:1"><div style="font-weight:600;color:var(--slate-900);font-size:13px">'+k.name+'</div><div class="muted" style="font-size:11.5px">'+k.id+' · '+k.grade+'</div></div><span class="badge b-'+(k.fee==='Paid'?'green':'amber')+'"><span class="bd"></span>Fees '+k.fee+'</span></div>').join(''):'<div class="muted" style="font-size:12.5px">No active students linked.</div>')+'</div>'},
   {h:'Relationship & legal access',rows:[['Relation',g.relation],['Custody',g.custody],['Pickup authorisation',g.pickup?'Yes':'No — see custody note'],['Financial responsibility',g.financial?'Primary payer':'—'],['Emergency priority','1']]},
   {h:'Consents',rows:[['Photo / media',g.consents.media?'Granted':'Declined'],['Trips',g.consents.trips?'Granted':'Declined'],['Medical treatment',g.consents.medical?'Granted':'Declined']]},
   {h:'Contact',rows:[['Phone',g.phone||'—'],['Email',g.email]]}],
  footer:[[ic('comm',15)+' Message',"openDrawer(guardianThread('"+g.id+"'))"],[g.portal==='Active'?'Suspend portal':'Resend invite','toggleGuardianPortal(\'' + g.id + '\')',true]]})}
window.toggleGuardianPortal=function(gid){const g=buildGuardians().find(x=>x.id===gid);if(!g)return;g.portal=g.portal==='Active'?'Suspended':'Active';g.lastLogin=g.portal==='Active'?'Just now':g.lastLogin;logAudit((g.portal==='Active'?'Re-activated':'Suspended')+' guardian portal · '+g.id,'Parents');openDrawer(guardianDetail(gid));toast('Portal '+g.portal.toLowerCase()+' · '+g.name)};
M.parents=()=>{const tab=getSubTab('parents-v','directory');const list=buildGuardians();
  return `<div class="page-head"><div class="ph-l"><h2>Parents & Guardians</h2><p>Linked guardian accounts with portal access, communication and meetings.</p></div>
  <div class="ph-r"><button class="btn primary" onclick="sendToParentsForm()">${ic('comm',16)} Message parents</button></div></div>
  <div class="grid cols-4" style="margin-bottom:16px">
    ${kpi('parents','#17A24A','Guardian accounts',String(list.length),{dir:'flat',v:list.reduce((a,g)=>a+g.children.length,0)+' children linked',note:''})}${kpi('att','#2563EB','Portal active','98%',{dir:'up',v:'engaged',note:''})}
    ${kpi('fees','#0E7C39','Fees cleared',String(list.filter(s=>s.fee==='Paid').length)+'/'+list.length,null)}${kpi('cal','#E2920C','PTM bookings','46',{dir:'flat',v:'this term',note:''})}</div>
  ${subTabs('parents-v',[['directory','Directory','parents'],['comm','Communication','comm'],['meetings','Meetings','cal']])}
  ${tab==='comm'?parentComm():tab==='meetings'?parentMeetings():parentDirectory()}`};
function sendToParentsForm(){const grades=[...new Set(STUDENTS.map(s=>s.grade))].sort();const classes=[...new Set(STUDENTS.map(s=>s.grade.replace('Grade ','').replace(' · ','-')))].sort();const guardians=buildGuardians();
 formDrawer('Send to parents','Only the field matching your chosen audience is used',[
  {label:'Audience',key:'audience',opts:['All parents','By grade','Single class','Individual guardian'],req:true},
  {label:'Grade (if By grade)',key:'grade',opts:grades,half:true},{label:'Class (if Single class)',key:'cls',opts:classes,half:true},
  {label:'Guardian (if Individual)',key:'guardian',opts:guardians.map(g=>g.name+' ('+g.id+')')},
  {label:'Channel',key:'channel',opts:['In-app + Email','SMS + Email','In-app only']},
  {label:'Subject',key:'subject',req:true},{label:'Message',area:true,key:'message',req:true,aiContext:'parents-broadcast',maxlen:600,val:AI_DEFAULT_MESSAGES['parents-broadcast']}
 ],'Preview & send','','sendToParents')}
window.sendToParents=function(v){const audience=v.audience||'All parents';const guardians=buildGuardians();let targets=[];
 if(audience==='By grade'){if(!v.grade){toast('Select a grade');return false}targets=guardians.filter(g=>g.children.some(id=>{const st=STUDENTS.find(s=>s.id===id);return st&&st.grade===v.grade}))}
 else if(audience==='Single class'){if(!v.cls){toast('Select a class');return false}targets=guardians.filter(g=>g.children.some(id=>{const st=STUDENTS.find(s=>s.id===id);return st&&st.grade.replace('Grade ','').replace(' · ','-')===v.cls}))}
 else if(audience==='Individual guardian'){if(!v.guardian){toast('Select a guardian');return false}const gid=v.guardian.match(/\(([^)]+)\)$/);const g=guardians.find(x=>gid&&x.id===gid[1]);if(g)targets=[g]}
 else targets=guardians;
 if(!targets.length){toast('No guardians match that audience');return false}
 const delivered=Math.round(targets.length*0.97),read=Math.round(targets.length*0.6);
 PARENT_BROADCASTS.unshift({subject:v.subject,audience:audience+(v.grade?' - '+v.grade:'')+(v.cls?' - '+v.cls:'')+(audience==='Individual guardian'&&targets[0]?' - '+targets[0].name:''),channel:v.channel||'In-app + Email',delivered,read,sent:'Just now'});
 targets.forEach(g=>{seedThread(g.id).push({dir:'out',from:'You - '+state.role,text:v.message,time:'Just now'})});
 logAudit('Sent broadcast "'+v.subject+'" to '+targets.length+' guardian'+(targets.length===1?'':'s')+' ('+audience+')','Communication');
 closeDrawer();render();openDrawer(broadcastConfirmation(v.subject,targets.length,v.channel||'In-app + Email',audience));return false};
function broadcastConfirmation(subject,count,channel,audience){return detailDrawer({title:'Message sent',sub:'Confirmed - '+audience,color:'#17A24A',badge:ic('comm',18),
 stats:[['Recipients',String(count),'blue'],['Channel',channel,'blue'],['Status','Delivered','green']],
 sections:[{h:'Summary',rows:[['Subject',subject],['Audience',audience],['Sent',count+' guardian'+(count===1?'':'s')]]}],
 footer:[['Done','closeDrawer()',true]]})}
function parentDirectory(){return `<div class="card pad"><div class="flex ac" style="gap:10px;margin-bottom:14px;flex-wrap:wrap">
    <div class="field" style="flex:1;min-width:200px"><input id="parSearch" placeholder="Search guardian or student" oninput="filterParents()" style="width:100%;height:40px;border:1px solid var(--line);border-radius:10px;padding:0 12px"></div>
    <div class="field sel"><select id="parFee" onchange="filterParents()"><option value="">Any fee status</option><option>Paid</option><option>Due</option><option>Overdue</option></select></div>
    <span class="muted" id="parCount" style="font-size:12.5px;margin-left:auto">${STUDENTS.slice(0,12).length} shown</span></div>
  <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Guardian</th><th>Linked children</th><th>Phone</th><th>Portal</th><th>Custody</th></tr></thead><tbody id="parBody">${parentRows(buildGuardians())}</tbody></table></div></div>`}
function parentRows(list){return list.map(g=>`<tr style="cursor:pointer" onclick="openDrawer(guardianDetail('${g.id}'))"><td>${cellUser(g.name,g.id+' · '+g.relation)}</td><td>${g.children.map(id=>{const k=STUDENTS.find(x=>x.id===id);return k?k.name.split(' ')[0]+' ('+k.grade.replace('Grade ','G').replace(' · ','')+')':id}).join(', ')}</td><td class="num">${g.phone||'—'}</td><td><span class="badge ${g.portal==='Active'?'b-green':g.portal==='Suspended'?'b-red':'b-amber'}"><span class="bd"></span>${g.portal}</span></td><td>${g.custody==='Full'?'<span class="badge b-green"><span class="bd"></span>Full</span>':'<span class="badge b-red"><span class="bd"></span>Restricted</span>'}</td></tr>`).join('')||`<tr><td colspan="5"><div class="empty"><div class="ei">${ic('parents',26)}</div><h3>No guardians match</h3></div></td></tr>`}
function filterParents(){const q=($('#parSearch')?.value||'').toLowerCase(),fee=$('#parFee')?.value||'';const rows=buildGuardians().filter(g=>{const kids=g.children.map(id=>STUDENTS.find(x=>x.id===id)).filter(Boolean);return (g.name.toLowerCase().includes(q)||kids.some(k=>k.name.toLowerCase().includes(q)))&&(!fee||kids.some(k=>k.fee===fee))});$('#parCount').textContent=rows.length+' shown';$('#parBody').innerHTML=parentRows(rows)}
let PARENT_BROADCASTS=[
 {subject:'Term 2 fee reminder',audience:'Due-fee parents',channel:'SMS + Email',delivered:86,read:71,sent:'Today'},
 {subject:'Parent-teacher meeting invite',audience:'All parents',channel:'In-app + Email',delivered:980,read:742,sent:'Yesterday'},
 {subject:'Sports day schedule',audience:'Gr 1-8 parents',channel:'In-app',delivered:540,read:498,sent:'12 Jun'},
 {subject:'Exam timetable released',audience:'Gr 9-12 parents',channel:'Email',delivered:320,read:289,sent:'10 Jun'},
];
let MSG_THREADS={};
function seedThread(gid){if(MSG_THREADS[gid])return MSG_THREADS[gid];
 MSG_THREADS[gid]=[
  {dir:'out',from:'Front Office',text:'Hello, this is a reminder that Term 2 fees are due by 01 September. Please let us know if you need a payment plan.',time:'3 days ago'},
  {dir:'in',from:'Guardian',text:'Thank you for the reminder. I will make the payment by this weekend.',time:'2 days ago'},
  {dir:'out',from:'Class Teacher',text:'Just a note that your child did wonderfully in the science exhibition today!',time:'Yesterday'},
 ];return MSG_THREADS[gid]}
function parentComm(){const gs=buildGuardians();
 return `<div class="card pad" style="margin-bottom:14px"><div class="sec-head" style="margin-bottom:6px"><h3 style="font-size:15px">Recent broadcasts</h3></div>
  <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Subject</th><th>Audience</th><th>Channel</th><th class="right">Delivered</th><th class="right">Read</th><th>Sent</th></tr></thead><tbody>
  ${PARENT_BROADCASTS.map(m=>`<tr><td style="font-weight:600;color:var(--slate-900)">${m.subject}</td><td>${m.audience}</td><td>${m.channel}</td><td class="right num">${m.delivered}</td><td class="right num muted">${m.read}</td><td class="num muted">${m.sent}</td></tr>`).join('')}
  </tbody></table></div></div>
  <div class="card pad"><div class="sec-head" style="margin-bottom:6px"><h3 style="font-size:15px">Conversation threads</h3><span class="muted" style="font-size:12px">Click a guardian to see the full chain</span></div>
  ${gs.slice(0,6).map(g=>{const th=seedThread(g.id);const last=th[th.length-1];return `<div class="lrow" style="cursor:pointer" onclick="openDrawer(guardianThread('${g.id}'))">${avatar(g.name)}<div style="flex:1;min-width:0"><div style="font-weight:600;color:var(--slate-900);font-size:13.5px">${g.name}</div><div class="muted" style="font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${last.text}</div></div><span class="muted" style="font-size:11px">${last.time}</span></div>`}).join('')}
  </div>`}
function guardianThread(gid){const g=buildGuardians().find(x=>x.id===gid);if(!g)return '';const th=seedThread(gid);
 return `<div class="dh"><span class="avatar" style="width:40px;height:40px">${initials(g.name)}</span><div style="flex:1"><h3 style="font-size:15px">${g.name}</h3><div class="muted" style="font-size:12px">${g.id} - ${g.relation}</div></div><button class="iconbtn" onclick="closeDrawer()"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button></div>
 <div class="db" id="threadBody" style="display:flex;flex-direction:column;gap:10px">
  ${th.map(m=>`<div style="align-self:${m.dir==='out'?'flex-end':'flex-start'};max-width:80%"><div style="background:${m.dir==='out'?'var(--brand-soft)':'var(--surface-2)'};border:1px solid ${m.dir==='out'?'var(--brand-line)':'var(--line)'};border-radius:14px;padding:9px 13px"><div style="font-size:13px;color:var(--slate-800)">${m.text}</div></div><div class="muted" style="font-size:10.5px;margin-top:3px;text-align:${m.dir==='out'?'right':'left'}">${m.from} - ${m.time}</div></div>`).join('')}
 </div>
 <div class="df" style="gap:8px"><input id="threadReply" placeholder="Type a reply..." style="flex:1;height:40px;border:1px solid var(--line);border-radius:10px;padding:0 12px"><button class="btn primary" onclick="sendThreadReply('${gid}')">${ic('comm',15)} Send</button></div>`}
window.sendThreadReply=function(gid){const input=document.getElementById('threadReply');const text=(input&&input.value||'').trim();if(!text){toast('Type a message first');return}
 seedThread(gid).push({dir:'out',from:'You - '+state.role,text,time:'Just now'});logAudit('Replied to guardian thread - '+gid,'Communication');openDrawer(guardianThread(gid));toast('Message sent')};
let MEETINGS=[
 {id:'PTM-001',time:'09:00',date:'18 Jun',parent:'Khalid Al Hashimi',student:'Fatima Al Hashimi - Gr 10',teacher:'Rohan Mehta',status:'Confirmed',link:'https://meet.alnoor.ae/ptm-001',room:'Room 12'},
 {id:'PTM-002',time:'09:20',date:'18 Jun',parent:'Imran Rahman',student:'Yusuf Rahman - Gr 10',teacher:'Rohan Mehta',status:'Confirmed',link:'https://meet.alnoor.ae/ptm-002',room:'Room 12'},
 {id:'PTM-003',time:'09:40',date:'18 Jun',parent:'Salim Noor',student:'Aisha Noor - Gr 9',teacher:'Sana Iqbal',status:'Pending',link:'https://meet.alnoor.ae/ptm-003',room:'Room 14'},
 {id:'PTM-004',time:'10:00',date:'18 Jun',parent:'Tariq Siddiqui',student:'Omar Siddiqui - Gr 11',teacher:'Grace Williams',status:'Confirmed',link:'https://meet.alnoor.ae/ptm-004',room:'Room 9'},
 {id:'PTM-005',time:'10:20',date:'18 Jun',parent:null,student:null,teacher:'Rohan Mehta',status:'Available',link:null,room:'Room 12'},
 {id:'PTM-006',time:'10:40',date:'18 Jun',parent:null,student:null,teacher:'Rohan Mehta',status:'Available',link:null,room:'Room 12'},
 {id:'PTM-007',time:'11:00',date:'18 Jun',parent:null,student:null,teacher:'Sana Iqbal',status:'Available',link:null,room:'Room 14'},
];
function meetingsToday(){return MEETINGS.filter(m=>m.date==='18 Jun')}
function meetingSlotDetail(id){const m=MEETINGS.find(x=>x.id===id);if(!m)return '';
 if(m.status==='Available'){return detailDrawer({title:'Available slot',sub:m.time+' - '+m.date+' - '+m.teacher,color:'#17A24A',badge:ic('cal',18),
  sections:[{h:'Slot',rows:[['Teacher',m.teacher],['Room',m.room],['Time',m.time+' - '+m.date],['Duration','20 minutes']]}],
  footer:[['Book this slot',"bookMeetingForm('"+id+"')",true]]})}
 return detailDrawer({title:m.parent+' - '+m.student,sub:m.time+' - '+m.date+' with '+m.teacher,color:m.status==='Confirmed'?'#17A24A':'#E2920C',badge:ic('cal',18),
  stats:[['Status',m.status,m.status==='Confirmed'?'green':'amber'],['Room',m.room,'blue'],['Time',m.time,'gray']],
  sections:[{h:'Details',rows:[['Parent',m.parent],['Student',m.student],['Teacher',m.teacher],['Video link',m.link||'-'],['Room (in-person alt.)',m.room]]}],
  footer:m.status==='Pending'?[['Cancel',"cancelMeeting('"+id+"')"],['Confirm',"confirmMeeting('"+id+"')",true]]:[['Cancel',"cancelMeeting('"+id+"')"],['Reschedule',"rescheduleMeetingForm('"+id+"')"],['Notify participants',"notifyMeeting('"+id+"')",true]]})}
function bookMeetingForm(id){state._meetingSlot=id;const gs=buildGuardians();
 formDrawer('Book this slot','Select the guardian and student attending',[
  {label:'Guardian',key:'guardian',opts:gs.map(g=>g.name+' ('+g.id+')'),req:true},
  {label:'Student',key:'student',opts:STUDENTS.map(s=>s.name+' - '+s.grade),req:true},
  {label:'Note to teacher',key:'note',area:true}
 ],'Book slot','','confirmBooking')}
window.confirmBooking=function(v){const id=state._meetingSlot;const m=MEETINGS.find(x=>x.id===id);if(!m||m.status!=='Available'){toast('Slot no longer available');return false}
 const gname=(v.guardian||'').split(' (')[0].trim();const sname=(v.student||'').split(' - ')[0].trim();
 if(!gname||!sname){toast('Select guardian and student');return false}
 m.parent=gname;m.student=v.student;m.status='Confirmed';m.link='https://meet.alnoor.ae/'+id.toLowerCase();
 logAudit('Booked PTM slot '+id+' - '+gname+' with '+m.teacher,'Communication');closeDrawer();render();toast('Slot booked - confirmation sent to '+gname);return false};
window.confirmMeeting=function(id){const m=MEETINGS.find(x=>x.id===id);if(m)m.status='Confirmed';logAudit('Confirmed PTM '+id,'Communication');closeDrawer();render();toast('Meeting confirmed')};
window.cancelMeeting=function(id){const m=MEETINGS.find(x=>x.id===id);if(!m)return;const who=m.parent;m.status='Available';m.parent=null;m.student=null;m.link=null;
 logAudit('Cancelled PTM '+id+(who?' - notified '+who:''),'Communication');closeDrawer();render();toast(who?'Cancelled - '+who+' notified':'Slot cleared')};
function rescheduleMeetingForm(id){const m=MEETINGS.find(x=>x.id===id);if(!m)return;const avail=MEETINGS.filter(x=>x.status==='Available'&&x.teacher===m.teacher);
 if(!avail.length){toast('No other open slots with '+m.teacher+' - cancel and ask parent to rebook');return}
 state._reschedFrom=id;
 formDrawer('Reschedule meeting',m.parent+' - choose a new slot with '+m.teacher,[
  {label:'New slot',key:'slot',opts:avail.map(a=>a.time+' - '+a.date+' ('+a.id+')'),req:true}
 ],'Reschedule','','doReschedule')}
window.doReschedule=function(v){const oldId=state._reschedFrom;const old=MEETINGS.find(x=>x.id===oldId);if(!old)return false;
 const newIdM=(v.slot||'').match(/\(([^)]+)\)$/);const newSlot=newIdM&&MEETINGS.find(x=>x.id===newIdM[1]);if(!newSlot){toast('Select a slot');return false}
 newSlot.parent=old.parent;newSlot.student=old.student;newSlot.status='Confirmed';newSlot.link='https://meet.alnoor.ae/'+newSlot.id.toLowerCase();
 const who=old.parent;old.status='Available';old.parent=null;old.student=null;old.link=null;
 logAudit('Rescheduled PTM '+oldId+' -> '+newSlot.id+' - notified '+who,'Communication');closeDrawer();render();toast('Rescheduled to '+newSlot.time+' - '+who+' notified');return false};
window.notifyMeeting=function(id){const m=MEETINGS.find(x=>x.id===id);if(!m)return;logAudit('Notified participants - PTM '+id,'Communication');closeDrawer();toast('Reminder sent to '+m.parent+' and '+m.teacher)};
function newMeetingSlotForm(){formDrawer('Draft a new slot','Creates an open slot parents can book',[
 {label:'Teacher',key:'teacher',opts:[...new Set(STAFF.filter(s=>s.type==='Teaching').map(s=>s.name))],req:true,half:true},
 {label:'Time',key:'time',type:'time',half:true},{label:'Date',key:'date',ph:'e.g. 18 Jun',half:true},{label:'Room',key:'room',ph:'e.g. Room 12',half:true}
 ],'Save as draft (open slot)','','saveMeetingSlot')}
window.saveMeetingSlot=function(v){const teacher=v.teacher||STAFF.find(s=>s.type==='Teaching').name;
 const id='PTM-'+String(100+MEETINGS.length);
 MEETINGS.push({id,time:v.time||'12:00',date:v.date||'18 Jun',parent:null,student:null,teacher,status:'Available',link:null,room:v.room||'TBC'});
 logAudit('Drafted new PTM slot '+id+' - '+teacher,'Communication');closeDrawer();render();toast('Slot saved - open for booking')};
function parentMeetings(){const today=meetingsToday();const avail=today.filter(m=>m.status==='Available').length;
 return `<div class="card pad"><div class="flex ac jb" style="margin-bottom:10px;flex-wrap:wrap;gap:8px"><h3 style="font-size:15px">Parent-teacher meetings · 18 June</h3><div class="flex ac" style="gap:8px"><span class="badge b-green"><span class="bd"></span>${avail} open</span><button class="btn sm" onclick="newMeetingSlotForm()">${ic('plus',14)} New slot</button></div></div>
  <div class="muted" style="font-size:11.5px;margin-bottom:10px">Click any slot for details. Booked slots show the parent & student; open slots can be booked directly.</div>
  <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Time</th><th>Parent</th><th>Student</th><th>Teacher</th><th>Room</th><th>Status</th></tr></thead><tbody>
  ${today.map(m=>`<tr style="cursor:pointer" onclick="openDrawer(meetingSlotDetail('${m.id}'))"><td class="num" style="font-weight:600">${m.time}</td><td>${m.parent||'<span class="muted">-</span>'}</td><td>${m.student||'<span class="muted">-</span>'}</td><td>${m.teacher}</td><td class="muted">${m.room}</td><td>${chip(m.status,m.status==='Confirmed'?'green':m.status==='Pending'?'amber':'blue')}</td></tr>`).join('')}
  </tbody></table></div></div>`}

