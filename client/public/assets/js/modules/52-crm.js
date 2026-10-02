/* ---- Enrolment CRM (lead management before formal application) ---- */
const CRMSTAGES=['New','Contacted','Toured','Application','Won'];
const CRMCOL={New:'#2563EB',Contacted:'#E2920C',Toured:'#7C3AED',Application:'#0E7C39',Won:'#17A24A'};
let CRMLEADS=[
  {name:'Zayd Haddad',grade:'Grade 4',stage:'New',source:'Website',phone:'+971 50 118 2200',guardian:'Layla Haddad',owner:'Front Office',date:'Today',temp:'Warm',idle:0,follow:2,followType:'Scheduled',archived:false,log:[['Enquiry submitted via website','Today']]},
  {name:'Mariam Osei',grade:'KG 2',stage:'New',source:'Instagram',phone:'+971 55 903 1120',guardian:'Kwame Osei',owner:'Front Office',date:'Today',temp:'Hot',idle:0,follow:0,followType:'Scheduled',archived:false,log:[['Downloaded prospectus','Today']]},
  {name:'Ivan Petrov',grade:'Grade 7',stage:'Contacted',source:'Referral',phone:'+971 52 771 4408',guardian:'Anna Petrova',owner:'Nadia (Admissions)',date:'12 Jun',temp:'Hot',idle:2,follow:-1,followType:'Scheduled',archived:false,log:[['Called — interested, sending brochure','12 Jun'],['Enquiry from parent referral','10 Jun']]},
  {name:'Sara Reyes',grade:'Grade 2',stage:'Contacted',source:'Walk-in',phone:'+971 50 220 9915',guardian:'Diego Reyes',owner:'Nadia (Admissions)',date:'11 Jun',temp:'Warm',idle:3,follow:3,followType:'Scheduled',archived:false,log:[['Front-desk walk-in, shared fee structure','11 Jun']]},
  {name:'Yusuf Farouk',grade:'Grade 9',stage:'Toured',source:'Event',phone:'+971 56 640 2231',guardian:'Hana Farouk',owner:'Nadia (Admissions)',date:'09 Jun',temp:'Hot',idle:5,follow:1,followType:'Scheduled',archived:false,log:[['Campus tour completed — very positive','09 Jun'],['Booked tour at open day','05 Jun']]},
  {name:'Elena Novak',grade:'Grade 5',stage:'Toured',source:'Website',phone:'+971 54 118 7742',guardian:'Marco Novak',owner:'Front Office',date:'08 Jun',temp:'Warm',idle:6,follow:null,followType:'Follow later',archived:false,log:[['Toured campus, considering options','08 Jun']]},
  {name:'Kabir Nair',grade:'Grade 1',stage:'Application',source:'Referral',phone:'+971 50 887 3310',guardian:'Priya Nair',owner:'Nadia (Admissions)',date:'06 Jun',temp:'Hot',idle:8,follow:5,followType:'Scheduled',archived:false,log:[['Started application form','06 Jun'],['Tour + assessment booked','03 Jun']]},
  {name:'Lina Chen',grade:'KG 1',stage:'Won',source:'Agent',phone:'+971 55 300 1180',guardian:'Wei Chen',owner:'Nadia (Admissions)',date:'01 Jun',temp:'Hot',idle:13,follow:null,followType:null,archived:false,log:[['Enrolled','01 Jun'],['Application submitted','28 May']]},
  {name:'Omar Khalil',grade:'Grade 6',stage:'Contacted',source:'Google',phone:'+971 52 908 1123',guardian:'Rania Khalil',owner:'Front Office',date:'22 May',temp:'Cold',idle:23,follow:null,followType:null,archived:false,log:[['Called twice — no answer','24 May'],['Enquiry via Google','20 May']]},
  {name:'Nadia Roy',grade:'Grade 3',stage:'New',source:'Facebook',phone:'+971 55 771 9902',guardian:'Sunil Roy',owner:'Front Office',date:'25 May',temp:'Cold',idle:20,follow:null,followType:null,archived:false,log:[['Enquiry via Facebook ad','25 May']]},
  {name:'Tom Bradley',grade:'Grade 8',stage:'Toured',source:'Event',phone:'+971 50 334 7781',guardian:'Karen Bradley',owner:'Nadia (Admissions)',date:'02 May',temp:'Cold',idle:44,follow:null,followType:null,archived:true,archReason:'Chose another school',log:[['Archived — chose another school','10 May'],['Toured campus','02 May']]}];
const CRM_STALE=14;
const CRMCHIP={New:'blue',Contacted:'amber',Toured:'purple',Application:'green',Won:'green'};
function crmActive(){return CRMLEADS.filter(l=>!l.archived)}
function crmArchived(){return CRMLEADS.filter(l=>l.archived)}
function isStale(l){return !l.archived&&l.stage!=='Won'&&(l.follow==null)&&l.idle>=CRM_STALE}
function followLabel(o){if(o==null)return '—';if(o<0)return 'Overdue '+(-o)+'d';if(o===0)return 'Due today';return 'In '+o+'d'}
function followColor(o){if(o==null)return 'gray';if(o<0)return 'red';if(o===0)return 'amber';return 'blue'}
function crmConv(){const a=crmActive();const won=a.filter(l=>l.stage==='Won').length;return a.length?Math.round(won/a.length*100):0}
function crmFunnel(){const act=crmActive();const total=act.length;return `<div class="card pad" style="margin-bottom:16px"><div class="flex ac jb" style="margin-bottom:12px"><h3 style="font-size:15px">Lead funnel</h3><span class="muted" style="font-size:12px">Prospective families by stage</span></div>
  <div style="display:flex;height:12px;border-radius:6px;overflow:hidden;margin-bottom:12px">${CRMSTAGES.map(st=>{const n=act.filter(l=>l.stage===st).length;const pct=total?n/total*100:0;return pct?`<div style="width:${pct}%;background:${CRMCOL[st]}" title="${st}: ${n}"></div>`:''}).join('')}</div>
  <div class="flex" style="gap:16px;flex-wrap:wrap">${CRMSTAGES.map(st=>{const n=act.filter(l=>l.stage===st).length;return `<span style="font-size:11.5px;color:var(--slate-600)"><span style="display:inline-block;width:9px;height:9px;border-radius:3px;background:${CRMCOL[st]};vertical-align:middle;margin-right:5px"></span>${st} · ${n}</span>`}).join('')}</div></div>`}
