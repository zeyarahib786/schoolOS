/* ---- Helpdesk (Operations) ---- */
/* ---- Helpdesk AI-agent first-line resolution: tries a deterministic knowledge base before
   creating a ticket, matching the same pattern as the in-app SchoolOS Assistant (BOT_KB) - honest
   about being rule-based, not a live model. Only escalates to a real ticket if it can't help. ---- */
const HELPDESK_KB=[
 {k:['printer','print','printing','paper jam','toner'],fix:'Check the printer is powered on and connected to the network. For paper jams, open the rear tray and gently remove any stuck sheets. If toner is low, replace the cartridge from the IT store. Restart the printer if the queue is stuck.'},
 {k:['wifi','wi-fi','internet','network','connection','no signal'],fix:'Try toggling Wi-Fi off and on, and confirm you are on the correct school network (not a guest network). If it still fails, restart the classroom access point (the small white box near the ceiling) by unplugging it for 10 seconds.'},
 {k:['projector','screen','display','smartboard','smart board'],fix:'Check the HDMI/VGA cable is fully seated at both ends and the input source on the projector remote matches the cable used. Power-cycle the projector if the image does not appear within 60 seconds.'},
 {k:['password','login','locked out','account','cant sign in',"can't sign in"],fix:'Use "Forgot password" on the sign-in screen to reset via your registered email. If your account shows as locked, wait 15 minutes and try again, or contact IT to unlock it manually.'},
 {k:['ac','air conditioning','aircon','hot','cold','temperature'],fix:'Check the thermostat is set correctly and not in "off" mode. If the unit is running but not cooling/heating, this usually needs a facilities technician - please still raise a ticket so it can be scheduled.'},
 {k:['leak','water','flooding','pipe'],fix:'For active leaks, please raise a ticket immediately marked High priority - do not attempt to fix electrical equipment near water yourself.'},
 {k:['laptop','computer','pc','slow','freezing','frozen','crash'],fix:'Try a full restart (not sleep) and close unused browser tabs/apps. If the device is still slow after a restart, it may need a hardware check - a ticket is the right next step.'},
];
function helpdeskAIMatch(text){const q=(text||'').toLowerCase();let best=null,bs=0;
 HELPDESK_KB.forEach(e=>{let sc=0;e.k.forEach(kw=>{if(q.indexOf(kw)>=0)sc+=kw.split(' ').length});if(sc>bs){bs=sc;best=e}});
 return bs>0?best:null}
function raisedByOptions(){const office=Object.values(OFFICE_STAFF_NAMES);const staff=STAFF.filter(s=>s.status==='Active').map(s=>s.name);
 return[...new Set([myIdentity(),...office,...staff])]}
function newTicketStep1Form(){formDrawer('New ticket','Describe the issue - we\'ll try to resolve it instantly before creating a ticket',[
 {label:'Title',key:'title',req:true,ph:'e.g. Printer not working in Room 12'},
 {label:'Description',key:'desc',area:true,req:true,ph:'What\'s happening? Any error messages?',aiContext:'general',maxlen:400},
 {label:'Category',key:'category',opts:['IT','Facilities','Maintenance','Network','Other'],half:true},{label:'Priority',key:'priority',opts:['High','Medium','Low'],half:true},
 {label:'Raised by',key:'raised_by',opts:[...raisedByOptions(),'Other (not listed)'],val:myIdentity(),half:true},
 {label:'Other - enter name',key:'raised_by_other',ph:'Full name',showIf:{key:'raised_by',equals:'Other (not listed)'}}
 ],'Try AI resolution','','tryHelpdeskAI')}
window.tryHelpdeskAI=function(v){if(!(v.title||'').trim()){toast('Title is required');return false}
 state._ticketDraft=v;const match=helpdeskAIMatch((v.title||'')+' '+(v.desc||''));
 if(match){closeDrawer();openDrawer(helpdeskAISuggestion(match));return false}
 closeDrawer();createTicketFromDraft();return false};
function helpdeskAISuggestion(match){return detailDrawer({title:'AI suggested fix',sub:'Try this before we create a ticket',color:'#7C3AED',badge:ic('ai',18),
 sections:[{h:'Suggested resolution',html:'<div class="card pad" style="box-shadow:none;font-size:13px;line-height:1.6;color:var(--slate-700)">'+match.fix+'</div>'},
  {h:'Note',html:'<div class="muted" style="font-size:11px">Matched from a rule-based knowledge base, not a live AI call - if it doesn\'t help, a real ticket routes straight to the support team.</div>'}],
 footer:[['Still need help - create ticket',"closeDrawer();createTicketFromDraft()"],['This solved it',"closeDrawer();logAudit('Self-resolved via AI suggestion - '+(state._ticketDraft?state._ticketDraft.title:''),'Helpdesk');toast('Great - glad that fixed it!')",true]]})}
window.createTicketFromDraft=function(){const v=state._ticketDraft||{};const raisedBy=(v.raised_by==='Other (not listed)'?(v.raised_by_other||''):v.raised_by)||myIdentity();
 createTicket({title:v.title,category:v.category,raised_by:raisedBy,priority:v.priority,desc:v.desc})};
