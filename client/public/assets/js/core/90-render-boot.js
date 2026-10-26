/* ============ RENDER DISPATCH ============ */
function a11yEnhance(root){root=root||document;
  root.querySelectorAll('select:not([aria-label]):not([aria-labelledby])').forEach(sel=>{
    if(sel.closest('label'))return;
    const opt=sel.options&&sel.options.length?(sel.options[sel.selectedIndex]||sel.options[0]).text:'';
    sel.setAttribute('aria-label',(opt&&opt.trim())||'Select option');});
  root.querySelectorAll('.tbl-wrap,.kboard').forEach(el=>{if(!el.hasAttribute('tabindex')){el.tabIndex=0;el.setAttribute('role','group');if(!el.getAttribute('aria-label'))el.setAttribute('aria-label',el.classList.contains('kboard')?'Pipeline board, scroll horizontally':'Data table, scroll horizontally');}});
  root.querySelectorAll('[role="switch"]:not([aria-label])').forEach(sw=>{const par=sw.parentElement;let t='';if(par){const b=par.querySelector('span,b,strong');if(b)t=b.textContent.trim();}sw.setAttribute('aria-label',(t?('Toggle '+t):'Toggle'));});
  root.querySelectorAll('button:not([aria-label])').forEach(btn=>{if(btn.textContent.trim())return;const ti=btn.getAttribute('title');btn.setAttribute('aria-label',ti||'Action');});
  root.querySelectorAll('img:not([alt])').forEach(im=>im.setAttribute('alt',''));
}
function render(){
  if (typeof window.__IS_REACT_MODULE === 'function' && window.__IS_REACT_MODULE(state.module)) {
    $('#view').innerHTML = '';
    if (typeof window.__NAVIGATE_REACT === 'function') {
      window.__NAVIGATE_REACT(state.module);
    }
    return;
  }
  if (typeof window.__NAVIGATE_REACT === 'function') {
    window.__NAVIGATE_REACT(null);
  }
  const fn=M[state.module];$('#view').innerHTML=fn?fn():M.dashboard();
  if(state.module==='students')filterStudents();
  if(state.module==='parents')filterParents();
  a11yEnhance($('#view'));localizeView($('#view'));
  if (typeof schoolLocalizeShell === 'function') schoolLocalizeShell();
}

/* ============ COMMAND PALETTE ============ */
let cmdSel=0;
function cmdItems(){const o=[];flatItems().forEach(it=>{if((!it.roles||it.roles.includes(state.role))&&modOn(it.id))o.push({label:it.label,icon:it.icon,group:it.group,act:()=>go(it.id)})});
  o.push({label:'Add a student',icon:'plus',group:'Action',act:()=>{go('students');studentAddForm()}});
  o.push({label:'New announcement',icon:'comm',group:'Action',act:()=>{go('comm');newAnnouncementForm()}});
  o.push({label:'Take attendance',icon:'att',group:'Action',act:()=>go('attendance')});
  return o}
function openCmd(){$('#cmdk').classList.add('on');$('#cmdInput').value='';cmdSel=0;renderCmd();setTimeout(()=>$('#cmdInput').focus(),30)}
function closeCmd(){$('#cmdk').classList.remove('on')}
function renderCmd(){const q=($('#cmdInput').value||'').toLowerCase();const items=cmdItems().filter(i=>(i.label.toLowerCase().includes(q)||schoolTranslateText(i.label).toLowerCase().includes(q)));window._cmd=items;
  $('#cmdList').innerHTML=items.map((i,x)=>`<div class="cr${x===cmdSel?' sel':''}" onclick="window._cmd[${x}].act();closeCmd()">${ic(i.icon,16).replace('class="ic"','')}<span>${studentEscape(schoolTranslateText(i.label))}</span><span class="grp">${studentEscape(schoolTranslateText(i.group))}</span></div>`).join('')||`<div class="muted" style="padding:18px;text-align:center">${t('No matches')}</div>`;localizeView($('#cmdk'))}
