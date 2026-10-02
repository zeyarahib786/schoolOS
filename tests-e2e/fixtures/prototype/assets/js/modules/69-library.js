/* ---- Library ---- */
M.library=()=>{const tab=getSubTab('lib-v','circulation');const overdue=LIBLOANS.filter(l=>l.status==='Overdue');const onLoan=LIBLOANS.filter(l=>l.status!=='Returned');
 return `
  <div class="page-head"><div class="ph-l"><h2>Library</h2><p>Catalogue, issue and return, reservations and overdue tracking.</p></div>
  <div class="ph-r"><button class="btn" onclick="openDrawer(overdueNotifyCentre())">${ic('comm',16)} Notify overdue${overdue.length?' ('+overdue.length+')':''}</button>${canWrite()?`<button class="btn primary" onclick="issueBookForm()">${ic('plus',16)} Issue book</button>`:`<button class="btn primary" onclick="requestBookForm()">${ic('plus',16)} Request a book</button>`}</div></div>
  <div class="grid cols-4" style="margin-bottom:18px">
    ${kpi('lib','#17A24A','Titles',String(BOOKCAT.length),null,"setSubTab('lib-v','catalogue')")}${kpi('students','#2563EB','On loan',String(onLoan.length),null,"setSubTab('lib-v','circulation')")}
    ${kpi('exam','#E11D2A','Overdue',String(overdue.length),overdue.length?{dir:'down',v:'action needed',note:''}:null,"openDrawer(overdueNotifyCentre())")}${kpi('reports','#0E7C39','Available copies',String(BOOKCAT.reduce((a,b)=>a+b.avail,0)),null,"setSubTab('lib-v','catalogue')")}</div>
  ${subTabs('lib-v',[['circulation','Circulation','lib'],['catalogue','Catalogue','reports'],['members','Members','students'],['requests','Requests','helpdesk']])}
  ${tab==='catalogue'?libCatalogue():tab==='members'?libMembers():tab==='requests'?libRequestsView():libCirculation()}`};
let BOOKCAT=[
 {title:'Sapiens: A Brief History',author:'Y. N. Harari',cat:'History & Geography',total:6,avail:4},
 {title:'The Hobbit',author:'J. R. R. Tolkien',cat:'Fiction & Literature',total:8,avail:6},
 {title:'A Brief History of Time',author:'Stephen Hawking',cat:'Science & Technology',total:5,avail:3},
 {title:'To Kill a Mockingbird',author:'Harper Lee',cat:'Fiction & Literature',total:7,avail:5},
 {title:'The Alchemist',author:'Paulo Coelho',cat:'Fiction & Literature',total:6,avail:6},
 {title:'Cosmos',author:'Carl Sagan',cat:'Science & Technology',total:4,avail:2},
 {title:'1984',author:'George Orwell',cat:'Fiction & Literature',total:5,avail:4},
 {title:'The Elements of Style',author:'Strunk & White',cat:'Languages (Arabic/EN)',total:3,avail:3},
 {title:'Calculus Made Easy',author:'Silvanus Thompson',cat:'Mathematics',total:4,avail:1},
 {title:'Arabic for Beginners',author:'Dept. of Education',cat:'Languages (Arabic/EN)',total:10,avail:8},
];
function bookAvailability(){LIBLOANS.filter(l=>l.status!=='Returned').forEach(()=>{});return BOOKCAT}
let LIBREQUESTS=[];
function issueBookForm(){if(!guardWrite('Issuing books'))return;
 const avail=BOOKCAT.filter(b=>b.avail>0);
 const due=new Date();due.setDate(due.getDate()+14);const dueStr=due.toISOString().slice(0,10);
 formDrawer('Issue book','Select from catalogue and roster - due date defaults to 14 days',[
  {label:'Title',key:'title',opts:avail.map(b=>b.title+' ('+b.avail+' available)'),req:true},
  {label:'Borrower',key:'borrower',opts:STUDENTS.map(s=>s.name+' - '+s.grade+' - '+s.id),req:true},
  {label:'Due date',key:'due',type:'date',val:dueStr}
 ],'Issue book','','issueBook')}
