const assert=require('assert');
require('../helpers/browser.cjs')('pilot',async({role,step,evaluate,api,waitFor,fill,cdp,screenshot})=>{
  const family=['Parent','Student'].includes(role),finance=['Administrator','Principal','Accountant'].includes(role);
  await step('School-size roster remains paginated and family data stays isolated',async()=>{
    const response=await api('/students?limit=25');
    assert.strictEqual(response.data.length,family?1:25);
    assert.strictEqual(response.meta.pagination.total,family?1:3031);
    assert.strictEqual(await evaluate('STUDENTS.length'),family?1:3031);
    if(family)assert(response.data.every(row=>row.refId==='QA-001'));
    await evaluate("go('students');studentSetFilter('q','PILOT-3000')");
    assert.strictEqual(await evaluate('studentFilteredRows().length'),family?0:1);
    if(!family)assert(await evaluate("document.getElementById('stuBody').textContent.includes('PILOT-3000')"));
    await evaluate("studentResetFilters();studentSetFilter('size','25')");
    assert(await evaluate("document.querySelectorAll('#stuBody tr').length<=25"));
    return {students:response.meta.pagination.total,authenticatedMs:await evaluate('performance.now()')};
  });
  await step('Financial writes are role-controlled and fictional partial collections persist once',async()=>{
    const student=(await api('/students?limit=1')).data[0];
    const body={refId:'INV-PILOT-CHECK-'+role,studentId:student._id,term:'Pilot QA '+role,amount:123.45,dueDate:'2026-12-01'};
    if(!finance){await assert.rejects(()=>api('/fees','POST',body));return {denied:true};}
    const invoice=(await api('/fees','POST',body)).data;
    const payment={amount:23.45,paymentMethod:'Cash',reference:'FICTIONAL-PILOT-'+role,idempotencyKey:'pilot-payment-'+role};
    await api('/fees/'+invoice._id+'/pay','POST',payment);
    await api('/fees/'+invoice._id+'/pay','POST',payment);
    const saved=(await api('/fees?studentId='+student._id+'&limit=100')).data.find(row=>row._id===invoice._id);
    assert.strictEqual(saved.paidAmount,23.45);assert.strictEqual(saved.status,'Pending');
    return {invoiceId:invoice._id,paidAmount:saved.paidAmount};
  });
  await step('Every role can save its own Arabic support request and reload the actual record',async()=>{
    await evaluate("setLanguage('ar');go('helpdesk');helpdeskWorkspaceRaise()");
    await fill({category:'IT',subject:'تجربة المدرسة '+role,description:'طلب تجريبي لاختبار حفظ البيانات',priority:'High'});
    await waitFor(()=>evaluate("helpdeskWorkspaceState().rows.some(row=>row.subject==='تجربة المدرسة '+state.role)"),'saved pilot request');
    const response=await api('/helpdesk?limit=100');
    assert(response.data.some(row=>row.subject==='تجربة المدرسة '+role));
  });
  await step('Saving while a prior support list is delayed refreshes the new record afterwards',async()=>{
    await evaluate("closeDrawer();go('helpdesk')");
    await waitFor(()=>evaluate('!helpdeskWorkspaceState().loading&&!helpdeskWorkspaceState().saving'),'previous support load');
    await evaluate(`(()=>{
      const original=window.fetch;let held=false;window.__heldSupportReady=false;
      window.fetch=async function(url,options){const response=await original(url,options);
        if(!held&&String(url).includes('/helpdesk?page=')){
          held=true;const json=response.json.bind(response);
          response.json=async()=>{window.__heldSupportReady=true;await new Promise(resolve=>{window.__releaseSupport=resolve});return json()};
        }return response;
      };
      window.__restoreSupportFetch=()=>{window.fetch=original};helpdeskWorkspaceLoad();
    })()`);
    await waitFor(()=>evaluate('window.__heldSupportReady'),'held real support response');
    await evaluate('helpdeskWorkspaceRaise()');
    await fill({category:'IT',subject:'Delayed pilot '+role,description:'Fictional delayed list refresh '+role,priority:'High'});
    await waitFor(()=>evaluate('helpdeskWorkspaceState().saving'),'support save');
    await evaluate('window.__restoreSupportFetch();window.__releaseSupport()');
    await waitFor(()=>evaluate("!helpdeskWorkspaceState().saving&&helpdeskWorkspaceState().rows.some(row=>row.subject==='Delayed pilot '+state.role)"),'fresh list includes saved record');
  });
  await step('All Arabic workspaces render at desktop and mobile without changing stored enums',async()=>{
    const modules=await evaluate('flatItems().map(m=>({id:m.id,label:m.label}))');
    for(const module of modules){
      await evaluate('go('+JSON.stringify(module.id)+')');
      await new Promise(resolve=>setTimeout(resolve,150));
      assert(await evaluate("document.getElementById('view').textContent.trim().length>0"),module.id);
      assert(await evaluate('document.getElementById("tbTitle").textContent===t('+JSON.stringify(module.label)+')'),module.id);
    }
    await evaluate("go('students');studentResetFilters()");
    await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
    assert(await evaluate('document.documentElement.scrollWidth<=window.innerWidth+2'));
    await screenshot('arabic-school-roster');
    await evaluate("setLanguage('en')");
    assert.strictEqual(await evaluate('document.documentElement.dir'),'ltr');
    return {workspaces:modules.length};
  });
  await step('Production shell restores the authenticated session after a full reload',async()=>{
    await cdp('Page.reload',{ignoreCache:true});
    await waitFor(()=>evaluate('Boolean(window.SCHOOLOS_ADAPTER&&SCHOOLOS_ADAPTER.connected)'),'restored login');
    assert.strictEqual(await evaluate('state.role'),role);
    assert.strictEqual(await evaluate('STUDENTS.length'),family?1:3031);
  });
});