function cmdKey(e){const items=window._cmd||[];if(e.key==='ArrowDown'){cmdSel=Math.min(cmdSel+1,items.length-1);renderCmd();e.preventDefault()}else if(e.key==='ArrowUp'){cmdSel=Math.max(cmdSel-1,0);renderCmd();e.preventDefault()}else if(e.key==='Enter'){if(items[cmdSel]){items[cmdSel].act();closeCmd()}}else if(e.key==='Escape')closeCmd()}
document.addEventListener('keydown',e=>{if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();$('#cmdk').classList.contains('on')?closeCmd():openCmd()}if(e.key==='Escape'){closeDrawer();if(typeof BOT_OPEN!=='undefined'&&BOT_OPEN)closeBot()}});

/* ---- persistence handlers for previously toast-only create forms ---- */
const FLEETADD=[];
window.addStaffLeave=function(v){const emp=(v.emp||'').trim();if(!emp){toast('Employee is required');return false}
  const from=v.from||'',to=v.to||'';const range=from&&to?(from+' – '+to):(from||to||'Today');
  let dur='—';try{if(from&&to){const d=Math.round((new Date(to)-new Date(from))/86400000)+1;if(d>0)dur=d+(d>1?' days':' day')}else if(from)dur='1 day'}catch(e){}
  LEAVE.unshift([emp,v.type||'Casual leave',range,dur,'Pending','amber']);closeDrawer();render();toast('Leave request submitted · '+emp);return false};
window.approveStaffLeave=function(i){if(LEAVE[i]){LEAVE[i][4]='Approved';LEAVE[i][5]='green';logAudit('Approved staff leave · '+LEAVE[i][0],'Staff & HR')}render();toast('Leave approved · '+(LEAVE[i]?LEAVE[i][0]:''))};
window.rejectStaffLeave=function(i){if(LEAVE[i]){LEAVE[i][4]='Rejected';LEAVE[i][5]='red';logAudit('Rejected staff leave · '+LEAVE[i][0],'Staff & HR')}render();toast('Leave rejected')};
window.addFeeHead=function(v){const head=(v.head||'').trim();if(!head){toast('Fee head is required');return false}
  FEESTRUCT.push([head,v.applies||'All grades',parseInt(v.amount,10)||0]);closeDrawer();render();toast('Fee head added · '+head);return false};
window.addRole=function(v){const role=(v.role||'').trim();if(!role){toast('Role name is required');return false}
  if(ROLES.includes(role)){toast('Role already exists');return false}
  const baseIdx=Math.max(0,ROLES.indexOf(v.base||'Teacher'));ROLES.push(role);
  PERMROWS.forEach(r=>r[1].push(r[1][baseIdx]||0));closeDrawer();render();toast('Role created · '+role);return false};
function newArrivalForm(){go('library');libraryWorkspaceBookForm();}
window.addTitle=function(v){const title=(v.title||'').trim();if(!title){toast('Title is required');return false}
  if(BOOKCAT.some(b=>b.title.toLowerCase()===title.toLowerCase())){toast(title+' is already in the catalogue');return false}
  const cat=(v.category||'').trim()||'General';const copies=parseInt(v.copies,10)||1;
  BOOKCAT.push({title,author:v.author||'Unknown',cat,total:copies,avail:copies});
  const row=LIBCAT.find(c=>c[0].toLowerCase()===cat.toLowerCase());
  if(row){row[1]+=copies;row[2]+=copies}else{LIBCAT.push([cat,copies,copies,0])}
  logAudit('Added new arrival - '+title+' ('+copies+' cop'+(copies>1?'ies':'y')+')','Library');closeDrawer();render();toast('Added to catalogue - '+title);return false};
function libSearchCatalogue(q){const query=(q||'').toLowerCase();const list=BOOKCAT.filter(b=>b.title.toLowerCase().includes(query)||b.author.toLowerCase().includes(query));
 const el=document.getElementById('libTitlesBody');if(el)el.innerHTML=list.map(b=>`<tr><td style="font-weight:600;color:var(--slate-900)">${b.title}</td><td class="muted">${b.author}</td><td>${b.cat}</td><td class="right num">${b.total}</td><td class="right num" style="color:${b.avail?'var(--brand-deep)':'var(--red)'};font-weight:600">${b.avail}</td></tr>`).join('')||'<tr><td colspan="5"><div class="empty"><div class="ei">'+ic('lib',24)+'</div><h3>No matches</h3><p>Try a different title or author.</p></div></td></tr>'}
