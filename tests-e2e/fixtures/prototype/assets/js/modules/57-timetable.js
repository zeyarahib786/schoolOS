/* ---- Timetable ---- */
function ttGridFor(cls){const list=['Grade 10 · A','Grade 11 · C','Grade 9 · B','Grade 8 · A','Grade 5 · A','Grade 3 · B','Grade 1 · A','KG 2 · B','KG 1 · A'];
  let ci=list.indexOf(cls);if(ci<0)ci=hashStr(cls)%list.length;
  const cOff=ci%5;const nb=TT.filter(r=>r[1][0]!=='BREAK');const rOff=nb.length?Math.floor(ci/5)%nb.length:0;let k=0;
  return TT.map(r=>{if(r[1][0]==='BREAK')return r;const src=nb[(k++ +rOff)%nb.length];return [r[0],src[1].map((_,j)=>src[1][(j+cOff)%src[1].length])]});}
const TTCLASSES=['Grade 10 · A','Grade 11 · C','Grade 9 · B','Grade 8 · A','Grade 5 · A','Grade 3 · B','Grade 1 · A','KG 2 · B','KG 1 · A'];
const SUBJTEACH={Mathematics:'Rohan Mehta',English:'Ms. Priya Nair',Physics:'Mr. Omar Hassan',Chemistry:'Dr. Ayesha Khan',Biology:'Ms. Sara Lim','Islamic St.':'Sh. Khalid Al Ameri',Arabic:'Mr. Yousef Nasser',PE:'Coach Daniel Obi',Computer:'Ms. Elena Petrova',Library:'Ms. Fatima Zayed'};
let TTDATA={};
function ttData(cls){if(!TTDATA[cls])TTDATA[cls]={status:'Draft',rows:ttGridFor(cls).map(r=>[r[0],r[1].map(c=>{if(c==='BREAK'||c==='FREE')return c;const p=String(c).split('|');return p[0]+'|'+(SUBJTEACH[p[0]]||'Staff')+'|'+(p[1]||'—')})])};return TTDATA[cls]}
function ttAllData(){TTCLASSES.forEach(c=>ttData(c));return TTDATA}
function ttConflicts(){ttAllData();const seen={};const out=[];
 Object.entries(TTDATA).forEach(([cls,d])=>d.rows.forEach(r=>r[1].forEach((c,di)=>{if(c==='BREAK'||c==='FREE')return;const p=String(c).split('|');const t=(p[1]||'').replace(' (sub)','');const room=p[2]||'—';
  const kt='T|'+t+'|'+di+'|'+r[0];if(t&&t!=='Staff'){if(seen[kt]&&seen[kt]!==cls)out.push({type:'Teacher',who:t,day:di,time:r[0],a:seen[kt],b:cls});else seen[kt]=cls}
  const kr='R|'+room+'|'+di+'|'+r[0];if(room!=='—'){if(seen[kr]&&seen[kr]!==cls)out.push({type:'Room',who:room,day:di,time:r[0],a:seen[kr],b:cls});else seen[kr]=cls}})));
 return out}
M.timetable=()=>{const days=['Mon','Tue','Wed','Thu','Fri'];const cls=state.ttClass||'Grade 10 · A';const d=ttData(cls);const tab=getSubTab('tt-v','grid');
  const conf=ttConflicts();const myConf=conf.filter(c=>c.a===cls||c.b===cls);
  return `<div class="page-head"><div class="ph-l"><h2>Timetable</h2><p>Editable schedules with teacher & room views, conflict checks and a publish workflow. Click any period to edit.</p></div>
  <div class="ph-r"><div class="field sel"><select onchange="state.ttClass=this.value;render()" aria-label="Select class">${TTCLASSES.map(o=>`<option ${o===cls?'selected':''}>${o}</option>`).join('')}</select></div>
  <button class="btn" onclick="const c=state.ttClass||'Grade 10 · A';exportCSV('timetable-'+c.replace(/[^A-Za-z0-9]+/g,'-')+'.csv',['Period','Mon','Tue','Wed','Thu','Fri'],ttData(c).rows.map(r=>[r[0]].concat(r[1].map(x=>String(x).split('|')[0]))))">${ic('download',16)} Export</button>
  <button class="btn primary" onclick="publishTT('${cls}')">${ic('reports',16)} ${d.status==='Published'?'Republish':'Publish'}</button></div></div>
  <div class="grid cols-4" style="margin-bottom:16px">
    ${kpi('tt','#17A24A','Status',d.status,{dir:'flat',v:d.status==='Published'?'live to parents':'not yet visible',note:''})}
    ${kpi('staff','#2563EB','Teachers scheduled',String(ttTeachers().length),null,"setSubTab('tt-v','teacher')",tab==='teacher')}
    ${kpi('settings','#E2920C','Rooms in use',String(ttRooms().length),null,"setSubTab('tt-v','room')",tab==='room')}
    ${kpi('helpdesk','#E11D2A','Conflicts',String(conf.length),conf.length?{dir:'down',v:myConf.length+' in '+cls,note:''}:null,"setSubTab('tt-v','conflicts')",tab==='conflicts')}
  </div>
  ${subTabs('tt-v',[['grid','Class grid','tt'],['teacher','Teacher view','staff'],['room','Room view','settings'],['conflicts','Conflicts','helpdesk']])}
  ${tab==='teacher'?ttTeacherView():tab==='room'?ttRoomView():tab==='conflicts'?ttConflictView():ttClassGrid(cls,days)}`};

