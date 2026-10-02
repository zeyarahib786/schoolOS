/* ---- Admissions ---- */
M.admissions=()=>{const view=state.admView||'board';const f=state.admF||(state.admF={q:'',grade:'',source:''});
  const enrolled=ADMISSIONS.filter(a=>a.stage==='Enrolled').length;const conv=ADMISSIONS.length?Math.round(enrolled/ADMISSIONS.length*100):0;
  const grades=[...new Set(ADMISSIONS.map(a=>a.grade))];const sources=[...new Set(ADMISSIONS.map(a=>a.src))];
  return `<div class="page-head"><div class="ph-l"><h2>Admissions</h2><p>${ADMISSIONS.length} applications across the ${STAGES.length}-stage pipeline for the 2025–26 intake. Drag a card to move stages, or click to manage documents.</p></div>
  <div class="ph-r"><button class="btn" onclick="exportCSV('admissions-pipeline.csv',['Applicant','Grade','Stage','Source','Guardian','Enquiry'],ADMISSIONS.map(a=>[a.name,a.grade,a.stage,a.src,a.guardian||'-',a.date]))">${ic('download',16)} Export</button><button class="btn primary" onclick="admissionApplyForm()">${ic('plus',16)} New application</button></div></div>
  <div class="grid cols-4" style="margin-bottom:16px">
    ${kpi('admiss','#2563EB','Total applications',String(ADMISSIONS.length),{dir:'up',v:'this intake',note:''},"admFocus('all')",f.focus==='all')}
    ${kpi('att','#E2920C','In pipeline',String(ADMISSIONS.filter(a=>a.stage!=='Enrolled').length),null,"admFocus('pipeline')",f.focus==='pipeline')}
    ${kpi('cert','#0E7C39','Offers out',String(ADMISSIONS.filter(a=>a.stage==='Offer').length),null,"admFocus('Offer')",f.focus==='Offer')}
    ${kpi('reports','#17A24A','Conversion',conv+'%',{dir:'up',v:enrolled+' enrolled',note:''},"admFocus('Enrolled')",f.focus==='Enrolled')}</div>
  ${admFunnel()}
  ${f.focus&&f.focus!=='all'?`<div class="flex ac" style="gap:10px;margin-bottom:12px"><span class="muted" style="font-size:12.5px">Showing</span><span class="badge b-blue" style="font-size:12px">${f.focus==='pipeline'?'In pipeline':f.focus} · ${filteredAdm().length}</span><span class="muted" style="font-size:12px">${view==='board'?'· highlighted on board':'· filtered in table'}</span><button class="btn sm" onclick="admClearFocus()">Clear ✕</button></div>`:''}
  <div class="card pad" style="margin-bottom:14px"><div class="flex ac" style="gap:10px;flex-wrap:wrap">
    <div class="field" style="flex:1;min-width:200px"><input id="admSearch" value="${f.q}" placeholder="Search applicant, guardian or grade" oninput="admApply()" style="width:100%;height:40px;border:1px solid var(--line);border-radius:10px;padding:0 12px"></div>
    <div class="field sel"><select id="admGrade" onchange="admApply()"><option value="">All grades</option>${grades.map(g=>`<option ${f.grade===g?'selected':''}>${g}</option>`).join('')}</select></div>
    <div class="field sel"><select id="admSource" onchange="admApply()"><option value="">All sources</option>${sources.map(s=>`<option ${f.source===s?'selected':''}>${s}</option>`).join('')}</select></div>
    <div class="seg" style="margin-left:auto"><button class="${view==='board'?'on':''}" onclick="setAdmView('board')">${ic('classes',14)} Board</button><button class="${view==='table'?'on':''}" onclick="setAdmView('table')">${ic('students',14)} Table</button></div>
  </div></div>
  <div id="admBody">${view==='table'?admTable(filteredAdm()):admBoard(filteredAdmBase(),f.focus)}</div>
  ${(ADMISSIONS.some(a=>a.stage==='Waitlisted'||a.stage==='Closed'))?`
  <div class="card pad mt"><div class="sec-head" style="margin-bottom:6px"><h3 style="font-size:15px">Waitlist & closed outcomes</h3><span class="muted" style="font-size:12px">Controlled decisions — every record kept for audit, restorable</span></div>
  <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Applicant</th><th>Grade</th><th>Status</th><th>Reason</th><th></th></tr></thead><tbody>
  ${ADMISSIONS.filter(a=>a.stage==='Waitlisted'||a.stage==='Closed').map(a=>`<tr><td>${cellUser(a.name,a.guardian||'')}</td><td>${a.grade}</td><td>${chip(a.stage==='Waitlisted'?'Waitlisted':(a.outcome||'Closed'),a.stage==='Waitlisted'?'amber':'gray')}</td><td class="muted" style="font-size:12px">${a.declineReason||'Capacity review'}</td><td class="right"><button class="btn sm" onclick="restoreAdmission('${a.name}')">Restore</button></td></tr>`).join('')}
  </tbody></table></div></div>`:''}`};