M.crm=()=>{const view=state.crmView||'board';const act=crmActive();
  const due=act.filter(l=>l.follow!=null&&l.follow<=0).length;
  const sched=act.filter(l=>l.follow!=null&&l.follow>0).length;
  const stale=act.filter(isStale).length;const arch=crmArchived().length;
  return `<div class="page-head"><div class="ph-l"><h2>Enrolment CRM</h2><p>Nurture prospective families from first enquiry to enrolment. ${act.length} active leads · ${due} follow-ups due.</p></div>
  <div class="ph-r"><button class="btn" onclick="openDrawer(socialComposerDrawer())">${ic('comm',16)} Social reachout</button><button class="btn" onclick="openDrawer(crmBulkOutreach())">${ic('comm',16)} Bulk outreach</button><button class="btn" onclick="exportCSV('crm-leads.csv',['Lead','Grade','Stage','Source','Owner','Temp','Follow-up','Archived'],CRMLEADS.map(l=>[l.name,l.grade,l.stage,l.source,l.owner,l.temp,l.follow!=null?l.follow+'d':'-',l.archived?'Yes':'No']))">${ic('download',16)} Export</button><button class="btn primary" onclick="addLeadForm()">${ic('plus',16)} New lead</button></div></div>
  <div class="grid cols-4" style="margin-bottom:16px">
    ${kpi('crm','#2563EB','Total leads',String(act.length),{dir:'up',v:'this intake',note:''},"crmFocus('')",state.crmFocus===''&&(view==='board'||view==='table'))}
    ${kpi('comm','#E11D2A','Follow-ups due',String(due),null,"setCrmView('followups')",view==='followups')}
    ${kpi('cal','#7C3AED','Scheduled',String(sched),null,"setCrmView('followups')",false)}
    ${kpi('reports','#17A24A','Conversion',crmConv()+'%',{dir:'up',v:act.filter(l=>l.stage==='Won').length+' won',note:''},"crmFocus('Won')",state.crmFocus==='Won')}
  </div>
  ${crmFunnel()}
  <div class="card pad" style="margin-bottom:16px"><div class="flex ac jb" style="flex-wrap:wrap;gap:10px"><h3 style="font-size:15px">Leads</h3>
    <div class="seg"><button class="${view==='board'?'on':''}" onclick="setCrmView('board')">${ic('admiss',15)} Board</button><button class="${view==='table'?'on':''}" onclick="setCrmView('table')">${ic('reports',15)} Table</button><button class="${view==='followups'?'on':''}" onclick="setCrmView('followups')">${ic('cal',15)} Follow-ups${due?' · '+due:''}</button><button class="${view==='archived'?'on':''}" onclick="setCrmView('archived')">${ic('audit',15)} Archived${arch?' · '+arch:''}</button></div></div>
    ${stale&&view!=='archived'&&view!=='followups'?`<div class="flex ac" style="gap:10px;margin-top:12px;padding:10px 12px;background:rgba(226,146,12,.08);border:1px solid rgba(226,146,12,.28);border-radius:10px;flex-wrap:wrap"><span class="badge b-amber"><span class="bd"></span>${stale} stale</span><span class="muted" style="font-size:12.5px;flex:1;min-width:140px">Idle ${CRM_STALE}+ days with no scheduled follow-up.</span><button class="btn sm" onclick="setCrmView('followups')">Review</button><button class="btn sm" onclick="archiveStale()">Archive all stale</button></div>`:''}
    ${state.crmFocus&&(view==='board'||view==='table')?`<div class="flex ac" style="gap:10px;margin-top:10px"><span class="muted" style="font-size:12.5px">Showing</span><span class="badge b-blue">${state.crmFocus==='followup'?'In follow-up':state.crmFocus} · ${crmFiltered().length}</span><button class="btn sm" onclick="crmFocus('')">Clear ✕</button></div>`:''}
  </div>
  ${view==='table'?crmTable():view==='followups'?crmFollowups():view==='archived'?crmArchivedView():crmBoard()}`};
function setCrmView(v){state.crmView=v;render()}
function crmFocus(v){state.crmFocus=(state.crmFocus===v?'':v);if(state.crmView!=='board'&&state.crmView!=='table')state.crmView='board';render()}
function crmMatch(st,f){if(!f)return true;if(f==='followup')return st==='New'||st==='Contacted';return st===f}
function crmFiltered(){return crmActive().filter(l=>crmMatch(l.stage,state.crmFocus))}
function crmBoard(){const f=state.crmFocus;const narrow=f&&f!=='';return `<div class="kboard">${CRMSTAGES.map(st=>{const items=crmActive().filter(l=>l.stage===st);const match=crmMatch(st,f);const cls=narrow?(match?' hot':' dim'):'';
  return `<div class="kcol${cls}"><div class="kcol-h"><span class="lbl"><span class="dot" style="background:${CRMCOL[st]}"></span>${st}</span><span class="badge ${narrow&&match?'b-green':'b-gray'}">${items.length}</span></div>
  ${items.map(l=>`<div class="kcard" onclick="openDrawer(crmDetail('${l.name}'))"><div style="font-weight:600;color:var(--slate-900);font-size:13.5px">${l.name}</div>
    <div class="kcard-meta"><span class="badge b-blue" style="font-size:10px">${l.grade}</span><span class="muted" style="font-size:11px">${l.source}</span></div>
    <div class="flex ac jb" style="margin-top:8px"><span class="badge ${l.temp==='Hot'?'b-red':l.temp==='Warm'?'b-amber':'b-gray'}" style="font-size:10px">${l.temp}</span>${l.follow!=null?`<span class="badge b-${followColor(l.follow)}" style="font-size:9.5px">${followLabel(l.follow)}</span>`:isStale(l)?`<span class="badge b-gray" style="font-size:9.5px">${l.idle}d idle</span>`:`<span class="muted" style="font-size:10.5px">${l.date}</span>`}</div></div>`).join('')||`<div class="kempty">No leads</div>`}</div>`}).join('')}</div>`}
