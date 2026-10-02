/* ---- Exams ---- */
M.exams=()=>{const tab=getSubTab('exams-v','results');const sch=EXAMSCHEMES[0];
 const allClasses=[...new Set(EXAMRESULTS.map(r=>r.cls))].sort();const clsFilter=state._examCls||'All classes';
 const scoped=clsFilter==='All classes'?EXAMRESULTS:EXAMRESULTS.filter(r=>r.cls===clsFilter);
 const weak=scoped.filter(r=>resultAvg(r)<60);const top=scoped.slice().sort((a,b)=>resultAvg(b)-resultAvg(a))[0];
 return `
  <div class="page-head"><div class="ph-l"><h2>Exams & Gradebook</h2><p>${sch.name} results — ${clsFilter==='All classes'?'all classes':clsFilter}. Configurable scheme, locked once published; rank is always computed, never stored.</p></div>
  <div class="ph-r"><button class="btn" onclick="genReportCardsForm()">${ic('exam',16)} Generate report cards</button>${EXAMSCHEMES[0].locked?`<span class="badge b-red" style="margin-right:8px"><span class="bd"></span>Locked</span>`:''}${canWrite()?`<button class="btn" onclick="manageSubjectsForm()">${ic('curric',16)} Manage subjects</button><button class="btn primary" onclick="enterMarksForm()">${ic('plus',16)} Enter marks</button>`:''}</div></div>
  <div class="field sel" style="margin-bottom:14px;max-width:260px"><select onchange="state._examCls=this.value;render()" aria-label="Filter by class">${['All classes',...allClasses].map(c=>`<option ${c===clsFilter?'selected':''}>${c}</option>`).join('')}</select></div>
  <div class="grid cols-4" style="margin-bottom:16px">
    ${kpi('exam','#17A24A','Class average',(scoped.length?Math.round(scoped.reduce((a,r)=>a+resultAvg(r),0)/scoped.length*10)/10:0)+'%',{dir:'up',v:'vs Term 1',note:''})}
    ${kpi('reports','#2563EB','Pass rate',(scoped.length?Math.round(scoped.filter(r=>resultAvg(r)>=(EXAMSCHEMES[0].passMark||50)).length/scoped.length*100):0)+'%',{dir:'up',v:'≥ '+(EXAMSCHEMES[0].passMark||50)+'%',note:''})}
    ${kpi('students','#E2920C','Need support',String(weak.length),weak.length?{dir:'down',v:'below 60%',note:''}:null,weak.length?"openDrawer(examNeedSupportDrawer('"+clsFilter.replace(/'/g,"\'")+"'))":null)}
    ${kpi('roles','#0E7C39','Top scorer',top?String(resultAvg(top)):'-',top?{dir:'flat',v:top.name.split(' ')[0],note:''}:null,top?"openDrawer(examDetail('"+top.name.replace(/'/g,"\'")+"'))":null)}
  </div>
  ${subTabs('exams-v',[['results','Results','exam'],['schedule','Exam schedule','cal'],['analysis','Subject analysis','reports']])}
  ${tab==='results'?examSchemeCard():''}
  ${tab==='schedule'?examSchedule():tab==='analysis'?examAnalysis():examResults(clsFilter)}`};
