/* ---- Health & Clinic ---- */
M.health=()=>`
  <div class="page-head"><div class="ph-l"><h2>Health & Clinic</h2><p>Clinic visits, medical records, allergies and immunisation tracking.</p></div>
  <div class="ph-r"><button class="btn" onclick="openDrawer(medicalRecordsDirectory())">${ic('students',16)} Records</button><button class="btn primary" onclick="logClinicForm()">${ic('plus',16)} New visit</button></div></div>
  <div class="grid cols-4" style="margin-bottom:18px">
    ${kpi('health','#17A24A','Visits today',String(CLINIC.length),null)}${kpi('comm','#E2920C','Sent home',String(CLINIC.filter(v=>v.outcome==='Sent home').length),null)}
    ${kpi('students','#2563EB','Flagged allergies',String(CAFEALG.length),{dir:'flat',v:'care plans',note:''},"go('cafeteria')")}${kpi('reports','#0E7C39','Immunisation','97%',{dir:'up',v:'compliant',note:''})}</div>
  <div class="card pad"><div class="sec-head" style="margin-bottom:6px"><h3 style="font-size:15px">Today's clinic log</h3></div>
  <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Student</th><th>Class</th><th>Severity</th><th>Reason</th><th>Time</th><th>Status</th></tr></thead><tbody>
  ${CLINIC.map(v=>`<tr style="cursor:pointer" onclick="openDrawer(clinicDetail('${v.name}'))"><td>${cellUser(v.name,'')}</td><td class="num">${v.cls}</td><td>${chip(v.severity||'Routine',v.severity==='Emergency'?'red':v.severity==='Urgent'?'amber':'green')}</td><td>${v.reason}</td><td class="num">${v.time}</td>
    <td>${chip(v.status,v.status==='Resolved'?'green':'amber')}</td></tr>`).join('')}
  </tbody></table></div></div>`;

