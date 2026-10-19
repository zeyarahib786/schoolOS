import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {describe,it,expect} from 'vitest';
const code=['10-localization.js','11-arabic.js'].map(p=>readFileSync('public/assets/js/i18n/'+p,'utf8')).join('\n');
function runtime(){const context={CFG:{country:'UAE',currency:'AED'},window:{confirm:()=>true},document,NodeFilter};runInNewContext(code+'\n; LANG="ar";globalThis.apply=localizeView;globalThis.translate=schoolTranslateText;globalThis.english=()=>{LANG="en"};',context);return context;}
describe('Arabic UI and record boundaries',()=>{
 it('preserves authored detail titles while translating ordinary drawer headings',()=>{const r=runtime();Object.assign(r,{avc:()=> '#333333',darken:()=> '#333333',initials:()=> ''});const helper=readFileSync('public/assets/js/core/42-detail-drawer.js','utf8');runInNewContext(helper.slice(0,helper.indexOf('const AI_DEFAULT_MESSAGES')),r);const root=document.createElement('div');root.innerHTML=r.detailDrawer({title:'Active',recordTitle:true});r.apply(root);expect(root.querySelector('h3').textContent).toBe('Active');root.innerHTML=r.detailDrawer({title:'Open'});r.apply(root);expect(root.querySelector('h3').textContent).toBe('مفتوح');});
 it('localizes standalone and compound pagination with Arabic ticket count forms',()=>{const r=runtime();expect(r.translate('1 tickets · Page 1')).toBe('١ طلب دعم · الصفحة ١');expect(r.translate('2 tickets')).toBe('٢ طلبا دعم');expect(r.translate('3 tickets')).toBe('٣ طلبات دعم');expect(r.translate('11 tickets')).toBe('١١ طلب دعم');r.english();expect(r.translate('1 tickets · Page 1')).toBe('1 tickets · Page 1');});
 it('uses school accommodation and class-register terminology rather than unrelated meanings',()=>{const r=runtime();expect(r.translate('Discharge')).toBe('إنهاء الإقامة');expect(r.translate('Discharged')).toBe('انتهت الإقامة');expect(r.translate('Roll number')).toBe('الرقم في قائمة الصف');runInNewContext('LANG="hi"',r);expect(r.translate('Discharge')).toBe('आवास समाप्त करें');});
 it('translates long copy and options without corrupting enum values or authored text',()=>{const r=runtime(),root=document.createElement('div');root.innerHTML='<select><option>Open</option><option value="High">High</option></select><span data-i18n-skip>Active</span><p>No support tickets match.</p><input placeholder="Search subject or category">';r.apply(root);expect(root.querySelector('option').value).toBe('Open');expect(root.querySelector('option').textContent).toBe('مفتوح');expect(root.querySelectorAll('option')[1].value).toBe('High');expect(root.querySelector('[data-i18n-skip]').textContent).toBe('Active');expect(root.querySelector('p').textContent).not.toContain('No support');expect(root.querySelector('input').placeholder).not.toContain('Search');r.english();r.apply(root);expect(root.querySelector('option').textContent).toBe('Open');expect(root.querySelector('input').placeholder).toBe('Search subject or category');});
 it('tracks external updates on reused text nodes while preserving language reversal',()=>{const r=runtime(),root=document.createElement('span'),node=document.createTextNode('Open');root.appendChild(node);r.apply(root);node.nodeValue='High';r.apply(root);expect(node.nodeValue).toBe('مرتفع');r.english();r.apply(root);expect(node.nodeValue).toBe('High');});
 it('handles dynamic pagination and school grades without running authored strings as HTML',()=>{const r=runtime();expect(r.translate('Page 2 of 10')).toBe('الصفحة ٢ من ١٠');expect(r.translate('Grade 7 · A')).toBe('الصف ٧ · A');expect(r.translate('QA <img src=x>')).toBe('QA <img src=x>');});
 it('translates seamlessly across Urdu and Hindi with one click',()=>{const r=runtime();runInNewContext('LANG="ur"',r);expect(r.translate('Page 2 of 10')).toBe('صفحہ ۲ از ۱۰');expect(r.translate('Grade 7 · A')).toBe('گریڈ ۷ · A');expect(r.translate('Students')).toBe('طلبہ');runInNewContext('LANG="hi"',r);expect(r.translate('Page 2 of 10')).toBe('पृष्ठ २ का १०');expect(r.translate('Grade 7 · A')).toBe('कक्षा ७ · A');expect(r.translate('Students')).toBe('छात्र');});
 it('converts numbers to Arabic and Urdu digits across UI text nodes and currency while preserving brand names and English reversal',()=>{const r=runtime(),root=document.createElement('div');root.innerHTML='<div class="kpi"><span>1,486</span> <span>94.8%</span> <span>AED 17,000</span> <span>2026-03-31</span></div><div data-i18n-skip>Solvagence SchoolOS</div><span data-i18n-skip>Al Noor International</span><span data-i18n-skip>Rashid Al Maktoum</span>';r.apply(root);expect(root.querySelector('.kpi').textContent).toContain('١,٤٨٦');expect(root.querySelector('.kpi').textContent).toContain('٩٤.٨%');expect(root.querySelector('.kpi').textContent).toContain('١٧,٠٠٠');expect(root.querySelector('.kpi').textContent).toContain('٢٠٢٦-٠٣-٣١');expect(root.querySelector('[data-i18n-skip]').textContent).toBe('Solvagence SchoolOS');expect(root.querySelectorAll('[data-i18n-skip]')[1].textContent).toBe('Al Noor International');expect(root.querySelectorAll('[data-i18n-skip]')[2].textContent).toBe('Rashid Al Maktoum');runInNewContext('LANG="ur"',r);r.apply(root);expect(root.querySelector('.kpi').textContent).toContain('۱,۴۸۶');expect(root.querySelector('.kpi').textContent).toContain('۹۴.۸%');expect(root.querySelector('.kpi').textContent).toContain('۱۷,۰۰۰');expect(root.querySelector('.kpi').textContent).toContain('۲۰۲۶-۰۳-۳۱');r.english();r.apply(root);expect(root.querySelector('.kpi').textContent).toContain('1,486');expect(root.querySelector('.kpi').textContent).toContain('94.8%');expect(root.querySelector('.kpi').textContent).toContain('17,000');expect(root.querySelector('.kpi').textContent).toContain('2026-03-31');});
});

