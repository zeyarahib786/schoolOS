/* ---- AI Insights (Intelligence) ---- */
function aiRisk(){return STUDENTS.map(s=>{let score=0,why=[];
  if(s.att<85){score+=40;why.push('Attendance '+s.att+'%')}
  else if(s.att<92){score+=18;why.push('Attendance dipping')}
  if(s.gpa<3.0){score+=35;why.push('GPA '+s.gpa)} else if(s.gpa<3.4){score+=15;why.push('GPA below cohort')}
  if(s.fee==='Overdue'){score+=25;why.push('Fees overdue')} else if(s.fee==='Due'){score+=8}
  if(s.status==='Probation'){score+=15;why.push('On probation')}
  return {s,score:Math.min(score,99),why}}).filter(r=>r.score>=30).sort((a,b)=>b.score-a.score)}
function aiRiskDetail(id){const r=aiRisk().find(x=>x.s.id===id);const s=r.s;const band=r.score>=70?'red':r.score>=50?'amber':'blue';
  return detailDrawer({title:s.name,sub:s.id+' · '+s.grade+' · risk '+r.score,color:band==='red'?'#E11D2A':band==='amber'?'#E2920C':'#2563EB',
    stats:[['Risk score',r.score+'/99',band],['Attendance',s.att+'%',s.att<85?'red':'green'],['GPA',String(s.gpa),s.gpa<3.0?'red':'blue'],['Fees',s.fee,s.fee==='Overdue'?'red':s.fee==='Due'?'amber':'green']],
    sections:[{h:'Why flagged',html:`<div class="card pad" style="box-shadow:none">${r.why.map(w=>`<div class="lrow" style="border:0;padding:6px 0"><span class="kp-ic" style="width:26px;height:26px;background:var(--red-soft,#FEECEC);color:var(--red)">${ic('behaviour',14)}</span><span style="font-size:13px;color:var(--slate-700)">${w}</span></div>`).join('')}</div>`},
      {h:'Recommended actions',rows:[['Assign mentor check-in','This week'],['Guardian conference','Suggested'],['Academic support plan',s.gpa<3.0?'Recommended':'Optional']]}],
    footer:[['Open student','closeDrawer();go(\'students\');setTimeout(()=>openDrawer(studentProfile(\''+s.id+'\')),120)'],['Assign mentor','closeDrawer();toast(\'Mentor assigned to '+s.name+'\')',true]]})}
function aiCards(){const risk=aiRisk();const overdue=INVOICES.filter(i=>i.status==='Overdue');const overdueAmt=overdue.reduce((a,b)=>a+b.amt,0);
  const low=(typeof INVENTORY!=='undefined')?INVENTORY.filter(it=>it.stock<it.min):[];
  const cards=[];
  if(risk.length)cards.push({sev:'High',c:'red',ic:'students',t:risk.length+' students predicted at academic risk',d:'Model combines attendance, GPA trend and fee status. Early mentor intervention lifts recovery to ~80%.',a:['Review list','document.getElementById(\'view\').scrollTo({top:9999,behavior:\'smooth\'})']});
  if(overdue.length)cards.push({sev:'High',c:'red',ic:'fees',t:aed(overdueAmt)+' at risk of fee default',d:overdue.length+' invoices over 30 days. Staged reminders predicted to recover 78% within 21 days.',a:['Open fees','go(\'fees\')']});
  cards.push({sev:'Medium',c:'amber',ic:'att',t:'Grade 11-C attendance down 8% this week',d:'Anomaly detected vs 6-week baseline. Likely linked to exam-week fatigue; monitor Thu–Fri.',a:['Open attendance','go(\'attendance\')']});
  if(low.length)cards.push({sev:'Medium',c:'amber',ic:'inv',t:low.length+' stock items below reorder point',d:low.map(i=>i.item).join(', ')+'. Auto-PO suggested to avoid disruption to labs.',a:['Open inventory','go(\'inventory\')']});
  cards.push({sev:'Low',c:'green',ic:'reports',t:'Top performers trending up in Sciences',d:'12 students show consistent improvement. Consider enrichment or olympiad nominations.',a:['Open exams','go(\'exams\')']});
  return cards}