function ttClassGrid(cls,days){const d=ttData(cls);
 return `<div class="card pad"><div class="flex ac jb" style="margin-bottom:4px;flex-wrap:wrap;gap:8px"><h3 style="font-size:15px">${cls} · weekly grid</h3><span class="badge ${d.status==='Published'?'b-green':'b-amber'}"><span class="bd"></span>${d.status}</span></div><div class="muted" style="font-size:11.5px;margin-bottom:10px">Live · ${ttNow().label} highlighted as today · ${canWrite()?'click a period to edit · drag one period onto another to swap - conflicts re-check instantly.':'view only - editing requires Teacher or Admin access.'}</div>
 <div style="overflow-x:auto"><div class="tt">
  <div class="h"></div>${days.map((x,i)=>`<div class="h" style="${i===ttNow().di?'color:var(--brand-deep);text-decoration:underline':''}">${x}${i===ttNow().di?' · today':''}</div>`).join('')}
  ${d.rows.map((row,ri)=>`<div class="tm">${row[0]}</div>${row[1].map((cell,di)=>{
    if(cell==='BREAK')return `<div class="cellx" style="background:var(--surface-3);display:grid;place-items:center;color:var(--slate-500);font-weight:600;font-size:11.5px">Break</div>`;
    if(cell==='FREE')return `<div class="cellx free" role="button" tabindex="0" ondragover="event.preventDefault()" ondrop="ttDrop(event,'${cls}',${ri},${di})" onclick="openDrawer(ttPeriodDetail('${cls}',${ri},${di}))" style="display:grid;place-items:center;color:var(--slate-500);font-size:11px;font-weight:600;cursor:pointer">Free</div>`;
    const[s,t,room]=cell.split('|');const c=SUBJCOLOR[s]||'gray';const cv={green:'var(--brand)',blue:'var(--blue)',amber:'var(--amber)',red:'var(--red)',gray:'var(--slate-500)'}[c];
    const isNow=di===ttNow().di&&parseInt(row[0],10)===ttNow().hr;return `<div class="cellx" role="button" tabindex="0" draggable="${canWrite()}" ondragstart="ttDragStart(event,'${cls}',${ri},${di})" ondragover="event.preventDefault()" ondrop="ttDrop(event,'${cls}',${ri},${di})" onclick="openDrawer(ttPeriodDetail('${cls}',${ri},${di}))" onkeydown="if(event.key==='Enter')openDrawer(ttPeriodDetail('${cls}',${ri},${di}))" style="background:${cv}10;border-color:${cv}33;cursor:${canWrite()?'grab':'pointer'};${isNow?'outline:2px solid var(--brand);outline-offset:-2px':''}" aria-label="${s} ${row[0]} ${days[di]}${isNow?' — current period':''}"><div class="s" style="color:${darken(cv,0.4)}">${s}</div><div class="m" style="color:var(--slate-500)">${t.split(' ')[0]} ${t.split(' ')[1]||''} · ${room}</div></div>`}).join('')}`).join('')}
 </div></div>
 <div class="flex ac wrap" style="gap:12px;margin-top:12px;font-size:11.5px;color:var(--slate-600)">${Object.entries(SUBJCOLOR).filter(([k])=>d.rows.some(r=>r[1].some(c=>String(c).split('|')[0]===k))).map(([k,c])=>{const cv={green:'var(--brand)',blue:'var(--blue)',amber:'var(--amber)',red:'var(--red)',gray:'var(--slate-500)'}[c];return `<span class="flex ac" style="gap:5px"><span style="width:10px;height:10px;border-radius:3px;background:${cv};display:inline-block"></span>${k}</span>`}).join('')}</div></div>`}

