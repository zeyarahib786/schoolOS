const assert=require('assert');
require('../helpers/browser.cjs')('crm',async({role,step,evaluate,waitFor,fill,api,screenshot})=>{
 const manage=['Administrator','Principal'].includes(role);
 await step('CRM role gate protects the internal pipeline',async()=>{await evaluate("go('crm')");if(!manage)assert(await evaluate("document.getElementById('view').textContent.includes('requires Administrator or Principal')"));});
 await step('Saved personal inbox is available to every role without CRM access leakage',async()=>{
  await evaluate('openNotifs()');await waitFor(()=>evaluate("!schoolInboxState().loading"),'inbox loaded');assert(await evaluate("Boolean(document.getElementById('schoolInboxContent'))"));if(!manage)assert(await evaluate('schoolInboxState().rows.every(n=>n.module!=="crm")'));await evaluate('closeDrawer()');
 });
 if(!manage)return;
 await step('Hydration reads beyond the first API page',async()=>{await waitFor(()=>evaluate("typeof SCHOOLOS_ADAPTER.hydrateCrm==='function'"),'CRM adapter installed');await evaluate('SCHOOLOS_ADAPTER.hydrateCrm()');await waitFor(()=>evaluate('CRMLEADS.length>=105'),'all leads');});
 await step('Create and schedule a real lead then read the persisted activity',async()=>{await evaluate('addLeadForm()');await fill({name:'QA '+role+' CRM lead',grade:'Grade 7',guardian:'QA Guardian',phone:'123456789',email:'crm-'+role.toLowerCase()+'@example.invalid',source:'Website',temp:'Warm',owner:'QA actual office',notes:'QA real enquiry'});await waitFor(()=>evaluate("CRMLEADS.some(l=>l.name==='QA '+state.role+' CRM lead'&&l.mongoId)"),'lead created');await evaluate('quickSchedule('+JSON.stringify('QA '+role+' CRM lead')+',3)');await waitFor(()=>evaluate("CRMLEADS.find(l=>l.name==='QA '+state.role+' CRM lead').follow!==null"),'follow-up');const rows=await api('/crm?search='+encodeURIComponent('QA '+role+' CRM lead'));assert.strictEqual(rows.data[0].owner,'QA actual office');assert(rows.data[0].followUpDate);});

 await step('Scheduled KPI opens upcoming leads rather than overdue groups',async()=>{
  await evaluate("[...document.querySelectorAll('.kp-lab')].find(n=>n.textContent==='Scheduled').closest('.kpi').click()");assert(await evaluate("document.getElementById('view').textContent.includes('Upcoming')"));assert(!(await evaluate("[...document.querySelectorAll('#view h3')].some(n=>n.textContent.includes('Overdue'))")));
  assert(await evaluate("document.getElementById('view').textContent.includes('QA '+state.role+' CRM lead')"));
  await evaluate("[...document.querySelectorAll('.kp-lab')].find(n=>n.textContent==='Follow-ups due').closest('.kpi').click()");assert(!(await evaluate("[...document.querySelectorAll('#view h3')].some(n=>n.textContent.includes('Upcoming'))")));
  await evaluate("setCrmView('board')");
 });
 await step('Edit saved contact details and use the actual guardian email in compose links',async()=>{
  const id=await evaluate("CRMLEADS.find(l=>l.name==='QA '+state.role+' CRM lead').mongoId");
  await evaluate('crmEditForm('+JSON.stringify(id)+')');
  await fill({name:'QA '+role+' CRM lead',grade:'Grade 7',guardian:'QA Updated Guardian',phone:'+971501234567',guardianEmail:'updated-'+role.toLowerCase()+'@example.invalid',source:'Website',temperature:'Hot'});
  await waitFor(()=>evaluate('!state.crmManagedSaving'),'edit saved');
  const saved=(await api('/crm?search='+encodeURIComponent('QA '+role+' CRM lead'))).data[0];assert.strictEqual(saved.guardian,'QA Updated Guardian');assert.strictEqual(saved.temperature,'Hot');
  await evaluate('openDrawer(crmDetail('+JSON.stringify(id)+'))');
  assert(await evaluate("[...document.querySelectorAll('#drawer a[href^=mailto]')].every(a=>decodeURIComponent(a.getAttribute('href')).startsWith('mailto:updated-'))"));
  assert.strictEqual(await evaluate("document.querySelector('#drawer [data-school-phone]').getAttribute('dir')"),'ltr');await evaluate('closeDrawer()');
 });
 await step('Bulk review queues saved contacts once and enquiry history shows the persisted status',async()=>{
  await evaluate('openDrawer(crmBulkOutreach())');
  assert(!(await evaluate("document.querySelector('#drawer').textContent.includes('@family.ae')")));
  assert.strictEqual(await evaluate("getComputedStyle(document.querySelector('[data-crm-bulk=subject]')).borderRadius"),'10px');
  assert(await evaluate("document.querySelector('[data-crm-bulk=subject]').getBoundingClientRect().width>250"));
  assert.strictEqual(await evaluate("document.querySelectorAll('#drawer .crm-bulk-card').length"),2);
  if(role==='Administrator')await screenshot('bulk-outreach');

  await evaluate("document.querySelectorAll('#drawer [data-crm-recipient]').forEach(n=>n.checked=state.crmBulkReview[Number(n.dataset.crmRecipient)].email==="+JSON.stringify('updated-'+role.toLowerCase()+'@example.invalid')+")");assert.strictEqual(await evaluate("document.querySelectorAll('#drawer [data-crm-recipient]:checked').length"),1);
  await evaluate('crmBulkSend()');await waitFor(()=>evaluate('!state.crmBulkSending'),'bulk saved');
  assert(await evaluate("document.getElementById('crmBulkResult').textContent.includes('Pending')"));
  await evaluate('crmBulkSend()');await waitFor(()=>evaluate('!state.crmBulkSending'),'bulk replay');
  const id=await evaluate("CRMLEADS.find(l=>l.name==='QA '+state.role+' CRM lead').mongoId");
  const history=await api('/crm/'+id+'/deliveries');assert.strictEqual(history.data.length,1);assert.strictEqual(history.data[0].destination,'updated-'+role.toLowerCase()+'@example.invalid');
  await evaluate('closeDrawer();openDrawer(crmDetail('+JSON.stringify(id)+'));crmDeliveryHistory('+JSON.stringify(id)+')');
  await waitFor(()=>evaluate("document.querySelector('#drawer').textContent.includes('Latest 100 jobs.')"),'history');
  assert(await evaluate("document.querySelector('#drawer').textContent.includes('Pending')"));
  await evaluate('crmDeliveryAction('+JSON.stringify(id)+','+JSON.stringify(history.data[0]._id)+',"cancel")');
  await waitFor(()=>evaluate('!state.crmDeliveryBusy'),'cancelled');
  assert.strictEqual((await api('/crm/'+id+'/deliveries')).data[0].status,'Cancelled');await evaluate('closeDrawer()');
 });
 await step('Account assignment follow-up completion and inbox deep links persist',async()=>{
  const id=await evaluate("CRMLEADS.find(l=>l.name==='QA '+state.role+' CRM lead').mongoId");
  await evaluate('crmAssignForm('+JSON.stringify(id)+')');await waitFor(()=>evaluate("Boolean(document.querySelector('#drawer [data-fkey=ownerId]'))"),'assignee form');
  const owner=await evaluate("state.crmAssignees.find(u=>u._id===SCHOOLOS_ADAPTER.user._id)");await fill({ownerId:owner._id+' · '+owner.name});await waitFor(()=>evaluate('!state.crmManagedSaving'),'assigned');
  const lead=(await api('/crm?search='+encodeURIComponent('QA '+role+' CRM lead'))).data[0];assert.strictEqual(lead.ownerUserId,owner._id);
  await evaluate('crmCompleteForm('+JSON.stringify(id)+')');await fill({note:'QA reached family and completed follow-up'});await waitFor(()=>evaluate('!state.crmManagedSaving'),'completed');assert.strictEqual(await evaluate('CRMLEADS.find(l=>l.mongoId==='+JSON.stringify(id)+').follow'),null);
  await evaluate('openNotifs()');await waitFor(()=>evaluate('!schoolInboxState().loading'),'notifications read');
  const notification=await evaluate('schoolInboxState().rows.find(n=>n.recordId==='+JSON.stringify(id)+')');assert(notification);
  await evaluate('schoolInboxOpen('+JSON.stringify(notification._id)+')');assert(await evaluate('document.getElementById("drawer").textContent.includes('+JSON.stringify('QA '+role+' CRM lead')+')'));const inbox=await api('/inbox');assert(inbox.data.find(n=>n._id===notification._id).readAt);await evaluate('closeDrawer()');
  await evaluate("setLanguage('ar');openNotifs()");await waitFor(()=>evaluate('!schoolInboxState().loading'),'Arabic notifications');assert(!(await evaluate("/Mark all read|Unread only|Open record|CRM lead assigned/.test(document.getElementById('drawer').textContent)")));await evaluate("closeDrawer();setLanguage('en')");
 });
 await step('Duplicate lead names cannot redirect a record action',async()=>{const ids=await evaluate("CRMLEADS.filter(l=>l.name==='QA duplicate lead').map(l=>l.mongoId)");assert.strictEqual(ids.length,2);const days=role==='Administrator'?4:2;await evaluate('quickSchedule('+JSON.stringify(ids[0])+','+days+')');await waitFor(()=>evaluate('CRMLEADS.find(l=>l.mongoId==='+JSON.stringify(ids[0])+').follow==='+days),'identified follow-up');assert.strictEqual(await evaluate('CRMLEADS.find(l=>l.mongoId==='+JSON.stringify(ids[1])+').follow'),null);await evaluate('openDrawer(crmDetail('+JSON.stringify(ids[0])+'))');assert(await evaluate("document.querySelector('#drawer .df').innerHTML.includes("+JSON.stringify(ids[0])+")"));await evaluate('closeDrawer()');});


 await step('Creating a repeated name opens the actual returned record',async()=>{const phone=role==='Principal'?'223456781':'223456782';await evaluate('addLeadForm()');await fill({name:'QA same new lead',grade:'Grade 7',phone,source:'Website',temp:'Warm',owner:'QA '+role+' owner'});await waitFor(()=>evaluate("CRMLEADS.some(l=>l.name==='QA same new lead'&&l.phone==="+JSON.stringify(phone)+"&&l.mongoId)"),'created repeated name');const id=await evaluate("CRMLEADS.find(l=>l.name==='QA same new lead'&&l.phone==="+JSON.stringify(phone)+").mongoId");await waitFor(()=>evaluate("document.querySelector('#drawer .df').innerHTML.includes("+JSON.stringify(id)+")"),'new record identity in drawer');await evaluate('closeDrawer()');});
 await step('A delayed saved follow-up does not overwrite a newer drawer',async()=>{
  const id=await evaluate("CRMLEADS.find(l=>l.name==='QA '+state.role+' CRM lead').mongoId");
  await evaluate("(()=>{window.qaOriginalFetch=window.fetch;window.fetch=async(...args)=>{const response=await qaOriginalFetch(...args);if(String(args[0]).includes('/follow-up'))await new Promise(resolve=>window.qaResumeFollowup=resolve);return response};quickSchedule("+JSON.stringify(id)+",6);openDrawer(socialComposerDrawer())})()");
  await waitFor(()=>evaluate("typeof qaResumeFollowup==='function'"),'delayed follow-up response');
  await evaluate('qaResumeFollowup();window.fetch=qaOriginalFetch');
  await waitFor(()=>evaluate('CRMLEADS.find(l=>l.mongoId==='+JSON.stringify(id)+').follow===6'),'saved delayed follow-up');
  assert(await evaluate("document.getElementById('drawer').textContent.includes('No social posts are sent by SchoolOS.')"));await evaluate('closeDrawer()');
 });

 await step('Saved contact and generated draft text render without executing markup',async()=>{const name='QA '+role+' <img src=x>';await evaluate('addLeadForm()');await fill({name,grade:'Grade 7',guardian:'QA <img src=x>',phone:role==='Principal'?'323456780':'323456781',source:'Website',temp:'Warm',owner:'<svg/onload=alert(1)>'});await waitFor(()=>evaluate('CRMLEADS.some(l=>l.name==='+JSON.stringify(name)+'&&l.mongoId)'),'escaped lead created');const id=await evaluate('CRMLEADS.find(l=>l.name==='+JSON.stringify(name)+').mongoId');await evaluate('openDrawer(crmDetail('+JSON.stringify(id)+'))');assert(!(await evaluate("document.querySelector('#drawer img[src=x],#drawer svg[onload]')")));assert(await evaluate("document.getElementById('drawer').textContent.includes('<img src=x>')"));await evaluate('closeDrawer()');});
 await step('Compose hands edited captions and selected files to external sharing without publishing',async()=>{
  await evaluate("state._socialText={Facebook:'QA edited caption'};openDrawer(socialComposerDrawer());window.qaSocialOpened=[];window.qaSavedOpen=window.open;window.open=(...args)=>qaSocialOpened.push(args);Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async text=>{window.qaSocialCopied=text}}})");
  try{
   await evaluate("[...document.querySelectorAll('#drawer button')].find(b=>b.textContent.includes('Compose on Facebook')).click()");
   assert.strictEqual(await evaluate('qaSocialCopied'),'QA edited caption');assert.strictEqual(await evaluate('qaSocialOpened[0][0]'),'https://www.facebook.com/');
   await evaluate("Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{window.qaSharedCaption=data.text;window.qaSharedFiles=data.files.map(f=>f.name)}});Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});socialAddMedia([new File(['fictional'],'qa-school-photo.png',{type:'image/png'})]);socialCompose('Facebook')");
   assert.strictEqual(await evaluate('typeof qaSharedFiles'),'undefined');
   await evaluate("socialShareMedia('Facebook')");
   assert.strictEqual(await evaluate('qaSharedCaption'),'QA edited caption');assert.deepStrictEqual(await evaluate('qaSharedFiles'),['qa-school-photo.png']);
   assert(await evaluate("document.querySelector('#drawer').textContent.includes('Instagram')"));
  }finally{await evaluate('window.open=qaSavedOpen;delete navigator.clipboard;delete navigator.share;delete navigator.canShare;socialMediaRemove(0);closeDrawer()');}
 });
 await step('Social drafts do not claim unconfigured live publication',async()=>{await evaluate('openDrawer(socialComposerDrawer())');assert(!(await evaluate("document.getElementById('drawer').textContent.includes('Post now')")));assert(await evaluate("document.getElementById('drawer').textContent.includes('No social posts are sent by SchoolOS.')"));await evaluate('closeDrawer()');});
});