describe('Student Arabic display',()=>{
 it('uses saved names or transliteration, and reverses names and LTR phone digits without changing values',()=>{
  const r=runtime(),root=document.createElement('div');
  root.innerHTML='<span data-school-name="Fatima Al Hashimi" data-i18n-skip></span><span data-school-name="Khalid Al Hashimi" data-school-name-translations=\'{"ar":"خالد الهاشمي"}\' data-i18n-skip></span><a href="tel:+971501234567"><span>Call</span><bdi dir="ltr" data-i18n-skip data-school-phone="+971501234567"></bdi></a><bdi dir="ltr" data-i18n-skip>ANS-1042</bdi><button><span>✓</span><span>Guardian name and phone</span></button>';
  r.apply(root);expect(root.firstChild.textContent).toBe('فاطمة الهاشمي');expect(root.children[1].textContent).toBe('خالد الهاشمي');expect(root.querySelector('[data-school-phone]').textContent).toBe('+٩٧١٥٠١٢٣٤٥٦٧');expect(root.querySelector('[data-school-phone]').dir).toBe('ltr');expect(root.querySelector('a').getAttribute('href')).toBe('tel:+971501234567');expect(root.querySelector('button').textContent).toContain('اسم ولي الأمر ورقم الهاتف');expect(root.textContent).toContain('ANS-1042');r.english();r.apply(root);expect(root.firstChild.textContent).toBe('Fatima Al Hashimi');expect(root.querySelector('[data-school-phone]').textContent).toBe('+971501234567');
 });
 it('translates directory totals and all screenshot profile copy',()=>{const r=runtime();expect(r.translate('3 matching · 3 accessible records')).not.toContain('accessible');expect(r.translate('1–3 of 3')).toBe('١–٣ من ٣');for(const key of ['Enrollment history','Emergency information','Profile completeness','Edit record','Portal links','Recommended record details. Missing information is not a reason to refuse admission.'])expect(r.translate(key)).not.toBe(key);});
});

describe('Student document translations',()=>{
 it('translates missing-document and replacement states and completeness labels reversibly',()=>{
  const r=runtime();r.M={};runInNewContext(readFileSync('public/assets/js/modules/51-students.js','utf8'),r);
  Object.assign(r,{state:{role:'Admin'},studentClick:()=>'',canWrite:()=>true,studentManager:()=>true});
  const student={id:'QA-DOC',name:'Test',docs:[{key:'photo',label:'Student photo',file:{name:'Original 123.png'}}]};
  const root=document.createElement('div');root.innerHTML=r.studentCompletenessHtml(student)+r.studentDocumentsHtml(student);
  r.apply(root);
  for(const key of ['Identity document','Birth certificate','Student photo','Replace','No document uploaded']){
   expect(root.textContent).not.toContain(key);expect(r.translate(key)).not.toBe(key);
  }
  expect(root.textContent).toContain('Original 123.png');expect(root.textContent).toContain('شهادة الميلاد');expect(root.textContent).toContain('استبدال');expect(root.textContent).toContain('لم يُرفع أي مستند');
  r.english();r.apply(root);for(const key of ['Identity document','Birth certificate','Student photo','Replace','No document uploaded'])expect(root.textContent).toContain(key);
 });
});

