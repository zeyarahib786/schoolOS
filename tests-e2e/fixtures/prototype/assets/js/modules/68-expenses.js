/* ---- Expenses ---- */
let EXPENSE_CLAIMS=[];let EXP_EVIDENCE=null;
function expenseCategories(){return['Facilities & Maintenance','IT & Technology','Academic Resources','Transport & Fuel','Events & Activities']}
function logExpenseForm(){EXP_EVIDENCE=null;openDrawer(logExpenseDrawer())}
function logExpenseDrawer(){const fields=[
 {label:'Description',key:'description',area:true,req:true,ph:'What was this expense for?',aiContext:'general',maxlen:300},
 {label:'Category',key:'category',opts:expenseCategories(),half:true},
 {label:'Amount (AED)',key:'amount',type:'number',req:true,half:true},
 {label:'Vendor',key:'vendor',ph:'e.g. Al Futtaim Office Solutions'}
 ];
 return`<div class="dh"><div style="flex:1"><h3>Log expense</h3><div class="muted" style="font-size:12.5px">Operational spend - evidence is optional but recommended</div></div><button class="iconbtn" onclick="closeDrawer()"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button></div>
 <div class="db form-body">${fields.map(fld).join('')}
 <label class="ffull" style="display:block;margin-bottom:13px"><span style="font-size:12.5px;font-weight:600;color:var(--slate-600);display:block;margin-bottom:5px">Evidence (optional)</span>${expEvidencePicker()}</label>
 </div>
 <div class="df"><button class="btn" onclick="closeDrawer()">Cancel</button><button class="btn primary" onclick="saveExpenseClaim()">Submit for approval</button></div>`}
function expEvidencePicker(){return EXP_EVIDENCE?`<div style="display:flex;align-items:center;gap:10px;border:1px solid var(--line);border-radius:10px;padding:10px 12px"><span style="flex:1;font-size:12.5px;color:var(--slate-700)">📎 ${EXP_EVIDENCE.name}</span><button class="btn sm" onclick="EXP_EVIDENCE=null;openDrawer(logExpenseDrawer())">Remove</button></div>`
 :`<label style="display:flex;flex-direction:column;align-items:center;gap:6px;border:1.5px dashed var(--line);border-radius:10px;padding:16px;cursor:pointer;background:var(--surface-2)"><input type="file" accept="image/*,.pdf" onchange="expEvidencePick(this)" style="display:none">${ic('plus',16)}<span style="font-size:12px;font-weight:600;color:var(--slate-600)">Attach invoice / receipt / pay slip (optional)</span></label>`}
window.expEvidencePick=function(input){const f=input.files&&input.files[0];docReadFile(f,file=>{EXP_EVIDENCE=file;openDrawer(logExpenseDrawer())})};
window.saveExpenseClaim=function(){const v=readForm();if(!(v.description||'').trim()){toast('Description is required');return}const amt=parseInt(v.amount||0,10)||0;if(!amt){toast('Enter an amount');return}
 EXPENSE_CLAIMS.unshift({id:'EXP-'+String(2000+EXPENSE_CLAIMS.length+1),description:v.description,category:v.category||expenseCategories()[0],amount:amt,vendor:v.vendor||'Unspecified',submittedBy:myIdentity(),date:'Today',status:'Pending',evidence:EXP_EVIDENCE});
 logAudit('Logged expense claim - '+aed(amt)+' - '+(v.category||''),'Expenses');closeDrawer();render();toast('Expense submitted for approval')};
function expenseClaimDetail(id){const c=EXPENSE_CLAIMS.find(x=>x.id===id);if(!c)return'';
 return detailDrawer({title:c.id,sub:c.category+' - '+c.status,color:c.status==='Approved'?'#17A24A':c.status==='Rejected'?'#E11D2A':'#E2920C',badge:ic('expense',18),
  stats:[['Amount',aed(c.amount),'blue'],['Status',c.status,c.status==='Approved'?'green':c.status==='Rejected'?'red':'amber'],['Submitted by',c.submittedBy.split(' ')[0],'gray'],['Evidence',c.evidence?'Attached':'None',c.evidence?'green':'gray']],
  sections:[{h:'Details',rows:[['Description',c.description],['Vendor',c.vendor],['Date',c.date]]},
   {h:'Evidence',html:c.evidence?(c.evidence.type&&c.evidence.type.startsWith('image')?`<img src="${c.evidence.url}" style="width:100%;border-radius:10px;border:1px solid var(--line)">`:`<div class="card pad" style="box-shadow:none">📎 ${c.evidence.name}</div>`):'<div class="muted" style="font-size:12.5px">No evidence attached.</div>'}],
  footer:(canWrite()&&c.status==='Pending')?[['Reject',"decideExpenseClaim('"+id+"','Rejected')"],['Approve',"decideExpenseClaim('"+id+"','Approved')",true]]:[['Close','closeDrawer()',true]]})}
