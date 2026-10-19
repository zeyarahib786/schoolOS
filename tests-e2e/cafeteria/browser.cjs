const assert=require('assert');
require('../helpers/browser.cjs')('cafeteria',async({role,step,evaluate,waitFor,fill,cdp})=>{
 const manage=['Administrator','Principal','Accountant'].includes(role), office=['Administrator','Principal'].includes(role),family=['Parent','Student'].includes(role);
 await step('Cafeteria loads saved menu and role-specific controls',async()=>{
  await evaluate("go('cafeteria')");await waitFor(()=>evaluate('cafeteriaWorkspaceState().loaded'),'cafeteria load');
  assert.strictEqual(await evaluate("document.getElementById('view').textContent.includes('Record top-up')"),manage);
  assert.strictEqual(await evaluate("document.getElementById('view').textContent.includes('Add care plan')"),office);
  assert(!(await evaluate("!!document.querySelector('#view img[src=x]')")));
  assert(await evaluate("document.getElementById('view').textContent.includes('QA ')"));
 });
 await step('Wallet and care-plan scope matches the signed-in role',async()=>{
  if(manage)assert(await evaluate('cafeteriaWorkspaceState().wallets.length===25'));
  if(family){assert(await evaluate("cafeteriaWorkspaceState().wallets.length===1&&cafeteriaWorkspaceState().wallets[0].student.refId==='QA-001'"));assert(await evaluate('cafeteriaWorkspaceState().plans.length===1&&cafeteriaWorkspaceState().plans[0].history.length===0'))}
  if(role==='Teacher')assert(await evaluate('cafeteriaWorkspaceState().wallets.length===0&&cafeteriaWorkspaceState().plans.length===0'));
  if(role==='Accountant')assert(await evaluate('cafeteriaWorkspaceState().plans.length===0'));
 });
 if(manage)await step('Actual receipt top-up and purchase persist exact amounts',async()=>{
  await evaluate("cafeteriaWorkspaceMovementForm('TopUp',cafeteriaWorkspaceState().students.find(s=>s.refId==='QA-001')._id)");
  await fill({amount:'10.25',description:'QA '+role+' cash receipt',method:'Cash',reference:'QA-'+role});await waitFor(()=>evaluate('!cafeteriaWorkspaceState().saving'),'top-up');
  assert(await evaluate("cafeteriaWorkspaceState().transactions.some(t=>t.description==='QA '+state.role+' cash receipt'&&t.amount===10.25)"));
  await evaluate("cafeteriaWorkspaceMovementForm('Purchase',cafeteriaWorkspaceState().students.find(s=>s.refId==='QA-001')._id)");
  await fill({amount:'2.15',description:'QA '+role+' meal',method:'Recorded sale',reference:'QA-SALE-'+role});await waitFor(()=>evaluate('!cafeteriaWorkspaceState().saving'),'purchase');
  assert(await evaluate("cafeteriaWorkspaceState().transactions.some(t=>t.description==='QA '+state.role+' meal'&&t.amount===2.15)"));
 });
 if(office)await step('Menu and care-plan reviews persist actual instructions',async()=>{
  await evaluate('cafeteriaWorkspaceMenuForm()');await fill({day:'Sunday',meal:'Breakfast',item:'QA '+role+' reviewed oats',calories:'260',vegetarian:'Yes',allergens:'Milk',reason:'QA menu review'});await waitFor(()=>evaluate('!cafeteriaWorkspaceState().saving'),'menu saved');
  assert(await evaluate("cafeteriaWorkspaceState().menu[0].breakfast.item==='QA '+state.role+' reviewed oats'"));
  await evaluate('cafeteriaWorkspacePlanForm(cafeteriaWorkspaceState().plans[0]._id)');await fill({allergens:'Milk',severity:'Severe',carePlan:'QA '+role+' reviewed substitute',reason:'QA school review'});await waitFor(()=>evaluate('!cafeteriaWorkspaceState().saving'),'plan saved');
  assert(await evaluate("cafeteriaWorkspaceState().plans[0].carePlan==='QA '+state.role+' reviewed substitute'&&cafeteriaWorkspaceState().plans[0].history.length>0"));
 });
 await step('Search pagination export and record details use saved records',async()=>{
  await evaluate("cafeteriaWorkspaceTab('"+(role==='Teacher'?'Menu':'Wallets')+"')");
  if(manage){await evaluate("cafeteriaWorkspaceFilter('page',2)");assert(await evaluate("document.getElementById('view').textContent.includes('Page 2')"));await evaluate("cafeteriaWorkspaceFilter('page',1)")}
  if(role!=='Teacher'){await evaluate('cafeteriaWorkspaceDetail(cafeteriaWorkspaceState().wallets[0]._id)');assert(await evaluate("document.getElementById('drawer').textContent.includes('Balance')"));await evaluate('closeDrawer()')}
  await evaluate('cafeteriaWorkspaceExport()');await evaluate('cafeteriaWorkspaceLoad()');assert(await evaluate('cafeteriaWorkspaceState().loaded'));
 });
 await step('Mobile cafeteria register fits the viewport',async()=>{await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});assert(await evaluate('document.documentElement.scrollWidth<=window.innerWidth+2'));});
});
