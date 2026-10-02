/* ---- Surveys & Feedback (Engagement) ---- */
/* ---- Survey templates: pre-built question sets so a survey can be created in seconds instead
   of starting from a blank form, with real scheduling to a specific class or employee group. ---- */
const SURVEY_TEMPLATES={
 'Parent satisfaction':['How satisfied are you with communication from the school? (1-5)','How would you rate the quality of teaching this term? (1-5)','What could we improve?','Would you recommend this school to other parents? (Yes/No)'],
 'Staff pulse check':['How supported do you feel in your role this term? (1-5)','Is your current workload manageable? (1-5)','What would most improve your day-to-day experience?','Any concerns you would like to raise confidentially?'],
 'Student feedback':['How much did you enjoy this unit/term? (1-5)','Which part was most useful?','Which part was least clear?','Any suggestions for next term?'],
 'Event feedback':['How would you rate this event overall? (1-5)','Was the event well organised?','What went well?','What could be improved next time?'],
 'Start from scratch':['']
};
function surveyTemplatePreview(name){return detailDrawer({title:name,sub:'Sample questions - used to prefill a new survey',color:'#7C3AED',badge:ic('survey',18),
 sections:[{h:'Questions',html:'<div class="card pad" style="box-shadow:none">'+SURVEY_TEMPLATES[name].filter(Boolean).map((q,i)=>'<div class="lrow" style="border-bottom:1px solid var(--line-soft)"><span style="flex:1;font-size:12.5px">'+(i+1)+'. '+q+'</span></div>').join('')+'</div>'}],
 footer:[['Use this template',"closeDrawer();newSurveyForm('"+name.replace(/'/g,"\'")+"')",true]]})}
function newSurveyForm(templateName){const t=templateName||'Start from scratch';const grades=[...new Set(STUDENTS.map(s=>s.grade))].sort();const depts=[...new Set(STAFF.map(s=>s.dept))].filter(Boolean);
 formDrawer('New survey',t==='Start from scratch'?'Blank survey - or pick a template from the list':'Using template: '+t,[
  {label:'Title',key:'title',req:true},
  {label:'Audience type',key:'audtype',opts:['All parents','Specific grade (parents)','All staff','Specific department (staff)','Students'],req:true},
  {label:'Grade',key:'grade',opts:grades,showIf:{key:'audtype',equals:'Specific grade (parents)'}},
  {label:'Department',key:'dept',opts:depts,showIf:{key:'audtype',equals:'Specific department (staff)'}},
  {label:'Type',key:'type',opts:['Satisfaction','Pulse / NPS','Feedback','Poll']},
  {label:'How will people respond?',key:'distribution',opts:['Online link - shared via email','Online link - shared via email + WhatsApp','Paper form (manual entry)'],req:true},
  {label:'Questions (one per line)',key:'questions',area:true,val:SURVEY_TEMPLATES[t].join('\n'),aiContext:'general',maxlen:800},
  {label:'Send',key:'sendplan',opts:['Save as draft','Send immediately','Schedule for later']},
  {label:'Scheduled date',key:'schedDate',type:'date',showIf:{key:'sendplan',equals:'Schedule for later'}}
 ],'Create survey','','createSurvey')}
function surveyTemplateLibrary(){return detailDrawer({title:'Survey templates',sub:'Pick a starting point - questions are fully editable after',color:'#7C3AED',badge:ic('survey',18),
 sections:Object.keys(SURVEY_TEMPLATES).map(name=>({h:name,html:'<div class="flex ac jb"><span class="muted" style="font-size:12px">'+(SURVEY_TEMPLATES[name].filter(Boolean).length||0)+' sample question(s)</span><div class="flex ac" style="gap:6px">'+(name!=='Start from scratch'?'<button class="btn sm" onclick="closeDrawer();openDrawer(surveyTemplatePreview(\''+name+'\'))">Preview</button>':'')+'<button class="btn sm primary" onclick="closeDrawer();newSurveyForm(\''+name+'\')">Use</button></div></div>'})),
 footer:[['Close','closeDrawer()',true]]})}
window.createSurvey=function(v){const t=(v.title||'').trim();if(!t){toast('Title is required');return false}
 const audType=v.audtype||'All parents';
 const audience=audType==='Specific grade (parents)'?(v.grade||'A grade')+' parents':audType==='Specific department (staff)'?(v.dept||'A department')+' staff':audType;
 const questions=(v.questions||'').split('\n').map(q=>q.trim()).filter(Boolean);
 const plan=v.sendplan||'Save as draft';const isLive=plan==='Send immediately';const isScheduled=plan==='Schedule for later';
 const sent=isLive?Math.round(Math.random()*80+60):0;
 const surveyId='SUR-'+String(1000+SURVEYS.length+1);const responseLink='https://portal.alnoor.ae/survey/'+surveyId;
 SURVEYS.unshift({title:t,audience,questions,type:v.type||'Feedback',responses:0,sent,status:isLive?'Live':isScheduled?'Scheduled':'Draft',c:isLive?'green':isScheduled?'blue':'gray',schedDate:isScheduled?v.schedDate:null,distribution:v.distribution||'Online link - shared via email',surveyId,responseLink});
 logAudit('Created survey - '+t+' ('+audience+', '+questions.length+' questions)','Surveys');closeDrawer();render();
 toast(isLive?'Survey launched - '+audience:isScheduled?'Survey scheduled for '+(v.schedDate||'later'):'Survey saved as draft');return false};
window.sendSurveyReminder=function(title,channel){const s=SURVEYS.find(x=>x.title===title);if(!s)return;
 logAudit('Sent survey reminder ('+channel+') - '+title+' - '+s.audience,'Surveys');toast('Reminder sent via '+channel+' to '+s.audience)};
window.copySurveyLink=function(title){const s=SURVEYS.find(x=>x.title===title);if(!s)return;
 if(navigator.clipboard&&navigator.clipboard.writeText){navigator.clipboard.writeText(s.responseLink).then(()=>toast('Link copied')).catch(()=>toast('Copy failed'))}else{toast('Link: '+s.responseLink)}
 logAudit('Copied survey link - '+title,'Surveys')};
function surveyDetail(title){const s=SURVEYS.find(x=>x.title===title);const rate=s.sent?Math.round(s.responses/s.sent*100):0;
  return detailDrawer({title:s.title,sub:s.audience,color:s.status==='Live'?'#17A24A':s.status==='Closed'?'#2563EB':s.status==='Scheduled'?'#2563EB':'#64748B',badge:'✦',
    stats:[['Status',s.status,s.status==='Live'?'green':s.status==='Closed'?'blue':s.status==='Scheduled'?'blue':'gray'],['Responses',String(s.responses),'blue'],['Sent',String(s.sent),'blue'],['Rate',rate+'%',rate>=70?'green':rate>=40?'amber':'red']],
    sections:[{h:'Response rate',html:`<div class="card pad" style="box-shadow:none"><div class="flex ac" style="gap:10px">${cbar(rate,rate>=70?'green':rate>=40?'amber':'red')}<span class="num" style="font-weight:700;color:var(--slate-900)">${rate}%</span></div></div>`},
     ...(s.responseLink&&s.status!=='Draft'?[{h:'How people respond',html:`<div class="card pad" style="box-shadow:none"><div class="muted" style="font-size:11.5px;margin-bottom:6px">${s.distribution||'Online link'}</div><div style="font-size:12px;color:var(--brand-deep);word-break:break-all;margin-bottom:10px">${s.responseLink}</div><div class="flex ac" style="gap:6px;flex-wrap:wrap"><button class="btn sm" onclick="copySurveyLink('${title.replace(/'/g,"\\'")}')">Copy link</button><button class="btn sm" onclick="sendSurveyReminder('${title.replace(/'/g,"\\'")}','Email')">Remind via email</button><button class="btn sm" onclick="sendSurveyReminder('${title.replace(/'/g,"\\'")}','WhatsApp')">Remind via WhatsApp</button></div></div>`}]:[]),
     {h:'Questions',html:(s.questions&&s.questions.length)?'<div class="card pad" style="box-shadow:none">'+s.questions.map((q,i)=>'<div class="lrow" style="border-bottom:1px solid var(--line-soft)"><span style="flex:1;font-size:12.5px">'+(i+1)+'. '+q+'</span></div>').join('')+'</div>':'<div class="muted" style="font-size:12.5px">No questions added yet.</div>'},
     {h:'Summary',rows:[['Audience',s.audience],['Type',s.type||'Feedback'],['Distribution',s.distribution||'-'],...(s.schedDate?[['Scheduled for',s.schedDate]]:[]),['Avg. score',s.responses?'4.3 / 5':'—'],['Sentiment',s.responses?'Positive':'—']]}],
    footer:s.status==='Draft'?[['Edit',"closeDrawer();newSurveyForm()"],['Launch survey','launchSurvey(\''+title.replace(/'/g,'')+'\')',true]]:s.status==='Live'?[['Close survey','closeSurvey(\''+title.replace(/'/g,'')+'\')'],['Export results','exportSurvey(\''+title.replace(/'/g,'')+'\')',true]]:[['Export results','exportSurvey(\''+title.replace(/'/g,'')+'\')',true]]})}
window.launchSurvey=function(title){const s=SURVEYS.find(x=>x.title===title);if(!s)return;s.status='Live';s.sent=s.sent||120;s.responses=s.responses||0;s.c='green';
 if(!s.responseLink){s.surveyId=s.surveyId||('SUR-'+String(1000+SURVEYS.indexOf(s)+1));s.responseLink='https://portal.alnoor.ae/survey/'+s.surveyId;s.distribution=s.distribution||'Online link - shared via email'}
 logAudit('Launched survey · '+title,'Surveys');closeDrawer();render();toast('Survey launched · '+title)};
window.closeSurvey=function(title){const s=SURVEYS.find(x=>x.title===title);if(!s)return;s.status='Closed';s.c='blue';logAudit('Closed survey · '+title,'Surveys');closeDrawer();render();toast('Survey closed · '+title)};
window.exportSurvey=function(title){const s=SURVEYS.find(x=>x.title===title);if(!s)return;exportCSV('survey-results.csv',['Survey','Audience','Status','Sent','Responses','Response rate'],[[s.title,s.audience,s.status,s.sent,s.responses,(s.sent?Math.round(s.responses/s.sent*100):0)+'%']])};
M.surveys=()=>{const totResp=SURVEYS.reduce((a,b)=>a+b.responses,0);
  return `<div class="page-head"><div class="ph-l"><h2>Surveys & Feedback</h2><p>Parent, staff and student surveys with response tracking and sentiment.</p></div>
  <div class="ph-r"><button class="btn primary" onclick="newSurveyForm()">${ic('plus',16)} New survey</button><button class="btn" onclick="openDrawer(surveyTemplateLibrary())">${ic('curric',16)} Templates</button></div></div>
  <div class="grid cols-4" style="margin-bottom:18px">
    ${kpi('survey','#17A24A','Active surveys',String(SURVEYS.filter(s=>s.status==='Live').length),null)}${kpi('parents','#2563EB','Total responses',totResp.toLocaleString('en-AE'),{dir:'up',v:'this term',note:''})}
    ${kpi('reports','#0E7C39','Avg. response rate','68%',{dir:'up',v:'+5%',note:''})}${kpi('roles','#E2920C','NPS','+42',{dir:'up',v:'parents',note:''})}</div>
  <div class="card pad"><div class="sec-head" style="margin-bottom:6px"><h3 style="font-size:15px">All surveys</h3></div>
  <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Survey</th><th>Audience</th><th class="right">Responses</th><th style="width:200px">Response rate</th><th>Status</th></tr></thead><tbody>
  ${SURVEYS.map(s=>{const rate=s.sent?Math.round(s.responses/s.sent*100):0;return `<tr style="cursor:pointer" onclick="openDrawer(surveyDetail('${s.title}'))"><td style="font-weight:600;color:var(--slate-900)">${s.title}</td><td>${s.audience}</td><td class="right num">${s.responses}/${s.sent}</td>
    <td><div class="flex ac" style="gap:10px">${cbar(rate,rate>=70?'green':rate>=40?'amber':'blue')}<span class="num" style="font-size:12px;font-weight:600;color:var(--slate-700);min-width:34px">${rate}%</span></div></td><td>${chip(s.status,s.c)}</td></tr>`}).join('')}
  </tbody></table></div></div>`};

