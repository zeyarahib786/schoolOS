/* ---- Reusable record detail drawer ---- */
function dRows(rows){return rows.map(r=>`<div class="lrow" style="justify-content:space-between;gap:14px"><span class="muted" style="font-size:12.5px">${r[0]}</span><span style="font-weight:600;color:var(--slate-900);font-size:13px;text-align:right">${r[1]}</span></div>`).join('')}
function detailDrawer(o){
  const c=o.color||avc(o.title);
  const stats=(o.stats&&o.stats.length)?`<div class="grid cols-2" style="gap:12px;margin-bottom:6px">${o.stats.map(s=>miniStat(s[0],s[1],s[2]||'blue')).join('')}</div>`:'';
  const secs=(o.sections||[]).map(sec=>`<h4 style="font-size:13px;margin:18px 0 8px;color:var(--slate-500);text-transform:uppercase;letter-spacing:.05em">${sec.h}</h4>${sec.rows?`<div class="card pad" style="box-shadow:none">${dRows(sec.rows)}</div>`:sec.html||''}`).join('');
  const foot=(o.footer||[]).map(f=>`<button class="btn ${f[2]?'primary':''}" onclick="${f[1]}">${f[0]}</button>`).join('');
  return `<div class="dh"><span class="avatar" style="width:46px;height:46px;font-size:16px;background:${c}22;color:${darken(c,0.4)}">${o.badge||initials(o.title)}</span>
    <div style="flex:1"><h3 style="font-size:17px">${o.title}</h3><div class="muted" style="font-size:12.5px">${o.sub||''}</div></div>
    <button class="iconbtn" onclick="closeDrawer()"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button></div>
  <div class="db">${stats}${secs}</div>
  ${foot?`<div class="df">${foot}</div>`:''}`;
}
/* ---- Reusable content assistant: default messages per context + rewrite/improve within char limit.
   Deterministic, on-page generation (a static frontend cannot safely hold API keys or bypass CORS
   for a live external model) — this is the documented integration seam for a real LLM once a
   backend exists (see docs/WORKFLOW-MAP.md). Applied to every major message/textarea across the app. ---- */
const AI_DEFAULT_MESSAGES={
 'parents-broadcast':'Dear parents,\n\nWe wanted to share an important update from Al Noor International. Please do not hesitate to reach out if you have any questions.\n\nBest regards,\nSchool Administration',
 'staff-message':'Hi,\n\nHope you are doing well. Wanted to check in regarding your current schedule and see if you need any support.\n\nThanks,\n'+((typeof myIdentity==='function')?myIdentity():'Admin'),
 'behaviour-note':'Observed during class today. Discussed with the student and next steps have been agreed. Will follow up as needed.',
 'absence-note':'Requesting leave for the dates above due to a planned family matter. Happy to share supporting documents if required.',
 'crm-followup':'Following up on our last conversation - happy to answer any questions about the admissions process or arrange a campus visit.',
 'bulk-outreach':'Dear parent,\n\nThank you for your interest in Al Noor International. Our admissions team would love to help with any questions about enrolment.\n\nBest regards,\nAdmissions Team',
 'general':'Hello,\n\nJust reaching out with an update. Please let us know if you have any questions.\n\nBest regards',
 'curriculum-outcomes':'Students will be able to recall key concepts, apply them to solve structured problems, and explain their reasoning using appropriate subject vocabulary.',
 'event-details':'Join us for this school event - further details, timing and venue information will be shared closer to the date. All are welcome.',
 'crm-lead-note':'Parent is exploring options for their child and has requested more information about our curriculum and admissions process. Follow up to build on the initial conversation.',
 'admissions-decline-note':'Application reviewed and outcome communicated to the family. Reason and next steps documented for the record.',
 'library-request-note':'Requesting this title for a class project or personal reading - please let me know when it becomes available.'
};
const AI_REWRITE_STYLES=['Formal','Friendly','Concise'];
function aiStripWrapper(text){let t=String(text||'');
 t=t.replace(/^\s*(Dear recipient,|Hi there!|Hello,|Dear [A-Za-z .]+,)\s*/i,'');
 t=t.replace(/\s*(Kind regards\.?|Thanks so much!|Warm regards,[\s\S]*|Best regards,[\s\S]*)\s*$/i,'');
 return t.trim()}
function aiRewriteText(text,style,limit){if(!text||!text.trim())return text;
 const base=aiStripWrapper(text);if(!base)return text;
 const sentences=base.split(/(?<=[.!?])\s+/).filter(Boolean);
 let out;
 if(style==='Concise'){out=sentences.map(s=>s.replace(/\b(please note that|I wanted to|I just wanted to|I would like to)\b/gi,'').replace(/\s{2,}/g,' ').trim()).join(' ');}
 else if(style==='Friendly'){out='Hi there! '+sentences.join(' ')+' Thanks so much!';}
 else{out='Dear recipient,\n\n'+sentences.join(' ')+'\n\nKind regards.';}
 if(limit&&out.length>limit)out=out.slice(0,limit-1).trim()+'…';
 return out;}
function aiAssistBar(taId,context,limit){const style=state._aiStyle&&state._aiStyle[taId]||AI_REWRITE_STYLES[0];
 return `<div class="flex ac" style="gap:6px;flex-wrap:wrap;margin:6px 0 2px">
  <button type="button" class="btn sm" onclick="aiUseDefault('${taId}','${context}')">${ic('ai',12)} Use default message</button>
  <button type="button" class="btn sm" onclick="aiRewrite('${taId}',${limit||500})">${ic('ai',12)} Rewrite (${style})</button>
  <select onchange="aiSetStyle('${taId}',this.value)" style="height:30px;border:1px solid var(--line);border-radius:8px;font-size:11px;padding:0 6px">${AI_REWRITE_STYLES.map(s=>`<option ${s===style?'selected':''}>${s}</option>`).join('')}</select>
  <span class="muted" style="font-size:10px">Smart assistant - on-device, not a live external AI call</span></div>`}
window.aiSetStyle=function(taId,style){state._aiStyle=state._aiStyle||{};state._aiStyle[taId]=style};
window.aiUseDefault=function(taId,context){const ta=document.getElementById(taId);if(!ta)return;ta.value=AI_DEFAULT_MESSAGES[context]||AI_DEFAULT_MESSAGES['general'];ta.dispatchEvent(new Event('input',{bubbles:true}));toast('Default message inserted')};
window.aiRewrite=function(taId,limit){const ta=document.getElementById(taId);if(!ta)return;const style=(state._aiStyle&&state._aiStyle[taId])||AI_REWRITE_STYLES[0];
 const idx=AI_REWRITE_STYLES.indexOf(style);const nextStyle=AI_REWRITE_STYLES[(idx+1)%AI_REWRITE_STYLES.length];
 ta.value=aiRewriteText(ta.value||AI_DEFAULT_MESSAGES['general'],style,limit);
 ta.dispatchEvent(new Event('input',{bubbles:true}));
 state._aiStyle=state._aiStyle||{};state._aiStyle[taId]=nextStyle;
 toast('Rewritten in '+style+' style'+(ta.value.length>=limit-1?' (trimmed to fit limit)':''))};
function staffScheduleView(id){const s=STAFF.find(x=>x.id===id);if(!s)return '';
 if(s.type==='Teaching'){const slots=ttSlotsFor('T',s.name);
  return detailDrawer({title:s.name+' - schedule',sub:s.role+' - '+s.dept,color:'#2563EB',badge:ic('tt',18),
   stats:[['Periods / week',String(slots.length),'blue'],['Busiest day',['Mon','Tue','Wed','Thu','Fri'].map(d=>slots.filter(x=>x.day===d).length).reduce((a,b)=>Math.max(a,b),0)+' periods','amber']],
   sections:[{h:'Weekly timetable',html:slots.length?'<div class="card pad" style="box-shadow:none">'+slots.map(sl=>'<div class="lrow" style="border-bottom:1px solid var(--line-soft)"><div style="flex:1"><div style="font-weight:600;color:var(--slate-900);font-size:12.5px">'+sl.subj+' - '+sl.cls+'</div><div class="muted" style="font-size:11px">'+sl.day+' '+sl.time+' - '+sl.room+'</div></div></div>').join('')+'</div>':'<div class="muted" style="font-size:12.5px">No periods scheduled yet.</div>'}],
   footer:[['Open full timetable',"closeDrawer();go('timetable')",true]]})}
 return detailDrawer({title:s.name+' - schedule',sub:s.role+' - '+s.dept,color:'#2563EB',badge:ic('tt',18),
  sections:[{h:'Standard work schedule',rows:[['Days','Monday - Friday'],['Hours','08:00 - 16:00'],['Department',s.dept],['Status',s.status]]},
   {h:'Note',html:'<div class="muted" style="font-size:12.5px">Non-teaching role - shown as a standard duty roster. Shift changes are managed by department head.</div>'}],
  footer:[['Close','closeDrawer()',true]]})}
function staffMessageForm(id){const s=STAFF.find(x=>x.id===id);if(!s)return;state._staffMsgId=id;
 formDrawer('Message '+s.name,s.role+' - '+s.dept,[
  {label:'Subject',key:'subject',val:'Checking in'},
  {label:'Message',key:'message',area:true,val:AI_DEFAULT_MESSAGES['staff-message'],aiContext:'staff-message',maxlen:500}
 ],'Send message','','sendStaffMessage')}
window.sendStaffMessage=function(v){const s=STAFF.find(x=>x.id===state._staffMsgId);if(!s)return false;
 const email=s.name.toLowerCase().replace(/[^a-z]+/g,'.')+'@alnoor.ae';
 window.open('mailto:'+email+'?subject='+encodeURIComponent(v.subject||'Message')+'&body='+encodeURIComponent(v.message||''),'_blank');
 logAudit('Messaged staff - '+s.name,'Staff & HR');closeDrawer();toast('Message sent to '+s.name);return false};
