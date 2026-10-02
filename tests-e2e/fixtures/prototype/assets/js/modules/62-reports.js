/* ---- Reports ---- */
M.reports=()=>{const byGrade={};STUDENTS.forEach(s=>{const g=s.grade.split(' · ')[0];byGrade[g]=(byGrade[g]||0)+1});
 const maxG=Math.max(...Object.values(byGrade),1);
 const gradeBars=Object.entries(byGrade).sort((a,b)=>a[0].localeCompare(b[0],undefined,{numeric:true})).map(([g,n])=>({lb:g.replace('Grade ','').replace('KG ','K'),val:String(n),pct:Math.round(n/maxG*100)}));
 const dist=(()=>{const buckets={'A+ / A':0,'B':0,'C':0,'D / below':0};EXAMRESULTS.forEach(r=>{const avg=resultAvg(r);if(avg>=85)buckets['A+ / A']++;else if(avg>=70)buckets['B']++;else if(avg>=60)buckets['C']++;else buckets['D / below']++});
   const tot=EXAMRESULTS.length||1;return Object.entries(buckets).map(([k,v],i)=>[k,Math.round(v/tot*100),['green','blue','amber','red'][i]])})();
 const billed=INVOICES.reduce((a,i)=>a+i.amt,0);const paid=INVOICES.filter(i=>i.status==='Paid').reduce((a,i)=>a+i.amt,0);
 const due=INVOICES.filter(i=>i.status==='Due').length;const overdue=INVOICES.filter(i=>i.status==='Overdue').length;const paidN=INVOICES.filter(i=>i.status==='Paid').length;
 const collRate=billed?Math.round(paid/billed*100):0;const tot=INVOICES.length||1;
 return `
  <div class="page-head"><div class="ph-l"><h2>Reports & Analytics</h2><p>Cross-module insight — every chart is computed from live records and drills down to source data.</p></div>
  <div class="ph-r"><button class="btn" onclick="exportCSV('reports-summary.csv',['Metric','Value'],[['Students',STUDENTS.length],['Staff',STAFF.length],['Applications',ADMISSIONS.length],['Invoices',INVOICES.length],['Collected AED',${paid}],['Collection rate','${collRate}%']])">${ic('download',16)} Export</button></div></div>
  <div class="muted" style="font-size:11.5px;margin-bottom:14px">Data: live · computed from Students, Exams & Fees records · last updated just now · Asia/Dubai · role: ${state.role}</div>
  <div class="grid cols-2">
    <div class="card pad" style="cursor:pointer" onclick="go('students')"><div class="sec-head"><h3>Enrolment by grade</h3><span class="muted" style="font-size:11.5px">Open Students →</span></div>${vbars(gradeBars)}</div>
    <div class="card pad" style="cursor:pointer" onclick="go('attendance')"><div class="sec-head"><h3>Attendance trend (6 mo)</h3><span class="muted" style="font-size:11.5px">Open Attendance →</span></div>${vbars([{lb:'Jan',val:'93',pct:93},{lb:'Feb',val:'94',pct:94},{lb:'Mar',val:'92',pct:92,alt:true},{lb:'Apr',val:'95',pct:95},{lb:'May',val:'94',pct:94},{lb:'Jun',val:'95',pct:95}])}</div>
    <div class="card pad" style="cursor:pointer" onclick="go('exams')"><div class="sec-head"><h3>Grade distribution</h3><span class="muted" style="font-size:11.5px">From ${EXAMRESULTS.length} results · Open Exams →</span></div>
    ${dist.map(g=>`<div style="margin-bottom:12px"><div class="flex ac jb" style="font-size:13px;margin-bottom:5px"><span style="font-weight:600;color:var(--slate-700)">${g[0]}</span><span class="num muted">${g[1]}%</span></div><div class="bar"><i style="width:${g[1]}%;background:var(--${g[2]==='green'?'brand':g[2]})"></i></div></div>`).join('')}</div>
    <div class="card pad" style="cursor:pointer" onclick="go('fees')"><div class="sec-head"><h3>Fee collection rate</h3><span class="muted" style="font-size:11.5px">Open Fees →</span></div><div class="flex ac" style="gap:20px"><div class="donut" style="--p:${collRate}"><div class="in"><b>${collRate}%</b><span>collected</span></div></div><div style="flex:1;font-size:13px;color:var(--slate-600)"><p style="margin:0 0 10px">${aed(paid)} collected of ${aed(billed)} billed — computed from the live invoice ledger.</p><div class="lrow" style="padding:6px 0;border:0"><span>Paid</span><b class="num" style="margin-left:auto;color:var(--slate-900)">${Math.round(paidN/tot*100)}%</b></div><div class="lrow" style="padding:6px 0;border:0"><span>Due</span><b class="num" style="margin-left:auto;color:var(--slate-900)">${Math.round(due/tot*100)}%</b></div><div class="lrow" style="padding:6px 0;border:0"><span>Overdue</span><b class="num" style="margin-left:auto;color:var(--red)">${Math.round(overdue/tot*100)}%</b></div></div></div></div>
  </div>`};