function crmTable(){const rows=crmFiltered();return `<div class="card pad"><div class="tbl-wrap"><table class="tbl"><thead><tr><th>Lead</th><th>Grade</th><th>Stage</th><th>Source</th><th>Owner</th><th>Temp</th><th>Follow-up</th><th>Updated</th></tr></thead><tbody>
  ${rows.map(l=>`<tr style="cursor:pointer" onclick="openDrawer(crmDetail('${l.name}'))"><td>${cellUser(l.name,l.guardian)}</td><td>${l.grade}</td><td>${chip(l.stage,CRMCHIP[l.stage])}</td><td>${l.source}</td><td class="muted">${l.owner}</td><td>${chip(l.temp,l.temp==='Hot'?'red':l.temp==='Warm'?'amber':'gray')}</td><td>${l.follow!=null?chip(followLabel(l.follow),followColor(l.follow)):isStale(l)?chip('Stale','gray'):'<span class="muted">—</span>'}</td><td class="num muted">${l.date}</td></tr>`).join('')||`<tr><td colspan="8"><div class="empty"><div class="ei">${ic('crm',26)}</div><h3>No leads in this view</h3></div></td></tr>`}
  </tbody></table></div></div>`}
function crmFollowups(){const act=crmActive();
 const overdue=act.filter(l=>l.follow!=null&&l.follow<0).sort((a,b)=>a.follow-b.follow);
 const today=act.filter(l=>l.follow===0);
 const upcoming=act.filter(l=>l.follow!=null&&l.follow>0).sort((a,b)=>a.follow-b.follow);
 const none=act.filter(l=>l.follow==null&&l.stage!=='Won');
 const grp=(title,list,c,empty,isNone)=>`<div class="card pad" style="margin-bottom:14px"><div class="flex ac jb" style="margin-bottom:${list.length?'10':'0'}"><h3 style="font-size:15px">${title} <span class="badge b-${c}">${list.length}</span></h3>${isNone&&list.filter(isStale).length?`<button class="btn sm" onclick="archiveStale()">Archive all stale</button>`:''}</div>
   ${list.length?`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Lead</th><th>Stage</th><th>Owner</th><th>${isNone?'Idle':'Follow-up'}</th><th>Last activity</th><th></th></tr></thead><tbody>
   ${list.map(l=>`<tr style="cursor:pointer" onclick="openDrawer(crmDetail('${l.name}'))"><td>${cellUser(l.name,l.guardian)}</td><td>${chip(l.stage,CRMCHIP[l.stage])}</td><td class="muted">${l.owner.split(' ')[0]}</td><td>${isNone?chip(l.idle+'d idle',l.idle>=CRM_STALE?'red':'gray'):chip(followLabel(l.follow),followColor(l.follow))}</td><td class="num muted">${l.log[0]?l.log[0][1]:l.date}</td><td class="right" onclick="event.stopPropagation()"><button class="btn sm" onclick="scheduleFollow('${l.name}')">Schedule</button>${isNone?`<button class="btn sm" onclick="archiveLead('${l.name}')">Archive</button>`:''}</td></tr>`).join('')}
   </tbody></table></div>`:`<div class="muted" style="font-size:12.5px;padding:2px 0">${empty}</div>`}</div>`;
 return grp('Overdue',overdue,'red','No overdue follow-ups — nicely on top of it.',false)+grp('Due today',today,'amber','No follow-ups due today.',false)+grp('Upcoming',upcoming,'blue','No upcoming follow-ups scheduled.',false)+grp('No follow-up scheduled',none,'gray','Every active lead has a next step scheduled.',true)}
function crmArchivedView(){const arch=crmArchived();
 return `<div class="card pad"><div class="sec-head" style="margin-bottom:6px"><h3 style="font-size:15px">Archived leads</h3><span class="muted" style="font-size:12px">Restore to the funnel or delete permanently</span></div>
 ${arch.length?`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Lead</th><th>Grade</th><th>Last stage</th><th>Reason</th><th>Archived</th><th></th></tr></thead><tbody>
 ${arch.map(l=>`<tr><td>${cellUser(l.name,l.guardian)}</td><td>${l.grade}</td><td>${chip(l.stage,'gray')}</td><td class="muted" style="font-size:12px">${l.archReason||'—'}</td><td class="num muted">${l.log[0]?l.log[0][1]:l.date}</td><td class="right"><button class="btn sm" onclick="restoreLead('${l.name}')">Restore</button><button class="btn sm" onclick="deleteLead('${l.name}')">Delete</button></td></tr>`).join('')}
 </tbody></table></div>`:`<div class="empty"><div class="ei">${ic('audit',26)}</div><h3>No archived leads</h3><p>Stale or lost leads you archive will appear here.</p></div>`}</div>`}
/* ---- CRM quick outreach: templates, individual & bulk channels, social composer ---- */
/* ---- Smart content assistant: context-aware, deterministic. A static frontend cannot safely hold
   API keys or bypass CORS for a real external LLM call, so this generates varied, on-context
   content from the record's own live data (tone x stage x channel), and is the integration seam
   for a real model once a backend exists (see docs/WORKFLOW-MAP.md). ---- */
const CONTENT_TONES=['Warm','Professional','Concise'];
function contentGreeting(tone,guardian){if(tone==='Warm')return 'Dear '+guardian+',\n\n';if(tone==='Concise')return 'Hi '+guardian.split(' ')[0]+',\n\n';return 'Dear '+guardian+',\n\n'}
function contentSignoff(tone,owner){if(tone==='Warm')return '\n\nWarm regards,\n'+owner;if(tone==='Concise')return '\n\n'+owner;return '\n\nKind regards,\n'+owner}
function crmGenerateContent(lead,variant){const tone=CONTENT_TONES[variant%CONTENT_TONES.length];
 const stageLines={
  'New':'Thank you for your interest in Al Noor International for '+lead.name+' ('+lead.grade+'). I would love to arrange a campus tour and answer any questions about our curriculum.',
  'Contacted':'It was great connecting with you about '+lead.name+"'s application for "+lead.grade+'. I wanted to check if you had any further questions before the next step.',
  'Toured':'Thank you for visiting our campus with '+lead.name+'! We hope you enjoyed seeing our facilities. I would love to help with the next steps in the application.',
  'Application':lead.name+"'s application for "+lead.grade+' is progressing well. Please let me know if you need help completing any documents or scheduling an assessment.',
  'Won':'Congratulations on '+lead.name+"'s place at Al Noor International! I am here to help with any onboarding questions ahead of the term."
 };
 const body=stageLines[lead.stage]||stageLines['New'];
 const subjectMap={'New':'Welcome - '+lead.grade+' admissions at Al Noor International','Contacted':'Following up - '+lead.name+"'s enquiry",'Toured':'Great to see you on campus, '+lead.guardian.split(' ')[0],'Application':lead.name+"'s application - next steps",'Won':'Welcome to Al Noor International!'};
 return{subject:subjectMap[lead.stage]||subjectMap['New'],body:contentGreeting(tone,lead.guardian)+body+contentSignoff(tone,lead.owner),tone};}
