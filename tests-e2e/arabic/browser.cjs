const assert=require('assert');
require('../helpers/browser.cjs')('arabic',async({role,step,evaluate,waitFor,fill,cdp,screenshot})=>{
 await step('Arabic sets RTL and translates every registered workspace for this role',async()=>{
  await evaluate("setLanguage('ar')");assert.deepStrictEqual(await evaluate('[document.documentElement.lang,document.documentElement.dir]'),['ar','rtl']);
  const modules=await evaluate('flatItems().map(m=>({id:m.id,label:m.label}))');
  for(const m of modules){await evaluate('go('+JSON.stringify(m.id)+')');await new Promise(r=>setTimeout(r,200));assert(await evaluate('document.getElementById("view").textContent.trim().length>0'),m.id+' empty');assert(await evaluate('document.getElementById("tbTitle").textContent===t('+JSON.stringify(m.label)+')'),m.id+' untranslated title');}
  return {workspaces:modules.length};
 });
 await step('Student names profile copy and LTR phones switch reversibly',async()=>{
  await evaluate("go('students')");
  await evaluate("window.studentLocaleFixture=JSON.parse(JSON.stringify(STUDENTS[0]));Object.assign(STUDENTS[0],{name:'Fatima Al Hashimi',guardian:'Khalid Al Hashimi',phone:'+971501234567',translations:undefined});filterStudents();localizeView(document.getElementById('view'))");
  assert(await evaluate("document.getElementById('stuBody').textContent.includes('فاطمة الهاشمي')"));
  assert(!(await evaluate("document.getElementById('stuCount').textContent.includes('accessible records')")));
  await evaluate("state._spTab='overview';openDrawer(studentProfile(STUDENTS[0].id))");
  assert.strictEqual(await evaluate("document.querySelector('#drawer h3').textContent"),'فاطمة الهاشمي');
  assert(!(await evaluate("document.querySelector('#drawer .dh').textContent.includes('Grade')")));
  if(role!=='Accountant'){
   assert(await evaluate("document.getElementById('drawer').textContent.includes('معلومات الطوارئ')"));
   assert.deepStrictEqual(await evaluate("(()=>{const e=document.querySelector('#drawer [data-school-phone]');return [e.textContent,getComputedStyle(e).direction]})()"),['+٩٧١٥٠١٢٣٤٥٦٧','ltr']);
   assert.strictEqual(await evaluate("document.querySelector('#drawer a[href^=tel]').getAttribute('href')"),'tel:+971501234567');
  }
  assert(!(await evaluate("/Emergency information|Profile completeness|Class and roll|Guardian name and phone|Edit record|Portal links/.test(document.getElementById('drawer').textContent)")));
  await screenshot('student-profile-rtl');
  for(const tab of ['guardians','academics','attendance','fees',...(role==='Accountant'?[]:['documents']),...(['Admin','Principal'].includes(role)?['history']:[])]){
   await evaluate("studentOpenTab(STUDENTS[0].id,"+JSON.stringify(tab)+")");
   assert(!(await evaluate("/Identity document|Birth certificate|Student photo|Replace|No document uploaded|Enrollment history|No assessment results|Recorded sessions|Linked invoices|No enrollment changes recorded|Stored securely/.test(document.getElementById('drawer').textContent)")),tab);
  }
  await evaluate("setLanguage('en')");assert.strictEqual(await evaluate("document.querySelector('#drawer h3').textContent"),'Fatima Al Hashimi');
  await evaluate("closeDrawer();Object.assign(STUDENTS[0],window.studentLocaleFixture);delete window.studentLocaleFixture;setLanguage('ar')");
 });
 await step('Future names propagate through shared and unmodified views while authored titles remain intact',async()=>{
  const result=await evaluate("(()=>{schoolRegisterResponseNames('/staff',{data:[{name:'Future QA Employee',translations:{ar:{name:'موظف اختبار جديد'}}}]});const root=document.createElement('div');root.innerHTML='<table><thead><tr><th>Name</th></tr></thead><tbody><tr><td data-i18n-skip>Future QA Employee</td></tr></tbody></table><select><option value=canonical>REF-1 · Future QA Employee</option></select><h3 data-i18n-skip>Active</h3>';localizeView(root);const ar=root.querySelector('td').textContent,option=root.querySelector('option').value,title=root.querySelector('h3').textContent;const current=LANG;LANG='en';localizeView(root);const en=root.querySelector('td').textContent;LANG=current;return {ar,en,option,title}})()");
  assert.deepStrictEqual(result,{ar:'موظف اختبار جديد',en:'Future QA Employee',option:'canonical',title:'Active'});
 });
 await step('Arabic shell search tooltips and help answers switch with the interface',async()=>{assert(await evaluate("document.querySelector('.topbar input').placeholder.includes('البحث')"));assert.strictEqual(await evaluate("document.querySelector('.topbar button[title=\"تغيير اللغة\"]')?.title"),'تغيير اللغة');await evaluate("openCmd();document.getElementById('cmdInput').value='مكتب';renderCmd()");assert(await evaluate("document.getElementById('cmdList').textContent.includes('مكتب المساعدة')"));assert(!(await evaluate("document.getElementById('cmdList').textContent.includes('No matches')")));await evaluate("closeCmd();openBot();document.getElementById('botInput').value='رسوم';botSend()");await waitFor(()=>evaluate("document.querySelectorAll('#botBody .bot-msg.bot').length>=2"),'Arabic help response');assert(await evaluate("[...document.querySelectorAll('#botBody .bot-msg.bot .bub')].every(e=>/[\\u0600-\\u06ff]/.test(e.textContent))"));await evaluate('closeBot()');});
 await step('Arabic dropdown labels preserve API values and drawer edits survive language switches',async()=>{
  await evaluate("go('helpdesk');helpdeskWorkspaceRaise()");
  assert(await evaluate("/[\\u0600-\\u06ff]/.test(document.getElementById('drawer').textContent)"));
  const values=await evaluate("[...document.querySelectorAll('#drawer select')].map(s=>[...s.options].map(o=>o.value))");
  assert(values.flat().includes('High'));assert(await evaluate("[...document.querySelectorAll('#drawer select option')].some(o=>o.value==='High'&&o.textContent==='مرتفع')"));
  await evaluate("document.querySelector('#drawer [data-fkey=subject]').value='Active';setLanguage('en')");
  assert.strictEqual(await evaluate("document.querySelector('#drawer [data-fkey=subject]').value"),'Active');
  assert.deepStrictEqual(await evaluate("[...document.querySelectorAll('#drawer select')].map(s=>[...s.options].map(o=>o.value))"),values);
  assert(await evaluate("document.getElementById('drawer').textContent.includes('Raise ticket')"));await evaluate("setLanguage('ar')");
  await fill({category:'IT',subject:'Active',description:'Arabic workflow '+role,priority:'High'});
  await waitFor(()=>evaluate("helpdeskWorkspaceState().rows.some(r=>r.subject==='Active'&&r.description==='Arabic workflow '+state.role)"),'Arabic ticket saved');
  const row=await evaluate("helpdeskWorkspaceState().rows.find(r=>r.subject==='Active'&&r.description==='Arabic workflow '+state.role)");assert.strictEqual(row.priority,'High');
  assert(await evaluate("[...document.querySelectorAll('#view [data-i18n-skip]')].some(e=>e.textContent==='Active')"));
  await evaluate('helpdeskWorkspaceDetail('+JSON.stringify(row._id)+')');assert(await evaluate("document.querySelector('#drawer h3').textContent==='Active'"));await evaluate('closeDrawer()');
 });
 await step('Known states errors dates and currency are localized without changing records',async()=>{
  assert(await evaluate("schoolTranslateText('Open')!== 'Open'&&schoolTranslateText('No support tickets match.')!=='No support tickets match.'"));
  assert(await evaluate("!/[A-Za-z]/.test(schoolApiError('Unmapped server conflict','CONFLICT'))"));
  assert.strictEqual(await evaluate("schoolDateOnly('2026-10-11').includes('2026-10-11')"),false);
  await evaluate("setLanguage('en')");assert.strictEqual(await evaluate("schoolTranslateText('Open')"),'Open');assert.strictEqual(await evaluate('document.documentElement.dir'),'ltr');await evaluate("setLanguage('ar')");
 });
 await step('Protected file download refreshes an expired access token once',async()=>{const result=await evaluate("(async()=>{const student=STUDENTS.find(s=>s.id==='QA-001');if(!student)throw Error('Missing linked photo fixture');SCHOOLOS_ADAPTER.token='expired-fixture-token';try{const blob=await SCHOOLOS_ADAPTER.apiBlob('/students/'+student.mongoId+'/documents/photo');return {size:blob.size,type:blob.type,refreshed:SCHOOLOS_ADAPTER.token!=='expired-fixture-token'}}catch(error){return {denied:true,message:error.message,refreshed:SCHOOLOS_ADAPTER.token!=='expired-fixture-token'}}})()");if(role==='Accountant'){assert.strictEqual(result.denied,true);assert(/[\u0600-\u06ff]/.test(result.message))}else{assert(result.size>0);assert.strictEqual(result.type,'image/png')}assert.strictEqual(result.refreshed,true);});
 await step('RTL support workspace fits mobile screen',async()=>{
  await evaluate("go('helpdesk')");await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});assert(await evaluate('document.documentElement.scrollWidth<=window.innerWidth+2'));await screenshot('rtl-mobile');
  assert(await evaluate("!document.getElementById('view').textContent.includes('Page ')&&document.getElementById('view').textContent.includes('الصفحة')"));
 });
});
