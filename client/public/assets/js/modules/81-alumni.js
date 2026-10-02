/* ---- Alumni (People) ---- */
window.addAlumni=function(v){const name=(v.full_name||'').trim();if(!name){toast('Name is required');return false}ALUMNI.unshift({name,batch:v.graduating_batch||'—',path:v.current_path||'—',contact:v.contact||'—',status:'Active'});closeDrawer();render();toast(name+' added to alumni network');return false};
function alumniDetail(name){const a=ALUMNI.find(x=>x.name===name);const myReqs=MENTOR_REQUESTS.filter(r=>r.mentor===name);
 return detailDrawer({title:a.name,sub:'Class of '+a.batch+' · '+a.university,color:avc(a.name),
  stats:[['Batch',a.batch,'blue'],['Status',a.status,a.status==='Mentor'?'green':a.status==='Lapsed'?'red':'blue'],['Industry',a.industry,'blue'],['Mentoring',a.mentorAvail?'Available':'Not available',a.mentorAvail?'green':'gray']],
  sections:[{h:'Current path',rows:[['Role',a.path],['Employer',a.employer],['University',a.university],['Skills',a.skills.join(', ')]]},
   {h:'Contact',rows:[['Phone',a.contact],['Email',a.email],['Directory visibility',a.consent?'Visible - consent on file':'Hidden - no consent on file']]},
   {h:'Mentorship',html:a.mentorAvail?('<div class="card pad" style="box-shadow:none">'+(myReqs.length?myReqs.map(r=>'<div class="lrow" style="border-bottom:1px solid var(--line-soft)"><span style="flex:1;font-size:12.5px">'+r.student+'</span>'+chip(r.status,r.status==='Accepted'?'green':r.status==='Declined'?'red':'amber')+'</div>').join(''):'<div class="muted" style="font-size:12.5px">No mentorship requests yet.</div>')+'</div>'):'<div class="muted" style="font-size:12.5px;padding:4px 0">Not currently available for mentoring.</div>'}],
  footer:[['Invite to event',"inviteAlumniToEvent('"+name.replace(/'/g,"\'")+"')"],a.mentorAvail?['Request mentorship',"requestMentorship('"+name.replace(/'/g,"\'")+"')",true]:[ic('comm',16)+' Email',"window.open('mailto:'+'"+a.email+"');logAudit('Emailed alumnus - "+name.replace(/'/g,"\'")+"','Alumni')",true]]})}
window.inviteAlumniToEvent=function(name){state._almInviteName=name;formDrawer('Invite to event',name,[{label:'Event',key:'event',opts:ALUMNI_EVENTS.map(e=>e.title)}],'Send invitation','','confirmAlumniInvite')}
window.confirmAlumniInvite=function(v){const ev=ALUMNI_EVENTS.find(e=>e.title===v.event)||ALUMNI_EVENTS[0];ev.invited++;logAudit('Invited '+state._almInviteName+' to '+ev.title,'Alumni');closeDrawer();render();toast('Invitation sent - '+ev.title);return false};
window.requestMentorship=function(mentorName){state._almMentor=mentorName;formDrawer('Request mentorship',mentorName,[{label:'Student / requester',key:'student',req:true,ph:'Your name'},{label:'Area of interest',key:'area',ph:'e.g. Career advice, university applications'},{label:'Message',key:'msg',area:true}],'Send request','','submitMentorRequest')}
window.submitMentorRequest=function(v){if(!(v.student||'').trim()){toast('Name is required');return false}
 MENTOR_REQUESTS.unshift({mentor:state._almMentor,student:v.student,area:v.area||'',msg:v.msg||'',status:'Pending',date:'Today'});
 logAudit('Requested mentorship - '+state._almMentor+' from '+v.student,'Alumni');closeDrawer();render();openDrawer(alumniDetail(state._almMentor));toast('Mentorship request sent to '+state._almMentor);return false};
window.decideMentorRequest=function(i,decision){if(MENTOR_REQUESTS[i]){MENTOR_REQUESTS[i].status=decision;logAudit(decision+' mentorship request - '+MENTOR_REQUESTS[i].student,'Alumni')}render();toast('Request '+decision.toLowerCase())};
function alumniMentorQueue(){return detailDrawer({title:'Mentorship requests',sub:MENTOR_REQUESTS.length+' total - '+MENTOR_REQUESTS.filter(r=>r.status==='Pending').length+' pending',color:'#7C3AED',badge:ic('roles',18),
 sections:[{h:'All requests',html:MENTOR_REQUESTS.length?'<div class="card pad" style="box-shadow:none">'+MENTOR_REQUESTS.map((r,i)=>'<div class="lrow" style="border-bottom:1px solid var(--line-soft)"><div style="flex:1"><div style="font-weight:600;color:var(--slate-900);font-size:13px">'+r.student+' → '+r.mentor+'</div><div class="muted" style="font-size:11px">'+(r.area||'General mentoring')+'</div></div>'+chip(r.status,r.status==='Accepted'?'green':r.status==='Declined'?'red':'amber')+(r.status==='Pending'?'<button class="btn sm" style="margin-left:8px" onclick="decideMentorRequest('+i+',\'Accepted\')">Accept</button>':'')+'</div>').join('')+'</div>':'<div class="muted" style="font-size:12.5px">No mentorship requests yet.</div>'}],
 footer:[['Close','closeDrawer()',true]]})}
function alumniRows(list){return list.map(a=>`<tr style="cursor:pointer" onclick="openDrawer(alumniDetail('${a.name}'))"><td>${cellUser(a.name,'Class of '+a.batch)}</td><td class="num">${a.batch}</td><td>${a.path}</td><td class="num">${a.contact}</td><td>${chip(a.status,a.status==='Mentor'?'green':a.status==='Lapsed'?'red':'blue')}</td></tr>`).join('')||`<tr><td colspan="5"><div class="empty"><div class="ei">${ic('alumni',26)}</div><h3>No alumni match</h3></div></td></tr>`}
function filterAlumni(){const q=($('#almSearch')?.value||'').toLowerCase(),st=$('#almStatus')?.value||'';
 const rows=ALUMNI.filter(a=>(a.name.toLowerCase().includes(q)||a.batch.includes(q))&&(!st||(st==='__active_network__'?a.status!=='Lapsed':a.status===st)));
 $('#almCount').textContent=rows.length+' of '+ALUMNI.length+' shown';$('#almBody').innerHTML=alumniRows(rows)}
window.almFilterByStatus=function(status){const sel=document.getElementById('almStatus');const search=document.getElementById('almSearch');
 if(search)search.value='';
 if(sel){
  if(status==='')sel.value='';
  else if(status==='Active'){sel.innerHTML='<option value="">All statuses</option><option>Active</option><option>Mentor</option><option>Lapsed</option>';sel.value='__active_network__';
   // native <select> can't hold a value not in its options - use a synthetic option
   const opt=document.createElement('option');opt.value='__active_network__';opt.textContent='Active network (not lapsed)';sel.appendChild(opt);sel.value='__active_network__';}
  else sel.value=status;
 }
 filterAlumni()};
M.alumni=()=>`
  <div class="page-head"><div class="ph-l"><h2>Alumni</h2><p>Graduate network, mentorship and engagement — ${ALUMNI.length} alumni on record.</p></div>
  <div class="ph-r"><button class="btn" onclick="openDrawer(alumniNewsletterView())">${ic('comm',16)} Newsletter</button><button class="btn primary" onclick="formDrawer('Add alumnus','Alumni network',[{label:'Full name',key:'full_name',req:true},{label:'Graduating batch',key:'graduating_batch',opts:['2024','2023','2022','2021','2020','2019','2018','2017','2016']},{label:'Current path',key:'current_path',ph:'University or employer'},{label:'Contact',type:'tel',key:'contact'}],'Add to network','','addAlumni')">${ic('plus',16)} Add alumnus</button></div></div>
  <div class="grid cols-4" style="margin-bottom:18px">
    ${kpi('alumni','#17A24A','Total alumni',String(ALUMNI.length),null,"almFilterByStatus('')")}${kpi('parents','#2563EB','Active network',String(ALUMNI.filter(a=>a.status!=='Lapsed').length),{dir:'up',v:'engaged',note:''},"almFilterByStatus('Active')")}
    ${kpi('roles','#0E7C39','Mentors',String(ALUMNI.filter(a=>a.status==='Mentor').length),{dir:'flat',v:MENTOR_REQUESTS.filter(r=>r.status==='Pending').length+' requests pending',note:''},"openDrawer(alumniMentorQueue())")}${kpi('cal','#E2920C','Events / year',String(ALUMNI_EVENTS.length),{dir:'flat',v:ALUMNI_EVENTS.reduce((a,e)=>a+e.invited,0)+' invited',note:''},"openDrawer(alumniEventsDrawer())")}</div>
  <div class="card pad"><div class="flex ac" style="gap:10px;margin-bottom:14px;flex-wrap:wrap">
    <div class="field" style="flex:1;min-width:200px"><input id="almSearch" placeholder="Search by name or batch" oninput="filterAlumni()" style="width:100%;height:40px;border:1px solid var(--line);border-radius:10px;padding:0 12px"></div>
    <div class="field sel"><select id="almStatus" onchange="filterAlumni()"><option value="">All statuses</option><option>Active</option><option>Mentor</option><option>Lapsed</option></select></div>
    <span class="muted" id="almCount" style="font-size:12.5px;margin-left:auto">${ALUMNI.length} of ${ALUMNI.length} shown</span></div>
  <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Alumnus</th><th>Batch</th><th>Current path</th><th>Contact</th><th>Status</th></tr></thead><tbody id="almBody">${alumniRows(ALUMNI)}</tbody></table></div></div>`;