window.issueBook=function(v){if(!guardWrite('Issuing books'))return false;
 const titleRaw=(v.title||'').split(' (')[0].trim();const book=BOOKCAT.find(b=>b.title===titleRaw);
 if(!book||book.avail<=0){toast('No available copies of that title');return false}
 const borrowerRaw=(v.borrower||'').split(' - ')[0].trim();const student=STUDENTS.find(s=>s.name===borrowerRaw);
 if(!student){toast('Select a borrower from the list');return false}
 book.avail--;LIBLOANS.unshift({title:book.title,author:book.author,borrower:student.name,cls:student.grade.replace('Grade ','').replace(' · ','-'),due:v.due||dateShort(),status:'On loan'});
 logAudit('Issued book - '+book.title+' to '+student.name,'Library');closeDrawer();render();toast('Issued - '+book.title+' to '+student.name);return false};
function requestBookForm(){const avail=BOOKCAT;
 formDrawer('Request a book','Sent to library staff for approval and issue',[
  {label:'Title',key:'title',opts:avail.map(b=>b.title+(b.avail>0?' ('+b.avail+' available)':' (fully on loan)')),req:true},
  {label:'Requested for',key:'note',ph:'Optional note to librarian',area:true,aiContext:'library-request-note',maxlen:300}
 ],'Send request','','submitBookRequest')}
window.submitBookRequest=function(v){const titleRaw=(v.title||'').split(' (')[0].trim();const book=BOOKCAT.find(b=>b.title===titleRaw);if(!book){toast('Select a title');return false}
 const who=state.role==='Student'?myStudent().name:state.role==='Parent'?myStudent().name+" (via guardian)":myIdentity();
 LIBREQUESTS.unshift({title:book.title,by:who,role:state.role,date:'Today',status:'Pending',note:v.note||''});
 logAudit('Requested book - '+book.title+' by '+who,'Library');closeDrawer();render();toast('Request sent - library staff will issue when available');return false};
function libRequestsView(){return `<div class="card pad"><div class="sec-head" style="margin-bottom:8px"><h3 style="font-size:15px">Book requests</h3><span class="muted" style="font-size:12px">${LIBREQUESTS.filter(r=>r.status==='Pending').length} pending</span></div>
 ${LIBREQUESTS.length?`<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Title</th><th>Requested by</th><th>Role</th><th>Date</th><th>Status</th><th></th></tr></thead><tbody>
 ${LIBREQUESTS.map((r,i)=>`<tr><td style="font-weight:600;color:var(--slate-900)">${r.title}</td><td>${r.by}</td><td class="muted">${r.role}</td><td class="num">${r.date}</td><td>${chip(r.status,r.status==='Pending'?'amber':r.status==='Fulfilled'?'green':'gray')}</td><td class="right">${r.status==='Pending'&&canWrite()?`<button class="btn sm" onclick="fulfillBookRequest(${i})">Fulfil</button>`:''}</td></tr>`).join('')}
 </tbody></table></div>`:`<div class="empty"><div class="ei">${ic('helpdesk',26)}</div><h3>No requests</h3><p>Book requests from students and parents will appear here.</p></div>`}</div>`}
window.fulfillBookRequest=function(i){if(!guardWrite('Fulfilling book requests'))return;const r=LIBREQUESTS[i];if(!r)return;const book=BOOKCAT.find(b=>b.title===r.title);
 if(!book||book.avail<=0){toast('No copies currently available - keep pending');return}
 r.status='Fulfilled';logAudit('Fulfilled book request - '+r.title+' for '+r.by,'Library');render();toast('Marked fulfilled - issue the book from Circulation when handed over')};