describe('Employee Arabic display',()=>{
 it('localizes actual directory and detail markup while preserving phone links, document values and source records',()=>{
  const r=runtime();Object.assign(r,{M:{},state:{role:'Administrator'},commUserId:()=> 'admin',healthDay:()=> '2026-10-14',avc:()=> '#333333',darken:()=> '#333333',initials:()=> 'JT',kpi:()=> '',chip:v=>v,cellUser:(name,id)=>`<div><div class="nm">${name}</div><div>${id}</div></div>`,openDrawer:html=>{r.drawer=html}});
  runInNewContext(readFileSync('public/assets/js/modules/51-students.js','utf8')+'\n'+readFileSync('public/assets/js/modules/54-staff.js','utf8'),r);
  const helper=readFileSync('public/assets/js/core/42-detail-drawer.js','utf8');runInNewContext(helper.slice(0,helper.indexOf('const AI_DEFAULT_MESSAGES')),r);
  const employee={_id:'staff-1',refId:'EMP-104',name:'Joseph Thomas',designation:'Chief Accountant',department:'Finance',phone:'+971504445566',email:'joseph@example.invalid',status:'Active',annualLeaveRemaining:30,documents:[],onboarding:[{key:'offer',label:'Offer letter accepted',done:false},{key:'contract',label:'Employment contract signed',done:false},{key:'docs',label:'Documents verified (passport, certificates)',done:false},{key:'visa',label:'Visa / labour card processed',done:false},{key:'account',label:'IT account & email setup',done:false}]};
  const raw=JSON.stringify(employee);Object.assign(r.staffWorkspaceState(),{loaded:true,rows:[employee]});
  const root=document.createElement('div');root.innerHTML=r.M.staff();r.apply(root);expect(root.textContent).toContain('جوزيف توماس');expect(root.textContent).toContain('رئيس المحاسبين');expect(root.querySelector('[data-school-phone]').dir).toBe('ltr');expect(root.querySelector('[data-school-phone]').textContent).toBe('+٩٧١٥٠٤٤٤٥٥٦٦');
  r.window.staffWorkspaceDetail(employee._id);root.innerHTML=r.drawer;r.apply(root);expect(root.querySelector('h3').textContent).toBe('جوزيف توماس');expect(root.textContent).not.toMatch(/Joseph Thomas|Chief Accountant|calendar days|Offer letter accepted|Employment contract signed|Documents verified|Visa \/ labour card processed|IT account & email setup/);expect(root.querySelector('[data-school-phone]').textContent).toBe('+٩٧١٥٠٤٤٤٥٥٦٦');expect([...root.querySelectorAll('option')].map(e=>e.value)).toEqual(['id','degree','photo','experience','visa','attestation']);expect(root.querySelector('option').textContent).toBe('وثيقة الهوية');
  r.staffWorkspaceState().q='جوزيف';expect(r.staffWorkspaceFiltered()).toHaveLength(1);r.english();r.apply(root);expect(root.querySelector('h3').textContent).toBe('Joseph Thomas');expect(root.textContent).toContain('Chief Accountant');expect(root.querySelector('[data-school-phone]').textContent).toBe('+971504445566');expect(JSON.stringify(employee)).toBe(raw);
 });
});