function ttPeriodDetail(cls,ri,di){const d=ttData(cls);const days=['Mon','Tue','Wed','Thu','Fri'];const cell=d.rows[ri][1][di];const time=d.rows[ri][0];
 if(cell==='FREE')return detailDrawer({title:'Free period',sub:cls+' · '+days[di]+' '+time,color:'#64748B',badge:ic('tt',18),
   sections:[{h:'Slot',rows:[['Class',cls],['Day',days[di]],['Time',time],['Status','Unscheduled']]}],
   footer:[['Close','closeDrawer()'],['Schedule a subject','ttEditForm(\''+cls+'\','+ri+','+di+')',true]]});
 const[s,t,room]=cell.split('|');const isSub=/\(sub\)/.test(t);
 return detailDrawer({title:s,sub:cls+' · '+days[di]+' '+time,color:'#2563EB',badge:ic('tt',18),
   stats:[['Teacher',t.replace(' (sub)',''),isSub?'amber':'blue'],['Room',room,'green'],['Day',days[di],'gray'],['Time',time,'gray']],
   sections:[{h:'Details',rows:[['Subject',s],['Teacher',t],['Room',room],['Linked lesson plan','Unit '+((ri+di)%6+1)+' · see Curriculum'],['Timetable status',d.status]]}],
   footer:[['Assign substitute','assignSub(\''+cls+'\','+ri+','+di+')'],['Edit period','ttEditForm(\''+cls+'\','+ri+','+di+')',true]]})}

function ttEditForm(cls,ri,di){if(!guardWrite('Editing the timetable'))return;state._tt={cls,ri,di};const d=ttData(cls);const cell=d.rows[ri][1][di];const[s,t,room]=(cell==='FREE'?'||':cell).split('|');
 formDrawer('Edit period',cls+' · '+d.rows[ri][0],[
  {label:'Subject',key:'subj',opts:Object.keys(SUBJCOLOR).filter(k=>!/ $/.test(k)),val:s},
  {label:'Teacher',key:'teacher',opts:Object.values(SUBJTEACH).filter((v,i,a)=>a.indexOf(v)===i),val:(t||'').replace(' (sub)','')},
  {label:'Room',key:'room',val:room||'',ph:'e.g. Rm 204 / Lab 1',half:true},
  {label:'Or mark as',key:'clear',opts:['— keep scheduled —','Free period'],half:true},
  {note:'Saving re-runs conflict checks. A teacher or room double-booked in the same period across classes is flagged in the Conflicts tab, and publishing is blocked until resolved.'}
 ],'Save period','','saveTTPeriod')}
window.saveTTPeriod=function(v){if(!guardWrite('Editing the timetable'))return false;const{cls,ri,di}=state._tt||{};const d=ttData(cls);if(!d)return false;
 if(v.clear==='Free period'){d.rows[ri][1][di]='FREE'}
 else{const s=v.subj||'Mathematics';d.rows[ri][1][di]=s+'|'+(v.teacher||SUBJTEACH[s]||'Staff')+'|'+(v.room||'—')}
 d.status='Draft';logAudit('Edited timetable period · '+cls+' '+d.rows[ri][0],'Timetable');
 const conf=ttConflicts().filter(c=>c.a===cls||c.b===cls);closeDrawer();render();
 toast(conf.length?('Saved · '+conf.length+' conflict'+(conf.length>1?'s':'')+' flagged — see Conflicts tab'):'Period saved · no conflicts');return false};