window.addVehicle=function(v){const plate=(v.plate_number||'').trim();if(!plate){toast('Plate number is required');return false}
  FLEETADD.unshift({plate,cap:parseInt(v.capacity,10)||0,driver:v.driver||'Unassigned',type:v.type||'Bus 40-seat'});
  closeDrawer();render();toast('Vehicle added to fleet · '+plate);return false};
/* ============ SchoolOS Assistant (in-app help, offline, scoped) ============ */
const BOT_KB=[
 {k:['student','students','add student','new student','enrol','enroll','register','pupil','learner','admission number'],a:'The Students module holds every learner\u2019s profile \u2014 identity, guardian, medical, transport and fee status. Use \u201cAdd student\u201d for a full multi-section intake form, or open any record for academic history and downloadable report cards.',links:[['students','Students'],['admissions','Admissions']]},
 {k:['admission','admissions','apply','application','enquiry','lead','prospect','pipeline','crm'],a:'Admissions manages applications from enquiry to enrolment. The Enrolment CRM tracks leads through New \u2192 Contacted \u2192 Toured \u2192 Application \u2192 Won, with follow-ups and conversion.',links:[['admissions','Admissions'],['crm','Enrolment CRM']]},
 {k:['staff','teacher','teachers','employee','hr','human resource','hire','onboard','leave','department'],a:'Staff & HR covers employee profiles, departments, onboarding and leave requests. Payroll handles salaries and payslips.',links:[['staff','Staff & HR'],['payroll','Payroll']]},
 {k:['parent','parents','guardian','family','mother','father'],a:'Parents lists guardians linked to each student, with contacts and communication tools.',links:[['parents','Parents']]},
 {k:['attendance','present','absent','register','check in','late'],a:'Attendance lets you mark and review daily attendance by class, with present/absent KPIs and below-90% review flags.',links:[['attendance','Attendance']]},
 {k:['exam','exams','grade','grades','gradebook','marks','result','results','report card','assessment'],a:'Exams & Gradebook records marks and grades. Enter marks and generate downloadable report cards from a student\u2019s profile.',links:[['exams','Exams & Gradebook'],['students','Students']]},
 {k:['fee','fees','invoice','invoices','payment','pay','billing','due','overdue','finance','tuition','statement'],a:'Fees & Invoicing tracks tuition, transport and activity charges with paid/due/overdue status. Record payments and download fee statements (which include the local tax framework).',links:[['fees','Fees & Invoicing']]},
 {k:['timetable','schedule','period','periods','class schedule','lessons'],a:'Timetable shows the weekly class schedule grid, colour-coded by subject.',links:[['timetable','Timetable']]},
 {k:['class','classes','section','sections','stream','division'],a:'Classes & Sections manages grade sections, streams, class teachers and capacity.',links:[['classes','Classes & Sections']]},
 {k:['curriculum','syllabus','unit','units','learning outcome','scheme'],a:'Curriculum organises subjects into units, terms and learning outcomes.',links:[['curriculum','Curriculum']]},
 {k:['lms','learning','course','courses','online','elearning','quiz','assignment','homework'],a:'Learning (LMS) manages saved courses, assignments, submissions and reviewed assessments.',links:[['lms','Learning (LMS)']]},
 {k:['behaviour','behavior','discipline','merit','demerit','incident','conduct'],a:'Behaviour logs merits and incidents to track conduct over time.',links:[['behaviour','Behaviour']]},
 {k:['health','clinic','medical','nurse','sick','infirmary','allergy'],a:'Health & Clinic records clinic visits, reasons and actions taken, plus medical alerts.',links:[['health','Health & Clinic']]},
 {k:['cafeteria','canteen','meal','meals','food','wallet','lunch','top up'],a:'Cafeteria manages meal plans and student wallets \u2014 you can top up a wallet balance.',links:[['cafeteria','Cafeteria']]},
 {k:['library','book','books','borrow','issue book','catalogue','loan','return'],a:'Library manages the catalogue, book issues and returns. Add titles and issue books to members.',links:[['library','Library']]},
 {k:['transport','bus','buses','route','routes','vehicle','fleet','driver','pickup'],a:'Transport covers routes, fleet vehicles and riders. Add routes and vehicles to the fleet.',links:[['transport','Transport']]},
 {k:['hostel','boarding','dorm','room','bed','accommodation'],a:'Hostel manages boarding blocks and room/bed allocation.',links:[['hostel','Hostel']]},
 {k:['inventory','asset','assets','stock','supply','store','reorder'],a:'Inventory tracks stock items, quantities and reorder levels.',links:[['inventory','Inventory']]},
 {k:['biometric','fingerprint','device','devices','sync','face'],a:'The biometric registry records devices and observed status. Hardware ingestion is not configured; it does not automatically create attendance.',links:[['biometric','Biometric Sync']]},
 {k:['visitor','visitors','gate','guest','check in visitor','front desk','reception'],a:'Visitor Management logs visitor check-ins, purpose and host.',links:[['visitors','Visitor Management']]},
 {k:['facility','facilities','booking','bookings','hall','reserve','venue','lab'],a:'Facilities & Bookings lets you reserve halls, labs and other facilities.',links:[['facilities','Facilities & Bookings']]},
 {k:['helpdesk','ticket','tickets','support','issue','maintenance request'],a:'Helpdesk manages support tickets by category and priority.',links:[['helpdesk','Helpdesk']]},
 {k:['communication','announce','announcement','message','notice','circular','sms','email','broadcast'],a:'Communication manages portal announcements and private messages. External email and SMS require configured providers.',links:[['comm','Communication']]},
 {k:['event','events','calendar','holiday','ptm','parent teacher meeting','activity'],a:'Events Calendar schedules school events, holidays and parent-teacher meetings.',links:[['calendar','Events Calendar']]},
 {k:['survey','surveys','feedback','poll','questionnaire'],a:'Surveys & Feedback creates polls and collects responses from your community.',links:[['surveys','Surveys & Feedback']]},
 {k:['certificate','certificates','bonafide','transfer certificate','character','document','tc'],a:'Certificates issues official documents \u2014 transfer, bonafide and character certificates \u2014 as downloadable, print-ready files.',links:[['certificates','Certificates']]},
 {k:['alumni','graduate','graduates','ex student','former student'],a:'Alumni maintains records of graduates and their current paths.',links:[['alumni','Alumni']]},
 {k:['expense','expenses','spend','cost','vendor','purchase'],a:'Expenses logs operational spending by category and vendor.',links:[['expenses','Expenses']]},
 {k:['payroll','salary','salaries','payslip','wages'],a:'Payroll handles staff salaries and payslips.',links:[['payroll','Payroll']]},
 {k:['report','reports','analytics','insight','insights','kpi','statistic','data','trend'],a:'Reports & Analytics and AI Insights surface trends across attendance, finance and performance. The Dashboard gives an at-a-glance overview.',links:[['reports','Reports & Analytics'],['aiinsights','AI Insights'],['dashboard','Dashboard']]},
 {k:['role','roles','access','permission','permissions','rights','security'],a:'Roles & Access manages workspace visibility. API roles and record ownership still govern actions. Custom roles are permission templates.',links:[['roles','Roles & Access']]},
 {k:['audit','log','logs','history','activity trail','track changes'],a:'Audit Log records system activity for accountability and compliance.',links:[['audit','Audit Log']]},
 {k:['dark','light','theme','themes','appearance','accent','mode','colour scheme'],a:'Open Settings \u2192 Appearance to switch Light, Dark or System themes and pick a brand accent \u2014 or use the moon icon in the top bar. Your choice is saved on this device.',links:[['settings','Open Settings']]},
 {k:['language','languages','arabic','urdu','hindi','english','translate','translation','rtl'],a:'SchoolOS supports English, Arabic, Urdu and Hindi \u2014 with right-to-left layout for Arabic and Urdu. Use the language button in the top bar, or Settings \u2192 Region & localization. Your choice is remembered.',links:[['settings','Open Settings']]},
 {k:['compliance','privacy','gdpr','dpdp','pdpl','ferpa','tax','vat','gst','data protection','residency','grading system'],a:'Settings \u2192 Data & compliance shows the privacy framework, authority, data residency and tax treatment for the selected country (India DPDP, UAE/Saudi PDPL, GDPR, FERPA\u2026) and the regional grading system.',links:[['settings','Open Settings']]},
 {k:['region','country','currency','localization','locale','market'],a:'Settings \u2192 Region & localization adapts currency, language, direction and the grading/compliance framework across India, the GCC and global regions.',links:[['settings','Open Settings']]},
 {k:['export','csv','download data','backup'],a:'Many modules support export \u2014 the Students list exports to CSV, and report cards, fee statements and certificates download as print-ready documents.',links:[['students','Students']]},
 {k:['search','find','command','shortcut','palette','jump'],a:'Press \u2318K / Ctrl-K (or click the search bar) to open the command palette and jump to any module or action.',links:[]},
 {k:['switch role','view as','change role','principal','administrator','accountant','impersonate'],a:'The live workspace uses your authenticated account role. Interface controls do not impersonate another account or bypass server permissions.',links:[]},
 {k:['what','who are you','help','capabilities','about','schoolos','features','can you do'],a:'I\u2019m the SchoolOS assistant. I help you navigate this platform \u2014 ask about any area (students, fees, attendance, exams, timetable, HR, transport, compliance, themes, languages\u2026) and I\u2019ll explain it and open the right screen for you. I only cover Solvagence SchoolOS.',links:[['dashboard','Dashboard']]}
];
const BOT_SUGGEST=['How do I add a student?','Where are fees & invoices?','Change theme or language','Data & compliance','Generate a report card'];
let BOT_HISTORY=[],BOT_OPEN=false;
function botMatch(q){q=(q||'').toLowerCase();const words=q.split(/[^a-z0-9\u0600-\u06FF\u0900-\u097F]+/).filter(w=>w.length>1);
  let best=null,bs=0;BOT_KB.forEach(e=>{let sc=0;e.k.concat(ARABIC_HELP_TOPICS[e.k[0]]?.keywords||[]).forEach(kw=>{if(q.indexOf(kw)>=0)sc+=kw.split(' ').length*2;words.forEach(w=>{if(kw.indexOf(w)>=0)sc+=1});});if(sc>bs){bs=sc;best=e;}});return bs>0?best:null;}
