/* ---- Hostel (Boarding Management) ---- */
M.hostel=()=>{const tab=getSubTab('host-v','overview');
  const totalBeds=HOSTEL.reduce((a,h)=>a+h.beds,0),filled=HOSTEL.reduce((a,h)=>a+h.filled,0);
  const occ=Math.round(filled/totalBeds*100);
  const onLeave=HLEAVE.filter(l=>l.status==='Out'||l.status==='Approved').length;
  const openReq=HMAINT.filter(m=>m.status!=='Resolved').length+HLEAVE.filter(l=>l.status==='Requested').length;
  return `
  <div class="page-head"><div class="ph-l"><h2>Hostel</h2><p>Boarding houses, room allocation, roll-call, leave and welfare across ${HOSTEL.length} blocks · ${filled} boarders.</p></div>
  <div class="ph-r"><button class="btn" onclick="setSubTab('host-v','rollcall')">${ic('att',16)} Roll-call</button><button class="btn primary" onclick="allocateForm()">${ic('plus',16)} Allocate room</button></div></div>
  <div class="grid cols-4" style="margin-bottom:18px">
    ${kpi('hostel','#17A24A','Total beds',String(totalBeds),null)}${kpi('students','#2563EB','Occupancy',occ+'%',{dir:'up',v:(totalBeds-filled)+' vacant',note:''})}
    ${kpi('cal','#B45309','On leave',String(onLeave),null)}${kpi('helpdesk','#E11D2A','Open requests',String(openReq),null)}</div>
  ${subTabs('host-v',[['overview','Overview','hostel'],['rooms','Rooms & blocks','settings'],['boarders','Boarders','students'],['rollcall','Roll-call','att'],['leave','Leave & gate pass','cal'],['maint','Maintenance','helpdesk']])}
  ${tab==='rooms'?hostelRooms():tab==='boarders'?hostelBoarders():tab==='rollcall'?hostelRoll():tab==='leave'?hostelLeave():tab==='maint'?hostelMaint():hostelOverview()}`};

function hostelActivity(){return [
 {t:'Sara Abdullah signed out — Weekend leave',sub:'Oryx Block · approved by Ms. Farah',time:'2h ago',c:'amber',k:'cal'},
 {t:'Roll-call completed — Falcon Block',sub:'108 accounted · 1 on approved leave',time:'Tonight 21:00',c:'green',k:'att'},
 {t:'Maintenance logged — AC not cooling (FB-203)',sub:'High priority · assigned to facilities',time:'13 Jun',c:'red',k:'helpdesk'},
 {t:'New boarder allocated — Room OB-204',sub:'Nadia Karim · Grade 8',time:'12 Jun',c:'blue',k:'students'}];}
function hostelOverview(){const present=BOARDERS.filter(b=>b.roll==='Present').length,onL=BOARDERS.filter(b=>b.roll==='On leave').length;
 return `<div class="grid cols-2" style="margin-bottom:18px">
  ${HOSTEL.map(h=>{const pct=Math.round(h.filled/h.beds*100);return `<div class="card pad hoverable" onclick="setSubTab('host-v','rooms')"><div class="flex ac jb"><div><div style="font-weight:600;color:var(--slate-900);font-size:15px">${h.block}</div><div class="muted" style="font-size:12px;margin-top:2px">${h.rooms} rooms · ${h.floors} floors</div></div>${chip(pct+'% full',h.c)}</div>
   <div class="flex ac jb" style="margin:14px 0 6px"><span class="muted" style="font-size:12px">Beds occupied</span><span class="num" style="font-weight:600;color:var(--slate-900);font-size:12.5px">${h.filled}/${h.beds}</span></div>
   ${cbar(pct,h.c)}
   <div class="flex ac" style="gap:22px;margin-top:14px;padding-top:13px;border-top:1px solid var(--line-soft)"><div><div class="muted" style="font-size:11px">Warden</div><div style="font-size:12.5px;font-weight:600;color:var(--slate-800);margin-top:1px">${h.warden}</div></div><div><div class="muted" style="font-size:11px">Assistant</div><div style="font-size:12.5px;font-weight:600;color:var(--slate-800);margin-top:1px">${h.assist}</div></div></div></div>`}).join('')}
  </div>
  <div class="grid cols-4" style="margin-bottom:18px">${miniStat('Present tonight',String(present),'green')}${miniStat('On approved leave',String(onL),'amber')}${miniStat('Curfew compliance','98%','green')}${miniStat('Wardens on duty','4','blue')}</div>
  <div class="card pad"><div class="sec-head" style="margin-bottom:6px"><h3 style="font-size:15px">Recent activity</h3></div>
  <div>${hostelActivity().map(a=>`<div class="flex ac" style="gap:12px;padding:11px 2px;border-bottom:1px solid var(--line-soft)"><span class="avatar" style="width:30px;height:30px;font-size:11px;background:${CVAR[a.c]}1a;color:${CVAR[a.c]}">${ic(a.k,14)}</span><div style="flex:1"><div style="font-size:13px;color:var(--slate-800)">${a.t}</div><div class="muted" style="font-size:11.5px">${a.sub}</div></div><span class="muted num" style="font-size:11.5px">${a.time}</span></div>`).join('')}</div></div>`}