function admStageColor(st){return {Application:'#2563EB',Assessment:'#E2920C',Interview:'#7C3AED',Offer:'#0E7C39',Enrolled:'#17A24A'}[st]||'#64748B'}
function filteredAdmBase(){const f=state.admF||{q:'',grade:'',source:''};const q=(f.q||'').toLowerCase();
  return ADMISSIONS.filter(a=>(!q||a.name.toLowerCase().includes(q)||(a.guardian||'').toLowerCase().includes(q)||a.grade.toLowerCase().includes(q))&&(!f.grade||a.grade===f.grade)&&(!f.source||a.src===f.source))}
function admStageMatch(stage,focus){if(!focus||focus==='all')return true;if(focus==='pipeline')return stage!=='Enrolled';return stage===focus}
function filteredAdm(){const f=state.admF||{};return filteredAdmBase().filter(a=>admStageMatch(a.stage,f.focus))}
function admFocus(v){const f=state.admF||(state.admF={q:'',grade:'',source:''});f.focus=(f.focus===v?'':v);render()}
function admClearFocus(){if(state.admF)state.admF.focus='';render()}
function admApply(){const f=state.admF||(state.admF={});f.q=$('#admSearch')?.value||'';f.grade=$('#admGrade')?.value||'';f.source=$('#admSource')?.value||'';$('#admBody').innerHTML=(state.admView||'board')==='table'?admTable(filteredAdm()):admBoard(filteredAdmBase(),f.focus)}
function setAdmView(v){state.admView=v;render()}
function admCard(a){admInit(a);const done=a.docs.filter(d=>d.done).length;const pct=Math.round(done/a.docs.length*100);
  return `<div class="kcard" draggable="true" ondragstart="admDragStart(event,'${a.name}')" ondragend="admDragEnd(event)" onclick="openDrawer(admissionDetail('${a.name}'))">
    <div style="font-weight:600;color:var(--slate-900);font-size:13.5px">${a.name}</div>
    <div class="kcard-meta"><span class="badge b-blue" style="font-size:10px">${a.grade}</span><span class="muted" style="font-size:11px">${a.src}</span></div>
    <div class="kdocs"><i style="width:${pct}%;background:${pct===100?'var(--brand)':'var(--blue)'}"></i></div>
    <div class="flex ac jb" style="margin-top:6px"><span class="muted" style="font-size:10.5px">${done}/${a.docs.length} docs</span><span class="muted" style="font-size:10.5px">${a.date}</span></div></div>`}
function admBoard(list,focus){const narrowing=focus&&focus!=='all';return `<div class="kboard">${STAGES.map(st=>{const items=list.filter(a=>a.stage===st);const col=admStageColor(st);const match=admStageMatch(st,focus);const cls=narrowing?(match?' hot':' dim'):'';
  return `<div class="kcol${cls}" data-stage="${st}" ondragover="admDragOver(event)" ondragleave="admDragLeave(event)" ondrop="admDrop(event,'${st}')">
    <div class="kcol-h"><span class="lbl"><span class="dot" style="background:${col}"></span>${st}</span><span class="badge ${narrowing&&match?'b-green':'b-gray'}">${items.length}</span></div>
    ${items.map(admCard).join('')||`<div class="kempty">Drop here</div>`}</div>`}).join('')}</div>`}