function botReply(q){const m=botMatch(q);if(m)return{text:m.a,arabicText:ARABIC_HELP_TOPICS[m.k[0]]?.answer,links:m.links||[]};
  return{arabicText:ARABIC_HELP_TOPICS.what.answer,text:'I can help with anything inside Solvagence SchoolOS \u2014 students, admissions, fees, attendance, exams, timetable, library, transport, HR, compliance, themes and languages. Try naming a topic, or pick a suggestion below. (I only cover this platform.)',links:[['dashboard','Dashboard'],['settings','Settings']]};}
function botEsc(s){return String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}
const BOT_USER_SVG='<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M5 21a7 7 0 0 1 14 0"/></svg>';
function botRenderMsg(m){if(m.role==='me')return `<div class="bot-msg me" data-i18n-skip="true"><span class="mava">${BOT_USER_SVG}</span><div class="bub">${botEsc(m.text)}</div></div>`;
  const links=(m.links&&m.links.length)?`<div class="bot-links">${m.links.map(l=>`<span class="bot-link" role="button" tabindex="0" onclick="botGo('${l[0]}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();botGo('${l[0]}')}">${ic('arrow',13)} ${botEsc(t(l[1]))}</span>`).join('')}</div>`:'';
  return `<div class="bot-msg bot"><span class="mava">${ic('ai',15)}</span><div class="bub">${botEsc(LANG==='ar'?(m.arabicText||schoolTranslateText(m.text)):m.text)}${links}</div></div>`;}