function hostelRooms(){const f=getFilter('host-rooms','All');const rooms=HROOMS.filter(r=>f==='All'||r.block===f);
 return `<div class="card pad"><div class="flex ac jb" style="margin-bottom:12px"><h3 style="font-size:15px">Rooms &amp; blocks</h3>${segBtns('host-rooms',['All','Falcon Block (Boys)','Oryx Block (Girls)'],'All')}</div>
 <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Room</th><th>Block</th><th>Floor</th><th>Type</th><th style="width:150px">Occupancy</th><th>Occupants</th><th>Status</th></tr></thead><tbody>
 ${rooms.map(r=>{const pct=Math.round(r.occ.length/r.cap*100);const st=r.status==='Full'?'blue':r.status==='Maintenance'?'red':'green';return `<tr style="cursor:pointer" onclick="openDrawer(roomDetail('${r.no}'))"><td class="num" style="font-weight:600;color:var(--slate-900)">${r.no}</td><td>${r.block.replace(/ \(.*/,'')}</td><td class="num">Floor ${r.floor}</td><td>${r.type}</td><td><div class="flex ac" style="gap:8px">${cbar(pct,r.status==='Maintenance'?'red':pct>=100?'blue':'green')}<span class="num muted" style="font-size:11px">${r.occ.length}/${r.cap}</span></div></td><td class="muted" style="font-size:12px">${r.occ.slice(0,2).join(', ')||'—'}${r.occ.length>2?' +'+(r.occ.length-2):''}</td><td>${chip(r.status,st)}</td></tr>`}).join('')}
 </tbody></table></div></div>`}

function hostelBoarders(){const f=getFilter('host-board','All');const list=BOARDERS.filter(b=>f==='All'||b.block===f);
 return `<div class="card pad"><div class="flex ac jb" style="margin-bottom:12px"><h3 style="font-size:15px">Boarder roster</h3>${segBtns('host-board',['All','Falcon Block (Boys)','Oryx Block (Girls)'],'All')}</div>
 <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Boarder</th><th>Grade</th><th>Room</th><th>Guardian</th><th>Contact</th><th>Medical</th><th>Fee</th></tr></thead><tbody>
 ${list.map(b=>`<tr style="cursor:pointer" onclick="openDrawer(boarderDetail('${b.id}'))"><td>${cellUser(b.name,b.id)}</td><td>${b.grade}</td><td class="num">${b.room}</td><td>${b.guardian}</td><td class="num muted">${b.phone}</td><td>${b.medical==='—'?'<span class="muted">—</span>':chip(b.medical.split('—')[0].trim(),'amber')}</td><td>${chip(b.fee,b.fee==='Paid'?'green':'amber')}</td></tr>`).join('')}
 </tbody></table></div></div>`}

function hostelRoll(){const present=BOARDERS.filter(b=>b.roll==='Present').length,leave=BOARDERS.filter(b=>b.roll==='On leave').length,late=BOARDERS.filter(b=>b.roll==='Late').length,absent=BOARDERS.filter(b=>b.roll==='Absent').length;
 return `<div class="grid cols-4" style="margin-bottom:18px">${miniStat('Present',String(present),'green')}${miniStat('On leave',String(leave),'amber')}${miniStat('Late return',String(late),late?'amber':'green')}${miniStat('Unaccounted',String(absent),absent?'red':'green')}</div>
 <div class="card pad"><div class="flex ac jb" style="margin-bottom:12px"><div><h3 style="font-size:15px">Nightly roll-call</h3><div class="muted" style="font-size:12px;margin-top:2px">Tap a status to update · curfew 21:00</div></div><button class="btn sm primary" onclick="markAllRoll()">${ic('att',14)} Mark all present</button></div>
 <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Boarder</th><th>Room</th><th>Grade</th><th>Curfew check-in</th><th>Status</th></tr></thead><tbody>
 ${BOARDERS.map((b,i)=>{const c=b.roll==='Present'?'green':b.roll==='On leave'?'blue':b.roll==='Late'?'amber':'red';const times=['20:41','20:55','19:30','20:12','20:38','19:58','20:20','20:45','21:05','20:33'];const time=b.roll==='Present'?times[i%10]:b.roll==='Late'?'21:24':'—';return `<tr><td>${cellUser(b.name,b.id)}</td><td class="num">${b.room}</td><td>${b.grade}</td><td class="num" style="${b.roll==='Late'?'color:var(--amber);font-weight:600':'color:var(--slate-400)'}">${time}</td><td><span role="button" tabindex="0" style="cursor:pointer" onclick="cycleRoll('${b.id}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();cycleRoll('${b.id}')}" aria-label="Change roll-call status for ${b.name}">${chip(b.roll,c)}</span></td></tr>`}).join('')}
 </tbody></table></div></div>`}

function hostelLeave(){const f=getFilter('host-leave','All');const list=HLEAVE.filter(l=>f==='All'||l.status===f);
 return `<div class="card pad"><div class="flex ac jb" style="margin-bottom:12px"><h3 style="font-size:15px">Leave &amp; gate pass</h3><div class="flex ac" style="gap:10px">${segBtns('host-leave',['All','Requested','Approved','Out','Returned'],'All')}<button class="btn sm primary" onclick="leaveForm()">${ic('plus',14)} New request</button></div></div>
 <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Boarder</th><th>Room</th><th>Type</th><th>From</th><th>To</th><th>Reason</th><th>Status</th><th></th></tr></thead><tbody>
 ${list.map(l=>{const c=l.status==='Approved'?'blue':l.status==='Out'?'amber':l.status==='Returned'?'green':'gray';return `<tr style="cursor:pointer" onclick="openDrawer(leaveDetail('${l.id}'))"><td>${cellUser(l.name,l.id)}</td><td class="num">${l.room}</td><td>${l.type}</td><td class="num">${l.from}</td><td class="num">${l.to}</td><td class="muted" style="font-size:12px">${l.reason}</td><td>${chip(l.status,c)}</td><td class="right" onclick="event.stopPropagation()">${l.status==='Requested'?`<button class="btn sm primary" onclick="approveLeave('${l.id}')">Approve</button>`:l.status==='Out'?`<button class="btn sm" onclick="returnLeave('${l.id}')">Mark returned</button>`:''}</td></tr>`}).join('')}
 </tbody></table></div></div>`}

function hostelMaint(){const f=getFilter('host-maint','All');const list=HMAINT.filter(m=>f==='All'||m.status===f);
 return `<div class="card pad"><div class="flex ac jb" style="margin-bottom:12px"><h3 style="font-size:15px">Maintenance requests</h3><div class="flex ac" style="gap:10px">${segBtns('host-maint',['All','Open','In progress','Resolved'],'All')}<button class="btn sm primary" onclick="maintForm()">${ic('plus',14)} Log request</button></div></div>
 <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Ref</th><th>Room</th><th>Issue</th><th>Category</th><th>Priority</th><th>Status</th><th></th></tr></thead><tbody>
 ${list.map(m=>{const pc=m.prio==='High'?'red':m.prio==='Medium'?'amber':'gray';const sc=m.status==='Resolved'?'green':m.status==='In progress'?'amber':'red';return `<tr><td class="num" style="font-weight:600;color:var(--slate-900)">${m.id}</td><td class="num">${m.room}</td><td>${m.issue}</td><td>${m.cat}</td><td>${chip(m.prio,pc)}</td><td>${chip(m.status,sc)}</td><td class="right">${m.status!=='Resolved'?`<button class="btn sm" onclick="resolveMaint('${m.id}')">Resolve</button>`:''}</td></tr>`}).join('')}
 </tbody></table></div></div>`}

function roomDetail(no){const r=HROOMS.find(x=>x.no===no);const pct=Math.round(r.occ.length/r.cap*100);const vac=r.cap-r.occ.length;
 return detailDrawer({title:'Room '+r.no,sub:r.block+' · Floor '+r.floor,color:r.status==='Maintenance'?'#E11D2A':'#2563EB',badge:ic('hostel',18),
  stats:[['Type',r.type,'blue'],['Occupancy',r.occ.length+'/'+r.cap,pct>=100?'blue':'green'],['Status',r.status,r.status==='Maintenance'?'red':r.status==='Full'?'blue':'green'],['Vacant',String(vac),vac?'green':'gray']],
  sections:[{h:'Occupants',html:r.occ.length?`<div class="card pad" style="box-shadow:none">${r.occ.map(n=>`<div class="flex ac" style="gap:10px;padding:7px 0">${avatar(n)}<span style="font-size:13px;color:var(--slate-800)">${n}</span></div>`).join('')}</div>`:'<div class="muted" style="font-size:13px">No occupants — room available.</div>'}],
  footer:vac>0&&r.status!=='Maintenance'?[['Allocate to this room','allocateForm(\''+r.no+'\')',true]]:[[ic('helpdesk',15)+' Log maintenance','maintForm(\''+r.no+'\')',true]]})}

function boarderDetail(id){const b=BOARDERS.find(x=>x.id===id);const rc=b.roll==='Present'?'green':b.roll==='On leave'?'blue':b.roll==='Late'?'amber':'red';
 return detailDrawer({title:b.name,sub:b.id+' · '+b.grade,color:avc(b.name),
  stats:[['Room',b.room,'blue'],['Block',b.block.replace(/ \(.*/,''),'green'],['Fee',b.fee,b.fee==='Paid'?'green':'amber'],['Roll-call',b.roll,rc]],
  sections:[{h:'Guardian & contact',rows:[['Guardian',b.guardian],['Phone',b.phone],['Medical',b.medical]]},{h:'Boarding',rows:[['Boarding since',b.joined],['Curfew','21:00']]}],
  footer:[[ic('comm',16)+' Message guardian',"const gg=buildGuardians().find(g=>g.children.some(cid=>{const st=STUDENTS.find(s=>s.id===cid);return st&&st.name==='"+b.name.replace(/'/g,"\\'")+"'}));if(gg)openDrawer(guardianThread(gg.id));else toast('No guardian on file for "+b.name.replace(/'/g,"")+"')"],['View leave','setSubTab(\'host-v\',\'leave\');closeDrawer()',true]]})}

function leaveDetail(id){const l=HLEAVE.find(x=>x.id===id);const c=l.status==='Approved'?'#2563EB':l.status==='Out'?'#E2920C':l.status==='Returned'?'#17A24A':'#64748B';
 return detailDrawer({title:l.name,sub:l.id+' · '+l.type,color:c,badge:ic('cal',18),
  stats:[['Type',l.type,'blue'],['From',l.from,'amber'],['To',l.to,'amber'],['Status',l.status,l.status==='Returned'?'green':l.status==='Out'?'amber':'blue']],
  sections:[{h:'Details',rows:[['Room',l.room],['Reason',l.reason],['Approved by',l.by]]}],
  footer:l.status==='Requested'?[['Reject','rejectLeave(\''+l.id+'\')'],['Approve','approveLeave(\''+l.id+'\')',true]]:l.status==='Out'?[['Mark returned','returnLeave(\''+l.id+'\')',true]]:[['Close','closeDrawer()',true]]})}

function allocateForm(room){formDrawer('Allocate room','Assign a boarder to a room',[{section:'Boarder'},{label:'Student name',key:'name',req:true,opts:STUDENTS.map(s=>s.name+' - '+s.grade)},{section:'Placement'},{label:'Block',key:'block',opts:['Falcon Block (Boys)','Oryx Block (Girls)']},{label:'Room',key:'room',val:room||'',ph:'e.g. FB-102'},{label:'Guardian',key:'guardian',half:true},{label:'Contact',key:'phone',half:true}],'Allocate','','allocateRoom')}
window.allocateRoom=function(v){const pick=(v.name||'').trim();if(!pick){toast('Student name is required');return false}
 const name=pick.split(' - ')[0].trim();const st=STUDENTS.find(s=>s.name===name);const grade=st?st.grade:'—';
 const block=v.block||'Falcon Block (Boys)';const blk=HOSTEL.find(h=>h.block===block);if(blk&&blk.filled<blk.beds)blk.filled++;const room=(v.room||'').trim();const r=HROOMS.find(x=>x.no.toUpperCase()===room.toUpperCase());if(r&&r.occ.length<r.cap){r.occ.push(name);if(r.occ.length>=r.cap)r.status='Full'}BOARDERS.push({name,id:nextNum(BOARDERS,'ANS'),grade:v.grade||grade,room:(r?r.no:room)||(blk?blk.code+'-NEW':'—'),block,guardian:v.guardian||'—',phone:v.phone||'—',fee:'Paid',medical:'—',joined:'Today',roll:'Present'});closeDrawer();render();toast(name+' allocated · '+block);return false};
function leaveForm(){formDrawer('New leave request','Gate pass / boarder leave',[{label:'Boarder name',key:'name',req:true,opts:BOARDERS.map(b=>b.name+' - '+b.room)},{label:'Room',key:'room',half:true},{label:'Type',key:'type',half:true,opts:['Weekend leave','Day-out','Home leave','Medical']},{label:'From',key:'from',type:'date',half:true},{label:'To',key:'to',type:'date',half:true},{label:'Reason',key:'reason',area:true,aiContext:'general',maxlen:300}],'Submit request','','addHostelLeave')}
window.addHostelLeave=function(v){const pick=(v.name||'').trim();if(!pick){toast('Boarder name is required');return false}
 const name=pick.split(' - ')[0].trim();const b=BOARDERS.find(x=>x.name===name);const room=v.room||(b?b.room:'—');
 HLEAVE.unshift({id:nextNum(HLEAVE,'GP'),name,room,type:v.type||'Weekend leave',from:v.from||'Today',to:v.to||'Today',reason:v.reason||'—',status:'Requested',by:'—'});closeDrawer();render();toast('Leave request submitted for '+name);return false};
window.approveLeave=function(id){const l=HLEAVE.find(x=>x.id===id);if(l){l.status='Approved';l.by='Warden';logAudit('Approved gate pass · '+id,'Hostel')}closeDrawer();render();toast('Leave approved · '+id)};
window.rejectLeave=function(id){const i=HLEAVE.findIndex(x=>x.id===id);if(i>=0)HLEAVE.splice(i,1);closeDrawer();render();toast('Leave request rejected')};
window.returnLeave=function(id){const l=HLEAVE.find(x=>x.id===id);if(l){l.status='Returned';const b=BOARDERS.find(x=>x.name===l.name);if(b)b.roll='Present'}closeDrawer();render();toast('Marked returned · '+id)};
function maintForm(room){formDrawer('Log maintenance','Hostel maintenance request',[{label:'Room',key:'room',req:true,val:room||'',ph:'e.g. FB-203'},{label:'Issue',key:'issue',req:true},{label:'Category',key:'cat',half:true,opts:['HVAC','Plumbing','Electrical','Furniture','Cleaning','Other']},{label:'Priority',key:'prio',half:true,opts:['High','Medium','Low']}],'Log request','','addMaint')}
window.addMaint=function(v){const room=(v.room||'').trim(),issue=(v.issue||'').trim();if(!room||!issue){toast('Room and issue are required');return false}HMAINT.unshift({id:nextNum(HMAINT,'HM'),room,issue,cat:v.cat||'Other',prio:v.prio||'Medium',by:'Warden',status:'Open',date:'Today'});closeDrawer();render();toast('Maintenance logged · '+room);return false};
window.resolveMaint=function(id){const m=HMAINT.find(x=>x.id===id);if(m){m.status='Resolved';logAudit('Resolved maintenance · '+id,'Hostel')}render();toast('Marked resolved · '+id)};
window.cycleRoll=function(id){const b=BOARDERS.find(x=>x.id===id);if(!b)return;const order=['Present','Late','On leave','Absent'];b.roll=order[(order.indexOf(b.roll)+1)%order.length];render()};
window.markAllRoll=function(){BOARDERS.forEach(b=>{if(b.roll!=='On leave')b.roll='Present'});render();toast('Roll-call marked — all present')};