describe('Classes and timetable Arabic copy',()=>{
 it('localizes class-card availability and actions reversibly',()=>{
  const r=runtime(),root=document.createElement('div');root.innerHTML='<p>Primary · Room not assigned</p><p>28 <span>available places</span></p><button>Edit section</button>';r.apply(root);expect(root.textContent).not.toMatch(/Room not assigned|available places|Edit section/);expect(root.textContent).toContain('لم تُخصّص غرفة');expect(root.textContent).toContain('٢٨ مقاعد شاغرة');r.english();r.apply(root);expect(root.textContent).toContain('Room not assigned');expect(root.textContent).toContain('28 available places');expect(root.textContent).toContain('Edit section');
 });
 it('translates actual timetable instructions for every weekday and both edit permissions',()=>{
  const r=runtime();r.M={};r.SUBJCOLOR={};runInNewContext(readFileSync('public/assets/js/modules/57-timetable.js','utf8'),r);r.ttData=()=>({status:'Draft',rows:[]});
  for(const writable of [true,false])for(const day of ['Mon','Tue','Wed','Thu','Fri']){
   r.canWrite=()=>writable;r.ttNow=()=>({label:day,di:0});const root=document.createElement('div');root.innerHTML=r.ttClassGrid('Grade 1 · A',['Mon','Tue','Wed','Thu','Fri']);r.apply(root);expect(root.textContent).not.toMatch(/highlighted as today|click a period|drag one period|conflicts re-check|view only|editing requires/);expect(root.textContent).toContain('محدد باعتباره اليوم الحالي');r.english();r.apply(root);expect(root.textContent).toContain(day+' highlighted as today');runInNewContext('LANG="ar"',r);
  }
 });
});

describe('Parents Arabic screens',()=>{
 it('localizes guardian and child names, phone direction, conversations and both meeting views without changing data',()=>{
  const r=runtime();Object.assign(r,{M:{},state:{role:'Administrator',parentMeetingDate:'2026-10-14'},ic:()=>'',STUDENTS:[{id:'ANS-1042',name:'Fatima Al Hashimi',grade:'Grade 10 · A'}]});
  runInNewContext(readFileSync('public/assets/js/modules/51-students.js','utf8')+'\n'+readFileSync('public/assets/js/modules/55-parents.js','utf8'),r);
  runInNewContext(`GUARDIANS=[{id:'GRD-101',name:'Khalid Al Hashimi',phone:'+971501234567',email:'guardian@example.invalid',children:['ANS-1042'],relation:'Father',pickup:true,consents:{}}];PARENT_BROADCASTS=[{subject:'Term 2 fee reminder',audienceLabel:'Due-fee parents',recipientCount:1}];`,r);
  const source=JSON.stringify(r.buildGuardians()),root=document.createElement('div');root.innerHTML="<table><tbody>"+r.parentRows(r.buildGuardians())+"</tbody></table>";r.apply(root);expect(root.textContent).toContain('خالد الهاشمي');expect(root.textContent).toContain('فاطمة الهاشمي');expect(root.textContent).not.toContain('Authorized');expect(root.querySelector('[data-school-phone]').textContent).toBe('+٩٧١٥٠١٢٣٤٥٦٧');expect(root.querySelector('[data-school-phone]').dir).toBe('ltr');
  root.innerHTML=r.parentComm();r.apply(root);expect(root.textContent).not.toMatch(/In-app broadcasts|Messages saved|Guardian conversations|Due-fee parents|Term 2 fee reminder/);expect(root.textContent).toContain('خالد الهاشمي');
  for(const role of ['Administrator','Parent']){r.state.role=role;root.innerHTML=r.parentMeetings();r.apply(root);expect(root.textContent).not.toMatch(/Parent–teacher meetings|New slot|Select a date|Parent \/ student|No meetings on this date/);r.english();r.apply(root);expect(root.textContent).toContain('Select a date');runInNewContext('LANG="ar"',r);}
  root.innerHTML="<table><tbody>"+r.parentRows(r.buildGuardians())+"</tbody></table>";r.apply(root);r.english();r.apply(root);expect(root.textContent).toContain('Khalid Al Hashimi');expect(root.textContent).toContain('Fatima Al Hashimi');expect(root.querySelector('[data-school-phone]').textContent).toBe('+971501234567');expect(JSON.stringify(r.buildGuardians())).toBe(source);
 });
});