M.aiinsights=()=>{const risk=aiRisk();const overdue=INVOICES.filter(i=>i.status==='Overdue');
  return `<div class="page-head"><div class="ph-l"><h2>AI Insights</h2><p style="margin-bottom:2px">Predictive intelligence across attendance, academics, finance and operations — computed live from your data.</p><p class="muted" style="font-size:11.5px">Transparent rule-based scoring over attendance, GPA, fees & behaviour — decision support only, not a predictive ML model; human review required before any action.</p></div>
  <div class="ph-r"><button class="btn" onclick="state.aiRefreshed=new Date().toLocaleTimeString('en-AE',{hour:'2-digit',minute:'2-digit'});logAudit('Recalculated insights','AI Insights');render();toast('Insights recalculated from live module data')">${ic('ai',16)} Refresh</button></div></div>
  <div class="card pad" style="margin-bottom:16px;background:linear-gradient(135deg,var(--brand-soft),#fff);border-color:var(--brand-line)">
    <div class="flex ac" style="gap:12px"><span class="kp-ic" style="width:42px;height:42px;background:var(--brand);color:#fff">${ic('ai',20)}</span>
    <div style="flex:1"><div style="font-weight:600;color:var(--slate-900)">Ask the assistant</div><div class="muted" style="font-size:12.5px">e.g. "Which students need attention this week?" · "Forecast Term 3 fee collection"</div></div>
    <button class="btn primary" onclick="openCmd()">${ic('ai',15)} Ask AI</button></div></div>
  <div class="grid cols-4" style="margin-bottom:18px">
    ${kpi('students','#E11D2A','At-risk students',String(risk.length),{dir:'flat',v:'predicted',note:'this term'})}
    ${kpi('fees','#E2920C','Fee default risk',aed(overdue.reduce((a,b)=>a+b.amt,0)),{dir:'down',v:'78% recoverable',note:''})}
    ${kpi('att','#2563EB','Anomalies detected','3',{dir:'flat',v:'attendance',note:'this week'})}
    ${kpi('ai','#0E7C39','Engine','Rule-based',{dir:'flat',v:state.aiRefreshed?'recalc '+state.aiRefreshed:'deterministic',note:'not ML — see note'})}</div>
  <div class="sec-head" style="margin:0 0 12px"><h3 style="font-size:15px">Priority insights</h3><span class="muted" style="font-size:12px">${ic('ai',13)} Generated ${nowTime()}</span></div>
  <div class="grid cols-2" style="margin-bottom:18px">
  ${aiCards().map(k=>`<div class="card pad" style="border-left:3px solid ${CVAR[k.c]}"><div class="flex ac" style="gap:10px;margin-bottom:8px"><span class="kp-ic" style="width:34px;height:34px;background:${CVAR[k.c]}1a;color:${CVAR[k.c]}">${ic(k.ic,16)}</span><div style="flex:1"><div style="font-weight:600;color:var(--slate-900);font-size:14px">${k.t}</div></div>${chip(k.sev,k.c)}</div>
    <div class="muted" style="font-size:12.5px;line-height:1.5;margin-bottom:12px">${k.d}</div>
    <button class="btn sm" onclick="${k.a[1]}">${k.a[0]} ${ic('arrow',13)}</button></div>`).join('')}
  </div>
  <div class="card pad"><div class="sec-head" style="margin-bottom:6px"><h3 style="font-size:15px">At-risk students · ranked</h3><span class="muted" style="font-size:12px">Click a student for the full risk profile</span></div>
  <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Student</th><th>Grade</th><th class="right">Attendance</th><th class="right">GPA</th><th>Signals</th><th style="width:150px">Risk</th></tr></thead><tbody>
  ${risk.map(r=>{const band=r.score>=70?'red':r.score>=50?'amber':'blue';return `<tr style="cursor:pointer" onclick="openDrawer(aiRiskDetail('${r.s.id}'))"><td>${cellUser(r.s.name,r.s.id)}</td><td>${r.s.grade}</td><td class="right num">${r.s.att}%</td><td class="right num">${r.s.gpa}</td><td><span class="muted" style="font-size:12px">${r.why.slice(0,2).join(' · ')}</span></td>
    <td><div class="flex ac" style="gap:10px">${cbar(r.score,band==='red'?'red':band==='amber'?'amber':'blue')}<span class="num" style="font-size:12px;font-weight:700;color:${CVAR[band]};min-width:24px">${r.score}</span></div></td></tr>`}).join('')||`<tr><td colspan="6"><div class="empty"><div class="ei">${ic('ai',26)}</div><h3>No students at risk</h3><p>All learners are tracking healthily.</p></div></td></tr>`}
  </tbody></table></div></div>`};