function staffChecklist(){return [['Offer letter accepted',false],['Employment contract signed',false],['Documents verified (passport, certificates)',false],['Visa / labour card processed',false],['IT account & email setup',false],['Induction & orientation',false]].map(d=>({label:d[0],done:d[1]}))}
function staffInit(s){if(s.status==='Onboarding'&&!s.onboarding)s.onboarding=staffChecklist();return s}
window.toggleStaffTask=function(id,idx){const s=STAFF.find(x=>x.id===id);staffInit(s);s.onboarding[idx].done=!s.onboarding[idx].done;openDrawer(staffProfile(id))}
window.activateStaff=function(id){const s=STAFF.find(x=>x.id===id);staffInitDocs(s);if(!staffDocsDone(s)){toast('Attach all required documents first');setSubTab&&0;openDrawer(staffProfile(id));return}if(s.onboarding&&!s.onboarding.every(t=>t.done)){toast('Complete all onboarding tasks first');return}s.status='Active';render();openDrawer(staffProfile(id));toast(s.name+' is now an active employee')}
window.createStaff=function(v){const name=((v.first_name||'').trim()+' '+(v.last_name||'').trim()).trim()||(v.name||'').trim();if(!name){toast('Employee name is required');return false}
  const docs=docsFromBuffer(STAFF_DOCS);const reqDocsIn=docs.filter(d=>d.req).every(d=>d.done);
  const chk=staffChecklist();if(reqDocsIn){const di=chk.findIndex(t=>/Documents verified/i.test(t.label));if(di>=0)chk[di].done=true;}
  const id=nextNum(STAFF,'EMP');STAFF.push({id,name,role:v.role||'Staff',dept:v.dept||'Administration',type:v.type||'Teaching',phone:v.phone||'—',status:'Onboarding',joined:'Today',onboarding:chk,docs,qualification:v.qualification||'',id_no:v.id_no||'',nationality:v.nationality||'',emp_type:v.emp_type||'Full-time'});
  closeDrawer();render();toast(name+' added · onboarding started ('+id+')');openDrawer(staffProfile(id));return false}
function staffProfile(id){const s=staffInit(staffInitDocs(STAFF.find(x=>x.id===id)));const onb=s.status==='Onboarding';
  const sections=[{h:'Contact',rows:[['Phone',s.phone],['Email',s.name.toLowerCase().replace(/[^a-z]+/g,'.')+'@alnoor.ae'],['Nationality',s.nationality||'—'],['ID / passport',s.id_no||'—']]}];
  if(onb){const done=s.onboarding.filter(t=>t.done).length;sections.push({h:'Onboarding checklist',html:checklistHtml(s.onboarding,'window.toggleStaffTask.bind(null,\''+id+'\')')});
    const dn=s.docs.filter(d=>d.done).length,dpend=s.docs.filter(d=>d.req&&!d.done).length;
    sections.push({h:'Documents · '+dn+'/'+s.docs.length+(dpend?' · '+dpend+' required pending':''),html:docRecordHtml(s.docs,'staffDoc',id)});}
  else{sections.push({h:'This term',rows:[['Classes taught',s.type==='Teaching'?'5':'—'],['Attendance','98%'],['Leave balance','12 days']]});
    if(s.docs&&s.docs.some(d=>d.file||d.done))sections.push({h:'Documents on file',html:docRecordHtml(s.docs,'staffDoc',id)});}
  const footer=onb?[[ic('comm',16)+' Message',"staffMessageForm('"+id+"')"],['Activate employee','activateStaff(\''+id+'\')',true]]
                  :[['View schedule',"openDrawer(staffScheduleView('"+id+"'))"],[ic('comm',16)+' Message',"staffMessageForm('"+id+"')",true]];
  return detailDrawer({title:s.name,sub:s.id+' · '+s.role,color:avc(s.name),
    stats:[['Department',s.dept,'blue'],['Type',s.type,s.type==='Teaching'?'green':'amber'],['Status',s.status,s.status==='Active'?'green':'amber'],[onb?'Joined':'Employee ID',onb?(s.joined||'Today'):s.id,'blue']],
    sections,footer})}
function invoiceDetail(id){const i=INVOICES.find(x=>x.id===id);
  return detailDrawer({title:i.student,sub:i.id+' · '+i.term,color:i.status==='Paid'?'#17A24A':i.status==='Overdue'?'#E11D2A':'#E2920C',
    stats:[['Amount',aed(i.amt),'blue'],['Status',i.status,i.status==='Paid'?'green':i.status==='Overdue'?'red':'amber'],['Due date',i.due,'amber'],['Invoice',i.id,'blue']],
    sections:[{h:'Breakdown',rows:[['Tuition fee',aed(Math.round(i.amt*0.82))],['Transport',aed(Math.round(i.amt*0.12))],['Activities',aed(Math.round(i.amt*0.06))],['Total',aed(i.amt)]]}],
    footer:i.status==='Paid'?[['Download receipt',"downloadReceipt('"+id+"')",true]]:[['Send reminder',"sendFeeReminderOne('"+id+"')"],['Collect payment','collectFee(\''+i.id+'\')',true]]})}
function downloadReceipt(id){const i=INVOICES.find(x=>x.id===id);if(!i)return;
 const html='<html><head><meta charset="utf-8"><title>Receipt '+i.id+'</title></head><body style="font-family:Arial,sans-serif;padding:40px;max-width:600px;margin:0 auto">'
  +'<h2 style="color:#0E7C39">Al Noor International</h2><p style="color:#666">Official Payment Receipt</p><hr>'
  +'<table style="width:100%;margin-top:20px"><tr><td><b>Receipt</b></td><td style="text-align:right">'+i.id+'</td></tr>'
  +'<tr><td><b>Student</b></td><td style="text-align:right">'+i.student+'</td></tr>'
  +'<tr><td><b>Term</b></td><td style="text-align:right">'+i.term+'</td></tr>'
  +'<tr><td><b>Tuition fee</b></td><td style="text-align:right">'+aed(Math.round(i.amt*0.82))+'</td></tr>'
  +'<tr><td><b>Transport</b></td><td style="text-align:right">'+aed(Math.round(i.amt*0.12))+'</td></tr>'
  +'<tr><td><b>Activities</b></td><td style="text-align:right">'+aed(Math.round(i.amt*0.06))+'</td></tr>'
  +'<tr><td style="padding-top:10px"><b>Total paid</b></td><td style="text-align:right;padding-top:10px"><b>'+aed(i.amt)+'</b></td></tr></table>'
  +'<p style="margin-top:30px;color:#666;font-size:12px">This is a system-generated receipt.</p></body></html>';
 logAudit('Downloaded receipt - '+i.id,'Fees');downloadDoc('Receipt_'+i.id+'.html',html)}
window.sendFeeReminderOne=function(id){const i=INVOICES.find(x=>x.id===id);if(!i)return;logAudit('Sent fee reminder - '+i.student+' ('+i.id+')','Fees');closeDrawer();toast('Reminder sent to '+i.student)};
function collectFee(id){const i=INVOICES.find(x=>x.id===id);if(i){i.status='Paid';}closeDrawer();render();toast('Payment collected · '+id+' marked paid')}
function staffAttendanceDaysThisMonth(name){const a=STAFF_ATTENDANCE[name];const base=22;
 if(!a)return{present:base-1,absent:1,note:'Not marked today'};
 if(a.status==='Present')return{present:base,absent:0,note:'On track'};
 if(a.status==='Remote')return{present:base,absent:0,note:'Remote - counted present'};
 return{present:base-1,absent:1,note:'1 late/absence this month'};}
