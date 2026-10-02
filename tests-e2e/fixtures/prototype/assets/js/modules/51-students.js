/* ---- Students ---- */
M.students=()=>{
  return `
  <div class="page-head"><div class="ph-l"><h2>Students</h2><p>${STUDENTS.length} on the demo roster across ${[...new Set(STUDENTS.map(s=>s.grade.split(' · ')[0]))].length} grades — counts computed live. Click any student for their full profile.</p></div>
    <div class="ph-r"><button class="btn" onclick="exportStudentsCSV()">${ic('download',16)} Export CSV</button>
    <button class="btn primary" onclick="studentAddForm()">${ic('plus',16)} Add student</button></div></div>
  <div class="card pad">
    <div class="toolbar">
      <div class="field search"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg><input id="stuSearch" placeholder="Search by name or ID" oninput="state.stuPage=1;filterStudents()"></div>
      <div class="field sel"><select id="stuGrade" onchange="state.stuPage=1;filterStudents()"><option value="">All grades</option><option>KG 1</option><option>KG 2</option><option>Grade 1</option><option>Grade 2</option><option>Grade 3</option><option>Grade 4</option><option>Grade 5</option><option>Grade 6</option><option>Grade 7</option><option>Grade 8</option><option>Grade 9</option><option>Grade 10</option><option>Grade 11</option><option>Grade 12</option></select></div>
      <div class="field sel"><select id="stuFee" onchange="state.stuPage=1;filterStudents()"><option value="">Any fee status</option><option>Paid</option><option>Due</option><option>Overdue</option></select></div>
      <div style="margin-left:auto;color:var(--slate-500);font-size:12.5px" id="stuCount"></div>
    </div>
    <div class="tbl-wrap"><table class="tbl"><thead><tr>
      <th>Student</th><th>Grade</th><th>Roll</th><th>Guardian</th><th>Attendance</th><th>Fee</th><th>Status</th><th></th>
    </tr></thead><tbody id="stuBody"></tbody></table></div>
    <div id="stuPager" class="flex ac jb" style="margin-top:14px;flex-wrap:wrap;gap:10px"></div>
  </div>`;
};
function filterStudents(){
  const q=($('#stuSearch')?.value||'').toLowerCase(),g=$('#stuGrade')?.value||'',f=$('#stuFee')?.value||'';
  const rows=STUDENTS.filter(s=>(s.name.toLowerCase().includes(q)||s.id.toLowerCase().includes(q))&&(!g||s.grade.split(' · ')[0]===g)&&(!f||s.fee===f));
  const size=state.stuPageSize||25;const pages=Math.max(1,Math.ceil(rows.length/size));if(!state.stuPage||state.stuPage>pages)state.stuPage=1;const pg=state.stuPage;
  const view=rows.slice((pg-1)*size,pg*size);
  $('#stuCount').textContent=rows.length+' of '+STUDENTS.length+' shown';
  $('#stuBody').innerHTML=view.map(s=>`<tr style="cursor:pointer" onclick="openDrawer(studentProfile('${s.id}'))">
    <td>${cellUser(s.name,s.id)}</td><td>${s.grade}</td><td class="num">${s.roll}</td><td>${s.guardian}</td>
    <td><div class="flex ac" style="gap:8px"><div class="bar" style="width:64px"><i style="width:${s.att}%;background:${s.att<85?'var(--red)':s.att<92?'var(--amber)':'var(--brand)'}"></i></div><span class="num" style="font-size:12.5px;font-weight:600">${s.att}%</span></div></td>
    <td>${feeBadge(s.fee)}</td><td>${statusBadge(s.status)}</td>
    <td class="right"><span style="color:var(--slate-400)">${ic('arrow',16)}</span></td></tr>`).join('')
   || `<tr><td colspan="8"><div class="empty"><div class="ei">${ic('students',26)}</div><h3>No students match</h3><p>Try a different name, grade or fee status.</p></div></td></tr>`;
  const pager=$('#stuPager');if(pager){if(rows.length>size){const from=(pg-1)*size+1,to=Math.min(pg*size,rows.length);
    pager.innerHTML=`<span class="muted" style="font-size:12.5px">Showing ${from}–${to} of ${rows.length}</span>
      <div class="flex ac" style="gap:6px"><button class="btn sm" ${pg<=1?'disabled style=opacity:.4':''} onclick="stuGoPage(${pg-1})">Prev</button>
      ${Array.from({length:pages},(_,i)=>i+1).filter(n=>n===1||n===pages||Math.abs(n-pg)<=1).map((n,i,a)=>`${i>0&&n-a[i-1]>1?'<span class=muted style=padding:0-4px>…</span>':''}<button class="btn sm ${n===pg?'primary':''}" onclick="stuGoPage(${n})">${n}</button>`).join('')}
      <button class="btn sm" ${pg>=pages?'disabled style=opacity:.4':''} onclick="stuGoPage(${pg+1})">Next</button></div>`;
  }else pager.innerHTML='';}
}
function stuGoPage(p){state.stuPage=p;filterStudents();document.querySelector('#view').scrollTop=0}
function staffRows(list){return list.map(s=>`<tr style="cursor:pointer" onclick="openDrawer(staffProfile('${s.id}'))"><td>${cellUser(s.name,s.id)}</td><td style="font-weight:600;color:var(--slate-900)">${s.role}</td><td>${s.dept}</td><td><span class="badge ${s.type==='Teaching'?'b-blue':'b-gray'}"><span class="bd"></span>${s.type}</span></td><td class="num">${s.phone}</td><td>${statusBadge(s.status)}</td><td class="right"><span style="color:var(--slate-400)">${ic('arrow',16)}</span></td></tr>`).join('')
   || `<tr><td colspan="7"><div class="empty"><div class="ei">${ic('staff',26)}</div><h3>No staff match</h3><p>Try a different name or department.</p></div></td></tr>`}