function admTable(list){return `<div class="card pad"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Applicant</th><th>Grade</th><th>Stage</th><th>Source</th><th style="width:160px">Documents</th><th>Enquiry</th></tr></thead><tbody>
  ${list.map(a=>{admInit(a);const done=a.docs.filter(d=>d.done).length;const pct=Math.round(done/a.docs.length*100);const col=admStageColor(a.stage);
  return `<tr style="cursor:pointer" onclick="openDrawer(admissionDetail('${a.name}'))"><td>${cellUser(a.name,a.guardian||'')}</td><td>${a.grade}</td><td><span class="badge" style="background:${col}1a;color:${col}"><span class="bd" style="background:${col}"></span>${a.stage}</span></td><td>${a.src}</td>
    <td><div class="flex ac" style="gap:8px">${cbar(pct,pct===100?'green':'blue')}<span class="num muted" style="font-size:11px;min-width:34px">${done}/${a.docs.length}</span></div></td><td class="num muted">${a.date}</td></tr>`}).join('')||`<tr><td colspan="6"><div class="empty"><div class="ei">${ic('admiss',26)}</div><h3>No applications match</h3><p>Try a different search, grade or source.</p></div></td></tr>`}
  </tbody></table></div></div>`}
function admFunnel(){const tot=ADMISSIONS.length||1;return `<div class="card pad" style="margin-bottom:14px"><div class="flex ac jb" style="margin-bottom:9px"><span style="font-weight:600;font-size:13px;color:var(--slate-700)">Pipeline funnel</span><span class="muted" style="font-size:11.5px">Live distribution across stages</span></div>
  <div style="display:flex;height:10px;border-radius:6px;overflow:hidden;background:var(--surface-3)">${STAGES.map(st=>{const c=ADMISSIONS.filter(a=>a.stage===st).length;const w=c/tot*100;return w?`<div title="${st}: ${c}" style="width:${w}%;background:${admStageColor(st)}"></div>`:''}).join('')}</div>
  <div class="flex" style="gap:16px;margin-top:9px;flex-wrap:wrap">${STAGES.map(st=>`<span class="flex ac" style="gap:6px;font-size:11.5px;color:var(--slate-500)"><span style="width:9px;height:9px;border-radius:2px;background:${admStageColor(st)}"></span>${st} · ${ADMISSIONS.filter(a=>a.stage===st).length}</span>`).join('')}</div></div>`}
/* drag & drop */
let _admDrag=null;
function admDragStart(e,name){_admDrag=name;e.dataTransfer.effectAllowed='move';try{e.dataTransfer.setData('text/plain',name)}catch(_){}; if(e.currentTarget&&e.currentTarget.classList)e.currentTarget.classList.add('dragging')}
function admDragEnd(e){if(e.currentTarget&&e.currentTarget.classList)e.currentTarget.classList.remove('dragging');document.querySelectorAll('.kcol.drag').forEach(c=>c.classList.remove('drag'))}
function admDragOver(e){e.preventDefault();e.dataTransfer.dropEffect='move';const col=e.currentTarget;if(col&&!col.classList.contains('drag'))col.classList.add('drag')}
function admDragLeave(e){const col=e.currentTarget;if(col&&!col.contains(e.relatedTarget))col.classList.remove('drag')}
function admDrop(e,stage){e.preventDefault();const name=_admDrag||((()=>{try{return e.dataTransfer.getData('text/plain')}catch(_){return null}})());document.querySelectorAll('.kcol.drag').forEach(c=>c.classList.remove('drag'));_admDrag=null;if(name)moveAdmissionTo(name,stage)}
function moveAdmissionTo(name,stage){const a=ADMISSIONS.find(x=>x.name===name);if(!a||a.stage===stage)return;
  if(stage==='Enrolled'){admInit(a);if(!admDocsDone(a)){toast('Complete all documents before enrolling');return}a.stage='Enrolled';const sid=enrollStudent(a);render();toast(a.name+' enrolled · '+sid);return}
  a.stage=stage;render();toast(a.name+' moved to '+stage)}