function botRender(){const body=$('#botBody');if(!body)return;body.innerHTML=BOT_HISTORY.map(botRenderMsg).join('');body.scrollTop=body.scrollHeight;
  localizeView($('#botPanel'));const chips=$('#botChips');if(chips)chips.innerHTML=BOT_SUGGEST.map(s=>`<span class="bot-chip" role="button" tabindex="0" onclick="botAsk(this.dataset.q)" onkeydown="if(event.key==='Enter'){botAsk(this.dataset.q)}" data-q="${botEsc(s)}">${botEsc(schoolTranslateText(s))}</span>`).join('');}
function botGreet(){if(!BOT_HISTORY.length)BOT_HISTORY.push({role:'bot',text:'Hi! I\u2019m the SchoolOS assistant. Ask me how to do something or where to find a feature \u2014 I\u2019ll explain it and open the right screen for you.',links:[]});}
function openBot(){BOT_OPEN=true;botGreet();botRender();$('#botPanel').classList.add('on');$('#botPanel').removeAttribute('inert');$('#botScrim').classList.add('on');$('#botFab').style.display='none';setTimeout(()=>{const i=$('#botInput');i&&i.focus()},80);}
function closeBot(){BOT_OPEN=false;$('#botPanel').classList.remove('on');$('#botPanel').setAttribute('inert','');$('#botScrim').classList.remove('on');$('#botFab').style.display='grid';const f=$('#botFab');f&&f.focus&&f.focus();}
function botAsk(q){const i=$('#botInput');if(i)i.value=q;botSend();}
function botSend(){const i=$('#botInput');if(!i)return;const q=i.value.trim();if(!q)return;i.value='';BOT_HISTORY.push({role:'me',text:q});botRender();
  setTimeout(()=>{const r=botReply(q);BOT_HISTORY.push({role:'bot',text:r.text,arabicText:r.arabicText,links:r.links});botRender();},200);}