function filterStaff(){
  const q=($('#stfSearch')?.value||'').toLowerCase(),d=$('#stfDept')?.value||'',st=$('#stfStatus')?.value||'';
  const rows=STAFF.filter(s=>(s.name.toLowerCase().includes(q)||s.id.toLowerCase().includes(q))&&(!d||s.dept===d)&&(!st||s.status===st));
  $('#stfCount').textContent=rows.length+' of '+STAFF.length+' shown';
  $('#stfBody').innerHTML=staffRows(rows);
}
function studentProfile(id){const s=STUDENTS.find(x=>x.id===id);const c=avc(s.name);const tab=state._spTab||'overview';
  const g=buildGuardians().find(x=>x.children.includes(id));
  const tabs=[['overview','Overview'],['guardians','Guardians'],['academics','Academics'],['attendance','Attendance'],['fees','Fees'],['audit','Audit']];
  const tabBar='<div class="seg" style="margin:2px 0 12px;flex-wrap:wrap">'+tabs.map(t=>'<button class="'+(tab===t[0]?'on':'')+'" onclick="state._spTab=\''+t[0]+'\';openDrawer(studentProfile(\''+id+'\'))">'+t[1]+'</button>').join('')+'</div>';
  let body='';
  if(tab==='guardians'){body=g?('<div class="card pad" style="box-shadow:none"><div class="lrow" style="cursor:pointer" onclick="openDrawer(guardianDetail(\''+g.id+'\'))">'+avatar(g.name)+'<div style="flex:1"><div style="font-weight:600;color:var(--slate-900)">'+g.name+'</div><div class="muted" style="font-size:11.5px">'+g.id+' · '+g.relation+' · portal '+g.portal+'</div></div><span class="badge '+(g.custody==='Full'?'b-green':'b-red')+'"><span class="bd"></span>'+(g.custody==='Full'?'Full custody':'Restricted')+'</span></div>'+
    '<div class="lrow" style="border:0"><span class="muted" style="font-size:12px">Pickup '+(g.pickup?'authorised':'NOT authorised')+' · Media consent '+(g.consents.media?'granted':'declined')+' · Emergency priority 1</span></div></div>'):'<div class="muted" style="font-size:13px">No guardian entity linked.</div>';}
  else if(tab==='academics'){body='<div class="card pad" style="box-shadow:none">'+[['Current GPA',s.gpa||'—'],['Grade / section',s.grade],['Roll number',s.roll],['Best subject',['Mathematics','Science','English','Arabic'][s.roll%4]],['Focus area',['Physics','Essay writing','Algebra','Reading'][s.roll%4]],['Term rank','Computed at result publication']].map(r=>'<div class="lrow" style="border-bottom:1px solid var(--line-soft);padding:8px 0"><span style="font-size:12.5px;color:var(--slate-500)">'+r[0]+'</span><b style="margin-left:auto;font-size:13px;color:var(--slate-900)">'+r[1]+'</b></div>').join('')+'</div><div class="muted" style="font-size:11.5px;margin-top:8px">History derives from finalized assessment records — see Exams module.</div>';}
  else if(tab==='attendance'){const a=s.att||0;body='<div class="card pad" style="box-shadow:none"><div class="flex ac jb" style="margin-bottom:6px"><span style="font-size:12.5px;color:var(--slate-500)">Term-to-date attendance</span><b class="num" style="color:'+(a<85?'var(--red)':'var(--brand-deep)')+'">'+a+'%</b></div>'+cbar(a,a<85?'red':'green')+
    '<div class="muted" style="font-size:11.5px;margin-top:10px">'+(a<85?'Below the 85% chronic-absence threshold — flagged in Attendance analytics for follow-up.':'Within policy. Computed from submitted registers, not editable here.')+'</div></div>';}
  else if(tab==='fees'){const inv=INVOICES.filter(i=>i.student===s.name);body='<div class="card pad" style="box-shadow:none">'+(inv.length?inv.map(i=>'<div class="lrow" style="border-bottom:1px solid var(--line-soft);padding:8px 0"><div style="flex:1"><div style="font-size:12.5px;font-weight:600;color:var(--slate-900)">'+i.id+'</div><div class="muted" style="font-size:11px">'+i.term+'</div></div><b class="num" style="margin-right:10px">'+aed(i.amt)+'</b>'+chip(i.status,i.status==='Paid'?'green':i.status==='Overdue'?'red':'amber')+'</div>').join(''):'<div class="lrow" style="border:0"><span class="muted" style="font-size:12.5px">Overall status: </span>'+feeBadge(s.fee)+'</div>')+'</div>';}
  else if(tab==='audit'){const ev=AUDIT.filter(a=>a.action.includes(s.name)).slice(0,6);body='<div class="card pad" style="box-shadow:none;padding:6px 12px">'+(ev.length?ev.map(e=>'<div class="lrow" style="border-bottom:1px solid var(--line-soft);padding:8px 0"><div style="flex:1;font-size:12.5px;color:var(--slate-700)">'+e.action+'</div><span class="muted" style="font-size:11px">'+e.time+'</span></div>').join(''):'<div class="muted" style="font-size:12.5px;padding:8px 0">No audited events reference this record yet — approvals, edits and exports appear here.</div>')+'</div>';}
  else{body='<div class="grid cols-2" style="gap:10px">'+[['Attendance',s.att+'%',s.att<85?'red':'green'],['GPA',String(s.gpa||'—'),'blue'],['Fees',s.fee,s.fee==='Paid'?'green':'amber'],['Status',s.status||'Active','green']].map(x=>'<div class="card pad" style="box-shadow:none;padding:12px"><div class="muted" style="font-size:11px;font-weight:600">'+x[0]+'</div><div style="font-family:var(--ff-display);font-weight:700;font-size:19px;color:var(--slate-900);margin-top:2px">'+x[1]+'</div></div>').join('')+'</div>'+
   '<div class="card pad" style="box-shadow:none;margin-top:10px">'+[['Guardian',s.guardian],['Contact',s.phone],['Roll',s.roll],['Gender',s.gender]].map(r=>'<div class="lrow" style="border-bottom:1px solid var(--line-soft);padding:7px 0"><span style="font-size:12.5px;color:var(--slate-500)">'+r[0]+'</span><b style="margin-left:auto;font-size:13px;color:var(--slate-900)">'+r[1]+'</b></div>').join('')+'</div>';}
  return `<div class="dh"><span class="avatar" style="width:46px;height:46px;font-size:16px;background:${c}22;color:${darken(c,0.4)}">${initials(s.name)}</span>
    <div style="flex:1"><h3 style="font-size:17px">${s.name}</h3><div class="muted" style="font-size:12.5px">${s.id} · ${s.grade} · Roll ${s.roll}</div></div>
    <button class="iconbtn" onclick="state._spTab='overview';closeDrawer()" aria-label="Close"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button></div>
  <div class="db">${tabBar}${body}
   <div class="df" style="margin-top:14px"><button class="btn" onclick="const gg=buildGuardians().find(x=>x.children.includes('${s.id}'));if(gg)openDrawer(guardianThread(gg.id));else toast('No guardian on file')">${ic('comm',15)} Message guardian</button><button class="btn primary" onclick="state._spTab='overview';closeDrawer();go('attendance')">Open attendance</button></div></div>`;
}
