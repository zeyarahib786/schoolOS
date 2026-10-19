const assert=require('assert');
require('../helpers/browser.cjs')('curriculum',async({role,step,evaluate,waitFor,fill,cdp,screenshot})=>{
 const manage=['Administrator','Principal','Teacher'].includes(role),office=['Administrator','Principal'].includes(role);
 await step('All role views load every curriculum page with correct controls',async()=>{
  await evaluate("go('curriculum')");await waitFor(()=>evaluate('curriculumWorkspaceState().loaded'),'curriculum loaded');
  assert(await evaluate('curriculumWorkspaceState().rows.length>=25'));
  assert.strictEqual(await evaluate("document.getElementById('view').textContent.includes('Add unit')"),manage);
  assert(await evaluate("document.querySelectorAll('#view tbody tr').length===20"));
  await evaluate('curriculumWorkspacePage(2)');assert(await evaluate("document.querySelectorAll('#view tbody tr').length>0"));
 });
 if(manage)await step('Arabic curriculum form defaults preserve canonical values and edited text',async()=>{
  await evaluate("setLanguage('ar');curriculumWorkspaceForm()");
  assert.strictEqual(await evaluate("document.querySelector('#drawer h3').textContent"),'إضافة وحدة دراسية');
  const fields=['grade','term','framework','owner'];
  const values=await evaluate("Object.fromEntries(['grade','term','framework','owner'].map(k=>[k,document.querySelector('#drawer [data-fkey='+k+']').value]))");
  for(const key of fields)assert(/[\u0600-\u06ff]/.test(values[key]),key);
  await evaluate("document.querySelector('#drawer [data-fkey=owner]').value='Custom coordinator';setLanguage('en')");
  assert.deepStrictEqual(await evaluate("Object.fromEntries(['grade','term','framework','owner'].map(k=>[k,document.querySelector('#drawer [data-fkey='+k+']').value]))"),{grade:'All grades',term:'Term 1',framework:'School-defined',owner:'Custom coordinator'});
  await evaluate('closeDrawer()');
 });
 await step('Safe unit detail renders real learning outcomes',async()=>{
  await evaluate("curriculumWorkspaceDetail(curriculumWorkspaceState().rows.find(r=>r.title.includes('<img'))._id)");
  assert(await evaluate("document.getElementById('drawer').textContent.includes('QA safe <img')"));
  assert(!(await evaluate("!!document.querySelector('#drawer img[src=x]')")));await evaluate('closeDrawer()');
 });
 if(manage){
  await step('Real creation form persists scoped plan',async()=>{
   await evaluate('curriculumWorkspaceForm()');await fill({subject:'QA Subject',grade:'Grade 9',academicYear:'2026-2027',term:'Term 3',title:'QA Created '+role,outcomes:'Fictional observed outcomes',plannedDate:'2026-01-01',sequenceOrder:'3',framework:'School QA',owner:'Fictional coordinator'});
   await waitFor(()=>evaluate('!curriculumWorkspaceState().saving'),'curriculum saved');assert(await evaluate("curriculumWorkspaceState().rows.some(r=>r.title==='QA Created '+state.role&&r.grade==='Grade 9')"));
  });
  await step('Reviewed correction preserves reason and clears schedule',async()=>{
   await evaluate("curriculumWorkspaceForm(curriculumWorkspaceState().rows.find(r=>r.title==='QA Created '+state.role)._id)");await fill({outcomes:'Fictional revised outcomes',plannedDate:'',reason:'QA planning review'});await waitFor(()=>evaluate('!curriculumWorkspaceState().saving'),'plan revised');assert(await evaluate("curriculumWorkspaceState().rows.find(r=>r.title==='QA Created '+state.role).history.length===1"));
   assert(await evaluate("!curriculumWorkspaceState().rows.find(r=>r.title==='QA Created '+state.role).plannedDate"));
  });
  await step('Actual completion and reopening preserve teaching history',async()=>{
   await evaluate("curriculumWorkspaceCoverage(curriculumWorkspaceState().rows.find(r=>r.title==='QA Created '+state.role)._id)");await fill({completedDate:await evaluate('healthDay()'),reason:'QA teaching complete'});await waitFor(()=>evaluate('!curriculumWorkspaceState().saving'),'completed');assert(await evaluate("!!curriculumWorkspaceState().rows.find(r=>r.title==='QA Created '+state.role).completedDate"));
   await evaluate("curriculumWorkspaceCoverage(curriculumWorkspaceState().rows.find(r=>r.title==='QA Created '+state.role)._id)");await fill({reason:'QA additional teaching review'});await waitFor(()=>evaluate('!curriculumWorkspaceState().saving'),'reopened');assert(await evaluate("curriculumWorkspaceState().rows.find(r=>r.title==='QA Created '+state.role).history.length===3&&!curriculumWorkspaceState().rows.find(r=>r.title==='QA Created '+state.role).completedDate"));
  });
  if(office)await step('Leadership archive and restore preserve the plan',async()=>{
   await evaluate("curriculumWorkspaceArchive(curriculumWorkspaceState().rows.find(r=>r.title==='QA Created '+state.role)._id)");await fill({reason:'QA historical archive'});await waitFor(()=>evaluate('!curriculumWorkspaceState().saving'),'archived');assert(!(await evaluate("curriculumWorkspaceState().rows.some(r=>r.title==='QA Created '+state.role)")));
   await evaluate("curriculumWorkspaceFilter('archived',true)");await waitFor(()=>evaluate('!curriculumWorkspaceState().loading'),'archive loaded');await evaluate("curriculumWorkspaceArchive(curriculumWorkspaceState().rows.find(r=>r.title==='QA Created '+state.role)._id)");await fill({reason:'QA restore teaching plan'});await waitFor(()=>evaluate('!curriculumWorkspaceState().saving'),'restored');await evaluate("curriculumWorkspaceFilter('archived',false)");await waitFor(()=>evaluate('!curriculumWorkspaceState().loading'),'active loaded');assert(await evaluate("curriculumWorkspaceState().rows.find(r=>r.title==='QA Created '+state.role).history.length===5"));
  });
 }
 await step('Grade and subject filters, export and reload use saved data',async()=>{
  await evaluate("curriculumWorkspaceFilter('grade','Grade 8')");assert(await evaluate("curriculumWorkspaceFiltered().length>0&&curriculumWorkspaceFiltered().every(r=>r.grade==='Grade 8')"));await evaluate('curriculumWorkspaceExport()');
  await cdp('Page.reload',{ignoreCache:true});await waitFor(()=>evaluate('SCHOOLOS_ADAPTER.connected'),'restore login');await evaluate("go('curriculum')");await waitFor(()=>evaluate('curriculumWorkspaceState().loaded'),'reload curriculum');
  if(!manage)assert(await evaluate('curriculumWorkspaceState().rows.every(r=>r.history.length===0)'));
 });
 await step('Mobile curriculum view fits the screen',async()=>{await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});assert(await evaluate('document.documentElement.scrollWidth<=window.innerWidth+1'));await screenshot('mobile');});
});
