/* ---- Payroll ---- */
M.payroll=()=>{const gross=PAYRUN.reduce((a,b)=>a+b.gross,0),ded=PAYRUN.reduce((a,b)=>a+b.ded,0);
  return `<div class="page-head"><div class="ph-l"><h2>Payroll</h2><p>June 2025 pay run · WPS-ready. Salary structures, allowances and deductions.</p></div>
  <div class="ph-r"><button class="btn" onclick="genWPS()">${ic('download',16)} Generate WPS file</button><button class="btn primary" onclick="runPayroll()">${ic('payroll',16)} Run payroll</button></div></div>
  <div class="grid cols-4" style="margin-bottom:18px">
    ${kpi('payroll','#17A24A','Monthly run',aed(PAYRUN.reduce((a,p)=>a+p.gross,0)),null)}${kpi('staff','#2563EB','Employees',String(STAFF.length),null)}
    ${kpi('expense','#E2920C','Pending',String(PAYRUN.filter(p=>p.status==='Pending').length),{dir:'flat',v:'this run',note:''})}${kpi('reports','#0E7C39','Next run','28 Jun',null)}</div>
  <div class="card pad"><div class="sec-head" style="margin-bottom:6px"><h3 style="font-size:15px">June pay run · sample</h3><span class="muted" style="font-size:12px">Net payable ${aed(gross-ded)}</span></div>
  <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Employee</th><th>Department</th><th>Attendance</th><th class="right">Gross</th><th class="right">Deductions</th><th class="right">Net</th><th>Status</th></tr></thead><tbody>
  ${PAYRUN.map(p=>`<tr style="cursor:pointer" onclick="openDrawer(payDetail('${p.name}'))"><td>${cellUser(p.name,'')}</td><td>${p.dept}</td><td class="muted" style="font-size:12px">${payrollAttendanceCol(p.name)}</td><td class="right num">${aed(p.gross)}</td><td class="right num" style="color:var(--red)">−${aed(p.ded).replace('AED ','')}</td>
    <td class="right num" style="font-weight:700;color:var(--slate-900)">${aed(p.gross-p.ded)}</td><td>${chip(p.status,p.status==='Processed'?'green':'amber')}</td></tr>`).join('')}
  </tbody></table></div></div>`};
window.runPayroll=function(){PAYRUN.forEach(p=>p.status='Processed');render();toast('Payroll processed · '+PAYRUN.length+' employees · '+aed(PAYRUN.reduce((a,b)=>a+(b.gross-b.ded),0))+' net')};
window.genWPS=function(){toast('WPS SIF file generated · ready for bank upload')};