window.createTicket=function(v){const t=(v.title||'').trim();if(!t){toast('Title is required');return false}TICKETS.unshift({id:nextNum(TICKETS,'TKT'),title:t,cat:v.category||'IT',by:v.raised_by||'—',priority:v.priority||'Medium',status:'Open',date:'Today',desc:v.desc||''});logAudit('Raised ticket - '+t,'Helpdesk');closeDrawer();render();toast('Ticket raised - routed to support team');return false};
window.advanceTicket=function(id){const t=TICKETS.find(x=>x.id===id);const flow=['Open','In progress','Resolved'];const i=flow.indexOf(t.status);if(i<flow.length-1)t.status=flow[i+1];render();openDrawer(ticketDetail(id));toast(t.id+' · '+t.status)};
function ticketDetail(id){const t=TICKETS.find(x=>x.id===id);const pc=t.priority==='High'?'red':t.priority==='Medium'?'amber':'blue';const sc=t.status==='Resolved'?'green':t.status==='In progress'?'amber':'red';
  return detailDrawer({title:t.title,sub:t.id+' · '+t.cat,color:sc==='green'?'#17A24A':sc==='amber'?'#E2920C':'#E11D2A',badge:'🛠',
    stats:[['Priority',t.priority,pc],['Status',t.status,sc],['Category',t.cat,'blue'],['Raised',t.date,'blue']],
    sections:[{h:'Details',rows:[['Raised by',t.by],['Ticket',t.id],['Assigned to',t.assignee||'Unassigned'],['SLA',t.priority==='High'?'4 hours':t.priority==='Medium'?'1 day':'3 days']]},
     ...(t.desc?[{h:'Description',html:'<div class="muted" style="font-size:12.5px">'+t.desc+'</div>'}]:[])],
    footer:t.status==='Resolved'?[['Reopen',"reopenTicket('"+id+"')"]]:[['Assign',"assignTicketForm('"+id+"')"],[t.status==='Open'?'Start work':'Mark resolved','advanceTicket(\''+id+'\')',true]]})}
function assignTicketForm(id){state._ticketAssign=id;const t=TICKETS.find(x=>x.id===id);const team=t.cat==='Facilities'||t.cat==='Maintenance'?STAFF.filter(s=>s.dept==='Operations'||s.dept==='Facilities').map(s=>s.name):STAFF.filter(s=>s.dept==='IT').map(s=>s.name);
 const pool=team.length?team:STAFF.filter(s=>s.status==='Active').map(s=>s.name);
 formDrawer('Assign ticket',t.title,[{label:'Assign to',key:'assignee',opts:pool,req:true}],'Assign','','saveTicketAssign')}
window.saveTicketAssign=function(v){const id=state._ticketAssign;const t=TICKETS.find(x=>x.id===id);if(!t||!v.assignee)return false;
 t.assignee=v.assignee;logAudit('Assigned ticket '+id+' to '+v.assignee,'Helpdesk');closeDrawer();render();openDrawer(ticketDetail(id));toast('Assigned to '+v.assignee);return false};
window.reopenTicket=function(id){const t=TICKETS.find(x=>x.id===id);if(!t)return;t.status='Open';logAudit('Reopened ticket '+id,'Helpdesk');closeDrawer();render();openDrawer(ticketDetail(id));toast('Ticket reopened')};
M.helpdesk=()=>{const open=TICKETS.filter(t=>t.status==='Open').length,prog=TICKETS.filter(t=>t.status==='In progress').length;
  return `<div class="page-head"><div class="ph-l"><h2>Helpdesk</h2><p>IT and facilities support tickets with priority, SLA and resolution tracking.</p></div>
  <div class="ph-r"><button class="btn primary" onclick="newTicketStep1Form()">${ic('plus',16)} New ticket</button></div></div>
  <div class="grid cols-4" style="margin-bottom:18px">
    ${kpi('helpdesk','#E11D2A','Open',String(open),null)}${kpi('att','#E2920C','In progress',String(prog),null)}
    ${kpi('reports','#17A24A','Resolved today',String(TICKETS.filter(t=>t.status==='Resolved'&&t.date==='Today'||t.status==='Resolved').length),{dir:'up',v:'on track',note:''})}${kpi('roles','#2563EB','Avg. resolution','6h',{dir:'down',v:'-1h',note:'this week'})}</div>
  <div class="card pad"><div class="flex ac jb" style="margin-bottom:12px"><h3 style="font-size:15px">Tickets</h3>${segBtns('helpdesk',['All','Open','In progress','Resolved'],'All')}</div>
  <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Ticket</th><th>Title</th><th>Category</th><th>Raised by</th><th>Priority</th><th>Status</th></tr></thead><tbody>
  ${TICKETS.filter(t=>{const f=getFilter('helpdesk','All');return f==='All'||t.status===f}).map(t=>`<tr style="cursor:pointer" onclick="openDrawer(ticketDetail('${t.id}'))"><td class="num" style="font-weight:600;color:var(--slate-900)">${t.id}</td><td>${t.title}</td><td>${t.cat}</td><td>${t.by}</td><td>${chip(t.priority,t.priority==='High'?'red':t.priority==='Medium'?'amber':'blue')}</td><td>${chip(t.status,t.status==='Resolved'?'green':t.status==='In progress'?'amber':'red')}</td></tr>`).join('')}
  </tbody></table></div></div>`};