function crmDraftEmail(name,variant){const l=CRMLEADS.find(x=>x.name===name);if(!l)return{subject:'',body:'',tone:'Warm'};return crmGenerateContent(l,variant||0)}
window.crmCopyDraft=function(name,variant){const draft=crmDraftEmail(name,variant||0);const text=draft.subject+'\n\n'+draft.body;
 if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(text).then(()=>toast('Draft copied')).catch(()=>toast('Copy failed - select and copy manually'))}else{toast('Clipboard not available in this browser')}
 logAudit('Copied email draft - '+name,'CRM')};
window.crmLogChannel=function(name,channel){const l=CRMLEADS.find(x=>x.name===name);if(l){l.log.unshift([channel+' initiated','Today']);l.idle=0}logAudit(channel+' - '+name,'CRM')};
function crmOutreachPanel(name){const l=CRMLEADS.find(x=>x.name===name);if(!l)return '';const variant=state._crmVariant||0;const draft=crmDraftEmail(name,variant);
 const phoneDigits=(l.phone||'').replace(/[^0-9+]/g,'');
 return `<div class="card pad" style="box-shadow:none">
  <div class="flex ac" style="gap:6px;margin-bottom:10px;flex-wrap:wrap">
   <a class="btn sm" href="tel:${phoneDigits}" onclick="crmLogChannel('${name.replace(/'/g,"\\'")}','Called')">${ic('phone',13)} Call</a>
   <a class="btn sm" target="_blank" href="https://wa.me/${phoneDigits.replace('+','')}?text=${encodeURIComponent('Hi '+l.guardian+', this is '+l.owner+' from Al Noor International regarding '+l.name+'\'s '+l.grade+' application. Happy to answer any questions!')}" onclick="crmLogChannel('${name.replace(/'/g,"\\'")}','WhatsApp')">${ic('comm',13)} WhatsApp</a>
   <a class="btn sm" href="mailto:?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}" onclick="crmLogChannel('${name.replace(/'/g,"\\'")}','Email')">${ic('mail',13)} Email</a>
  </div>
  <div style="border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin-bottom:8px;background:var(--surface-2)">
   <div class="flex ac jb" style="margin-bottom:6px;flex-wrap:wrap;gap:6px"><span class="muted" style="font-size:10.5px;font-weight:700;letter-spacing:.03em">SMART DRAFT · ${draft.tone.toUpperCase()} TONE</span><button class="btn sm" onclick="state._crmVariant=(${variant}+1)%3;closeDrawer();openDrawer(crmDetail('${name.replace(/'/g,"\\'")}'))">${ic('ai',12)} Regenerate</button></div>
   <div style="font-size:12.5px;font-weight:600;color:var(--slate-900);margin-bottom:4px">${draft.subject}</div>
   <div style="font-size:12px;color:var(--slate-600);white-spacmax-height:120px;overflow-y:auto">${draft.body}</div>
  </div>
  <div class="flex ac" style="gap:6px;flex-wrap:wrap">
   <a class="btn sm primary" href="mailto:?subject=${encodeURIComponent(draft.subject)}&body=${encodeURIComponent(draft.body)}" onclick="logAudit('Opened email draft - '+'${name.replace(/'/g,"\\'")}','CRM')">${ic('comm',13)} Open in email</a>
   <button class="btn sm" onclick="crmCopyDraft('${name.replace(/'/g,"\\'")}',${variant})">${ic('download',13)} Copy draft</button>
  </div>
  <div class="muted" style="font-size:10.5px;margin-top:8px">Draft assembled from a template library using this lead's data - not a live AI call. A real generative-AI integration is a backend addition (see docs).</div>
 </div>`}