function examNeedSupportDrawer(clsFilter){const scoped=clsFilter==='All classes'?EXAMRESULTS:EXAMRESULTS.filter(r=>r.cls===clsFilter);const weak=scoped.filter(r=>resultAvg(r)<60);
 return detailDrawer({title:'Students needing support',sub:clsFilter+' - below 60% average',color:'#E11D2A',badge:ic('students',18),
  sections:[{h:'Students',html:weak.length?'<div class="card pad" style="box-shadow:none">'+weak.map(r=>'<div class="lrow" style="cursor:pointer;border-bottom:1px solid var(--line-soft)" onclick="closeDrawer();openDrawer(examDetail(\''+r.name.replace(/'/g,"\\'")+'\'))"><div style="flex:1"><div style="font-weight:600;color:var(--slate-900);font-size:12.5px">'+r.name+'</div><div class="muted" style="font-size:11px">'+r.cls+'</div></div><b class="num" style="color:var(--red)">'+resultAvg(r)+'%</b></div>').join('')+'</div>':'<div class="muted" style="font-size:12.5px">None.</div>'}],
  footer:[['Close','closeDrawer()',true]]})}
function examResults(clsFilter){clsFilter=clsFilter||'All classes';const scoped=clsFilter==='All classes'?EXAMRESULTS:EXAMRESULTS.filter(r=>r.cls===clsFilter);
 const subj=EXAMSCHEMES[0].subjects;const keys=schemeSubjKeys();
 return `
  <div class="card pad"><div class="flex ac jb" style="margin-bottom:12px;flex-wrap:wrap;gap:8px"><h3 style="font-size:15px">Results · Unit Test 3${clsFilter!=='All classes'?' - '+clsFilter:''}</h3>${segBtns('exams',['By rank','By name'],'By rank')}</div>
  <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Rank</th><th>Student</th><th>Class</th>${subj.map(s=>`<th class="right">${s}</th>`).join('')}<th class="right">Average</th><th>Grade</th></tr></thead><tbody>
  ${scoped.length?scoped.slice().sort((a,b)=>getFilter('exams','By rank')==='By name'?a.name.localeCompare(b.name):a.rank-b.rank).map(r=>{const avg=resultAvg(r);const gc=avg>=85?'b-green':avg>=70?'b-blue':avg>=60?'b-amber':'b-red';
    return `<tr style="cursor:pointer" onclick="openDrawer(examDetail('${r.name}'))"><td><b class="num">#${r.rank}</b></td><td>${cellUser(r.name,'')}</td><td>${r.cls}</td>
    ${keys.map(k=>`<td class="right num">${r[k]||0}</td>`).join('')}
    <td class="right num" style="font-weight:700;color:var(--slate-900)">${avg}%</td><td><span class="badge ${gc}"><span class="bd"></span>${r.grade}</span></td></tr>`}).join(''):`<tr><td colspan="${5+subj.length}"><div class="empty"><div class="ei">${ic('exam',24)}</div><h3>No results for ${clsFilter}</h3><p>No marks entered yet for this class.</p></div></td></tr>`}
  </tbody></table></div></div>`}
function genReportCardsForm(){const allClasses=[...new Set(EXAMRESULTS.map(r=>r.cls))].sort();
 formDrawer('Generate report cards','Choose which class to generate for',[
  {label:'Class',key:'cls',opts:['All classes',...allClasses],req:true,val:state._examCls||'All classes'}
 ],'Generate','','genReportCards')}
window.genReportCards=function(v){const cls=(v&&v.cls)||'All classes';const yr=String(new Date().getFullYear()).slice(2);let n=0;const generated=[];const existed=[];
 EXAMRESULTS.filter(r=>cls==='All classes'||r.cls===cls).forEach(r=>{if(!CERTS.find(c=>c.name===r.name&&c.type.indexOf('Report Card')>-1)){const ref='RC-'+yr+'-'+String(1900+CERTS.length+n);CERTS.unshift({name:r.name,cls:r.cls,type:'Report Card · Term 2',ref,date:'Today',status:'Issued'});generated.push(r.name);n++}else existed.push(r.name)});
 logAudit('Generated '+n+' report card(s) - '+cls,'Exams');closeDrawer();render();openDrawer(reportCardsConfirmation(cls,generated,existed));return false};
function reportCardsConfirmation(cls,generated,existed){return detailDrawer({title:'Report cards generated',sub:cls,color:generated.length?'#17A24A':'#64748B',badge:ic('exam',18),
 stats:[['Generated',String(generated.length),generated.length?'green':'gray'],['Already existed',String(existed.length),'gray'],['Class',cls,'blue']],
 sections:[{h:'Students',html:generated.length?'<div class="card pad" style="box-shadow:none">'+generated.map(n=>'<div class="lrow" style="border-bottom:1px solid var(--line-soft)"><span style="flex:1;font-size:12.5px">'+n+'</span>'+chip('New','green')+'</div>').join('')+'</div>':'<div class="muted" style="font-size:12.5px">No new report cards - all students in '+cls+' already have one for this term.</div>'}],
 footer:[['View in Certificates',"closeDrawer();go('certificates')"],['Done','closeDrawer()',true]]})}
const EXAMSCHED=[['Mathematics','18 Jun','09:00','3 hrs','Hall A'],['Science','20 Jun','09:00','3 hrs','Hall A'],['English','22 Jun','09:00','3 hrs','Hall B'],['Arabic','24 Jun','09:00','2 hrs','Hall B'],['Social Studies','26 Jun','09:00','2 hrs','Hall A'],['Computer Science','28 Jun','09:00','2 hrs','Lab 1']];
function examSchedule(){return `<div class="card pad"><div class="flex ac jb" style="margin-bottom:6px"><h3 style="font-size:15px">Term 2 Final · datesheet</h3><button class="btn sm" onclick="toast('Datesheet published to parents')">${ic('comm',14)} Publish</button></div>
  <div class="muted" style="font-size:12.5px;margin-bottom:12px">All papers begin at 09:00. Students should arrive 20 minutes early with their hall ticket.</div>
  <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Subject</th><th>Date</th><th>Time</th><th>Duration</th><th>Venue</th></tr></thead><tbody>
  ${EXAMSCHED.map(e=>`<tr><td style="font-weight:600;color:var(--slate-900)">${e[0]}</td><td class="num">${e[1]}</td><td class="num">${e[2]}</td><td>${e[3]}</td><td>${e[4]}</td></tr>`).join('')}
  </tbody></table></div></div>`}
function examAnalysis(){const subs=[['Mathematics',83],['Science',80],['English',85],['Arabic',88],['Social Studies',79]];const dist=[['A+ / A',38,'green'],['B',31,'blue'],['C',19,'amber'],['D / below',12,'red']];
  return `<div class="grid cols-2" style="margin-bottom:18px">
    <div class="card pad"><div class="sec-head"><h3>Subject averages</h3></div>${subs.map(s=>`<div style="margin-bottom:13px"><div class="flex ac jb" style="margin-bottom:5px"><span style="font-size:13px;color:var(--slate-700)">${s[0]}</span><span class="num" style="font-weight:600">${s[1]}%</span></div>${cbar(s[1],s[1]>=85?'green':s[1]>=75?'blue':'amber')}</div>`).join('')}</div>
    <div class="card pad"><div class="sec-head"><h3>Grade distribution</h3></div>${dist.map(d=>`<div style="margin-bottom:13px"><div class="flex ac jb" style="margin-bottom:5px"><span style="font-size:13px;color:var(--slate-700)">${d[0]}</span><span class="num" style="font-weight:600">${d[1]}%</span></div>${cbar(Math.min(d[1]*2,100),d[2])}</div>`).join('')}</div>
  </div>
  <div class="card pad"><div class="sec-head"><h3>Students needing support</h3><span class="muted" style="font-size:12px">Below 70% average</span></div>
  <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Student</th><th>Class</th><th class="right">Average</th><th>Weak area</th></tr></thead><tbody>
  ${EXAMRESULTS.filter(r=>resultAvg(r)<70).slice(0,5).map(r=>{const avg=resultAvg(r);const keys=schemeSubjKeys();let weak=EXAMSCHEMES[0].subjects[0];let lo=Infinity;EXAMSCHEMES[0].subjects.forEach((subj,i)=>{const val=r[keys[i]]||0;if(val<lo){lo=val;weak=subj}});return `<tr style="cursor:pointer" onclick="openDrawer(examDetail('${r.name}'))"><td>${cellUser(r.name,'')}</td><td>${r.cls}</td><td class="right num" style="font-weight:700;color:${avg<60?'var(--red)':'var(--amber)'}">${avg}%</td><td>${weak}</td></tr>`}).join('')||`<tr><td colspan="4"><div class="muted" style="padding:8px">All students above threshold.</div></td></tr>`}
  </tbody></table></div></div>`}


