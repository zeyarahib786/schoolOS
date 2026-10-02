/* ---- Fees ---- */
M.fees=()=>{const total=INVOICES.reduce((a,b)=>a+b.amt,0);const paid=INVOICES.reduce((a,b)=>a+(b.paid||b.status==='Paid'&&b.amt||0),0);const due=INVOICES.filter(i=>i.status==='Due').reduce((a,b)=>a+(b.balance||b.amt),0);const overdue=INVOICES.filter(i=>i.status==='Overdue').reduce((a,b)=>a+(b.balance||b.amt),0);const tab=getSubTab('fees-v','invoices');
  return `<div class="page-head"><div class="ph-l"><h2>Fees & Invoicing</h2><p>Term 2 fee cycle. ${aed(paid)} collected of ${aed(total)} invoiced in this view.</p></div>
  <div class="ph-r"><button class="btn" onclick="sendFeeReminders()">${ic('comm',16)} Send reminders</button><button class="btn primary" onclick="recordPaymentForm()">${ic('plus',16)} Record payment</button></div></div>
  <div class="grid cols-4" style="margin-bottom:16px">
    ${kpi('fees','#17A24A','Collected',aed(paid),{dir:'flat',v:total?Math.round(paid/total*100)+'%':'0%',note:'of billed'})}
    ${kpi('expense','#E2920C','Due',aed(due),{dir:'flat',v:INVOICES.filter(i=>i.status==='Due').length+' invoices',note:''})}
    ${kpi('comm','#E11D2A','Overdue',aed(overdue),{dir:'down',v:INVOICES.filter(i=>i.status==='Overdue').length+' invoices',note:'needs follow-up'})}
    ${kpi('reports','#2563EB','Avg. fee / student',aed(Math.round(total/(STUDENTS.length||1))),null)}
  </div>
  ${subTabs('fees-v',[['invoices','Invoices','fees'],['structure','Fee structure','reports'],['collections','Collections','cert']])}
  ${tab==='structure'?feeStructure():tab==='collections'?feeCollections():feeInvoices()}`};
function feeInvoices(){return `<div class="card pad"><div class="flex ac jb" style="margin-bottom:12px"><h3 style="font-size:15px">Invoices</h3>
  ${segBtns('fees',['All','Due','Overdue'],'All')}</div>
  <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Invoice</th><th>Student</th><th>Description</th><th class="right">Amount</th><th>Due</th><th>Status</th><th></th></tr></thead><tbody>
  ${INVOICES.filter(i=>{const f=getFilter('fees','All');return f==='All'||i.status===f}).map(i=>`<tr style="cursor:pointer" onclick="openDrawer(invoiceDetail('${i.id}'))"><td class="num" style="font-weight:600;color:var(--slate-900)">${i.id}</td><td>${cellUser(i.student,'')}</td><td>${i.term}</td><td class="right num" style="font-weight:700;color:var(--slate-900)">${aed(i.amt)}</td><td class="num">${i.due}</td><td>${feeBadge(i.status)}</td><td class="right">${i.status==='Paid'?`<button class="btn sm" onclick="event.stopPropagation();openDrawer(invoiceDetail('${i.id}'))">Receipt</button>`:`<button class="btn sm primary" onclick="event.stopPropagation();collectFee('${i.id}')">Collect</button>`}</td></tr>`).join('')}
  </tbody></table></div></div>`}
const FEESTRUCT=[['Tuition fee','KG 1 – KG 2',7200],['Tuition fee','Grade 1 – 5',8400],['Tuition fee','Grade 6 – 8',9600],['Tuition fee','Grade 9 – 10',10800],['Tuition fee','Grade 11 – 12',12400],['Transport (one-way)','All grades',2400],['Transport (two-way)','All grades',4200],['Activities & resources','All grades',1800],['Registration (one-time)','New admissions',2500]];
function feeStructure(){return `<div class="card pad"><div class="flex ac jb" style="margin-bottom:6px"><h3 style="font-size:15px">Fee structure · 2025–26</h3><button class="btn sm" onclick="formDrawer('Add fee head','Fee structure',[{label:'Fee head',key:'head',req:true},{label:'Applies to',key:'applies'},{label:'Amount / year (AED)',type:'number',key:'amount'}],'Add fee head','','addFeeHead')">${ic('plus',14)} Add fee head</button></div>
  <div class="muted" style="font-size:12.5px;margin-bottom:12px">Annual fee heads by grade band. Discounts and scholarships are applied per student at invoicing.</div>
  <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Fee head</th><th>Applies to</th><th class="right">Amount / year</th><th class="right">Per term</th></tr></thead><tbody>
  ${FEESTRUCT.map(f=>`<tr><td style="font-weight:600;color:var(--slate-900)">${f[0]}</td><td>${f[1]}</td><td class="right num">${aed(f[2])}</td><td class="right num muted">${aed(Math.round(f[2]/3))}</td></tr>`).join('')}
  </tbody></table></div>
  <div class="grid cols-3" style="margin-top:16px">
    ${miniStat('Sibling discount','10%','green')}${miniStat('Scholarships active','24','blue')}${miniStat('Early-payment rebate','5%','amber')}</div></div>`}
function feeCollections(){const pays=(window.SCHOOLOS_ADAPTER&&window.SCHOOLOS_ADAPTER.feePayments)||[];const total=pays.reduce((a,p)=>a+p.amount,0)||1;const by={};pays.forEach(p=>{by[p.method]=(by[p.method]||0)+p.amount});const methods=['Online portal','Bank transfer','Card','Cash','Cheque'].map((m,i)=>[m,Math.round((by[m]||0)/total*100),['green','blue','amber','gray','gray'][i]]).filter(m=>m[1]||pays.length===0);
  return `<div class="grid cols-2" style="margin-bottom:18px">
    <div class="card pad"><div class="sec-head"><h3>Collections — last 6 months</h3></div>${vbars([{lb:'Jan',val:'1.9M',pct:76},{lb:'Feb',val:'2.0M',pct:80},{lb:'Mar',val:'2.1M',pct:84},{lb:'Apr',val:'1.8M',pct:72,alt:true},{lb:'May',val:'2.2M',pct:88},{lb:'Jun',val:'2.15M',pct:86}])}</div>
    <div class="card pad"><div class="sec-head"><h3>Payment methods</h3></div>${methods.map(m=>`<div style="margin-bottom:13px"><div class="flex ac jb" style="margin-bottom:5px"><span style="font-size:13px;color:var(--slate-700)">${m[0]}</span><span class="num" style="font-weight:600">${m[1]}%</span></div>${cbar(m[1],m[2])}</div>`).join('')}</div>
  </div>
  <div class="card pad"><div class="sec-head"><h3>Recent payments</h3></div>
  <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Receipt</th><th>Student</th><th>Method</th><th class="right">Amount</th><th>Date</th></tr></thead><tbody>
  ${(pays.length?pays:INVOICES.filter(i=>i.status==='Paid').map((i,k)=>({receipt:'RCP-'+(2400+k),student:i.student,method:i.paymentMethod||'—',amount:i.paid||i.amt,date:i.due}))).slice(0,6).map(p=>`<tr><td class="num" style="font-weight:600;color:var(--slate-900)">${p.receipt}</td><td>${cellUser(p.student,'')}</td><td>${p.method}</td><td class="right num" style="font-weight:700">${aed(p.amount)}</td><td class="num muted">${p.date}</td></tr>`).join('')}
  </tbody></table></div></div>`}
