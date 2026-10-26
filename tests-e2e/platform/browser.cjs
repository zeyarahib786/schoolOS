const assert=require('assert');
require('../helpers/browser.cjs')('platform',async({role,step,evaluate,waitFor,api,cdp,screenshot,fill})=>{
 await step('Role selection rejects valid credentials for the wrong role and accepts the assigned role',async()=>{
  const email=process.env.SCHOOLOS_SMOKE_EMAIL, wrong=role==='Student'?'Teacher':'Student';
  await evaluate('lockApp()');await waitFor(()=>evaluate('!SCHOOLOS_ADAPTER.user'),'logout before role check');
  await evaluate('document.getElementById("lxEmail").value='+JSON.stringify(email)+';document.getElementById("lxPass").value="LocalFixture123!";selectLandingRole('+JSON.stringify(wrong)+');enterApp()');
  await waitFor(()=>evaluate('!document.getElementById("lxEnter").disabled&&document.getElementById("lxNote").textContent.includes("selected role")'),'wrong role rejected');
  assert(await evaluate('!SCHOOLOS_ADAPTER.connected&&!SCHOOLOS_ADAPTER.token'));
  await evaluate('document.querySelector(\'#lxRoles [data-role="'+role+'"]\').click();enterApp()');
  await waitFor(()=>evaluate('SCHOOLOS_ADAPTER.connected'),'matching role accepted');
  assert.strictEqual(await evaluate('SCHOOLOS_ADAPTER.user.role'),role);
  assert(await evaluate('Boolean(document.querySelector(\'#lxRoles [data-role="Accountant"]\'))'));
 });

 await step('Every role reads school context and only Administrator can edit',async()=>{await evaluate("go('settings')");await waitFor(()=>evaluate('SCHOOLOS_ADAPTER.live.settings&&state.schoolProfile'),'settings loaded');assert(await evaluate("document.getElementById('view').textContent.includes('Refresh school settings')"));assert.strictEqual(await evaluate("[...document.querySelectorAll('#view input')].some(i=>!i.disabled&&i.getAttribute('onchange')?.includes('updateProfile'))"),role==='Administrator');await evaluate('settingsWorkspaceRefresh()');});
 await step('Own access grants cover released workspaces and role administration is gated',async()=>{const mine=await api('/roles/me');assert.strictEqual(Object.keys(mine.data.permissions).length,37);if(['Parent','Student'].includes(role))assert.strictEqual(mine.data.permissions.Helpdesk,true);await evaluate("go('roles')");if(role!=='Administrator')assert(await evaluate("document.getElementById('view').textContent.includes('requires Administrator')"));else{await waitFor(()=>evaluate('SCHOOLOS_ADAPTER.accessModules?.length===37'),'full matrix');assert(await evaluate("document.getElementById('view').textContent.includes('Hostel')"));assert(await evaluate("document.getElementById('view').textContent.includes('permission templates')"));}});
 if(role==='Administrator')await step('School profile module enablement and visibility changes persist',async()=>{await evaluate("go('settings');updateProfile('legalName','QA reviewed fictional school')");await waitFor(()=>evaluate("SCHOOLOS_ADAPTER.settings.schoolName==='QA reviewed fictional school'"),'profile saved');const before=await evaluate('Boolean(state.modules.hostel)');await evaluate("toggleModule('hostel')");await waitFor(()=>evaluate('Boolean(state.modules.hostel)!=='+before),'module saved');await evaluate("go('roles')");const row=await evaluate("PERMROWS.findIndex(r=>r[0]==='Helpdesk')"),col=await evaluate("ROLES.indexOf('Teacher')");await evaluate('togglePerm('+row+','+col+')');await waitFor(()=>evaluate('PERMROWS['+row+'][1]['+col+']===0'),'visibility saved');await evaluate('togglePerm('+row+','+col+')');await waitFor(()=>evaluate('PERMROWS['+row+'][1]['+col+']===1'),'visibility restored');await evaluate('exportRoleMatrix()');});
 await step('Configuration view fits mobile width',async()=>{await evaluate("go('settings')");await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});assert(await evaluate('document.documentElement.scrollWidth<=window.innerWidth+2'));});
 await step('Every signed-in role opens its own profile from the sidebar',async()=>{
  await evaluate("closeDrawer();document.querySelector('.sb-user .ua').click()");
  await waitFor(()=>evaluate("document.getElementById('drawer').textContent.includes('My profile')"),'own profile');
  assert(await evaluate("document.getElementById('drawer').textContent.includes(SCHOOLOS_ADAPTER.user.email)"));
  assert.strictEqual(await evaluate("document.getElementById('drawer').textContent.includes('Manage login accounts')"),role==='Administrator');
  assert.strictEqual(await evaluate("document.getElementById('drawer').textContent.includes('Contact school administration to request a correction.')"),role!=='Administrator');
  if(role==='Administrator'){
   await evaluate("[...document.querySelectorAll('#drawer button')].find(b=>b.textContent==='Edit account details').click()");
   await waitFor(()=>evaluate("Boolean(document.querySelector('#drawer [data-fkey=reason]'))"),'account correction form');
   await fill({name:'Corrected QA Administrator',email:'administrator@example.invalid',reason:'Fictional profile correction check'});
   await waitFor(()=>evaluate("document.getElementById('drawer').textContent.includes('Corrected QA Administrator')&&!document.querySelector('#drawer [data-fkey=reason]')"),'corrected profile');
   assert.strictEqual(await evaluate('SCHOOLOS_ADAPTER.user.name'),'Corrected QA Administrator');
  }

  await evaluate('closeDrawer()');
 });

 await step('Details fill the workspace in LTR, RTL and mobile while desktop sidebar stays usable',async()=>{
  await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});
  for(const direction of ['ltr','rtl']){
   await evaluate('document.documentElement.dir='+JSON.stringify(direction));await evaluate('schoolMyProfile()');
   await waitFor(()=>evaluate("document.getElementById('drawer').classList.contains('on')"),'profile page');
   await new Promise(r=>setTimeout(r,350));
   const b=await evaluate("(()=>{const d=document.getElementById('drawer').getBoundingClientRect(),s=document.getElementById('sidebar').getBoundingClientRect();return {left:d.left,right:d.right,width:d.width,sidebarLeft:s.left,sidebarRight:s.right,sidebarWidth:s.width,height:d.height,screen:innerWidth,inert:document.querySelector('.main').inert}})()");
   assert(Math.abs(b.width-(1440-b.sidebarWidth))<2);assert.strictEqual(b.inert,true);
   if(direction==='ltr')assert(Math.abs(b.left-b.sidebarRight)<2);else assert(Math.abs(b.right-b.sidebarLeft)<2);
   assert.strictEqual(await evaluate("document.getElementById('drawer').getAttribute('aria-modal')"),null);
   await evaluate("document.querySelector('#nav .nav-item').click()");assert(await evaluate("!document.getElementById('drawer').classList.contains('on')&&!document.querySelector('.main').inert"));
  }
  await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await evaluate('schoolMyProfile()');await waitFor(()=>evaluate("document.getElementById('drawer').classList.contains('on')"),'mobile profile');await new Promise(r=>setTimeout(r,350));
  assert(await evaluate("Math.abs(document.getElementById('drawer').getBoundingClientRect().width-innerWidth)<2&&document.documentElement.scrollWidth<=innerWidth+2"));
  await evaluate("closeDrawer();document.documentElement.dir='ltr'");
 });

 if(role==='Administrator')await step('Class filters combine with search and Back restores directory filters',async()=>{
  await api('/students','POST',{refId:'QA-CLASS-OTHER',name:'Other Class Learner',grade:'Grade 9 · B',gender:'Female',roll:'98',guardianName:'Fictional parent',phone:'+12025550143'});
  const first=await api('/students','POST',{refId:'QA-CLASS-MATCH',name:'Chosen Class Learner',grade:'Grade 7 · A',gender:'Female',roll:'97',guardianName:'Fictional parent',phone:'+12025550144'});
  await evaluate("schoolAccountsOpen('QA-CLASS','Grade 7 · A')");await waitFor(()=>evaluate("document.getElementById('drawer').textContent.includes('Chosen Class Learner')"),'class-filtered directory');
  assert(!(await evaluate("document.getElementById('drawer').textContent.includes('Other Class Learner')")));
  await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:900,deviceScaleFactor:1,mobile:false});await screenshot('accounts-desktop');
  await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await screenshot('accounts-mobile');
  assert.strictEqual(await evaluate("document.querySelector('[aria-label=\"Filter by class\"]').value"),'Grade 7 · A');
  await evaluate("[...document.querySelectorAll('#drawer button')].find(b=>b.textContent==='Generate login').click()");
  await waitFor(()=>evaluate("Boolean(document.querySelector('#drawer [data-fkey=email]'))"),'account form');
  await evaluate("document.querySelector('#drawer .workspace-back').click()");
  await waitFor(()=>evaluate("Boolean(document.querySelector('[aria-label=\"Filter by class\"]'))"),'directory restored');
  assert.strictEqual(await evaluate("document.querySelector('[aria-label=\"Search accounts\"]').value"),'QA-CLASS');
  assert.strictEqual(await evaluate("document.querySelector('[aria-label=\"Filter by class\"]').value"),'Grade 7 · A');
  await evaluate('closeDrawer()');
 });
 if(role==='Administrator')await step('Admin generates a linked login and first sign-in enforces password setup',async()=>{
  const created=await api('/students','POST',{refId:'QA-LOGIN-01',name:'Fictional Login Learner',grade:'Grade 7 · A',gender:'Female',roll:'99',studentEmail:'learner@example.invalid',guardianName:'Fictional Login Parent',phone:'+12025550143'});
  await evaluate("schoolAccountsOpen('QA-LOGIN-01','')");
  await waitFor(()=>evaluate("document.getElementById('drawer').textContent.includes('Fictional Login Learner')"),'directory search');
  await evaluate("[...document.querySelectorAll('#drawer button')].find(b=>b.textContent==='Generate login').click()");
  await waitFor(()=>evaluate("Boolean(document.querySelector('#drawer [data-fkey=email]'))"),'generation form');
  assert.strictEqual(await evaluate("document.querySelector('#drawer [data-fkey=emailMode]').value"),'Login ID only (recommended)');
  assert(await evaluate("document.querySelector('.account-identity-preview strong').textContent.toUpperCase().includes('STU-2026-7A-099')"));
  assert(await evaluate("document.querySelector('[data-fkey=savedEmail] option').value==='learner@example.invalid'"));
  assert.strictEqual(await evaluate("getComputedStyle(document.querySelector('#drawer [data-fkey=email]').closest('label')).display"),'none');
  await evaluate("(()=>{const mode=document.querySelector('#drawer [data-fkey=emailMode]');mode.value='Login ID + real email';mode.dispatchEvent(new Event('change',{bubbles:true}));})()");
  assert.notStrictEqual(await evaluate("getComputedStyle(document.querySelector('#drawer [data-fkey=email]').closest('label')).display"),'none');
  assert.strictEqual(await evaluate("document.querySelector('#drawer [data-fkey=email]').value"),'learner@example.invalid');
  await evaluate("(()=>{const select=document.querySelector('[data-fkey=savedEmail]');select.value='Enter another email';select.dispatchEvent(new Event('change',{bubbles:true}));})()");
  assert.strictEqual(await evaluate("document.querySelector('#drawer [data-fkey=email]').value"),'');
  await evaluate("(()=>{const select=document.querySelector('[data-fkey=savedEmail]');select.value='learner@example.invalid';select.dispatchEvent(new Event('change',{bubbles:true}));})()");
  assert.strictEqual(await evaluate("document.querySelector('#drawer [data-fkey=email]').value"),'learner@example.invalid');
  await evaluate("document.querySelector('#drawer [data-fkey=email]').value='hidden-contact@example.invalid';document.querySelector('#drawer [data-fkey=emailMode]').value='Login ID only (recommended)';formCheckShowIf()");

  await evaluate("document.querySelector('#drawer .df .btn.primary').click()");
  await waitFor(()=>evaluate("Boolean(document.getElementById('schoolCredentialReceipt'))"),'private credential receipt');
  assert(await evaluate("document.getElementById('schoolCredentialReceipt').textContent.includes('Not provided — use login ID')"));
  assert(!(await evaluate("document.getElementById('schoolCredentialReceipt').textContent.includes('hidden-contact@example.invalid')")));

  await evaluate("window.qaCredentials=(()=>{const text=document.getElementById('schoolCredentialReceipt').innerText;return {id:text.match(/Login ID: (.*)/)[1],password:text.match(/Temporary password: (.*)/)[1]}})()");
  await evaluate('closeDrawer()');assert(await evaluate("!document.getElementById('schoolCredentialReceipt')"));
  await evaluate('lockApp()');await waitFor(()=>evaluate('!SCHOOLOS_ADAPTER.user'),'signed out');
  await evaluate("selectLandingRole('Student');document.getElementById('lxEmail').value=qaCredentials.id;document.getElementById('lxPass').value=qaCredentials.password;enterApp()");
  await waitFor(()=>evaluate("Boolean(document.getElementById('schoolPasswordGate'))"),'first sign-in gate');
  assert(await evaluate('!SCHOOLOS_ADAPTER.connected'));
  await evaluate("(()=>{const f=document.querySelector('#schoolPasswordGate form');f.elements.current.value=qaCredentials.password;f.elements.next.value='PersonalNew123!';f.elements.confirmation.value='PersonalNew123!';f.requestSubmit()})()");
  await waitFor(()=>evaluate("!document.getElementById('schoolPasswordGate')&&!SCHOOLOS_ADAPTER.user"),'password updated and old session cleared');
  await evaluate("document.getElementById('lxPass').value='PersonalNew123!';enterApp()");await waitFor(()=>evaluate('SCHOOLOS_ADAPTER.connected'),'new login works');
  await evaluate('schoolMyProfile()');await waitFor(()=>evaluate("document.getElementById('drawer').textContent.includes('QA-LOGIN-01')"),'linked student identity');
  assert(!(await evaluate("document.getElementById('drawer').textContent.includes('Manage login accounts')")));
 });

});
