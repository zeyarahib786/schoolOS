/* ---- Classes ---- */
M.classes=()=>`
  <div class="page-head"><div class="ph-l"><h2>Classes & Sections</h2><p>${CLASSES.length} sections shown across the school. Capacity and class-teacher assignments at a glance.</p></div>
  <div class="ph-r"><button class="btn primary" onclick="addSectionForm()">${ic('plus',16)} Add section</button></div></div>
  <div class="card pad" style="margin-bottom:16px"><div class="flex ac" style="gap:10px;flex-wrap:wrap">
    <div class="field" style="flex:1;min-width:200px"><input id="clsSearch" placeholder="Search class or teacher" oninput="filterClasses()" style="width:100%;height:40px;border:1px solid var(--line);border-radius:10px;padding:0 12px"></div>
    <div class="field sel"><select id="clsStream" onchange="filterClasses()"><option value="">All streams</option>${[...new Set(CLASSES.map(c=>c.stream))].map(s=>`<option>${s}</option>`).join('')}</select></div>
    <span class="muted" id="clsCount" style="font-size:12.5px;margin-left:auto">${CLASSES.length} of ${CLASSES.length} shown</span></div></div>
  <div class="grid cols-3" id="clsGrid">${classCards(CLASSES)}</div>`;
function classCards(list){return list.map(c=>`<div class="card pad" style="cursor:pointer" onclick="openDrawer(classDetail('${c.cls}'))"><div class="flex ac jb"><h3 style="font-size:15px">${c.cls}</h3><span class="badge b-blue"><span class="bd"></span>${c.stream}</span></div>
    <div class="muted" style="font-size:12.5px;margin:8px 0 4px">Class teacher</div><div style="font-weight:600;color:var(--slate-900)">${c.teacher}</div>
    <div class="flex ac jb mt-s"><span class="muted" style="font-size:12px">Capacity</span><span class="num" style="font-weight:600;color:var(--slate-900)">${c.filled}/${c.cap}</span></div>
    <div class="bar mt-s"><i style="width:${Math.round(c.filled/c.cap*100)}%;background:${c.filled/c.cap>0.95?'var(--amber)':'var(--brand)'}"></i></div></div>`).join('')||`<div class="empty" style="grid-column:1/-1"><div class="ei">${ic('classes',26)}</div><h3>No classes match</h3></div>`}
function filterClasses(){const q=($('#clsSearch')?.value||'').toLowerCase(),s=$('#clsStream')?.value||'';const rows=CLASSES.filter(c=>(c.cls.toLowerCase().includes(q)||c.teacher.toLowerCase().includes(q))&&(!s||c.stream===s));$('#clsCount').textContent=rows.length+' of '+CLASSES.length+' shown';$('#clsGrid').innerHTML=classCards(rows)}
function classDetail(cls){const c=CLASSES.find(x=>x.cls===cls);const roster=STUDENTS.filter(s=>s.grade===cls).slice(0,6);const fillPct=Math.round(c.filled/c.cap*100);
  return detailDrawer({title:c.cls,sub:c.stream+' stream · '+c.filled+' students',color:'#2563EB',badge:c.cls.split(' ')[0][0]+(c.cls.split('·')[1]||'').trim(),
    stats:[['Students',String(c.filled),'blue'],['Capacity',String(c.cap),'blue'],['Utilisation',fillPct+'%',fillPct>95?'amber':'green'],['Stream',c.stream,'blue']],
    sections:[{h:'Class teacher',rows:[['Lead teacher',c.teacher],['Class representative',c.rep]]},
      {h:'Roster preview',html:roster.length?`<div class="card pad" style="box-shadow:none">${roster.map(s=>`<div class="lrow" style="border:0;padding:6px 0">${cellUser(s.name,'Roll '+s.roll)}</div>`).join('')}</div>`:`<div class="muted" style="font-size:13px;padding:4px 0">Roster loads from the Students module.</div>`}],
    footer:[['View timetable','closeDrawer();state.ttClass=\''+c.cls+'\';go(\'timetable\')'],['Open students','closeDrawer();go(\'students\')',true]]})}
function addSectionForm(){const grades=['KG1','KG2','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','Grade 10','Grade 11','Grade 12'];
 const sections=['A','B','C','D','E','F'];const teachers=STAFF.filter(s=>s.type==='Teaching'&&s.status==='Active').map(s=>s.name);
 formDrawer('Add section','Grade, section and teacher are loaded from existing school data',[
  {label:'Grade',key:'grade',opts:grades,req:true,half:true},{label:'Section',key:'section',opts:sections,req:true,half:true},
  {label:'Stream',key:'stream',opts:['Foundation','Primary','General','Commerce','Science','Arts'],half:true},
  {label:'Class teacher',key:'teacher',opts:teachers,half:true},
  {label:'Capacity',type:'number',key:'cap',ph:'30'}
 ],'Create section','','addClass')}
window.addClass=function(v){const grade=(v.grade||'').trim(),section=(v.section||'').trim();if(!grade||!section){toast('Grade and section are required');return false}
 const cls=grade+' · '+section;if(CLASSES.some(c=>c.cls===cls)){toast(cls+' already exists');return false}
 CLASSES.push({cls,rep:'-',teacher:v.teacher||'Unassigned',filled:0,cap:parseInt(v.cap||30,10)||30,stream:v.stream||'General'});
 logAudit('Created section - '+cls,'Classes');closeDrawer();render();toast('Section created - '+cls);return false};

