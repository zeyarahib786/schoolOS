/* ---- Reports ---- */
M.reports=()=>{const overview=window.SCHOOLOS_ADAPTER?.reportsOverview;
 const reportLoaded=Boolean(window.SCHOOLOS_ADAPTER?.live?.reports&&overview);
 const byGrade={};(overview?.students?.byGrade||[]).forEach(row=>{const g=String(row._id||'').split(' · ')[0];byGrade[g]=(byGrade[g]||0)+row.count});
 const monthly=overview?.attendance?.monthly||[];
 const trendBars=monthly.map(m=>({lb:new Date(m.month+'-01T00:00:00Z').toLocaleString('en',{month:'short',timeZone:'UTC'}),val:m.rate===null?'No data':m.rate+'%',pct:m.rate||0}));
 const hasAttendance=monthly.some(m=>m.eligible>0);
 const maxG=Math.max(...Object.values(byGrade),1);
 const gradeBars=Object.entries(byGrade).sort((a,b)=>a[0].localeCompare(b[0],undefined,{numeric:true})).map(([g,n])=>({lb:g.replace('Grade ','').replace('KG ','K'),val:String(n),pct:Math.round(n/maxG*100)}));
 const dist=(()=>{const buckets={'A+ / A':0,'B':0,'C':0,'D / below':0};(overview?.exams?.byGrade||[]).forEach(row=>{if(Object.hasOwn(buckets,row._id))buckets[row._id]=row.count});
   const tot=overview?.exams?.resultCount||1;return Object.entries(buckets).map(([k,v],i)=>[k,Math.round(v/tot*100),['green','blue','amber','red'][i]])})();
 const billed=overview?.fees?.billed||0;const paid=overview?.fees?.collected||0;
 const due=overview?.fees?.dueCount||0;const overdue=overview?.fees?.overdueCount||0;const paidN=overview?.fees?.paidCount||0;
 const collRate=billed?Math.round(paid/billed*100):0;const tot=overview?.fees?.invoiceCount||1;
 const feeCurrency=overview?.fees?.currency||'AED';
 const studentCount=(overview?.students?.byStatus||[]).reduce((n,row)=>n+row.count,0);
 return `
  <div class="page-head"><div class="ph-l"><h2>Reports & Analytics</h2><p>Cross-module insight — charts are computed from school records.</p></div>
  <div class="ph-r"><button class="btn" ${reportLoaded?'':'disabled title="Report unavailable"'} onclick="exportCSV('reports-summary.csv',['Metric','Value'],[['Students',${studentCount}],['Staff',${overview?.staff?.count||0}],['Applications',${overview?.applications?.count||0}],['Invoices',${overview?.fees?.invoiceCount||0}],['Collected ${feeCurrency}',${paid}],['Collection rate','${collRate}%']])">${ic('download',16)} Export</button></div></div>
  <div class="muted" style="font-size:11.5px;margin-bottom:14px">Data: ${reportLoaded?'live':'unavailable'} · Students, Exams & ${feeCurrency} Fees · role: ${state.role}</div>
  <div class="grid cols-2">
    <div class="card pad" style="cursor:pointer" onclick="go('students')"><div class="sec-head"><h3>Enrolment by grade</h3><span class="muted" style="font-size:11.5px">Open Students →</span></div>${!reportLoaded?'<div class="muted">Report unavailable</div>':gradeBars.length?vbars(gradeBars):'<div class="muted">No active students</div>'}</div>
    <div class="card pad" style="cursor:pointer" onclick="go('attendance')"><div class="sec-head"><h3>Attendance trend (6 mo)</h3><span class="muted" style="font-size:11.5px">Open Attendance →</span></div>${!reportLoaded?'<div class="muted" style="font-size:12px;padding:25px">Attendance trend unavailable</div>':hasAttendance?vbars(trendBars):'<div class="muted" style="font-size:12px;padding:25px">No attendance marks in the last six months</div>'}</div>
    <div class="card pad" style="cursor:pointer" onclick="go('exams')"><div class="sec-head"><h3>Grade distribution</h3><span class="muted" style="font-size:11.5px">From ${overview?.exams?.resultCount||0} results · Open Exams →</span></div>
    ${!reportLoaded?'<div class="muted">Report unavailable</div>':!overview?.exams?.resultCount?'<div class="muted">No exam results</div>':dist.map(g=>`<div style="margin-bottom:12px"><div class="flex ac jb" style="font-size:13px;margin-bottom:5px"><span style="font-weight:600;color:var(--slate-700)">${g[0]}</span><span class="num muted">${g[1]}%</span></div><div class="bar"><i style="width:${g[1]}%;background:var(--${g[2]==='green'?'brand':g[2]})"></i></div></div>`).join('')}</div>
    <div class="card pad" style="cursor:pointer" onclick="go('fees')"><div class="sec-head"><h3>Fee collection rate</h3><span class="muted" style="font-size:11.5px">Open Fees →</span></div>${!reportLoaded?'<div class="muted">Report unavailable</div>':`<div class="flex ac" style="gap:20px"><div class="donut" style="--p:${collRate}"><div class="in"><b>${collRate}%</b><span>collected</span></div></div><div style="flex:1;font-size:13px;color:var(--slate-600)"><p style="margin:0 0 10px">${aed(paid)} collected of ${aed(billed)} billed — computed from the live invoice ledger.</p><div class="lrow" style="padding:6px 0;border:0"><span>Paid</span><b class="num" style="margin-left:auto;color:var(--slate-900)">${Math.round(paidN/tot*100)}%</b></div><div class="lrow" style="padding:6px 0;border:0"><span>Due</span><b class="num" style="margin-left:auto;color:var(--slate-900)">${Math.round(due/tot*100)}%</b></div><div class="lrow" style="padding:6px 0;border:0"><span>Overdue</span><b class="num" style="margin-left:auto;color:var(--red)">${Math.round(overdue/tot*100)}%</b></div></div></div>`}</div>
  </div>`};