window.decideExpenseClaim=function(id,decision){const c=EXPENSE_CLAIMS.find(x=>x.id===id);if(!c)return;c.status=decision;
 if(decision==='Approved'){const e=EXPENSES.find(x=>x.cat===c.category);if(e)e.spent+=c.amount}
 logAudit(decision+' expense claim - '+id+' ('+aed(c.amount)+')','Expenses');closeDrawer();render();toast(id+' '+decision.toLowerCase())};
function expenseClaimsView(){return`<div class="card pad"><div class="sec-head" style="margin-bottom:6px"><h3 style="font-size:15px">Expense claims</h3><span class="muted" style="font-size:12px">${EXPENSE_CLAIMS.length} total</span></div>
 ${EXPENSE_CLAIMS.length?`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Claim</th><th>Description</th><th>Category</th><th class="right">Amount</th><th>Submitted by</th><th>Evidence</th><th>Status</th></tr></thead><tbody>
 ${EXPENSE_CLAIMS.map(c=>`<tr style="cursor:pointer" onclick="openDrawer(expenseClaimDetail('${c.id}'))"><td style="font-weight:600;color:var(--slate-900)">${c.id}</td><td class="muted">${c.description.slice(0,40)}</td><td>${c.category}</td><td class="right num">${aed(c.amount)}</td><td class="muted">${c.submittedBy}</td><td>${c.evidence?'📎':'-'}</td><td>${chip(c.status,c.status==='Approved'?'green':c.status==='Rejected'?'red':'amber')}</td></tr>`).join('')}
 </tbody></table></div>`:`<div class="empty"><div class="ei">${ic('expense',26)}</div><h3>No expense claims yet</h3><p>Submit a claim using "Log expense" above.</p></div>`}</div>`}
M.expenses=()=>{const budget=EXPENSES.reduce((a,b)=>a+b.budget,0),spent=EXPENSES.reduce((a,b)=>a+b.spent,0);
  const pending=EXPENSE_CLAIMS.filter(c=>c.status==='Pending').length;const vendors=new Set(EXPENSE_CLAIMS.map(c=>c.vendor)).size;
  return `<div class="page-head"><div class="ph-l"><h2>Expenses</h2><p>Operational spend, approvals and budget vs. actuals for the academic year.</p></div>
  <div class="ph-r"><button class="btn primary" onclick="logExpenseForm()">${ic('plus',16)} Log expense</button></div></div>
  <div class="grid cols-4" style="margin-bottom:18px">
    ${kpi('expense','#17A24A','Annual budget',aed(budget),null)}${kpi('reports','#2563EB','Spent to date',aed(spent),{dir:'flat',v:Math.round(spent/(budget||1)*100)+'%',note:'of budget'})}
    ${kpi('fees','#E2920C','Pending approval',String(pending),null,"document.getElementById('expClaims').scrollIntoView({behavior:'smooth'})")}${kpi('payroll','#0E7C39','Vendors',String(vendors),null)}</div>
  <div class="card pad" style="margin-bottom:16px"><div class="sec-head" style="margin-bottom:6px"><h3 style="font-size:15px">Budget vs. actual by category</h3></div>
  <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Category</th><th class="right">Budget</th><th class="right">Spent</th><th style="width:240px">Utilisation</th><th>Status</th></tr></thead><tbody>
  ${EXPENSES.map(e=>{const pct=Math.round(e.spent/e.budget*100);const over=e.spent>e.budget;return `<tr style="cursor:pointer" onclick="openDrawer(expenseDetail('${e.cat}'))"><td style="font-weight:600;color:var(--slate-900)">${e.cat}</td><td class="right num">${aed(e.budget)}</td><td class="right num">${aed(e.spent)}</td>
    <td><div class="flex ac" style="gap:10px">${cbar(pct,e.c)}<span class="num" style="font-size:12px;font-weight:600;color:var(--slate-700);min-width:34px">${pct}%</span></div></td>
    <td>${over?chip('Over budget','red'):pct>=90?chip('Near limit','amber'):chip('On track','green')}</td></tr>`}).join('')}
  </tbody></table></div></div>
  <div id="expClaims">${expenseClaimsView()}</div>`};