window.assignSub=function(cls,ri,di){if(!guardWrite('Assigning a substitute'))return;const d=ttData(cls);const cell=d.rows[ri][1][di];if(cell==='FREE')return;const[s,t,room]=cell.split('|');
 const pool=Object.values(SUBJTEACH).filter(x=>x!==t.replace(' (sub)',''));const sub=pool[(ri+di)%pool.length];
 d.rows[ri][1][di]=s+'|'+sub+' (sub)|'+room;d.status='Draft';logAudit('Substitute assigned · '+cls+' '+d.rows[ri][0]+' → '+sub,'Timetable');
 closeDrawer();render();toast('Substitute assigned · '+sub)};
function houseLeaderboard(){const houses={Falcon:{c:'blue',pts:0},Oryx:{c:'green',pts:0},Ghaf:{c:'amber',pts:0},Pearl:{c:'red',pts:0}};
 try{BEHAVIOUR.forEach((b,i)=>{const h=Object.keys(houses)[i%4];houses[h].pts+=(parseInt(b.pts,10)||(b.type==='Merit'?5:-2))})}catch(e){Object.keys(houses).forEach((h,i)=>houses[h].pts=[184,171,158,149][i])}
 const rows=Object.entries(houses).sort((a,b)=>b[1].pts-a[1].pts);const max=rows[0][1].pts||1;
 return detailDrawer({title:'House leaderboard',sub:'Term 2 · computed from behaviour ledger',color:'#17A24A',badge:ic('roles',18),
  sections:[{h:'Standings',html:'<div class="card pad" style="box-shadow:none">'+rows.map(([h,v],i)=>'<div style="padding:9px 0"><div class="flex ac jb" style="margin-bottom:5px"><span style="font-weight:700;color:var(--slate-900)">'+(i+1)+'. '+h+' House</span><span class="num" style="font-weight:700;color:var(--brand-deep)">'+v.pts+' pts</span></div>'+cbar(Math.round(v.pts/max*100),v.c)+'</div>').join('')+'</div>'}],
  footer:[['Export standings',"exportCSV('house-leaderboard.csv',['House','Points'],houseLbRows())"],['Close','closeDrawer()',true]]})}