function payrollAttendanceCol(name){const d=staffAttendanceDaysThisMonth(name);return d.present+'/'+(d.present+d.absent)+' days'}
function payDetail(name){const p=PAYRUN.find(x=>x.name===name);const att=staffAttendanceDaysThisMonth(name);return detailDrawer({title:p.name,sub:p.dept+' · Term 2 payroll',color:'#0E7C39',
  stats:[['Gross',aed(p.gross),'blue'],['Deductions',aed(p.ded),'amber'],['Net pay',aed(p.gross-p.ded),'green'],['Status',p.status,'green']],
  sections:[{h:'Breakdown',rows:[['Basic salary',aed(Math.round(p.gross*0.6))],['Allowances',aed(Math.round(p.gross*0.4))],['Deductions','−'+aed(p.ded)],['Net pay',aed(p.gross-p.ded)]]},
   {h:'Attendance this month',rows:[['Days present',String(att.present)],['Days absent/late',String(att.absent)],['Note',att.note],['Impact on deductions',att.absent>0?'Included in deductions above':'No attendance-related deduction']]}],
  footer:[['Download payslip',"downloadPayslip('"+name.replace(/'/g,"\\'")+"')",true]]})}
function downloadPayslip(name){const p=PAYRUN.find(x=>x.name===name);if(!p)return;const net=p.gross-p.ded;
 const html='<html><head><meta charset="utf-8"><title>Payslip - '+p.name+'</title></head><body style="font-family:Arial,sans-serif;padding:40px;max-width:600px;margin:0 auto">'
  +'<h2 style="color:#0E7C39">Al Noor International</h2><p style="color:#666">Payslip - Term 2</p><hr>'
  +'<table style="width:100%;margin-top:20px"><tr><td><b>Employee</b></td><td style="text-align:right">'+p.name+'</td></tr>'
  +'<tr><td><b>Department</b></td><td style="text-align:right">'+p.dept+'</td></tr>'
  +'<tr><td><b>Basic salary</b></td><td style="text-align:right">'+aed(Math.round(p.gross*0.6))+'</td></tr>'
  +'<tr><td><b>Allowances</b></td><td style="text-align:right">'+aed(Math.round(p.gross*0.4))+'</td></tr>'
  +'<tr><td><b>Deductions</b></td><td style="text-align:right">-'+aed(p.ded)+'</td></tr>'
  +'<tr><td style="padding-top:10px"><b>Net pay</b></td><td style="text-align:right;padding-top:10px"><b>'+aed(net)+'</b></td></tr></table>'
  +'<p style="margin-top:30px;color:#666;font-size:12px">This is a system-generated payslip.</p></body></html>';
 logAudit('Downloaded payslip - '+name,'Payroll');downloadDoc('Payslip_'+name.replace(/\s+/g,'_')+'.html',html)}
function expenseDetail(cat){const e=EXPENSES.find(x=>x.cat===cat);const pct=Math.round(e.spent/e.budget*100);return detailDrawer({title:e.cat,sub:'Budget line · Term 2',color:e.spent>e.budget?'#E11D2A':'#17A24A',
  stats:[['Budget',aed(e.budget),'blue'],['Spent',aed(e.spent),pct>90?'red':'green'],['Remaining',aed(e.budget-e.spent),'green'],['Utilised',pct+'%',pct>90?'amber':'green']],
  sections:[{h:'Notes',rows:[['Approval','Auto-approved < AED 5,000'],['Owner','Operations'],['Last entry',EXPENSE_CLAIMS.find(c=>c.category===cat)?EXPENSE_CLAIMS.find(c=>c.category===cat).date:'None yet']]}],
  footer:[['View transactions',"closeDrawer();openDrawer(expenseCategoryLedger('"+cat.replace(/'/g,"\\'")+"'))"],['Log expense',"closeDrawer();logExpenseForm()",true]]})}
function expenseCategoryLedger(cat){const claims=EXPENSE_CLAIMS.filter(c=>c.category===cat);
 return detailDrawer({title:cat+' - transactions',sub:claims.length+' claim(s) logged against this category',color:'#2563EB',badge:ic('expense',18),
  sections:[{h:'Claims',html:claims.length?'<div class="card pad" style="box-shadow:none">'+claims.map(c=>'<div class="lrow" style="cursor:pointer;border-bottom:1px solid var(--line-soft)" onclick="closeDrawer();openDrawer(expenseClaimDetail(\''+c.id+'\'))"><div style="flex:1"><div style="font-weight:600;color:var(--slate-900);font-size:12.5px">'+c.description.slice(0,40)+'</div><div class="muted" style="font-size:11px">'+c.vendor+' - '+c.date+'</div></div><b class="num">'+aed(c.amount)+'</b></div>').join('')+'</div>':'<div class="muted" style="font-size:12.5px">No claims logged against this category yet.</div>'}],
  footer:[['Log new expense',"closeDrawer();logExpenseForm()",true]]})}
function inventoryDetail(item){const it=INVENTORY.find(x=>x.item===item);if(!it)return '';const low=it.stock<it.min;
 return detailDrawer({title:it.item,sub:it.sku+' - '+it.cat,color:low?'#E11D2A':'#17A24A',
  stats:[['In stock',String(it.stock),low?'red':'green'],['Reorder min',String(it.min),'amber'],['Value',aed(it.stock*it.unitCost),'blue'],['Condition',it.condition,it.condition==='Damaged'?'red':it.condition==='Worn'?'amber':'green']],
  sections:[{h:'Stock details',rows:[['Location',it.location],['Supplier',it.supplier],['Unit cost',aed(it.unitCost)],['Last counted',it.lastCounted],['Warranty',it.warranty||'-']]},
   {h:'Recent movements',html:(it.movements&&it.movements.length)?'<div class="card pad" style="box-shadow:none">'+it.movements.map(m=>'<div class="lrow" style="border-bottom:1px solid var(--line-soft)"><div style="flex:1"><div style="font-weight:600;color:var(--slate-900);font-size:12.5px">'+m.type+' - '+(m.qty>0?'+':'')+m.qty+'</div><div class="muted" style="font-size:11px">'+m.note+' - '+m.date+'</div></div></div>').join('')+'</div>':'<div class="muted" style="font-size:12.5px">No movements recorded yet.</div>'}],
  footer:canWrite()?[['Adjust stock',"adjustStockForm('"+item.replace(/'/g,"\'")+"')"],['Raise purchase order',"raisePOForm('"+item.replace(/'/g,"\'")+"')",true]]:[['Close','closeDrawer()',true]]})}
function adjustStockForm(item){state._invAdjItem=item;formDrawer('Adjust stock',item,[
 {label:'Change type',key:'type',opts:['Received shipment','Issued to classroom','Damaged / written off','Stock count correction']},
 {label:'Quantity (+ to add, - to remove)',key:'qty',type:'number',req:true},
 {label:'Note',key:'note',area:true}],'Apply adjustment','','saveStockAdjustment')}
window.saveStockAdjustment=function(v){const it=INVENTORY.find(x=>x.item===state._invAdjItem);if(!it)return false;const qty=parseInt(v.qty,10);if(!qty){toast('Enter a non-zero quantity');return false}
 it.stock=Math.max(0,it.stock+qty);it.movements=it.movements||[];it.movements.unshift({date:'Today',type:v.type||'Adjustment',qty,note:v.note||''});it.lastCounted='Today';
 logAudit('Adjusted stock - '+it.item+' ('+(qty>0?'+':'')+qty+')','Inventory');closeDrawer();render();openDrawer(inventoryDetail(it.item));toast('Stock updated - '+it.item+' now at '+it.stock);return false};
function raisePOForm(item){const suppliers=[...new Set(INVENTORY.map(i=>i.supplier))];
 formDrawer('Raise purchase order','List each item on its own line: "Item name, quantity"',[
  {label:'Supplier',key:'supplier',opts:suppliers,req:true},
  {label:'Expected delivery',key:'expected',type:'date',half:true},{label:'Line items',key:'lines',area:true,req:true,val:item?item+', '+Math.max(10,((INVENTORY.find(i=>i.item===item)||{}).min||10)):''},
  {label:'Notes',key:'notes',area:true,aiContext:'general',maxlen:300}
 ],'Raise PO','','saveRaisePO')}
window.saveRaisePO=function(v){const lines=(v.lines||'').split('\n').map(l=>l.trim()).filter(Boolean);
 if(!lines.length){toast('Add at least one line item');return false}
 const items=lines.map(line=>{const[name,qty]=line.split(',').map(x=>(x||'').trim());const inv=INVENTORY.find(i=>i.item.toLowerCase()===name.toLowerCase());return{item:name,qty:parseInt(qty,10)||1,unitCost:inv?inv.unitCost:0}});
 const po={id:'PO-'+String(1000+PURCHASE_ORDERS.length+1),supplier:v.supplier,items,expected:v.expected||'TBC',status:'Draft',date:'Today',notes:v.notes||''};
 PURCHASE_ORDERS.unshift(po);logAudit('Raised purchase order '+po.id+' - '+items.length+' line item(s)','Inventory');closeDrawer();render();toast('Purchase order '+po.id+' raised - Draft');openDrawer(poDetail(po.id));return false};
function poDetail(id){const po=PURCHASE_ORDERS.find(x=>x.id===id);if(!po)return '';const total=po.items.reduce((a,i)=>a+i.qty*i.unitCost,0);
 return detailDrawer({title:po.id,sub:po.supplier+' - '+po.status,color:po.status==='Received'?'#17A24A':po.status==='Sent'?'#2563EB':po.status==='Cancelled'?'#64748B':'#E2920C',badge:ic('expense',18),
  stats:[['Status',po.status,po.status==='Received'?'green':po.status==='Sent'?'blue':'amber'],['Line items',String(po.items.length),'blue'],['Total',aed(total),'green'],['Expected',po.expected,'gray']],
  sections:[{h:'Items',html:'<div class="card pad" style="box-shadow:none">'+po.items.map(i=>'<div class="lrow" style="border-bottom:1px solid var(--line-soft)"><div style="flex:1"><div style="font-weight:600;color:var(--slate-900);font-size:12.5px">'+i.item+'</div><div class="muted" style="font-size:11px">Qty '+i.qty+' @ '+aed(i.unitCost)+'</div></div><b class="num">'+aed(i.qty*i.unitCost)+'</b></div>').join('')+'</div>'},
   {h:'Notes',html:'<div class="muted" style="font-size:12.5px">'+(po.notes||'No notes')+'</div>'}],
  footer:canWrite()?(po.status==='Draft'?[['Cancel',"cancelPO('"+id+"')"],['Send to supplier',"sendPO('"+id+"')",true]]:po.status==='Sent'?[['Cancel',"cancelPO('"+id+"')"],['Mark received',"receivePO('"+id+"')",true]]:[['Close','closeDrawer()',true]]):[['Close','closeDrawer()',true]]})}
window.sendPO=function(id){const po=PURCHASE_ORDERS.find(x=>x.id===id);if(po)po.status='Sent';logAudit('Sent PO '+id+' to supplier','Inventory');closeDrawer();render();openDrawer(poDetail(id));toast('PO sent to supplier')};
window.cancelPO=function(id){const po=PURCHASE_ORDERS.find(x=>x.id===id);if(po)po.status='Cancelled';logAudit('Cancelled PO '+id,'Inventory');closeDrawer();render();toast('PO cancelled')};
window.receivePO=function(id){const po=PURCHASE_ORDERS.find(x=>x.id===id);if(!po)return;po.status='Received';
 po.items.forEach(li=>{const it=INVENTORY.find(i=>i.item.toLowerCase()===li.item.toLowerCase());if(it){it.stock+=li.qty;it.movements=it.movements||[];it.movements.unshift({date:'Today',type:'Received',qty:li.qty,note:'From '+id});it.lastCounted='Today'}});
 logAudit('Received PO '+id+' - stock updated for '+po.items.length+' item(s)','Inventory');closeDrawer();render();openDrawer(poDetail(id));toast('PO received - stock levels updated')};
function libraryDetail(title){const b=LIBLOANS.find(x=>x.title===title);return detailDrawer({title:b.title,sub:'by '+b.author,color:b.status==='Overdue'?'#E11D2A':'#2563EB',badge:'📖',
  stats:[['Borrower',b.borrower,'blue'],['Class',b.cls,'blue'],['Due',b.due,b.status==='Overdue'?'red':'amber'],['Status',b.status,b.status==='Overdue'?'red':b.status==='Reserved'?'amber':'green']],
  footer:b.status==='Returned'?[['Close','closeDrawer()',true]]:canWrite()?[['Send reminder',"notifyOneOverdue('"+b.title.replace(/'/g,"\\'")+"','"+b.borrower.replace(/'/g,"\\'")+"')"],['Mark returned',"returnBook('"+b.title.replace(/'/g,"\\'")+"','"+b.borrower.replace(/'/g,"\\'")+"')",true]]:[['Close','closeDrawer()',true]]})}
function behaviourDetail(name){const b=BEHAVIOUR.find(x=>x.name===name);const isIncident=b.type==='Incident';
 return detailDrawer({title:b.name,sub:b.cls+' · '+b.date,color:b.c==='green'?'#17A24A':b.c==='red'?'#E11D2A':'#E2920C',
  stats:[['Type',b.type,b.c],['Points',b.pts,b.pts[0]==='+'?'green':'red'],['Severity',b.severity||'-',b.severity==='Serious'?'red':b.severity==='Moderate'?'amber':'gray'],['Status',b.status||'Logged',b.status==='Escalated'?'red':'blue']],
  sections:[{h:isIncident?'Incident record':'Note',rows:isIncident?[['Location',b.location||'-'],['Witness',b.witness||'-'],['Reporter',b.reporter||state.role],['Follow-up owner',b.owner||'Pastoral team'],['Status',b.status||'Logged']]:null,html:isIncident?null:`<div class="card pad" style="box-shadow:none;font-size:13px;color:var(--slate-700)">${b.note}</div>`},
   {h:'Description',html:`<div class="card pad" style="box-shadow:none;font-size:13px;color:var(--slate-700)">${b.note}</div>`}],
  footer:isIncident?(b.status==='Escalated'?[['Close case',"closeBehaviourCase('"+name.replace(/'/g,"\\'")+"','"+b.date+"')",true]]:[['Escalate to safeguarding',"escalateBehaviour('"+name.replace(/'/g,"\\'")+"','"+b.date+"')"],['Notify guardian (approval required)',"requestGuardianNotify('"+name.replace(/'/g,"\\'")+"')",true]])
   :[['Notify guardian (approval required)',"requestGuardianNotify('"+name.replace(/'/g,"\\'")+"')",true]]})}
window.escalateBehaviour=function(name,date){const b=BEHAVIOUR.find(x=>x.name===name&&x.date===date);if(b){b.status='Escalated';b.owner='Safeguarding lead'}logAudit('Escalated behaviour case - '+name,'Behaviour');closeDrawer();render();toast('Escalated to safeguarding lead - restricted visibility')};
window.closeBehaviourCase=function(name,date){const b=BEHAVIOUR.find(x=>x.name===name&&x.date===date);if(b)b.status='Closed';logAudit('Closed behaviour case - '+name,'Behaviour');closeDrawer();render();toast('Case closed')};
window.requestGuardianNotify=function(name){logAudit('Requested guardian notification (pending approval) - '+name,'Behaviour');closeDrawer();toast('Notification queued for pastoral-lead approval before sending')};
function clinicDetail(name){const v=CLINIC.find(x=>x.name===name);const sev=v.severity||'Routine';
 return detailDrawer({title:v.name,sub:v.cls+' · clinic visit '+v.time,color:sev==='Emergency'?'#E11D2A':sev==='Urgent'?'#E2920C':'#17A24A',
  stats:[['Severity',sev,sev==='Emergency'?'red':sev==='Urgent'?'amber':'green'],['Reason',v.reason,'blue'],['Time',v.time,'blue'],['Outcome',v.status,v.status==='Resolved'?'green':'amber']],
  sections:[{h:'Visit record',rows:[['Action taken',v.action],['Medicine issued',v.medicine||'None'],['Parent contacted',v.parentContacted?'Yes - '+(v.contactTime||'today'):'Not yet'],['Follow-up required',v.followUp||'No'],['Recorded by',v.staff||'Clinic nurse']]},
   {h:'Access & consent',rows:[['Visibility','Clinic staff & assigned nurse only'],['Consent on file',v.consent!==false?'Yes':'Missing - flag to front office'],['Audit','Every view of this record is logged']]}],
  footer:v.status==='Resolved'?[['Print referral note',"logAudit('Printed referral note - "+name.replace(/'/g,"\\'")+"','Health');toast('Referral note ready to print')",true]]
   :[['Mark sent home',"clinicMarkOutcome('"+name.replace(/'/g,"\\'")+"','"+v.time+"','Sent home')"],['Contact parent',"clinicContactParent('"+name.replace(/'/g,"\\'")+"','"+v.time+"')",true]]})}
window.clinicMarkOutcome=function(name,time,outcome){const v=CLINIC.find(x=>x.name===name&&x.time===time);if(v){v.status='Resolved';v.action=outcome}logAudit('Clinic outcome - '+name+' - '+outcome,'Health');closeDrawer();render();toast(name+' marked '+outcome.toLowerCase())};
window.clinicContactParent=function(name,time){const v=CLINIC.find(x=>x.name===name&&x.time===time);if(v){v.parentContacted=true;v.contactTime='Today'}logAudit('Contacted parent - clinic visit - '+name,'Health');closeDrawer();render();toast('Parent contacted - '+name)};
function visitorDetail(name){const v=VISITORS.find(x=>x.name===name);return detailDrawer({title:v.name,sub:v.purpose,color:v.status==='On-site'?'#17A24A':v.status==='Pre-approved'?'#E2920C':'#64748B',
  stats:[['Host',v.host,'blue'],['Check-in',v.in,'green'],['Check-out',v.out,'amber'],['Status',v.status,v.status==='On-site'?'green':v.status==='Pre-approved'?'amber':'gray']],
  footer:v.status==='On-site'?[['Check out','checkOutVisitor(\''+v.name+'\')',true]]:[['Print badge','printBadgeFor(\''+v.name+'\')',true]]})}
window.approveCert=function(ref){const c=CERTS.find(x=>x.ref===ref);if(c){c.status='Issued';c.date='Today';logAudit('Issued certificate · '+c.ref,'Certificates')}closeDrawer();render();toast('Certificate issued · '+(c?c.ref:''))};
window.rejectCert=function(ref){const i=CERTS.findIndex(x=>x.ref===ref);if(i>=0){logAudit('Rejected certificate · '+ref,'Certificates');CERTS.splice(i,1)}closeDrawer();render();toast('Request rejected')};
let NEWSLETTER_ISSUES=[
 {title:'Spring 2026 Alumni Update',period:'March 2026',summary:'Campus expansion news, 3 alumni spotlight features, and upcoming reunion save-the-date.',sentTo:0,date:'01 Mar 2026'},
 {title:'Winter 2025 Alumni Update',period:'December 2025',summary:'Year-in-review, scholarship fund update, and holiday greetings from the Principal.',sentTo:0,date:'15 Dec 2025'},
];
function alumniEventsDrawer(){return detailDrawer({title:'Alumni events',sub:ALUMNI_EVENTS.length+' event(s) this year',color:'#E2920C',badge:ic('cal',18),
 sections:[{h:'Upcoming events',html:ALUMNI_EVENTS.length?'<div class="card pad" style="box-shadow:none">'+ALUMNI_EVENTS.map(e=>'<div class="lrow" style="border-bottom:1px solid var(--line-soft)"><div style="flex:1"><div style="font-weight:600;color:var(--slate-900);font-size:12.5px">'+e.title+'</div><div class="muted" style="font-size:11px">'+e.date+' - '+e.invited+' invited, '+e.rsvp+' RSVP\'d</div></div></div>').join('')+'</div>':'<div class="muted" style="font-size:12.5px">No events scheduled.</div>'}],
 footer:[['Close','closeDrawer()',true]]})}
function alumniNewsletterView(){const eligible=ALUMNI.filter(a=>a.consent!==false);
 return detailDrawer({title:'Alumni newsletter',sub:eligible.length+' opted-in recipient(s) - current & past issues',color:'#7C3AED',badge:ic('comm',18),
  sections:[{h:'This month',html:'<div class="card pad" style="box-shadow:none"><div style="font-weight:700;color:var(--slate-900);font-size:13.5px;margin-bottom:4px">'+(NEWSLETTER_ISSUES[0]?NEWSLETTER_ISSUES[0].title:'No draft yet')+'</div><div class="muted" style="font-size:12px;margin-bottom:10px">'+(NEWSLETTER_ISSUES[0]?NEWSLETTER_ISSUES[0].summary:'')+'</div><button class="btn sm primary" onclick="closeDrawer();composeNewsletterForm()">Compose & send this month\'s issue</button></div>'},
   {h:'Previously sent',html:NEWSLETTER_ISSUES.length?'<div class="card pad" style="box-shadow:none">'+NEWSLETTER_ISSUES.map(n=>'<div class="lrow" style="border-bottom:1px solid var(--line-soft)"><div style="flex:1"><div style="font-weight:600;color:var(--slate-900);font-size:12.5px">'+n.title+'</div><div class="muted" style="font-size:11px">'+n.period+(n.sentTo?' - sent to '+n.sentTo:' - not sent yet')+'</div></div></div>').join('')+'</div>':'<div class="muted" style="font-size:12.5px">No previous issues.</div>'}],
  footer:[['Close','closeDrawer()',true]]})}
function composeNewsletterForm(){formDrawer('Compose alumni newsletter','Sent to all opted-in alumni',[
 {label:'Title',key:'title',req:true,val:NEWSLETTER_ISSUES[0]?NEWSLETTER_ISSUES[0].title:''},
 {label:'Content',key:'content',area:true,req:true,aiContext:'general',maxlen:600,val:AI_DEFAULT_MESSAGES['general']}
 ],'Send newsletter','','sendAlumniNewsletter')}
window.sendAlumniNewsletter=function(v){const eligible=ALUMNI.filter(a=>a.consent!==false);
 NEWSLETTER_ISSUES.unshift({title:(v&&v.title)||'Alumni Update',period:'This month',summary:(v&&v.content||'').slice(0,120),sentTo:eligible.length,date:'Today'});
 logAudit('Sent alumni newsletter - '+eligible.length+' recipients','Alumni');closeDrawer();render();toast('Newsletter sent - '+eligible.length+' opted-in alumni')};
function medicalRecordsDirectory(){const withAlerts=STUDENTS.filter((s,i)=>i%7===0);
 return detailDrawer({title:'Medical records directory',sub:withAlerts.length+' students with a medical flag on file',color:'#E11D2A',badge:ic('students',18),
  sections:[{h:'Students with medical alerts',html:'<div class="card pad" style="box-shadow:none">'+withAlerts.map((s,i)=>'<div class="lrow" style="cursor:pointer;border-bottom:1px solid var(--line-soft)" onclick="closeDrawer();go(\'students\');setTimeout(()=>openDrawer(studentProfile(\''+s.id+'\')),120)">'+avatar(s.name)+'<div style="flex:1"><div style="font-weight:600;color:var(--slate-900);font-size:13px">'+s.name+'</div><div class="muted" style="font-size:11px">'+s.grade+' · '+s.id+'</div></div><span class="badge b-'+['red','amber','blue'][i%3]+'"><span class="bd"></span>'+['Allergy','Chronic condition','Medication'][i%3]+'</span></div>').join('')+'</div>'},
   {h:'Access control',rows:[['Visibility','Clinic staff & assigned nurse only - role-restricted'],['Access logging','Every view of a medical record is written to Audit Log'],['Consent','Parent authorisation required before treatment/medication']]}],
  footer:[['Close','closeDrawer()',true]]})}
window.sendFeeReminders=function(){const overdue=INVOICES.filter(i=>i.status==='Overdue');logAudit('Sent fee reminders - '+overdue.length+' guardians','Fees');render();toast('Reminders sent to '+overdue.length+' guardian'+(overdue.length===1?'':'s')+' with overdue invoices')};

/* Simulated live position: interpolate along the route's real stop coordinates based on a
   deterministic "minutes since route start" clock, so re-opening the map shows the bus having
   moved - genuinely computed from route data, not random. GPS hardware integration is the
   documented production seam (see docs/WORKFLOW-MAP.md). */
function routeLiveProgress(route){if(!route.stops||route.stops.length<2)return{pct:0,lat:route.stops&&route.stops[0]?route.stops[0].lat:25.115,lng:route.stops&&route.stops[0]?route.stops[0].lng:55.201,nextStop:null,stopsLeft:0};
 const mins=(new Date().getMinutes()+new Date().getHours()*60)%40;const pct=Math.min(1,mins/38);
 const segF=pct*(route.stops.length-1);const segI=Math.min(route.stops.length-2,Math.floor(segF));const t=segF-segI;
 const a=route.stops[segI],b=route.stops[segI+1];
 const lat=a.lat+(b.lat-a.lat)*t,lng=a.lng+(b.lng-a.lng)*t;
 return{pct:Math.round(pct*100),lat,lng,nextStop:b.name,stopsLeft:route.stops.length-1-segI};}
function transportLiveMap(){
 return detailDrawer({title:'Live transport map',sub:ROUTES.filter(r=>r.status!=='Depot').length+' buses on road - positions computed from each route\'s stop schedule',color:'#2563EB',badge:ic('trans',18),
  sections:[{h:'Buses on road',html:'<div class="card pad" style="box-shadow:none">'+ROUTES.map(r=>{const live=routeLiveProgress(r);const onRoad=r.status!=='Depot';
    return '<div class="lrow" style="border-bottom:1px solid var(--line-soft);padding:9px 0;align-items:flex-start"><span class="kp-ic" style="width:30px;height:30px;background:var(--surface-3);color:var(--slate-500)">'+ic('trans',15)+'</span>'+
     '<div style="flex:1"><div style="font-weight:600;color:var(--slate-900);font-size:13px">'+r.r+' - '+r.bus+'</div>'+
     '<div class="muted" style="font-size:11px">'+(onRoad?live.stopsLeft+' stop(s) remaining - next: '+(live.nextStop||'Arriving')+' - '+live.pct+'% of route':'At depot - not yet dispatched')+'</div></div>'+
     (onRoad?'<a class="btn sm" target="_blank" href="https://www.google.com/maps?q='+live.lat.toFixed(5)+','+live.lng.toFixed(5)+'" onclick="logAudit(\'Viewed live location - '+r.r.replace(/'/g,"\\'")+'\',\'Transport\')">'+ic('trans',12)+' View live location</a>':chip('Depot','gray'))+
     '</div>';}).join('')+'</div>'},
   {h:'Note',rows:[['Data source','Simulated from each route\'s scheduled stops - real deployment reads a GPS device feed keyed by the gpsId on each route'],['Fallback','Manual check-in by driver if GPS signal lost']]}],
  footer:[['Close','closeDrawer()',true]]})}
window.printLatestBadge=function(){if(!VISITORS.length){toast('No visitors to badge');return}printBadgeFor(VISITORS[0].name)};
window.printBadgeFor=function(name){const v=VISITORS.find(x=>x.name===name);if(v)v.badge=true;logAudit('Printed visitor badge - '+name,'Visitors');closeDrawer();render();toast('Badge printed - '+name)};
window.checkOutVisitor=function(name){const v=VISITORS.find(x=>x.name===name);if(v){v.status='Checked out';v.out='Today'}logAudit('Visitor checked out - '+name,'Visitors');closeDrawer();render();toast(name+' checked out')};
const CERT_TEMPLATE_BODY={
 'Transfer Certificate':(n,c)=>'This is to certify that <b>'+n+'</b>, a student of Grade '+c+' at Al Noor International, Dubai, has been a bona fide student of this institution and is being transferred at the request of the parent/guardian. The student\'s conduct and academic record during their time here have been satisfactory.',
 'Bonafide Letter':(n,c)=>'This is to certify that <b>'+n+'</b> is a bona fide student of Grade '+c+' at Al Noor International, Dubai, for the academic year 2025-26. This letter is issued upon request for official purposes.',
 'Character Certificate':(n,c)=>'This is to certify that <b>'+n+'</b>, a student of Grade '+c+' at Al Noor International, Dubai, has borne a good moral character throughout their time at this institution and has actively participated in school activities.',
 'Report Card · Term 2':(n,c)=>'Term 2 academic report for <b>'+n+'</b>, Grade '+c+'. Includes subject-wise grades, attendance summary, and teacher remarks for the current term.'
};
function certTemplatePreview(type){const body=(CERT_TEMPLATE_BODY[type]||CERT_TEMPLATE_BODY['Bonafide Letter'])('[Student Name]','[Class]');
 return detailDrawer({title:type+' - preview',sub:'Sample rendering - v2.1 · EN/AR · letterhead',color:'#2563EB',badge:ic('curric',18),
  sections:[{h:'Letterhead preview',html:`<div class="card pad" style="box-shadow:none;background:#fff;border:1px solid var(--line);padding:24px 22px">
   <div style="text-align:center;border-bottom:2px solid var(--brand);padding-bottom:12px;margin-bottom:16px">
    <div style="font-weight:800;font-size:15px;color:var(--brand-deep);font-family:var(--ff-display)">AL NOOR INTERNATIONAL</div>
    <div class="muted" style="font-size:10.5px">Dubai, United Arab Emirates · Est. 1998</div></div>
   <div style="text-align:right;font-size:11px;color:var(--slate-500);margin-bottom:14px">Ref: [Auto-generated] · Date: [Issue date]</div>
   <div style="font-weight:700;text-align:center;text-decoration:underline;margin-bottom:16px;font-size:13.5px">${type.toUpperCase()}</div>
   <div style="font-size:13px;line-height:1.8;color:var(--slate-800)">${body}</div>
   <div style="margin-top:36px;display:flex;justify-content:space-between;font-size:11.5px;color:var(--slate-600)">
    <span>_____________________<br>Registrar</span><span>_____________________<br>Principal</span></div>
   </div>`},
   {h:'Placeholders auto-filled on issue',rows:[['[Student Name]','Pulled from student record'],['[Class]','Pulled from student record'],['[Auto-generated]','Sequential reference number'],['[Issue date]','Date of issuing']]}],
  footer:[['Close','closeDrawer()',true]]})}
function templateLibrary(){const types=[...new Set(CERTS.map(c=>c.type))];
 return detailDrawer({title:'Certificate templates',sub:types.length+' template'+(types.length>1?'s':'')+' · versioned & letterhead-ready',color:'#2563EB',badge:ic('curric',18),
  sections:[{h:'Available templates',html:'<div class="card pad" style="box-shadow:none">'+types.map(t=>'<div class="lrow" style="border-bottom:1px solid var(--line-soft);padding:9px 0"><span class="kp-ic" style="width:30px;height:30px;background:var(--surface-3);color:var(--slate-500)">'+ic('curric',15)+'</span><div style="flex:1"><div style="font-weight:600;color:var(--slate-900);font-size:13px">'+t+'</div><div class="muted" style="font-size:11px">v2.1 · EN/AR · effective Term 2 2025-26</div></div><button class="btn sm" onclick="closeDrawer();openDrawer(certTemplatePreview(\''+t.replace(/'/g,"\\'")+'\'))">Preview</button></div>').join('')+'</div>'},
   {h:'Governance',rows:[['Versioning','Historical certificates render with the template version active at issuance'],['Letterhead','School seal + principal signature block'],['Permissions','Only Admin & Principal can edit templates']]}],
  footer:[['Close','closeDrawer()',true]]})}
function certDetail(ref){const c=CERTS.find(x=>x.ref===ref);return detailDrawer({title:c.name,sub:c.type,color:c.status==='Issued'?'#17A24A':'#E2920C',
  stats:[['Document',c.type,'blue'],['Reference',c.ref,'blue'],['Date',c.date,'blue'],['Status',c.status,c.status==='Issued'?'green':'amber']],
  footer:c.status==='Issued'?[['Download document','downloadCertificate(\''+c.name+'\',\''+c.type+'\',\''+c.ref+'\',\''+c.cls+'\')',true]]:[['Reject','rejectCert(\''+c.ref+'\')'],['Approve & issue','approveCert(\''+c.ref+'\')',true]]})}
function bioDetail(loc){const d=BIODEVICES.find(x=>x.loc===loc);return detailDrawer({title:d.loc,sub:d.type+' device',color:d.status==='Online'?'#17A24A':'#E11D2A',badge:'⊙',
  stats:[['Mode',d.type,'blue'],['Punches today',String(d.punches),'blue'],['Last sync',d.sync,'blue'],['Status',d.status,d.status==='Online'?'green':'red']],
  footer:d.status==='Online'?[['Sync now',"syncOneDevice('"+loc.replace(/'/g,"\\'")+"')",true]]:[['Reconnect',"reconnectDevice('"+loc.replace(/'/g,"\\'")+"')",true]]})}
window.syncOneDevice=function(loc){const d=BIODEVICES.find(x=>x.loc===loc);if(!d)return;d.sync='Just now';logAudit('Synced device - '+loc,'Biometric Sync');closeDrawer();render();openDrawer(bioDetail(loc));toast(loc+' synced - '+d.punches+' punches up to date')};
window.reconnectDevice=function(loc){const d=BIODEVICES.find(x=>x.loc===loc);if(!d)return;d.status='Online';d.sync='Just now';logAudit('Reconnected device - '+loc,'Biometric Sync');closeDrawer();render();openDrawer(bioDetail(loc));toast(loc+' reconnected and syncing')};
const EXAMSCHEMES=[{id:'UT3',name:'Unit Test 3',term:'Term 2',classes:['9-B','10-A','10-B'],subjects:['Mathematics','Science','English'],maxMarks:100,weightage:'20% of term grade',passMark:50,gradeScale:[[85,'A+'],[70,'A'],[60,'B'],[50,'C'],[0,'D']],publishDate:'25 Jun 2026',status:'Draft',locked:false}];
function examGrade(avg){const sc=EXAMSCHEMES[0].gradeScale;for(const[m,g] of sc)if(avg>=m)return g;return 'D'}
function subjKey(name){return String(name||'').toLowerCase().replace(/[^a-z]/g,'').slice(0,3)||'sub'}
function schemeSubjKeys(){return EXAMSCHEMES[0].subjects.map(subjKey)}
function resultAvg(r){const keys=schemeSubjKeys();const vals=keys.map(k=>r[k]||0);return vals.length?Math.round(vals.reduce((a,b)=>a+b,0)/vals.length):0}
function recomputeRanks(){EXAMRESULTS.slice().sort((a,b)=>resultAvg(b)-resultAvg(a)).forEach((r,i)=>{r.rank=i+1;r.grade=examGrade(resultAvg(r))})}
function manageSubjectsForm(){openDrawer(manageSubjectsDrawer())}
function manageSubjectsDrawer(){const sch=EXAMSCHEMES[0];
 return `<div class="dh"><div style="flex:1"><h3>Manage subjects</h3><div class="muted" style="font-size:12.5px">${sch.name} - add or remove tracked subjects</div></div><button class="iconbtn" onclick="closeDrawer()"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg></button></div>
 <div class="db form-body">
  <div style="font-size:12.5px;font-weight:600;color:var(--slate-600);margin-bottom:8px">Currently tracked (${sch.subjects.length})</div>
  <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:18px">${sch.subjects.map(s=>`<span style="display:inline-flex;align-items:center;gap:6px;background:var(--brand-soft);color:var(--brand-deep);border-radius:20px;padding:5px 8px 5px 14px;font-size:12.5px;font-weight:600">${s}<button aria-label="Remove ${s}" onclick="confirmRemoveSubject('${s.replace(/'/g,"\\'")}')" style="border:none;background:rgba(0,0,0,.08);color:inherit;border-radius:50%;width:18px;height:18px;cursor:pointer;font-size:11px;line-height:1">✕</button></span>`).join('')}</div>
  <label class="ffull" style="display:block;margin-bottom:13px"><span style="font-size:12.5px;font-weight:600;color:var(--slate-600);display:block;margin-bottom:5px">Add subject</span><input id="newSubjectInput" type="text" style="width:100%;height:40px;border:1px solid var(--line);border-radius:10px;padding:0 12px" placeholder="e.g. Geography"></label>
 </div>
 <div class="df"><button class="btn" onclick="closeDrawer()">Close</button><button class="btn primary" onclick="addExamSubject({new_subject:document.getElementById('newSubjectInput').value})">Add subject</button></div>`}
window.confirmRemoveSubject=function(name){if(EXAMSCHEMES[0].subjects.length<=1){toast('At least one subject is required');return}
 removeExamSubject(name);openDrawer(manageSubjectsDrawer())};
window.addExamSubject=function(v){const name=(v.new_subject||'').trim();if(!name){toast('Enter a subject name');return false}
 if(EXAMSCHEMES[0].subjects.includes(name)){toast(name+' is already tracked');return false}
 EXAMSCHEMES[0].subjects.push(name);logAudit('Added exam subject - '+name,'Exams');render();openDrawer(manageSubjectsDrawer());toast(name+' added - now appears in Enter marks');return false};
window.removeExamSubject=function(name){if(EXAMSCHEMES[0].subjects.length<=1){toast('At least one subject is required');return}
 EXAMSCHEMES[0].subjects=EXAMSCHEMES[0].subjects.filter(s=>s!==name);logAudit('Removed exam subject - '+name,'Exams');render();toast(name+' removed')};
function examSchemeCard(){const sch=EXAMSCHEMES[0];return `<div class="card pad" style="margin-bottom:16px"><div class="flex ac jb" style="margin-bottom:10px;flex-wrap:wrap;gap:8px"><h3 style="font-size:15px">Assessment scheme · ${sch.name}</h3><span class="badge ${sch.locked?'b-red':'b-amber'}"><span class="bd"></span>${sch.locked?'Locked':sch.status}</span></div>
 <div class="grid cols-4" style="gap:10px">${miniStat('Max marks',String(sch.maxMarks),'blue')}${miniStat('Weightage',sch.weightage,'green')}${miniStat('Pass mark',String(sch.passMark),'amber')}${miniStat('Publish date',sch.publishDate,'gray')}</div>
 <div class="muted" style="font-size:11.5px;margin-top:10px">Grade scale: ${sch.gradeScale.map(g=>g[1]+' ≥'+g[0]).join(' · ')} · Classes: ${sch.classes.join(', ')} · Subjects: ${sch.subjects.join(', ')}</div>
 <div class="flex ac" style="gap:8px;margin-top:12px">${canWrite()?(sch.locked?`<button class="btn sm" onclick="unlockScheme()">Reopen for moderation</button>`:`<button class="btn sm primary" onclick="lockScheme()">Lock marks & publish</button>`):''}</div></div>`}
window.lockScheme=function(){if(!guardWrite('Locking marks'))return;EXAMSCHEMES[0].locked=true;EXAMSCHEMES[0].status='Published';logAudit('Locked & published exam scheme · '+EXAMSCHEMES[0].name,'Exams');render();toast('Marks locked — results published to students & guardians')};
window.unlockScheme=function(){if(!guardWrite('Reopening marks'))return;EXAMSCHEMES[0].locked=false;EXAMSCHEMES[0].status='Reopened for moderation';logAudit('Reopened exam scheme for moderation · '+EXAMSCHEMES[0].name,'Exams');render();toast('Reopened — marks editable again, change will be audited')};
function enterMarksForm(){const sch=EXAMSCHEMES[0];if(sch.locked){toast('Marks are locked - reopen for moderation first');return}
 const subjFields=sch.subjects.map(subj=>({label:subj,type:'number',key:subjKey(subj),ph:'0-'+sch.maxMarks,half:true}));
 formDrawer('Enter marks',sch.name+' - combo-box student, or type a new name',[
  {label:'Student',req:true,key:'student',opts:EXAMRESULTS.map(r=>r.name)},{label:'Class',key:'cls',val:'10-A'},
  ...subjFields
 ],'Save marks','','enterMarks')}
window.enterMarks=function(v){if(!guardWrite('Entering marks'))return false;if(EXAMSCHEMES[0].locked){toast('Marks are locked — reopen for moderation first');return false}
 const name=(v.student||'').trim();if(!name){toast('Student name is required');return false}
 let r=EXAMRESULTS.find(x=>x.name===name);const keys=schemeSubjKeys();const marks={};keys.forEach(k=>marks[k]=+v[k]||0);
 if(r){logAudit('Amended marks - '+name,'Exams');Object.assign(r,marks)}
 else{EXAMRESULTS.push({name,cls:v.cls||'10-A',...marks,grade:'C',rank:0});logAudit('Entered marks - '+name,'Exams')}
 recomputeRanks();closeDrawer();render();toast('Marks saved for '+name+' - rank recalculated');return false};
function examDetail(name){const r=EXAMRESULTS.find(x=>x.name===name);const avg=resultAvg(r);const keys=schemeSubjKeys();const subj0=EXAMSCHEMES[0].subjects;
 return detailDrawer({title:r.name,sub:'Unit Test 3 · rank #'+r.rank,color:avg>=85?'#17A24A':avg>=60?'#2563EB':'#E11D2A',
  stats:[['Average',avg+'%',avg>=85?'green':avg>=60?'blue':'red'],['Rank','#'+r.rank,'blue'],...(subj0.slice(0,2).map((s,i)=>[s,(r[keys[i]]||0)+'%','blue']))],
  sections:[{h:'Subjects',rows:[...subj0.map(subj=>[subj,(r[subjKey(subj)]||0)+'%']),['Average',avg+'%']]}],
  footer:[['Share with guardian',"shareResultWithGuardian('"+name.replace(/'/g,"\\'")+"')",true]]})}
window.shareResultWithGuardian=function(name){const st=STUDENTS.find(s=>s.name===name);const g=st&&buildGuardians().find(x=>x.children.includes(st.id));
 if(!g){toast('No guardian on file for '+name);return}
 seedThread(g.id).push({dir:'out',from:'You - '+state.role,text:name+"'s Unit Test 3 result is now available - average "+resultAvg(EXAMRESULTS.find(x=>x.name===name))+'%. Full breakdown in the parent portal.',time:'Just now'});
 logAudit('Shared exam result with guardian - '+name,'Exams');closeDrawer();toast('Result shared with '+g.name)};
function parentDetail(id){const s=STUDENTS.find(x=>x.id===id);const er=(typeof EXAMRESULTS!=='undefined')?EXAMRESULTS.find(x=>x.name===s.name):null;
  const grades=er?[['Mathematics',er.mat],['Science',er.sci],['English',er.eng]]:[['Mathematics',88],['Science',86],['English',84]];
  return detailDrawer({title:s.guardian,sub:'Guardian of '+s.name+' · '+s.grade,color:avc(s.guardian),
    stats:[['Child',s.name.split(' ')[0],'blue'],['Attendance',s.att+'%',s.att<85?'red':'green'],['Term GPA',String(s.gpa),'blue'],['Fees',s.fee,s.fee==='Paid'?'green':s.fee==='Due'?'amber':'red']],
    sections:[
      {h:'Recent grades',html:`<div class="card pad" style="box-shadow:none">${grades.map(g=>`<div class="lrow" style="border-bottom:1px solid var(--line-soft);padding:8px 0"><span style="flex:1;font-size:13px;color:var(--slate-700)">${g[0]}</span><span class="num" style="font-weight:600;color:var(--slate-900)">${g[1]}/100</span><span class="badge ${g[1]>=80?'b-green':g[1]>=60?'b-amber':'b-red'}" style="margin-left:10px">${g[1]>=90?'A+':g[1]>=80?'A':g[1]>=70?'B':'C'}</span></div>`).join('')}</div>`},
      {h:'Academic history · '+stuTenure(s)+' '+(stuTenure(s)===1?'year':'years'),html:historyHtml(s)},
      {h:'Documents & downloads',html:`<div class="card pad" style="box-shadow:none;padding:6px 12px">${[['Report card · Term 2','exam','downloadReportCard(\''+s.id+'\')'],['Fee statement','fees','downloadFeeStatement(\''+s.id+'\')'],['Bonafide letter','cert','downloadCertificate(\''+s.name+'\',\'Bonafide Letter\',\'\',\''+s.grade+'\')']].map(d=>`<div class="lrow" style="border-bottom:1px solid var(--line-soft);padding:10px 0"><span class="kp-ic" style="width:32px;height:32px;background:var(--brand-soft);color:var(--brand)">${ic(d[1],15)}</span><div style="flex:1;font-size:13px;font-weight:600;color:var(--slate-800)">${d[0]}</div><button class="btn sm" onclick="${d[2]}">${ic('download',14)} Download</button></div>`).join('')}</div>`},
      {h:'Contact',rows:[['Phone',s.phone],['Portal','Active'],['Preference','SMS + Email']]}],
    footer:s.fee!=='Paid'?[[ic('comm',16)+' Message',"const gg=buildGuardians().find(x=>x.children.includes('"+s.id+"'));if(gg)openDrawer(guardianThread(gg.id));else toast('No guardian on file')"],['Pay fees','closeDrawer();go(\'fees\')',true]]:[['Reset portal access',"logAudit('Reset portal access - "+s.name.replace(/'/g,"")+"','Parents');toast('Reset link sent')"],[ic('comm',16)+' Message',"const gg=buildGuardians().find(x=>x.children.includes('"+s.id+"'));if(gg)openDrawer(guardianThread(gg.id));else toast('No guardian on file')",true]]})}
function admChecklist(){return ADM_DOCS.map(d=>({key:d.key,label:d.label,req:d.req,done:false,file:null}))}
function admInit(a){if(!a.docs||!a.docs[0]||!('key' in a.docs[0])){a.docs=admChecklist();const si=STAGES.indexOf(a.stage);a.docs.forEach((d,i)=>{d.done=i<=si+1;});}return a}
function admDocsDone(a){admInit(a);return a.docs.filter(d=>d.req).every(d=>d.done)}
function findAdmDoc(name,key){const a=ADMISSIONS.find(x=>x.name===name);if(!a)return null;admInit(a);return a.docs.find(d=>d.key===key)||null}
window.admDocPick=function(input,name,key){const f=input.files&&input.files[0];docReadFile(f,file=>{const d=findAdmDoc(name,key);if(d){d.file=file;d.done=true;}openDrawer(admissionDetail(name));toast('Attached · '+file.name)})};
window.admDocDrop=function(e,name,key){e.preventDefault();const el=e.currentTarget;el&&el.classList.remove('drag');const f=e.dataTransfer&&e.dataTransfer.files&&e.dataTransfer.files[0];docReadFile(f,file=>{const d=findAdmDoc(name,key);if(d){d.file=file;d.done=true;}openDrawer(admissionDetail(name));toast('Attached · '+file.name)})};
window.admDocDownload=function(name,key){const d=findAdmDoc(name,key);if(d&&d.file)dlUrl(d.file.url,d.file.name)};
window.admDocView=function(name,key){const d=findAdmDoc(name,key);if(d&&d.file)docPreview(Object.assign({label:d.label},d.file))};
window.admDocRemove=function(name,key){const d=findAdmDoc(name,key);if(d){d.file=null;d.done=false;openDrawer(admissionDetail(name));toast('Document removed')}};
window.admDocMark=function(name,key){const d=findAdmDoc(name,key);if(d){d.done=true;openDrawer(admissionDetail(name));toast('Marked as received')}};
window.advanceAdmission=function(name){const a=ADMISSIONS.find(x=>x.name===name);const si=STAGES.indexOf(a.stage);const next=STAGES[si+1];if(!next)return;
  if((next==='Offer'||next==='Enrolled')&&!admDocsDone(a)){toast('Blocked — required documents must be verified before '+next);openDrawer(admissionDetail(name));return}
  a.hist=a.hist||[];a.hist.unshift([a.stage+' → '+next,'Today · '+state.role]);logAudit('Admission advanced · '+name+' → '+next,'Admissions');
  if(next==='Enrolled'){a.stage='Enrolled';const sid=enrollStudent(a);render();closeDrawer();toast(a.name+' enrolled · '+sid);return}
  a.stage=next;render();openDrawer(admissionDetail(name));toast(a.name+' moved to '+next)}
window.waitlistAdmission=function(name){const a=ADMISSIONS.find(x=>x.name===name);if(!a)return;a.prevStage=a.stage;a.stage='Waitlisted';a.hist=a.hist||[];a.hist.unshift(['Moved to waitlist','Today · '+state.role]);logAudit('Waitlisted · '+name,'Admissions');closeDrawer();render();toast(name+' · waitlisted — seat capacity review')};
window.restoreAdmission=function(name){const a=ADMISSIONS.find(x=>x.name===name);if(!a)return;a.stage=a.prevStage||'Application';a.outcome=null;a.hist=a.hist||[];a.hist.unshift(['Restored to pipeline · '+a.stage,'Today · '+state.role]);logAudit('Restored to pipeline · '+name,'Admissions');render();toast(name+' restored to '+a.stage)};
window.rejectAdmission=function(name){state._admActive=name;formDrawer('Decline application',name+' · a reason is required and the record is kept for audit',[
  {label:'Reason',key:'reason',opts:['Seats full for grade','Documents not provided','Assessment outcome','Chose another school','Guardian withdrew','Duplicate application','Other']},
  {label:'Outcome',key:'outcome',half:true,opts:['Rejected','Withdrawn','Deferred to next intake']},
  {label:'Notify guardian',key:'notify',half:true,opts:['Yes — send decision letter','No — record only']},
  {label:'Notes',key:'note',area:true,aiContext:'admissions-decline-note',maxlen:400}],'Confirm decision','','saveAdmDecline')};
window.saveAdmDecline=function(v){const a=ADMISSIONS.find(x=>x.name===state._admActive);if(!a){closeDrawer();return false}
  a.prevStage=a.stage;a.stage='Closed';a.outcome=v.outcome||'Rejected';a.declineReason=v.reason||'—';a.hist=a.hist||[];a.hist.unshift([a.outcome+' — '+(v.reason||''),'Today · '+state.role]);
  logAudit((v.outcome||'Rejected')+' application · '+a.name+' — '+(v.reason||''),'Admissions');closeDrawer();render();toast(a.name+' · '+(a.outcome)+((v.notify||'').startsWith('Yes')?' — guardian notified':''));return false};
function enrollStudent(a){const id=nextNum(STUDENTS,'ANS');const roll=STUDENTS.filter(s=>s.grade.split(' · ')[0]===a.grade).length+1;
  STUDENTS.push({id,name:a.name,grade:a.grade+' · A',gender:'—',roll,guardian:a.guardian||'—',phone:a.phone||'—',fee:'Due',att:100,gpa:0,status:'Active'});
  INVOICES.push({id:nextNum(INVOICES,'INV'),student:a.name,term:'Term 2 · admission',amt:8400,due:dateShort(),status:'Due'});
  return id}
window.createEnquiry=function(v){const name=((v.first_name||'').trim()+' '+(v.last_name||'').trim()).trim()||(v.applicant||'').trim();if(!name){toast('Applicant name is required');return false}
  ADMISSIONS.push({name,grade:v.grade||'Grade 1',stage:'Application',date:'Today',src:v.source||'Website',dob:v.dob||'',guardian:v.guardian||'',phone:v.phone||'',docs:docsFromBuffer(ADM_DOCS)});
  docResetBuffer();closeDrawer();render();toast('Application created · '+name+' added to pipeline');openDrawer(admissionDetail(name));return false}
function admissionDetail(name){const a=admInit(ADMISSIONS.find(x=>x.name===name));const si=STAGES.indexOf(a.stage);const next=STAGES[si+1];const enrolled=a.stage==='Enrolled';
  const pipeline=`<div class="card pad" style="box-shadow:none">${STAGES.map((s,i)=>`<div class="lrow" style="border:0;padding:7px 0"><span style="width:18px;height:18px;border-radius:50%;display:grid;place-items:center;flex:none;background:${i<=si?'var(--brand)':'var(--line)'};color:#fff;font-size:10px">${i<=si?'✓':i+1}</span><span style="font-size:13px;color:${i<=si?'var(--slate-900)':'var(--slate-400)'};font-weight:${i===si?'700':'500'}">${s}</span></div>`).join('')}</div>`;
  let footer;
  if(enrolled){const stu=STUDENTS.find(s=>s.name===a.name);footer=[stu?['Open student record','closeDrawer();go(\'students\');setTimeout(()=>openDrawer(studentProfile(\''+stu.id+'\')),120)']:['Download enrolment pack','toast(\'Enrolment pack ready\')'],['Download enrolment pack','toast(\'Enrolment pack ready\')',true]];}
  else if(a.stage==='Offer'){footer=[['Decline','rejectAdmission(\''+name+'\')'],['Enrol as student','advanceAdmission(\''+name+'\')',true]];}
  else if(a.stage==='Waitlisted'||a.stage==='Closed'){footer=[['Restore to pipeline','restoreAdmission(\''+name+'\')',true]];}
  else {footer=[['Decline','rejectAdmission(\''+name+'\')'],['Waitlist','waitlistAdmission(\''+name+'\')'],['Advance to '+next,'advanceAdmission(\''+name+'\')',true]];}
  return detailDrawer({title:a.name,sub:'Applicant · '+a.grade,color:enrolled?'#17A24A':'#2563EB',
    stats:[['Stage',a.stage,enrolled?'green':'blue'],['Grade',a.grade,'blue'],['Source',a.src,'amber'],['Enquiry',a.date,'blue']],
    sections:[
      {h:'Applicant & guardian',rows:[['Date of birth',a.dob||'—'],['Guardian',a.guardian||'—'],['Contact',a.phone||'—']]},
      {h:'Documents · '+a.docs.filter(d=>d.done).length+'/'+a.docs.length+(a.docs.filter(d=>d.req&&!d.done).length?' · '+a.docs.filter(d=>d.req&&!d.done).length+' required pending':''),html:docRecordHtml(a.docs,'admDoc',name)},
      {h:'Pipeline',html:pipeline},
      {h:'Stage history',html:(a.hist&&a.hist.length)?('<div class="card pad" style="box-shadow:none;padding:6px 12px">'+a.hist.map(e=>'<div class="lrow" style="border-bottom:1px solid var(--line-soft);padding:8px 0"><div style="flex:1;font-size:12.5px;color:var(--slate-700)">'+e[0]+'</div><span class="muted" style="font-size:11px">'+e[1]+'</span></div>').join('')+'</div>'):'<div class="muted" style="font-size:12.5px">No transitions yet — every stage move is recorded here with actor and timestamp.</div>'}],
    footer})}
function miniStat(l,v,c){return `<div class="card pad" style="box-shadow:none;padding:13px"><div class="muted" style="font-size:11.5px;font-weight:600">${l}</div><div style="font-family:var(--ff-display);font-weight:700;font-size:20px;color:var(--slate-900);margin-top:3px">${v}</div><div style="height:4px;border-radius:3px;background:var(--${c==='green'?'brand':c==='red'?'red':c==='amber'?'amber':'blue'});margin-top:8px;width:40px;opacity:.85"></div></div>`}
window.addStudent=function(v){const name=((v.first_name||'').trim()+' '+(v.last_name||'').trim()).trim()||(v.name||'').trim();if(!name){toast('Student name is required');return false}
  const id=(v.admission_no&&v.admission_no.trim())?v.admission_no.trim():nextNum(STUDENTS,'ANS');
  const grade=v.grade||'Grade 1 · A';
  STUDENTS.push({id,name,grade,gender:v.gender==='Female'?'F':v.gender==='Male'?'M':'—',roll:STUDENTS.filter(s=>s.grade.split(' · ')[0]===grade.split(' · ')[0]).length+1,guardian:v.guardian||'—',phone:v.phone||'—',fee:'Due',att:100,gpa:0,status:'Active',docs:docsFromBuffer(STUDENT_DOCS)});
  docResetBuffer();closeDrawer();render();toast(name+' enrolled · '+id);return false}
function staffOnboardForm(){docResetBuffer();formDrawer('Add employee','Staff onboarding · new hire',[
  {section:'Personal details',icon:'staff'},
  {label:'First name',key:'first_name',req:true,half:true},{label:'Last name',key:'last_name',half:true},
  {label:'Date of birth',type:'date',key:'dob',half:true},{label:'Gender',key:'gender',opts:['Male','Female'],ph:'Select',half:true},
  {label:'Nationality',key:'nationality',half:true},{label:'National ID / passport',key:'id_no',half:true},
  {label:'Phone',type:'tel',key:'phone',half:true},{label:'Email',type:'email',key:'email',half:true},
  {label:'Address',area:true,key:'address'},
  {section:'Employment',icon:'roles'},
  {label:'Role / designation',key:'role',req:true,half:true},{label:'Department',key:'dept',opts:['Science','Mathematics','Languages','Humanities','Operations','Student Support','Finance','Administration'],half:true},
  {label:'Staff type',key:'type',opts:['Teaching','Non-Teaching'],half:true},{label:'Employment type',key:'emp_type',opts:['Full-time','Part-time','Contract','Visiting'],ph:'Select',half:true},
  {label:'Joining date',type:'date',key:'joining',half:true},{label:'Reports to',key:'reports_to',half:true},
  {section:'Qualifications',icon:'cert'},
  {label:'Highest qualification',key:'qualification',half:true},{label:'Specialization',key:'specialization',half:true},
  {label:'Years of experience',type:'number',key:'experience',half:true},{label:'Certifications',key:'certifications',half:true},
  {section:'Compliance & documents',icon:'settings'},
  {label:'Visa / work permit status',key:'visa_status',opts:['Citizen','Resident','Work permit','Pending'],ph:'Select',half:true},{label:'Contract end (if any)',type:'date',key:'contract_end',half:true},
  {note:'Attach the required joining documents. Passport / Emirates ID, degree certificate and a photo are mandatory before the hire can be activated. Others can be added later from the employee record.'},
  {doccap:STAFF_DOCS}
  ],'Start onboarding','','createStaff')}
function admissionApplyForm(){docResetBuffer();formDrawer('New application','Admissions · 2025–26 intake',[
  {section:'Applicant details',icon:'admiss'},
  {label:'First name',key:'first_name',req:true,half:true},{label:'Last name',key:'last_name',half:true},
  {label:'Date of birth',type:'date',key:'dob',half:true},{label:'Gender',key:'gender',opts:['Male','Female'],ph:'Select',half:true},
  {label:'Nationality',key:'nationality',half:true},{label:'Grade applying for',key:'grade',opts:['KG 1','KG 2','Grade 1','Grade 2','Grade 3','Grade 4','Grade 5','Grade 6','Grade 7','Grade 8','Grade 9','Grade 10','Grade 11','Grade 12'],half:true},
  {section:'Guardian & family',icon:'parents'},
  {label:'Guardian name',key:'guardian',req:true,half:true},{label:'Relationship',key:'relationship',opts:['Father','Mother','Guardian','Other'],ph:'Select',half:true},
  {label:'Guardian phone',type:'tel',key:'phone',half:true},{label:'Guardian email',type:'email',key:'email',half:true},
  {section:'Application details',icon:'reports'},
  {label:'Source',key:'source',opts:['Website','Walk-in','Referral','Agent','Event'],half:true},{label:'Previous school',key:'prev_school',half:true},
  {label:'Notes',area:true,key:'notes',ph:'Sibling in school, special requirements, etc.',aiContext:'crm-lead-note',maxlen:400},
  {section:'Documents',icon:'cert'},
  {note:'Attach the essential documents now — passport/ID, birth certificate and a photo are required for admission. Optional documents can be added later from the applicant record.'},
  {doccap:ADM_DOCS}
  ],'Create application','','createEnquiry')}
function studentAddForm(){docResetBuffer();formDrawer('Add student','New enrolment record',[
  {section:'Student details',icon:'students'},
  {label:'First name',key:'first_name',req:true,half:true},{label:'Last name',key:'last_name',half:true},
  {label:'Date of birth',type:'date',key:'dob',half:true},{label:'Gender',key:'gender',opts:['Male','Female'],ph:'Select',half:true},
  {label:'Nationality',key:'nationality',half:true},{label:'Grade & section',key:'grade',opts:['KG 1 · A','KG 2 · B','Grade 1 · A','Grade 2 · A','Grade 3 · B','Grade 4 · A','Grade 5 · A','Grade 6 · A','Grade 7 · B','Grade 8 · A','Grade 9 · B','Grade 10 · A','Grade 11 · C','Grade 12 · A'],half:true},
  {label:'Admission number',key:'admission_no',ph:'Auto-generated if blank'},
  {section:'Guardian & family',icon:'parents'},
  {label:'Guardian name',key:'guardian',req:true,half:true},{label:'Relationship',key:'relationship',opts:['Father','Mother','Guardian','Other'],ph:'Select',half:true},
  {label:'Guardian phone',type:'tel',key:'phone',half:true},{label:'Guardian email',type:'email',key:'email',half:true},
  {label:'Emergency contact',type:'tel',key:'emergency',half:true},{label:'Preferred language',key:'pref_language',half:true},
  {label:'Home address',area:true,key:'address'},
  {section:'Academic background',icon:'exam'},
  {label:'Previous school',key:'prev_school',half:true},{label:'Last grade completed',key:'prev_grade',half:true},
  {label:'Languages spoken',key:'languages',ph:'e.g. English, Arabic'},
  {section:'Medical & wellbeing',icon:'health'},
  {label:'Blood group',key:'blood_group',opts:['A+','A-','B+','B-','O+','O-','AB+','AB-','Unknown'],ph:'Select',half:true},{label:'Allergies',key:'allergies',ph:'None known',half:true},
  {label:'Medical conditions / special needs',area:true,key:'medical',ph:'None'},
  {section:'Transport & documents',icon:'trans'},
  {label:'Transport required',key:'transport',opts:['No','One-way','Two-way'],ph:'Select',half:true},{label:'Route (if any)',key:'route',half:true},
  {note:'Minimal onboarding documents — attach a passport/ID, birth certificate and photo. More can be added anytime from the student profile.'},
  {doccap:STUDENT_DOCS}
  ],'Enrol student','','addStudent')}