window.returnBook=function(title,borrower){if(!guardWrite('Returning books'))return;const l=LIBLOANS.find(x=>x.title===title&&x.borrower===borrower&&x.status!=='Returned');if(!l)return;l.status='Returned';
 const book=BOOKCAT.find(b=>b.title===title);if(book)book.avail=Math.min(book.total,book.avail+1);
 logAudit('Returned book - '+title+' from '+borrower,'Library');closeDrawer();render();toast('Returned - '+title)};
function overdueNotifyCentre(){const overdue=LIBLOANS.filter(l=>l.status==='Overdue');const byDate={};overdue.forEach(l=>{(byDate[l.due]=byDate[l.due]||[]).push(l)});
 return detailDrawer({title:'Notify overdue borrowers',sub:overdue.length+' overdue loan'+(overdue.length===1?'':'s')+' across '+Object.keys(byDate).length+' due date'+(Object.keys(byDate).length===1?'':'s'),color:'#E11D2A',badge:ic('comm',18),
  sections:[{h:'By due date',html:overdue.length?'<div class="card pad" style="box-shadow:none">'+Object.entries(byDate).map(([d,list])=>'<div style="padding:10px 0;border-bottom:1px solid var(--line-soft)"><div class="flex ac jb" style="margin-bottom:6px"><span style="font-weight:600;color:var(--slate-900);font-size:13px">Due '+d+' - '+list.length+' borrower'+(list.length===1?'':'s')+'</span><button class="btn sm" onclick="notifyByDueDate(\''+d+'\')">Notify all ('+list.length+')</button></div>'+list.map(l=>'<div class="flex ac jb" style="padding:4px 0 4px 4px"><span class="muted" style="font-size:12px">'+l.borrower+' - '+l.title+'</span><button class="btn sm" onclick="notifyOneOverdue(\''+l.title.replace(/\x27/g,"\\\x27")+'\',\''+l.borrower.replace(/\x27/g,"\\\x27")+'\')">Notify</button></div>').join('')+'</div>').join('')+'</div>':'<div class="muted" style="font-size:12.5px">No overdue loans - nothing to notify.</div>'}],
  footer:overdue.length?[['Notify everyone overdue',"notifyAllOverdue()",true]]:[['Close','closeDrawer()',true]]})}
window.notifyAllOverdue=function(){const overdue=LIBLOANS.filter(l=>l.status==='Overdue');if(!overdue.length){toast('No overdue loans');return}
 logAudit('Sent overdue reminders - '+overdue.length+' borrower'+(overdue.length===1?'':'s'),'Library');closeDrawer();toast('Reminders sent to '+overdue.length+' borrower'+(overdue.length===1?'':'s')+' with overdue titles')};
window.notifyByDueDate=function(due){const list=LIBLOANS.filter(l=>l.status==='Overdue'&&l.due===due);if(!list.length)return;
 logAudit('Sent overdue reminders - due '+due+' - '+list.length+' borrower'+(list.length===1?'':'s'),'Library');closeDrawer();openDrawer(overdueNotifyCentre());toast('Reminders sent to '+list.length+' borrower'+(list.length===1?'':'s')+' due '+due)};
window.notifyOneOverdue=function(title,borrower){logAudit('Sent overdue reminder - '+title+' to '+borrower,'Library');toast('Reminder sent to '+borrower)};
function libCirculation(){return `<div class="card pad"><div class="flex ac jb" style="margin-bottom:12px"><h3 style="font-size:15px">Recent loans</h3>
  ${segBtns('library',['All','Overdue','Reserved'],'All')}</div>
  <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Title</th><th>Author</th><th>Borrower</th><th>Class</th><th>Due</th><th>Status</th></tr></thead><tbody>
  ${LIBLOANS.filter(b=>{const f=getFilter('library','All');return f==='All'||b.status===f}).map(b=>`<tr style="cursor:pointer" onclick="openDrawer(libraryDetail('${b.title}'))"><td style="font-weight:600;color:var(--slate-900)">${b.title}</td><td>${b.author}</td><td>${b.borrower}</td><td class="num">${b.cls}</td><td class="num">${b.due}</td>
    <td>${chip(b.status,b.status==='Overdue'?'red':b.status==='Reserved'?'amber':'green')}</td></tr>`).join('')}
  </tbody></table></div></div>`}