describe('Attendance Arabic views',()=>{
 it('translates actual register, monthly, follow-up and staff markup with reversible names and canonical option values',()=>{
  const r=runtime();r.window.addEventListener=()=>{};const student={id:'ANS-1044',mongoId:'s1',name:'Mariam Saleh',roll:'19'};Object.assign(r,{M:{},state:{role:'Administrator',attSession:'AM'},STUDENTS:[student],kpi:()=>'',SCHOOLOS_ADAPTER:{settings:{}},STUDENT_ATTENDANCE:{},STAFF_ATTENDANCE:{'Joseph Thomas':{status:'Present',time:'09:00'}},ABSENCE_REQUESTS:[]});
  runInNewContext(readFileSync('public/assets/js/modules/51-students.js','utf8')+'\n'+readFileSync('public/assets/js/modules/58-attendance.js','utf8'),r);
  Object.assign(r,{attRoster:()=>[student],attDate:()=> '2026-10-14',attSelectedClass:()=> 'Grade 8 · B',attLabelDate:()=> '2026-10-14',attDraft:()=>({dirty:false,rows:{s1:{status:'',notes:''}}}),attMonthRecords:()=>[],attRecordFor:()=>null});
  for(const html of [r.attDaily(),r.attMonthly(),r.attAnalytics(),r.attStaffView()]){const root=document.createElement('div');root.innerHTML=html;r.apply(root);expect(root.textContent).not.toMatch(/Mariam Saleh|Joseph Thomas|Monthly register|Attendance follow-up|Based on saved sessions|Follow-up threshold|Blank rows are not counted|I'm present|I'm remote|I'm late/);r.english();r.apply(root);runInNewContext('LANG="ar"',r);}
  const root=document.createElement('select');root.innerHTML='<option value="ANS-1044 · Mariam Saleh" data-school-name="Mariam Saleh" data-school-name-prefix="ANS-1044" data-i18n-skip>ANS-1044 · Mariam Saleh</option>';r.apply(root);expect(root.options[0].textContent).toBe('ANS-1044 · مريم صالح');expect(root.value).toBe('ANS-1044 · Mariam Saleh');r.english();r.apply(root);expect(root.options[0].textContent).toBe('ANS-1044 · Mariam Saleh');
 });
});

describe('Curriculum Arabic form defaults',()=>{
 it('localizes defaults reversibly while preserving user edits and canonical save values',()=>{
  const r=runtime();r.M={};runInNewContext(readFileSync('public/assets/js/modules/65-curriculum.js','utf8'),r);
  const root=document.createElement('div');root.innerHTML='<h3>Add curriculum unit</h3>'+['All grades','Term 1','School-defined','Subject coordinator'].map(v=>`<input data-school-default-value="${v}" value="${v}">`).join('');r.apply(root);expect(root.querySelector('h3').textContent).toBe('إضافة وحدة دراسية');const inputs=[...root.querySelectorAll('input')];for(const input of inputs){expect(input.value).not.toBe(input.getAttribute('data-school-default-value'));expect(r.curriculumCanonicalDefault(input.value,input.getAttribute('data-school-default-value'))).toBe(input.getAttribute('data-school-default-value'));}inputs[3].value='Custom coordinator';r.english();r.apply(root);expect(inputs[0].value).toBe('All grades');expect(inputs[1].value).toBe('Term 1');expect(inputs[2].value).toBe('School-defined');expect(inputs[3].value).toBe('Custom coordinator');expect(r.curriculumCanonicalDefault('Custom coordinator','Subject coordinator')).toBe('Custom coordinator');
 });
});

describe('Central personal-name display',()=>{
 it('registers future API people and translates unmodified modules and option labels reversibly without changing authored text or values',()=>{
  const r=runtime();r.schoolRegisterResponseNames('/staff',{data:[{name:'Future Employee',translations:{ar:{name:'موظف جديد'}}}]});r.schoolRegisterResponseNames('/invoices',{data:[{student:{name:'Fatima Al Hashimi',translations:{ar:{name:'فاطمة الهاشمي'}}},name:'Tuition fee'}]});
  const root=document.createElement('div');root.innerHTML='<td>Future Employee</td><p>ANS-1 · Fatima Al Hashimi</p><select><option value="student-1">ANS-1 · Fatima Al Hashimi</option></select><h3 data-i18n-skip>Active</h3><textarea>Fatima Al Hashimi</textarea><p>Tuition fee</p>';
  r.apply(root);expect(root.textContent).toContain('موظف جديد');expect(root.querySelector('option').textContent).toBe('ANS-١ · فاطمة الهاشمي');expect(root.querySelector('select').value).toBe('student-1');expect(root.querySelector('textarea').value).toBe('Fatima Al Hashimi');expect(root.querySelector('h3').textContent).toBe('Active');expect(root.textContent).toContain('Tuition fee');r.english();r.apply(root);expect(root.querySelector('option').textContent).toBe('ANS-1 · Fatima Al Hashimi');expect(root.textContent).toContain('Future Employee');
 });
 it('uses safe shared person cells, stored spelling and fallback for unseen names',()=>{
  const r=runtime();Object.assign(r,{avatar:()=>''});runInNewContext(readFileSync('public/assets/js/core/40-helpers-infra.js','utf8').split('function emptyState')[0],r);const root=document.createElement('div');root.innerHTML=r.cellUser('Joseph Thomas','EMP-1');r.apply(root);expect(root.querySelector('.nm').textContent).toBe('جوزيف توماس');r.english();r.apply(root);expect(root.querySelector('.nm').textContent).toBe('Joseph Thomas');
 });
});
