/* ---- Curriculum ---- */
let CURRIC_UNITS=[];
function curricUnits(sub){if(!CURRIC_UNITS.length){CURRIC.forEach(c=>{for(let i=1;i<=Math.min(c.units,6);i++)CURRIC_UNITS.push({subject:c.sub,title:'Unit '+i+' — '+['Foundations','Core skills','Application','Analysis','Synthesis','Review'][(i-1)%6],term:i<=3?'Term 1':'Term 2',plannedDate:'0'+(i+3)+' '+['Jan','Feb','Mar','Apr','May','Jun'][i%6],completedDate:i<=c.done/c.units*6?'0'+(i+3)+' '+['Jan','Feb','Mar','Apr','May','Jun'][i%6]:null,outcomes:['Recall key concepts','Apply to worked examples','Evaluate & extend'],framework:'MOE / school-defined',owner:'Subject coordinator'})})}
 return sub?CURRIC_UNITS.filter(u=>u.subject===sub):CURRIC_UNITS}
function curricUnitDetail(subject,title){const u=curricUnits().find(x=>x.subject===subject&&x.title===title);if(!u)return '';
 return detailDrawer({title:u.title,sub:u.subject+' · '+u.term,color:'#2563EB',badge:ic('curric',18),
  stats:[['Framework',u.framework,'blue'],['Owner',u.owner,'green'],['Planned',u.plannedDate,'gray'],['Status',u.completedDate?'Completed':'Planned',u.completedDate?'green':'amber']],
  sections:[{h:'Learning outcomes',rows:u.outcomes.map((o,i)=>['LO-'+(i+1),o])},
   {h:'Coverage',rows:[['Planned date',u.plannedDate],['Actual completion',u.completedDate||'Not yet completed'],['Assessment link','Mapped to Exams & Gradebook subject analysis']]},
   {h:'Resources',rows:[['Attached','Lesson slides, worksheet, rubric (demo)'],['LMS link','See Learning (LMS) module for this subject']]}],
  footer:u.completedDate?[['Reopen coverage',"markUnitPlanned('"+subject+"','"+title.replace(/'/g,"\\'")+"')"],['Close','closeDrawer()',true]]
   :[['Mark completed',"markUnitDone('"+subject+"','"+title.replace(/'/g,"\\'")+"')",true]]})}
window.markUnitDone=function(subject,title){const u=curricUnits().find(x=>x.subject===subject&&x.title===title);if(u){u.completedDate='Today';const c=CURRIC.find(x=>x.sub===subject);if(c&&c.done<c.units)c.done++;logAudit('Marked curriculum unit complete · '+subject+' · '+title,'Curriculum')}closeDrawer();render();toast('Coverage updated · '+title)};
window.markUnitPlanned=function(subject,title){const u=curricUnits().find(x=>x.subject===subject&&x.title===title);if(u){u.completedDate=null;const c=CURRIC.find(x=>x.sub===subject);if(c&&c.done>0)c.done--;logAudit('Reopened curriculum unit · '+subject+' · '+title,'Curriculum')}closeDrawer();render();toast('Unit reopened — coverage recalculated')};
function addUnitForm(){formDrawer('Add curriculum unit','New unit — creates a real coverage record',[
 {label:'Subject',key:'subject',opts:CURRIC.map(c=>c.sub),half:true},{label:'Term',key:'term',opts:['Term 1','Term 2'],half:true},
 {label:'Unit title',key:'title',req:true},{label:'Planned date',key:'date',type:'date'},
 {label:'Learning outcomes',key:'outcomes',area:true,ph:'One per line',aiContext:'curriculum-outcomes',maxlen:400}],'Add unit','','saveUnit')}
window.saveUnit=function(v){const subject=v.subject||CURRIC[0].sub;const title=(v.title||'').trim();if(!title){toast('Unit title is required');return false}
 curricUnits();CURRIC_UNITS.push({subject,title,term:v.term||'Term 2',plannedDate:v.date||'TBC',completedDate:null,outcomes:(v.outcomes||'Recall key concepts').split('\n').filter(Boolean),framework:'School-defined',owner:'Subject coordinator'});
 const c=CURRIC.find(x=>x.sub===subject);if(c)c.units++;logAudit('Added curriculum unit · '+subject+' · '+title,'Curriculum');
 closeDrawer();render();toast('Unit added · '+title);return false};
function curricSubjectsDrawer(){return detailDrawer({title:'All subjects',sub:CURRIC.length+' subjects in the curriculum map',color:'#17A24A',badge:ic('curric',18),
 sections:[{h:'Subjects',html:'<div class="card pad" style="box-shadow:none">'+CURRIC.map(c=>{const pct=Math.round(c.done/c.units*100);return '<div class="lrow" style="cursor:pointer;border-bottom:1px solid var(--line-soft)" onclick="closeDrawer();openDrawer(curricSubjectDetail(\''+c.sub.replace(/\x27/g,"\\\x27")+'\'))"><div style="flex:1"><div style="font-weight:600;color:var(--slate-900);font-size:13px">'+c.sub+'</div><div class="muted" style="font-size:11px">'+c.grades+' - '+c.units+' units</div></div><b class="num">'+pct+'%</b></div>'}).join('')+'</div>'}],
 footer:[['Close','closeDrawer()',true]]})}
function curricUnitsDrawer(){const all=curricUnits();return detailDrawer({title:'All curriculum units',sub:all.length+' units mapped across '+CURRIC.length+' subjects',color:'#2563EB',badge:ic('classes',18),
 sections:[{h:'Units',html:'<div class="card pad" style="box-shadow:none">'+all.map(u=>'<div class="lrow" style="cursor:pointer;border-bottom:1px solid var(--line-soft)" onclick="closeDrawer();openDrawer(curricUnitDetail(\''+u.subject.replace(/\x27/g,"\\\x27")+'\',\''+u.title.replace(/\x27/g,"\\\x27")+'\'))"><div style="flex:1"><div style="font-weight:600;color:var(--slate-900);font-size:13px">'+u.title+'</div><div class="muted" style="font-size:11px">'+u.subject+' - '+u.term+'</div></div>'+(u.completedDate?chip('Done','green'):chip('Planned','amber'))+'</div>').join('')+'</div>'}],
 footer:[['Close','closeDrawer()',true]]})}
function curricCoverageDrawer(){const cov=CURRIC.map(c=>({sub:c.sub,pct:Math.round(c.done/c.units*100)})).sort((a,b)=>a.pct-b.pct);
 return detailDrawer({title:'Coverage by subject',sub:'Lowest coverage first - review pacing where behind plan',color:'#0E7C39',badge:ic('reports',18),
 sections:[{h:'Coverage',html:'<div class="card pad" style="box-shadow:none">'+cov.map(c=>{const hc=c.pct>=90?'green':c.pct>=80?'blue':c.pct>=70?'amber':'red';return '<div style="padding:9px 0;border-bottom:1px solid var(--line-soft)" onclick="closeDrawer();openDrawer(curricSubjectDetail(\''+c.sub.replace(/\x27/g,"\\\x27")+'\'))" style="cursor:pointer"><div class="flex ac jb" style="margin-bottom:5px"><span style="font-weight:600;color:var(--slate-900);font-size:13px">'+c.sub+'</span><b class="num">'+c.pct+'%</b></div>'+cbar(c.pct,hc)+'</div>'}).join('')+'</div>'}],
 footer:[['Close','closeDrawer()',true]]})}
M.curriculum=()=>{const totUnits=CURRIC.reduce((a,c)=>a+c.units,0);const totDone=CURRIC.reduce((a,c)=>a+c.done,0);const cov=totUnits?Math.round(totDone/totUnits*100):0;
 return `
  <div class="page-head"><div class="ph-l"><h2>Curriculum</h2><p>Board framework → grade → subject → term → unit → learning outcomes. Coverage is computed from real unit records.</p></div>
  <div class="ph-r"><button class="btn" onclick="exportCSV('curriculum-map.csv',['Subject','Grades','Units','Completed','Coverage %'],CURRIC.map(c=>[c.sub,c.grades,c.units,c.done,Math.round(c.done/c.units*100)]))">${ic('download',16)} Export map</button><button class="btn primary" onclick="addUnitForm()">${ic('plus',16)} Add unit</button></div></div>
  <div class="grid cols-4" style="margin-bottom:18px">
    ${kpi('curric','#17A24A','Subjects',String(CURRIC.length),null,"openDrawer(curricSubjectsDrawer())")}${kpi('classes','#2563EB','Units mapped',String(totUnits),{dir:'flat',v:'live',note:'computed'},"openDrawer(curricUnitsDrawer())")}
    ${kpi('lms','#B45309','Units completed',String(totDone),null,"openDrawer(curricUnitsDrawer())")}${kpi('reports','#0E7C39','Coverage',cov+'%',{dir:cov>=80?'up':'down',v:'vs plan',note:''},"openDrawer(curricCoverageDrawer())")}</div>
  <div class="card pad" style="margin-bottom:16px"><div class="sec-head" style="margin-bottom:6px"><h3 style="font-size:15px">Term 2 coverage by subject</h3><span class="muted" style="font-size:12px">Click a subject to see its units</span></div>
  <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Subject</th><th>Grades</th><th class="right">Units</th><th class="right">Completed</th><th style="width:240px">Coverage</th></tr></thead><tbody>
  ${CURRIC.map(c=>{const pct=Math.round(c.done/c.units*100);const hc=pct>=90?'green':pct>=80?'blue':pct>=70?'amber':'red';return `<tr style="cursor:pointer" onclick="openDrawer(curricSubjectDetail('${c.sub}'))"><td style="font-weight:600;color:var(--slate-900)">${c.sub}</td><td>${c.grades}</td><td class="right num">${c.units}</td><td class="right num">${c.done}</td>
    <td><div class="flex ac" style="gap:10px">${cbar(pct,hc)}<span class="num" style="font-size:12px;font-weight:600;color:var(--slate-700);min-width:34px">${pct}%</span></div></td></tr>`}).join('')}
  </tbody></table></div></div>
  <div class="muted" style="font-size:11px">Legend: <span style="color:var(--brand)">green</span> ≥90% on track · <span style="color:var(--blue)">blue</span> ≥80% · <span style="color:var(--amber)">amber</span> ≥70% · <span style="color:var(--red)">red</span> below plan — review pacing.</div>`};
function curricSubjectDetail(sub){const units=curricUnits(sub);const c=CURRIC.find(x=>x.sub===sub);
 return detailDrawer({title:sub,sub:c.grades+' · '+c.done+'/'+c.units+' units complete',color:'#17A24A',badge:ic('curric',18),
  sections:[{h:'Units — planned vs completed',html:'<div class="card pad" style="box-shadow:none">'+units.map(u=>'<div class="lrow" style="cursor:pointer;border-bottom:1px solid var(--line-soft)" onclick="openDrawer(curricUnitDetail(\''+sub+'\',\''+u.title.replace(/\x27/g,"\\\x27")+'\'))">'+'<div style="flex:1"><div style="font-weight:600;color:var(--slate-900);font-size:13px">'+u.title+'</div><div class="muted" style="font-size:11px">Planned '+u.plannedDate+'</div></div>'+(u.completedDate?chip('Done '+u.completedDate,'green'):chip('Planned','amber'))+'</div>').join('')+'</div>'}],
  footer:[['Close','closeDrawer()',true]]})}