function crmLeadEmail(l){return l.name.toLowerCase().replace(/[^a-z]+/g,'.')+'@family.ae'}
function crmBulkOutreach(){const scope=state._crmBulkScope||'all';const leads=scope==='followups'?crmActive().filter(l=>l.follow!=null&&l.follow<=0):crmActive();
 const withFollow=crmActive().filter(l=>l.follow!=null&&l.follow<=0);
 const subject=state._crmBulkSubject!=null?state._crmBulkSubject:'Al Noor International - following up on your enquiry';
 const body=state._crmBulkBody!=null?state._crmBulkBody:'Dear parent,\n\nThank you for your interest in Al Noor International. Our admissions team would love to help with any questions about enrolment.\n\nBest regards,\nAdmissions Team';
 return detailDrawer({title:'Bulk outreach',sub:leads.length+' recipient'+(leads.length===1?'':'s')+' in scope - '+withFollow.length+' follow-ups due',color:'#2563EB',badge:ic('crm',18),
  sections:[
   {h:'Recipients',html:'<div class="card pad" style="box-shadow:none"><div class="seg" style="margin-bottom:10px"><button class="'+(scope==='all'?'on':'')+'" onclick="state._crmBulkScope=\'all\';closeDrawer();openDrawer(crmBulkOutreach())">All active ('+crmActive().length+')</button><button class="'+(scope==='followups'?'on':'')+'" onclick="state._crmBulkScope=\'followups\';closeDrawer();openDrawer(crmBulkOutreach())">Follow-ups due ('+withFollow.length+')</button></div>'+
    '<textarea readonly rows="3" style="width:100%;border:1px solid var(--line);border-radius:10px;padding:8px 10px;font-size:11.5px;color:var(--slate-600);resize:vertical">'+leads.map(crmLeadEmail).join(', ')+'</textarea>'+
    '<div class="muted" style="font-size:10.5px;margin-top:6px">'+leads.length+' email address'+(leads.length===1?'':'es')+' - editable recipients via individual outreach if you need to exclude someone.</div></div>'},
   {h:'Message',html:'<div class="card pad" style="box-shadow:none">'+
    '<label style="display:block;margin-bottom:10px"><span style="font-size:11.5px;font-weight:600;color:var(--slate-600);display:block;margin-bottom:5px">Subject</span><input value="'+subject.replace(/"/g,'&quot;')+'" oninput="state._crmBulkSubject=this.value" style="width:100%;height:38px;border:1px solid var(--line);border-radius:10px;padding:0 10px;font-size:12.5px"></label>'+
    '<label style="display:block"><span style="font-size:11.5px;font-weight:600;color:var(--slate-600);display:block;margin-bottom:5px">Message (common to all recipients)</span><textarea id="bulkMsgTa" maxlength="600" rows="6" oninput="state._crmBulkBody=this.value" style="width:100%;border:1px solid var(--line);border-radius:10px;padding:8px 10px;font-size:12.5px;resize:vertical">'+body+'</textarea>'+aiAssistBar('bulkMsgTa','bulk-outreach',600)+'</label></div>'},
   {h:'Preview',html:'<div class="card pad" style="box-shadow:none;background:var(--surface-2)"><div style="font-size:11px;font-weight:600;color:var(--slate-500);margin-bottom:6px">TO: '+leads.length+' recipients (BCC) - SUBJECT: '+subject+'</div><div style="font-size:12px;color:var(--slate-700);white-space:pre-wrap">'+body+'</div></div>'}
  ],
  footer:[['Close','closeDrawer()'],['Open bulk email draft','openBulkEmailDraft()',true]]})}
window.openBulkEmailDraft=function(){const scope=state._crmBulkScope||'all';const leads=scope==='followups'?crmActive().filter(l=>l.follow!=null&&l.follow<=0):crmActive();
 const subject=state._crmBulkSubject!=null?state._crmBulkSubject:'Al Noor International - following up on your enquiry';
 const body=state._crmBulkBody!=null?state._crmBulkBody:'Dear parent,\n\nThank you for your interest in Al Noor International. Our admissions team would love to help with any questions about enrolment.\n\nBest regards,\nAdmissions Team';
 const emails=leads.map(crmLeadEmail).join(',');
 window.open('mailto:?bcc='+encodeURIComponent(emails)+'&subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body),'_blank');
 logAudit('Bulk email drafted - '+leads.length+' leads','CRM');closeDrawer();toast('Email client opened - '+leads.length+' recipients BCC\'d')};
const SOCIAL_SAMPLES=[
 {platform:'Facebook',text:'🎓 Admissions are open for 2026-27 at Al Noor International, Dubai! Book a campus tour today and see why families choose us. #AlNoorInternational #DubaiSchools #Admissions2026',url:'https://www.facebook.com/sharer/sharer.php?u=https://alnoor.ae/admissions&quote='},
 {platform:'LinkedIn',text:'Al Noor International is now accepting applications for the 2026-27 academic year across all grades. Learn more about our curriculum and campus.',url:'https://www.linkedin.com/sharing/share-offsite/?url=https://alnoor.ae/admissions'},
 {platform:'X (Twitter)',text:'Admissions open for 2026-27 🎓 Book your campus tour at Al Noor International, Dubai. alnoor.ae/admissions #Dubai #Education',url:'https://twitter.com/intent/tweet?text='},
];
window.socialCopyCaption=function(platform){const s=SOCIAL_SAMPLES.find(x=>x.platform===platform);if(!s)return;
 if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(s.text).then(()=>toast('Caption copied')).catch(()=>toast('Copy failed - select and copy manually'))}else{toast('Clipboard not available in this browser')}};
let SOCIAL_MEDIA=[];let SOCIAL_QUEUE=[];let SOCIAL_DEFAULT_MSG=AI_DEFAULT_MESSAGES?'':'';
window.socialMediaPick=function(input){const files=[...(input.files||[])].slice(0,8-SOCIAL_MEDIA.length);
 if(!files.length){toast('Up to 8 files - remove one to add more');return}
 let pending=files.length;files.forEach(f=>{docReadFile(f,file=>{SOCIAL_MEDIA.push(file);pending--;if(pending<=0)openDrawer(socialComposerDrawer())})})};
window.socialMediaDrop=function(e){e.preventDefault();e.currentTarget.classList.remove('drag');const files=[...(e.dataTransfer&&e.dataTransfer.files||[])].slice(0,8-SOCIAL_MEDIA.length);
 if(!files.length)return;let pending=files.length;files.forEach(f=>{docReadFile(f,file=>{SOCIAL_MEDIA.push(file);pending--;if(pending<=0)openDrawer(socialComposerDrawer())})})};
window.socialMediaRemove=function(i){SOCIAL_MEDIA.splice(i,1);openDrawer(socialComposerDrawer())};
function socialMediaPicker(){return `<div style="margin-bottom:12px">
 ${SOCIAL_MEDIA.length?`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(90px,1fr));gap:8px;margin-bottom:8px">${SOCIAL_MEDIA.map((m,i)=>{const isVideo=m.type&&m.type.startsWith('video');
   return `<div style="position:relative;border-radius:10px;overflow:hidden;aspect-ratio:1;background:var(--surface-3)">${isVideo?`<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:var(--slate-500)">${ic('lms',22)}</div>`:`<img src="${m.url}" style="width:100%;height:100%;object-fit:cover">`}<button class="btn sm" style="position:absolute;top:3px;right:3px;padding:2px 6px;min-width:0" onclick="socialMediaRemove(${i})">✕</button>${isVideo?`<span class="badge b-gray" style="position:absolute;bottom:3px;left:3px;font-size:9px">VIDEO</span>`:''}</div>`}).join('')}</div>`:''}
 ${SOCIAL_MEDIA.length<8?`<label ondragover="event.preventDefault();this.classList.add('drag')" ondragleave="this.classList.remove('drag')" ondrop="socialMediaDrop(event)" style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;border:1.5px dashed var(--line);border-radius:12px;padding:16px;cursor:pointer;background:var(--surface-2)">
  <input type="file" accept="image/*,video/*" multiple onchange="socialMediaPick(this)" style="display:none">
  ${ic('plus',18)}<span style="font-size:12px;font-weight:600;color:var(--slate-600)">Add photos or videos (${SOCIAL_MEDIA.length}/8)</span><span class="muted" style="font-size:10.5px">Drag & drop or click - multiple files supported</span></label>`:`<div class="muted" style="font-size:11px">Maximum 8 files reached - remove one to add more.</div>`}
 </div>`}
window.socialPostNow=function(platform){const s=SOCIAL_SAMPLES.find(x=>x.platform===platform);if(!s)return;
 const mediaCount=SOCIAL_MEDIA.length;
 SOCIAL_QUEUE.unshift({platform,text:state._socialText&&state._socialText[platform]||s.text,mediaCount,mediaNames:SOCIAL_MEDIA.map(m=>m.name),time:'Just now',status:'Posted (simulated)'});
 logAudit('Posted to '+platform+(mediaCount?' with '+mediaCount+' file(s)':'')+' (simulated - connect account for live posting)','Communication');
 closeDrawer();openDrawer(socialPostConfirmation(platform,mediaCount))};
function socialPostConfirmation(platform,mediaCount){return detailDrawer({title:'Post queued',sub:platform,color:'#17A24A',badge:ic('comm',18),
 stats:[['Platform',platform,'blue'],['Attachments',String(mediaCount),'blue'],['Status','Queued','green']],
 sections:[{h:'Note',html:'<div class="muted" style="font-size:12px">This is a simulated post for the demo environment. Connect a real social account in Settings to publish live.</div>'}],
 footer:[['Done','closeDrawer()',true]]})}
window.socialTextEdit=function(platform,val){state._socialText=state._socialText||{};state._socialText[platform]=val};
window.socialUseDefaultForAll=function(){const def=document.getElementById('socialDefaultMsg');const text=def?def.value:'';if(!text.trim()){toast('Write a default message first');return}
 SOCIAL_SAMPLES.forEach(s=>{state._socialText=state._socialText||{};state._socialText[s.platform]=text});
 openDrawer(socialComposerDrawer());toast('Applied to all platforms')};
function socialComposerDrawer(){const samples=SOCIAL_SAMPLES;const defMsg=state._socialDefaultMsg!=null?state._socialDefaultMsg:AI_DEFAULT_MESSAGES['event-details'];
 return detailDrawer({title:'Social reachout',sub:'Compose once, share to every platform - add photos/videos and a custom default message below',color:'#7C3AED',badge:ic('comm',18),
  sections:[{h:'Photos & videos',html:socialMediaPicker()},
   {h:'Custom default message',html:'<div class="card pad" style="box-shadow:none"><textarea id="socialDefaultMsg" rows="2" oninput="state._socialDefaultMsg=this.value" style="width:100%;border:1px solid var(--line);border-radius:8px;padding:8px 10px;font-size:12px;color:var(--slate-700);resize:vertical;margin-bottom:8px">'+defMsg+'</textarea><button class="btn sm" onclick="socialUseDefaultForAll()">Apply to all platforms</button></div>'},
   ...samples.map(s=>{const text=(state._socialText&&state._socialText[s.platform])||s.text;
    return {h:s.platform,html:'<div class="card pad" style="box-shadow:none">'+(SOCIAL_MEDIA.length?'<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(60px,1fr));gap:6px;margin-bottom:8px">'+SOCIAL_MEDIA.slice(0,4).map(m=>m.type&&m.type.startsWith('video')?'<div style="aspect-ratio:1;border-radius:6px;background:var(--surface-3);display:flex;align-items:center;justify-content:center">'+ic('lms',16)+'</div>':'<img src="'+m.url+'" style="width:100%;aspect-ratio:1;object-fit:cover;border-radius:6px">').join('')+(SOCIAL_MEDIA.length>4?'<div style="aspect-ratio:1;border-radius:6px;background:var(--surface-3);display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--slate-500)">+'+(SOCIAL_MEDIA.length-4)+'</div>':'')+'</div>':'')+
     '<textarea rows="3" oninput="socialTextEdit(\''+s.platform.replace(/'/g,"\\'")+'\',this.value)" style="width:100%;border:1px solid var(--line);border-radius:8px;padding:8px 10px;font-size:12px;color:var(--slate-700);resize:vertical;margin-bottom:8px">'+text+'</textarea>'+
     '<div class="flex ac" style="gap:6px;flex-wrap:wrap"><a class="btn sm" target="_blank" href="'+s.url+encodeURIComponent(text)+'">'+ic('comm',13)+' Compose on '+s.platform+'</a><button class="btn sm" onclick="socialCopyCaption(\''+s.platform.replace(/'/g,"\\'")+'\')">Copy caption</button><button class="btn sm primary" onclick="socialPostNow(\''+s.platform.replace(/'/g,"\\'")+'\')">Post now</button></div></div>'};
   }),
   {h:'Recent posts',html:SOCIAL_QUEUE.length?'<div class="card pad" style="box-shadow:none">'+SOCIAL_QUEUE.slice(0,5).map(q=>'<div class="lrow" style="border-bottom:1px solid var(--line-soft)"><div style="flex:1"><div style="font-size:12px;font-weight:600">'+q.platform+(q.mediaCount?' - '+q.mediaCount+' file(s)':'')+'</div><div class="muted" style="font-size:11px">'+q.time+'</div></div>'+chip(q.status,'blue')+'</div>').join('')+'</div>':'<div class="muted" style="font-size:12px">No posts yet this session.</div>'}
  ],
  footer:[['Close','closeDrawer()',true]]})}
function crmDetail(name){const l=CRMLEADS.find(x=>x.name===name);if(!l)return '';const won=l.stage==='Won';const idx=CRMSTAGES.indexOf(l.stage);
  const pipeline=`<div class="flex ac" style="gap:6px;flex-wrap:wrap">${CRMSTAGES.map((s,i)=>`<span class="badge ${i<=idx?'b-green':'b-gray'}" style="font-size:10.5px">${s}</span>${i<CRMSTAGES.length-1?'<span class="muted">→</span>':''}`).join('')}</div>`;
  const overdue=l.follow!=null&&l.follow<0;const dueToday=l.follow===0;
  const reminderBanner=(overdue||dueToday)?`<div class="card pad" style="box-shadow:none;margin-bottom:10px;background:${overdue?'rgba(225,29,42,.06)':'rgba(226,146,12,.08)'};border-color:${overdue?'rgba(225,29,42,.25)':'rgba(226,146,12,.3)'}"><div class="flex ac" style="gap:8px"><span style="font-size:16px">${overdue?'⏰':'📅'}</span><span style="font-size:12.5px;font-weight:600;color:${overdue?'var(--red)':'var(--amber)'}">${overdue?'Follow-up is overdue - '+followLabel(l.follow):'Follow-up is due today'}</span></div></div>`:'';
  const followBox=`<div class="card pad" style="box-shadow:none"><div class="flex ac jb" style="flex-wrap:wrap;gap:8px"><div><div class="muted" style="font-size:11.5px;font-weight:600">Next follow-up</div><div style="font-size:14px;font-weight:600;color:${l.follow!=null?(l.follow<0?'var(--red)':l.follow===0?'var(--amber)':'var(--slate-900)'):'var(--slate-500)'};margin-top:2px">${l.follow!=null?followLabel(l.follow)+' · '+(l.followType||'Scheduled'):(l.followType==='Follow later'?'Follow later':'Not scheduled')}</div></div>
    <div class="flex ac" style="gap:6px;flex-wrap:wrap"><button class="btn sm" onclick="followLater('${l.name}')">+7 days</button><button class="btn sm" onclick="quickSchedule('${l.name}',1)">Tomorrow</button><button class="btn sm" onclick="quickSchedule('${l.name}',3)">+3 days</button><button class="btn sm primary" onclick="scheduleFollow('${l.name}')">Custom...</button></div></div></div>`;
  const timelineHtml=`<div class="card pad" style="box-shadow:none;padding:6px 12px">${l.log.map(e=>`<div class="lrow" style="border-bottom:1px solid var(--line-soft);padding:9px 0"><span class="kp-ic" style="width:28px;height:28px;background:var(--surface-3);color:var(--slate-500)">${ic('comm',14)}</span><div style="flex:1;font-size:13px;color:var(--slate-700)">${e[0]}</div><span class="muted" style="font-size:11px">${e[1]}</span></div>`).join('')}</div>`;
  const manage=`<div class="flex ac" style="gap:8px;flex-wrap:wrap"><button class="btn sm" onclick="logFollowup('${l.name}')">${ic('comm',13)} Log note</button>${won?'':`<button class="btn sm" onclick="markLost('${l.name}')">Mark lost</button>`}<button class="btn sm" onclick="archiveLead('${l.name}')">Archive</button></div>`;
  return detailDrawer({title:l.name,sub:'Prospective · '+l.grade,color:CRMCOL[l.stage],badge:l.temp,
    stats:[['Stage',l.stage,won?'green':'blue'],['Source',l.source,'amber'],['Owner',l.owner.split(' ')[0],'blue'],['Follow-up',l.follow!=null?followLabel(l.follow):'—',followColor(l.follow)]],
    sections:[
      {h:'Contact',rows:[['Guardian',l.guardian],['Phone',l.phone],['Enquiry date',l.date],['Temperature',l.temp]]},
      {h:'Follow-up',html:reminderBanner+followBox},
      {h:'Communication - call, WhatsApp, email & history in one place',html:crmOutreachPanel(name)+timelineHtml},
      {h:'Pipeline',html:pipeline},
      {h:'Manage',html:manage}],
    footer:won?[['Log follow-up','logFollowup(\''+name+'\')'],['Enrolled','closeDrawer();toast(\''+l.name+' already enrolled\')',true]]
      :l.stage==='Application'?[['Log follow-up','logFollowup(\''+name+'\')'],['Convert to application','convertLead(\''+name+'\')',true]]
      :[['Log follow-up','logFollowup(\''+name+'\')'],['Advance stage','advanceLead(\''+name+'\')',true]]})}
window.quickSchedule=function(name,days){const l=CRMLEADS.find(x=>x.name===name);if(!l)return;l.follow=days;l.followType='Scheduled';l.idle=0;l.log.unshift(['Follow-up scheduled - '+(days===1?'tomorrow':'in '+days+' days'),'Today']);
 logAudit('Scheduled follow-up - '+name+' ('+days+'d)','CRM');render();if($('#drawer').classList.contains('on'))openDrawer(crmDetail(name));toast('Follow-up scheduled')};
function advanceLead(name){const l=CRMLEADS.find(x=>x.name===name);if(!l)return;const i=CRMSTAGES.indexOf(l.stage);if(i<CRMSTAGES.length-1){l.stage=CRMSTAGES[i+1];l.idle=0;l.log.unshift(['Advanced to '+l.stage,'Today']);render();openDrawer(crmDetail(name));toast(l.name+' → '+l.stage)}}
function logFollowup(name){state._crmActive=name;formDrawer('Log activity',name,[{label:'Type',key:'type',opts:['Call','Email','SMS','Meeting','Campus tour','Note']},{label:'Outcome',key:'outcome',opts:['Interested','Needs info','Booked tour','Not reachable','Not interested']},{label:'Notes',area:true,key:'notes',req:true},{label:'Update temperature',key:'temp',opts:['Hot','Warm','Cold'],ph:'Keep current'}],'Save activity','','saveFollowup')}
window.saveFollowup=function(v){const l=CRMLEADS.find(x=>x.name===state._crmActive);if(!l){closeDrawer();return false}
  const entry=(v.type||'Note')+(v.outcome?' · '+v.outcome:'')+(v.notes?' — '+v.notes:'');l.log.unshift([entry,'Today']);if(v.temp)l.temp=v.temp;l.idle=0;
  closeDrawer();render();openDrawer(crmDetail(l.name));toast('Activity logged');return false};
function scheduleFollow(name){state._crmActive=name;const l=CRMLEADS.find(x=>x.name===name);const suggestedNote=l?('Follow up with '+l.guardian+' about '+l.name+"'s "+l.grade+' '+(l.stage==='New'?'enquiry':l.stage==='Toured'?'visit':'application')+'.'):'';
 formDrawer('Schedule follow-up',name+' - pick a date or use a quick option',[
  {label:'Follow-up date',key:'date',type:'date',req:true},
  {label:'Type',key:'type',opts:['Call','Email','WhatsApp','Meeting','Campus tour','Assessment']},
  {label:'Note',key:'note',area:true,val:suggestedNote,aiContext:'crm-followup',maxlen:400}
 ],'Schedule follow-up','','saveSchedule')}
window.saveSchedule=function(v){const l=CRMLEADS.find(x=>x.name===state._crmActive);if(!l){closeDrawer();return false}
  let off=3;if(v.date){const d=new Date(v.date),now=new Date();now.setHours(0,0,0,0);const o=Math.round((d-now)/86400000);if(!isNaN(o))off=o}
  l.follow=off;l.followType='Scheduled';l.idle=0;l.log.unshift([(v.type||'Follow-up')+' scheduled'+(v.note?' — '+v.note:''),'Today']);
  closeDrawer();render();if($('#drawer').classList.contains('on'))openDrawer(crmDetail(l.name));toast('Follow-up scheduled · '+l.name);return false};
function followLater(name){const l=CRMLEADS.find(x=>x.name===name);if(!l)return;l.follow=7;l.followType='Follow later';l.idle=0;l.log.unshift(['Snoozed — follow later (7 days)','Today']);render();if($('#drawer').classList.contains('on'))openDrawer(crmDetail(name));toast(l.name+' — follow later in 7 days')}
function archiveLead(name){const l=CRMLEADS.find(x=>x.name===name);if(!l)return;l.archived=true;l.archReason=l.archReason||('Archived — '+(l.idle>=CRM_STALE?'stale ('+l.idle+'d idle)':'manual')); l.follow=null;l.log.unshift(['Archived','Today']);closeDrawer();render();toast(l.name+' archived')}
function markLost(name){state._crmActive=name;formDrawer('Mark lead as lost',name,[{label:'Reason',key:'reason',opts:['Chose another school','Not reachable','Out of catchment','Budget / affordability','Not interested','Duplicate','Other']},{label:'Notes',key:'note',area:true}],'Mark lost & archive','','saveLost')}
window.saveLost=function(v){const l=CRMLEADS.find(x=>x.name===state._crmActive);if(!l){closeDrawer();return false}l.archived=true;l.archReason=v.reason||'Lost';l.follow=null;l.followType=null;l.log.unshift(['Marked lost — '+(v.reason||'')+(v.note?' · '+v.note:''),'Today']);closeDrawer();render();toast(l.name+' marked lost & archived');return false};
function restoreLead(name){const l=CRMLEADS.find(x=>x.name===name);if(!l)return;l.archived=false;l.archReason=null;l.idle=0;l.follow=null;l.followType=null;l.log.unshift(['Restored to funnel','Today']);render();toast(l.name+' restored to funnel')}
function deleteLead(name){const i=CRMLEADS.findIndex(x=>x.name===name);if(i<0)return;CRMLEADS.splice(i,1);render();toast('Lead permanently deleted · '+name)}
function archiveStale(){const stale=crmActive().filter(isStale);if(!stale.length){toast('No stale leads to archive');return}stale.forEach(l=>{l.archived=true;l.archReason='Auto-archived — stale ('+l.idle+'d idle)';l.follow=null;l.log.unshift(['Auto-archived — stale','Today'])});render();toast(stale.length+' stale lead'+(stale.length>1?'s':'')+' archived')}
function convertLead(name){const l=CRMLEADS.find(x=>x.name===name);if(!l)return;
  if(!ADMISSIONS.find(a=>a.name===l.name)){ADMISSIONS.push({name:l.name,grade:l.grade,stage:'Application',date:'Today',src:l.source,dob:'',guardian:l.guardian,phone:l.phone,docs:admChecklist()});}
  l.stage='Won';l.idle=0;l.log.unshift(['Converted to application','Today']);closeDrawer();toast(l.name+' converted → Admissions pipeline');go('admissions')}
function addLeadForm(){formDrawer('New lead','Enrolment CRM · prospective family',[
  {section:'Prospective student',icon:'students'},
  {label:'Student name',key:'name',req:true,half:true},{label:'Grade of interest',key:'grade',opts:['KG 1','KG 2','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','Grade 10','Grade 11','Grade 12'],half:true},
  {section:'Guardian & contact',icon:'parents'},
  {label:'Guardian name',key:'guardian',half:true},{label:'Phone',type:'tel',key:'phone',half:true},
  {label:'Email',type:'email',key:'email'},
  {section:'Lead details',icon:'crm'},
  {label:'Source',key:'source',opts:['Website','Walk-in','Referral','Agent','Event','Instagram','Facebook','Google'],half:true},{label:'Temperature',key:'temp',opts:['Hot','Warm','Cold'],half:true},
  {label:'Assigned to',key:'owner',opts:['Front Office','Nadia (Admissions)','Principal'],ph:'Front Office'},
  {label:'Schedule first follow-up',key:'followdate',type:'date',half:true},{label:'Notes',area:true,key:'notes',aiContext:'crm-lead-note',maxlen:400}
  ],'Add lead','','addLead')}
window.addLead=function(v){const name=(v.name||'').trim();if(!name){toast('Student name is required');return false}
  let off=null,ft=null;if(v.followdate){const d=new Date(v.followdate),now=new Date();now.setHours(0,0,0,0);const o=Math.round((d-now)/86400000);if(!isNaN(o)){off=o;ft='Scheduled'}}
  CRMLEADS.unshift({name,grade:v.grade||'Grade 1',stage:'New',source:v.source||'Website',phone:v.phone||'—',guardian:v.guardian||'—',owner:v.owner||'Front Office',date:'Today',temp:v.temp||'Warm',idle:0,follow:off,followType:ft,archived:false,log:[[v.notes?('Note: '+v.notes):'Lead captured','Today']]});
  closeDrawer();render();toast('Lead added · '+name);openDrawer(crmDetail(name));return false};