const LIBCAT=[['Fiction & Literature',4200,3760,440],['Science & Technology',2800,2410,390],['Mathematics',1200,1015,185],['History & Geography',1650,1500,150],['Languages (Arabic/EN)',2100,1880,220],['Reference & Encyclopedias',980,980,0],['Children & Early Years',1890,1620,270]];
function libCatalogue(){return `<div class="card pad" style="margin-bottom:14px"><div class="flex ac jb" style="margin-bottom:12px;flex-wrap:wrap;gap:10px"><h3 style="font-size:15px">Titles - search by book or author</h3>${canWrite()?`<button class="btn sm primary" onclick="newArrivalForm()">${ic('plus',14)} Add new arrival</button>`:''}</div>
  <div class="field search" style="margin-bottom:12px"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg><input placeholder="Search title or author" oninput="libSearchCatalogue(this.value)"></div>
  <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Title</th><th>Author</th><th>Category</th><th class="right">Copies</th><th class="right">Available</th></tr></thead><tbody id="libTitlesBody">
  ${BOOKCAT.map(b=>`<tr><td style="font-weight:600;color:var(--slate-900)">${b.title}</td><td class="muted">${b.author}</td><td>${b.cat}</td><td class="right num">${b.total}</td><td class="right num" style="color:${b.avail?'var(--brand-deep)':'var(--red)'};font-weight:600">${b.avail}</td></tr>`).join('')}
  </tbody></table></div></div>
  <div class="card pad"><div class="sec-head" style="margin-bottom:6px"><h3 style="font-size:15px">Catalogue by category</h3></div>
  <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Category</th><th class="right">Copies</th><th class="right">Available</th><th class="right">On loan</th><th style="width:150px">Availability</th></tr></thead><tbody>
  ${LIBCAT.map(c=>{const pct=Math.round(c[2]/c[1]*100);return `<tr><td style="font-weight:600;color:var(--slate-900)">${c[0]}</td><td class="right num">${c[1].toLocaleString()}</td><td class="right num" style="color:var(--brand-deep);font-weight:600">${c[2].toLocaleString()}</td><td class="right num muted">${c[3]}</td><td><div class="flex ac" style="gap:8px">${cbar(pct,pct>=85?'green':pct>=60?'amber':'red')}<span class="num muted" style="font-size:11px">${pct}%</span></div></td></tr>`}).join('')}
  </tbody></table></div></div>`}
function libMembers(){const members=STUDENTS.slice(0,10);return `<div class="card pad"><div class="sec-head" style="margin-bottom:6px"><h3 style="font-size:15px">Members</h3><span class="muted" style="font-size:12px">Active borrowers and their loan limits</span></div>
  <div class="tbl-wrap"><table class="tbl"><thead><tr><th>Member</th><th>Grade</th><th class="right">On loan</th><th class="right">Limit</th><th>Status</th></tr></thead><tbody>
  ${members.map((s,i)=>{const onLoan=i%4;const lim=s.grade.indexOf('Grade 1')===0||s.grade.indexOf('KG')===0?3:5;return `<tr style="cursor:pointer" onclick="openDrawer(studentProfile('${s.id}'))"><td>${cellUser(s.name,s.id)}</td><td>${s.grade}</td><td class="right num">${onLoan}</td><td class="right num muted">${lim}</td><td>${chip(onLoan>=lim?'At limit':onLoan?'Active':'Clear',onLoan>=lim?'amber':onLoan?'blue':'green')}</td></tr>`}).join('')}
  </tbody></table></div></div>`}