window.houseLbRows=function(){const houses={Falcon:0,Oryx:0,Ghaf:0,Pearl:0};try{BEHAVIOUR.forEach((b,i)=>{houses[Object.keys(houses)[i%4]]+=(parseInt(b.pts,10)||(b.type==='Merit'?5:-2))})}catch(e){}return Object.entries(houses)};
window.downloadICS=function(){try{const pad=n=>String(n).padStart(2,'0');const yr=new Date().getFullYear();
 const mon={Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12};
 const evs=EVENTS.map((e,i)=>{const m=String(e.date||'').match(/(\d+)\s+(\w+)/);const dd=m?pad(m[1]):'15';const mm=m&&mon[m[2]]?pad(mon[m[2]]):'06';
  return 'BEGIN:VEVENT\r\nUID:sos-'+i+'@alnoor.ae\r\nDTSTART;VALUE=DATE:'+yr+mm+dd+'\r\nSUMMARY:'+String(e.title||'School event').replace(/[,;]/g,' ')+'\r\nDESCRIPTION:'+String(e.type||'Event')+' - '+String(e.audience||'All')+'\r\nEND:VEVENT'}).join('\r\n');
 const cal='BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Solvagence SchoolOS//EN\r\nX-WR-CALNAME:Al Noor International\r\n'+evs+'\r\nEND:VCALENDAR';
 const blob=new Blob([cal],{type:'text/calendar'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='alnoor-calendar.ics';document.body.appendChild(a);a.click();setTimeout(()=>{a.remove();URL.revokeObjectURL(url)},150);
 logAudit('Downloaded calendar feed (.ics)','Calendar');toast('Calendar feed downloaded - import into Google/Outlook/Apple Calendar')}catch(e){toast('Calendar feed ready')}};
window.ttDragStart=function(e,cls,ri,di){try{e.dataTransfer.setData('text/plain',cls+'|'+ri+'|'+di);e.dataTransfer.effectAllowed='move'}catch(x){}};
window.ttDrop=function(e,cls,ri,di){e.preventDefault();if(!canWrite())return;let d0;try{d0=(e.dataTransfer.getData('text/plain')||'').split('|')}catch(x){return}
 if(!d0||d0.length<3||d0[0]!==cls)return; const a=ttData(cls);const r1=+d0[1],c1=+d0[2];
 if(a.rows[r1][1][c1]==='BREAK'||a.rows[ri][1][di]==='BREAK')return;
 const tmp=a.rows[r1][1][c1];a.rows[r1][1][c1]=a.rows[ri][1][di];a.rows[ri][1][di]=tmp;
 a.status='Draft';logAudit('Swapped periods (drag) · '+cls+' '+a.rows[r1][0]+' ↔ '+a.rows[ri][0],'Timetable');render();
 const conf=ttConflicts().filter(c=>c.a===cls||c.b===cls);toast(conf.length?('Periods swapped · '+conf.length+' conflict'+(conf.length>1?'s':'')+' flagged'):'Periods swapped · no conflicts')};
function ttNow(){const d=new Date();const day=d.getDay();const di=day>=1&&day<=5?day-1:0;const hr=d.getHours();return{di,hr,label:['Mon','Tue','Wed','Thu','Fri'][di]}}
window.publishTT=function(cls){if(!guardWrite('Publishing the timetable'))return;const d=ttData(cls);const conf=ttConflicts().filter(c=>c.a===cls||c.b===cls);
 if(conf.length){toast('Cannot publish — '+conf.length+' conflict'+(conf.length>1?'s':'')+' involve '+cls+'. Open the Conflicts tab.');setSubTab('tt-v','conflicts');return}
 d.status='Published';logAudit('Published timetable · '+cls,'Timetable');render();toast('Timetable published · '+cls+' — parents & teachers notified')};

function ttTeachers(){ttAllData();const set=new Set();Object.values(TTDATA).forEach(d=>d.rows.forEach(r=>r[1].forEach(c=>{if(c!=='BREAK'&&c!=='FREE')set.add(String(c).split('|')[1].replace(' (sub)',''))})));return[...set].sort()}
function ttRooms(){ttAllData();const set=new Set();Object.values(TTDATA).forEach(d=>d.rows.forEach(r=>r[1].forEach(c=>{if(c!=='BREAK'&&c!=='FREE')set.add(String(c).split('|')[2])})));return[...set].sort()}
function ttSlotsFor(kind,val){const days=['Mon','Tue','Wed','Thu','Fri'];const out=[];ttAllData();
 Object.entries(TTDATA).forEach(([cls,d])=>d.rows.forEach((r,ri)=>r[1].forEach((c,di)=>{if(c==='BREAK'||c==='FREE')return;const[s,t,room]=String(c).split('|');
  if((kind==='T'&&t.replace(' (sub)','')===val)||(kind==='R'&&room===val))out.push({cls,ri,di,day:days[di],time:r[0],subj:s,teacher:t,room})})));
 return out.sort((a,b)=>a.day===b.day?a.time.localeCompare(b.time):0)}
function ttTeacherView(){const list=ttTeachers();const sel=state.ttTeacher&&list.includes(state.ttTeacher)?state.ttTeacher:list[0];const slots=ttSlotsFor('T',sel);const maxDay=Math.max(...['Mon','Tue','Wed','Thu','Fri'].map(d=>slots.filter(s=>s.day===d).length));
 const canEditRoom=canWrite()&&(state.role!=='Teacher'||sel===myTeacherName());
 return `<div class="card pad"><div class="flex ac jb" style="margin-bottom:12px;flex-wrap:wrap;gap:10px"><h3 style="font-size:15px">Teacher workload</h3><div class="flex ac" style="gap:10px"><div class="field sel"><select onchange="state.ttTeacher=this.value;render()" aria-label="Select teacher">${list.map(t=>`<option ${t===sel?'selected':''}>${t}</option>`).join('')}</select></div>${canEditRoom?'':`<span class="badge b-gray"><span class="bd"></span>View only</span>`}</div></div>
 <div class="grid cols-3" style="margin-bottom:14px">${miniStat('Periods / week',String(slots.length),'blue')}${miniStat('Busiest day',maxDay+' periods',maxDay>5?'red':'green')}${miniStat('Load check',maxDay>5?'Over daily max (5)':'Within policy','green')}</div>
 <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Day</th><th>Time</th><th>Class</th><th>Subject</th><th>Room</th>${canEditRoom?'<th></th>':''}</tr></thead><tbody>
 ${slots.map(s=>`<tr><td>${s.day}</td><td class="num">${s.time}</td><td>${s.cls}</td><td style="font-weight:600;color:var(--slate-900)">${s.subj}</td><td class="muted">${s.room}</td>${canEditRoom?`<td class="right"><button class="btn sm" onclick="ttEditRoomForm('${s.cls.replace(/'/g,"\\'")}',${s.ri},${s.di})">Edit room</button></td>`:''}</tr>`).join('')||'<tr><td colspan="'+(canEditRoom?6:5)+'" class="muted">No periods scheduled.</td></tr>'}
 </tbody></table></div></div>`}
function ttEditRoomForm(cls,ri,di){if(!guardWrite('Editing the room'))return;const d=ttData(cls);const cell=d.rows[ri][1][di];if(cell==='BREAK'||cell==='FREE')return;const[subj,teacher,room]=cell.split('|');
 state._ttRoomEdit={cls,ri,di};formDrawer('Edit room',cls+' - '+subj+' - '+d.rows[ri][0],[{label:'Room',key:'room',val:room,req:true}],'Save room','','saveTTRoom')}
window.saveTTRoom=function(v){if(!guardWrite('Editing the room'))return false;const{cls,ri,di}=state._ttRoomEdit||{};const d=ttData(cls);if(!d)return false;
 const cell=d.rows[ri][1][di];const[subj,teacher]=cell.split('|');d.rows[ri][1][di]=subj+'|'+teacher+'|'+(v.room||'-');d.status='Draft';
 logAudit('Changed room - '+cls+' '+d.rows[ri][0]+' -> '+v.room,'Timetable');closeDrawer();render();toast('Room updated - conflicts re-checked');return false};
function ttRoomView(){const list=ttRooms();const sel=state.ttRoom&&list.includes(state.ttRoom)?state.ttRoom:list[0];const slots=ttSlotsFor('R',sel);
 return `<div class="card pad"><div class="flex ac jb" style="margin-bottom:12px;flex-wrap:wrap;gap:10px"><h3 style="font-size:15px">Room utilisation</h3><div class="field sel"><select onchange="state.ttRoom=this.value;render()" aria-label="Select room">${list.map(t=>`<option ${t===sel?'selected':''}>${t}</option>`).join('')}</select></div></div>
 <div class="grid cols-3" style="margin-bottom:14px">${miniStat('Bookings / week',String(slots.length),'blue')}${miniStat('Utilisation',Math.round(slots.length/30*100)+'%','green')}${miniStat('Free slots',String(30-slots.length),'amber')}</div>
 <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Day</th><th>Time</th><th>Class</th><th>Subject</th><th>Teacher</th></tr></thead><tbody>
 ${slots.map(s=>`<tr><td>${s.day}</td><td class="num">${s.time}</td><td>${s.cls}</td><td style="font-weight:600;color:var(--slate-900)">${s.subj}</td><td class="muted">${s.teacher}</td></tr>`).join('')||'<tr><td colspan="5" class="muted">No bookings.</td></tr>'}
 </tbody></table></div></div>`}
function ttConflictView(){const conf=ttConflicts();
 return `<div class="card pad"><div class="sec-head" style="margin-bottom:8px"><h3 style="font-size:15px">Scheduling conflicts</h3><span class="badge ${conf.length?'b-red':'b-green'}"><span class="bd"></span>${conf.length} found</span></div>
 <div class="muted" style="font-size:12.5px;margin-bottom:12px">A conflict means the same teacher or room is booked in two classes at the same day & period. Publishing a class timetable is blocked while it has conflicts — open the class grid, click the period and reassign.</div>
 ${conf.length?`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Type</th><th>Teacher / Room</th><th>Day</th><th>Time</th><th>Class A</th><th>Class B</th><th></th></tr></thead><tbody>
 ${conf.map(c=>`<tr><td>${chip(c.type,c.type==='Teacher'?'red':'amber')}</td><td style="font-weight:600;color:var(--slate-900)">${c.who}</td><td>${['Mon','Tue','Wed','Thu','Fri'][c.day]}</td><td class="num">${c.time}</td><td>${c.a}</td><td>${c.b}</td><td class="right"><button class="btn sm" onclick="state.ttClass='${c.b}';setSubTab('tt-v','grid')">Open ${c.b.split(' · ')[0]}</button></td></tr>`).join('')}
 </tbody></table></div>`:`<div class="empty"><div class="ei">${ic('tt',26)}</div><h3>No conflicts</h3><p>All class timetables are consistent — safe to publish.</p></div>`}</div>`}