function botGo(id){go(id);closeBot();}

/* ============ PUBLIC LANDING / LOGIN ============ */
const LX={
 tag:{en:'Education Platform',ar:'منصة تعليمية',ur:'تعلیمی پلیٹ فارم',hi:'शिक्षा मंच'},
 eyebrow:{en:'India · GCC · Global · Multilingual',ar:'الهند · الخليج · عالمي · متعدد اللغات',ur:'انڈیا · جی سی سی · عالمی · کثیر لسانی',hi:'भारत · जीसीसी · वैश्विक · बहुभाषी'},
 title:{en:['The complete','operating system for schools'],ar:['نظام التشغيل','المتكامل للمدارس'],ur:['اسکولوں کے لیے','مکمل آپریٹنگ سسٹم'],hi:['स्कूलों के लिए','संपूर्ण ऑपरेटिंग सिस्टम']},
 sub:{en:'Admissions to alumni, attendance to finance, timetables to transport — 36 modules, role-aware, offline-capable, and localized for your region.',ar:'من القبول إلى الخريجين، ومن الحضور إلى المالية، ومن الجداول إلى النقل — 36 وحدة، مدركة للأدوار، تعمل دون اتصال، ومُهيّأة لمنطقتك.',ur:'داخلوں سے فارغ التحصیل تک، حاضری سے مالیات تک، ٹائم ٹیبل سے ٹرانسپورٹ تک — 36 ماڈیولز، کردار سے آگاہ، آف لائن اور آپ کے خطے کے لیے مقامی۔',hi:'प्रवेश से पूर्व छात्र तक, उपस्थिति से वित्त तक, समय-सारणी से परिवहन तक — 36 मॉड्यूल, भूमिका-सजग, ऑफ़लाइन-सक्षम और आपके क्षेत्र के लिए स्थानीयकृत।'},
 feats:{en:['Every school workflow in one secure platform','Works in English, Arabic, Urdu & Hindi with RTL','India DPDP, GCC PDPL, GDPR & FERPA aware'],ar:['كل سير عمل مدرسي في منصة آمنة واحدة','يعمل بالإنجليزية والعربية والأردية والهندية مع دعم RTL','متوافق مع DPDP الهند وPDPL الخليج وGDPR وFERPA'],ur:['ہر اسکول ورک فلو ایک محفوظ پلیٹ فارم میں','انگریزی، عربی، اردو اور ہندی میں RTL کے ساتھ','انڈیا DPDP، جی سی سی PDPL، GDPR اور FERPA سے آگاہ'],hi:['हर स्कूल वर्कफ़्लो एक सुरक्षित मंच में','अंग्रेज़ी, अरबी, उर्दू और हिंदी में RTL सहित','भारत DPDP, जीसीसी PDPL, GDPR और FERPA सजग']},
 stats:{en:[['36','Modules'],['6','Role views'],['4','Languages'],['12','Regions']],ar:[['36','وحدة'],['6','أدوار'],['4','لغات'],['12','منطقة']],ur:[['36','ماڈیولز'],['6','کردار'],['4','زبانیں'],['12','خطے']],hi:[['36','मॉड्यूल'],['6','भूमिकाएँ'],['4','भाषाएँ'],['12','क्षेत्र']]},
 signin:{en:'Sign in to your workspace',ar:'سجّل الدخول إلى مساحة عملك',ur:'اپنے ورک اسپیس میں سائن ان کریں',hi:'अपने कार्यक्षेत्र में साइन इन करें'},
 cardsub:{en:'Select your assigned role and sign in with your school account.',ar:'اختر دورك المخصص وسجّل الدخول بحسابك المدرسي.',ur:'اپنا مقررہ کردار منتخب کرکے اسکول اکاؤنٹ سے سائن ان کریں۔',hi:'अपनी निर्धारित भूमिका चुनकर स्कूल खाते से साइन इन करें।'},
 email:{en:'Email or login ID',ar:'البريد الإلكتروني أو معرّف الدخول',ur:'ای میل یا لاگ ان آئی ڈی',hi:'ईमेल या लॉगिन आईडी'},
 pass:{en:'Password',ar:'كلمة المرور',ur:'پاس ورڈ',hi:'पासवर्ड'},
 rolelab:{en:'Enter as',ar:'ادخل بصفة',ur:'بطور داخل ہوں',hi:'इस रूप में प्रवेश करें'},
 enter:{en:'Enter platform',ar:'دخول المنصة',ur:'پلیٹ فارم میں داخل ہوں',hi:'मंच में प्रवेश करें'},
 guest:{en:'Explore as guest',ar:'الاستكشاف كضيف',ur:'مہمان کے طور پر دیکھیں',hi:'अतिथि के रूप में देखें'},
 note:{en:'Demo environment — no real credentials required. Your data stays on this device.',ar:'بيئة تجريبية — لا حاجة لبيانات اعتماد حقيقية. بياناتك تبقى على هذا الجهاز.',ur:'ڈیمو ماحول — حقیقی اسناد کی ضرورت نہیں۔ آپ کا ڈیٹا اسی ڈیوائس پر رہتا ہے۔',hi:'डेमो वातावरण — किसी वास्तविक क्रेडेंशियल की आवश्यकता नहीं। आपका डेटा इसी डिवाइस पर रहता है।'},
 foot:{en:'© 2025–26 Solvagence · SchoolOS — best-practice demo build',ar:'© 2025–26 سولفاجنس · SchoolOS — نسخة تجريبية وفق أفضل الممارسات',ur:'© 2025–26 سولویجنس · SchoolOS — بہترین عمل ڈیمو',hi:'© 2025–26 सॉल्वेजेंस · SchoolOS — सर्वोत्तम-अभ्यास डेमो'},
 k1:{en:'Students',ar:'الطلاب',ur:'طلبہ',hi:'छात्र'},k2:{en:'Attendance',ar:'الحضور',ur:'حاضری',hi:'उपस्थिति'},k3:{en:'Fees collected',ar:'الرسوم المحصلة',ur:'وصول شدہ فیس',hi:'शुल्क संग्रह'}
};
const LX_FEAT_ICONS=['<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7h16M4 12h16M4 17h10"/></svg>','<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/></svg>','<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>'];
function lxT(k){return (LX[k]&&LX[k][LANG])||(LX[k]&&LX[k].en)||''}
let LANDING_ROLE='Administrator';
LX.sub.en='School people, academics, finance and operations in one authenticated workspace, with saved records and Arabic/RTL support.';
LX.sub.ar='بيانات المدرسة والدراسة والمالية والعمليات في مساحة عمل تتطلب تسجيل الدخول، مع سجلات محفوظة ودعم العربية واتجاه اليمين إلى اليسار.';
LX.feats.en=['Saved school records and role-aware workflows','English and Arabic interface with RTL support','School configuration and operational reporting'];
LX.feats.ar=['سجلات مدرسية محفوظة وإجراءات حسب صلاحيات الحساب','واجهة إنجليزية وعربية مع دعم اتجاه اليمين إلى اليسار','إعدادات المدرسة والتقارير التشغيلية'];
LX.stats.en[0][0]='37';LX.stats.ar[0][0]='٣٧';
LX.note.en='Sign in with your school account. Saved records are stored on the configured school server.';
LX.note.ar='سجّل الدخول بحساب المدرسة. تُحفظ السجلات على خادم المدرسة المهيأ.';
LX.foot.en='Solvagence · SchoolOS';LX.foot.ar='سولفاجنس · نظام المدرسة';
function renderLanding(){
  const L=$('#landing');if(!L)return;
  const logo=document.querySelector('.app img[alt="Solvagence SchoolOS"]');
  const lx=$('#lxLogo');if(lx&&logo&&logo.getAttribute('src'))lx.src=logo.getAttribute('src');
  $('#lxTag').textContent=lxT('tag');
  $('#lxEyebrow').textContent=lxT('eyebrow');
  const ti=lxT('title');$('#lxTitle').innerHTML=escHtml(ti[0])+' <span class="g">'+escHtml(ti[1])+'</span>';
  $('#lxSub').textContent=lxT('sub');
  $('#lxFeats').innerHTML=lxT('feats').map((f,i)=>`<div class="lx-feat"><span class="fi">${LX_FEAT_ICONS[i]}</span>${escHtml(f)}</div>`).join('');
  $('#lxStats').innerHTML=lxT('stats').map(s=>`<div class="lx-stat"><div class="n">${escHtml(s[0])}</div><div class="l">${escHtml(s[1])}</div></div>`).join('');
  $('#lxSignin').textContent=lxT('signin');
  $('#lxCardSub').textContent=lxT('cardsub');
  $('#lxEmailL').textContent=lxT('email');
  $('#lxPassL').textContent=lxT('pass');
  $('#lxRoleL').textContent=lxT('rolelab');
  $('#lxK1').textContent=lxT('k1');$('#lxK2').textContent=lxT('k2');$('#lxK3').textContent=lxT('k3');
  $('#lxEnter').innerHTML=escHtml(lxT('enter'))+' <span aria-hidden="true">'+(CFG.dir==='rtl'?'←':'→')+'</span>';
  $('#lxGuest').textContent=lxT('guest');
  $('#lxNote').textContent=lxT('note');
  $('#lxFoot').textContent=lxT('foot');
  $('#lxBadges').innerHTML=['DPDP','PDPL','GDPR','FERPA','WCAG 2.1 AA'].map(b=>`<span class="lx-badge">${b}</span>`).join('');
  const roles=['Administrator','Principal','Teacher','Accountant','Parent','Student'];
  $('#lxRoles').innerHTML=roles.map(r=>`<button type="button" class="lx-role ${r===LANDING_ROLE?'on':''}" aria-pressed="${r===LANDING_ROLE}" data-role="${r}" onclick="selectLandingRole('${r}')">${escHtml(t(r))}</button>`).join('');
  $('#lxLangs').innerHTML=langEnabled().map(c=>`<button type="button" class="lx-lang ${LANG===c?'on':''}" onclick="setLanguage('${c}')" lang="${c}">${escHtml(LANGS[c].native)}</button>`).join('');
  localizeView(L);
}
function selectLandingRole(r){if(!['Administrator','Principal','Teacher','Accountant','Parent','Student'].includes(r))return;LANDING_ROLE=r;document.querySelectorAll('#lxRoles .lx-role').forEach(el=>{el.classList.toggle('on',el.dataset.role===r);el.setAttribute('aria-pressed',String(el.dataset.role===r))})}
function enterApp(role){const r=role||LANDING_ROLE||'Administrator';const L=$('#landing');
  L.classList.add('out');const app=document.querySelector('.app');if(app)app.removeAttribute('inert');
  setTimeout(()=>{document.body.classList.add('authed');},560);
  setRole(r);go('dashboard');try{window.scrollTo(0,0)}catch(e){}}
function lockApp(){document.body.classList.remove('authed');const L=$('#landing');L.classList.remove('out');const app=document.querySelector('.app');if(app)app.setAttribute('inert','');renderLanding();try{window.scrollTo(0,0)}catch(e){}}
function lxTilt(e){const d=$('#lxDeck');if(!d)return;const w=window.innerWidth||1,h=window.innerHeight||1;const x=(e.clientX/w-.5),y=(e.clientY/h-.5);d.style.transform=`rotateX(${12-y*10}deg) rotateY(${(CFG.dir==='rtl'?16:-16)+x*12}deg)`}
document.addEventListener('mousemove',e=>{if(!document.body.classList.contains('authed'))lxTilt(e)});
/* ============ INIT ============ */
document.documentElement.lang='en';
loadTheme();
document.getElementById('langPill')&&(document.getElementById('langPill').textContent=LANG.toUpperCase());
renderNav();render();
document.querySelector('.app')&&document.querySelector('.app').setAttribute('inert','');
renderLanding();
