const assert = require('assert');
require('../helpers/browser.cjs')('performance', async ({role, step, evaluate, waitFor, cdp}) => {
  await step('Production entry loads the active shell without unreleased React page downloads', async () => {
    assert.strictEqual(process.env.SCHOOLOS_TEST_BUILD, 'true', 'Use the built preview, not Vite development');
    const assets = await evaluate("performance.getEntriesByType('resource').filter(r=>r.name.endsWith('.js')).map(r=>({name:new URL(r.name).pathname,size:r.decodedBodySize,duration:r.duration}))");
    const entry = assets.find(a => /\/index-[\w-]+\.js$/.test(a.name));
    const runtime = assets.find(a => /schoolos-runtime-[\w-]+\.js$/.test(a.name));
    assert(entry && entry.size > 0 && entry.size < 220000, JSON.stringify(entry));
    assert(runtime && runtime.size > 0 && runtime.size < 1650000, JSON.stringify(runtime));
    assert(!assets.some(a => /Page-[\w-]+\.js$/.test(a.name)), JSON.stringify(assets));
    const timing = await evaluate("({loadMs:performance.getEntriesByType('navigation')[0].loadEventEnd,authenticatedMs:performance.now(),role:state.role})");
    assert.strictEqual(timing.role, role);
    return {assets, timing};
  });
  await step('Released workspaces and UTF-8 Arabic remain usable after production bundling', async () => {
    const ids = await evaluate('flatItems().map(m=>m.id)');
    for (const id of ids) {
      await evaluate('go('+JSON.stringify(id)+')');
      await waitFor(() => evaluate("document.getElementById('view').textContent.trim().length>0"), id);
    }
    await evaluate("setLanguage('ar');go('helpdesk')");
    assert(await evaluate("document.documentElement.dir==='rtl'&&/[\\u0600-\\u06ff]/.test(document.getElementById('view').textContent)"));
    await evaluate("setLanguage('en')");
    return {workspaces: ids.length};
  });
  await step('Unavailable external fonts do not block the login and school workspace', async () => {
    await cdp('Network.setCacheDisabled',{cacheDisabled:true});
    await cdp('Network.setBlockedURLs',{urls:['*fonts.googleapis.com*','*fonts.gstatic.com*']});
    await cdp('Page.reload',{ignoreCache:true});
    await waitFor(()=>evaluate('Boolean(window.SCHOOLOS_ADAPTER&&SCHOOLOS_ADAPTER.connected)'),'boot without font provider');
    await waitFor(()=>evaluate("document.getElementById('view').textContent.trim().length>0"),'workspace without font provider');
    assert.strictEqual(await evaluate('state.role'),role);
    assert.strictEqual(process.env.SCHOOLOS_TEST_BLOCK_FONTS,'true','Block fonts before the cold page load');
    assert(await evaluate("Boolean(document.getElementById('schoolos-fonts'))&&document.getElementById('view').textContent.trim().length>0"));
    await cdp('Network.setBlockedURLs',{urls:[]});
  });
  await step('Logout revokes the old access token in the built application', async () => {
    const oldToken = await evaluate('SCHOOLOS_ADAPTER.token');
    await evaluate('lockApp()');
    await waitFor(() => evaluate('!SCHOOLOS_ADAPTER.connected'), 'logout');
    const response = await fetch('http://127.0.0.1:4400/api/v1/students', {headers:{Authorization:'Bearer '+oldToken}});
    assert.strictEqual(response.status, 401);
  });
  await step('A delayed response from the previous account cannot enter a new session', async () => {
    async function signIn(email) {
      await evaluate('document.getElementById("lxEmail").value='+JSON.stringify(email)+';document.getElementById("lxPass").value="LocalFixture123!";selectLandingRole('+JSON.stringify(email.split('@')[0][0].toUpperCase()+email.split('@')[0].slice(1))+');enterApp()');
      await waitFor(()=>evaluate('Boolean(SCHOOLOS_ADAPTER.connected)'), 'new account login');
    }
    await signIn(role.toLowerCase()+'@example.invalid');
    await evaluate(`(()=>{
      const original=window.fetch;window.__oldResponseReady=false;
      window.fetch=async function(url,options){
        const response=await original(url,options);
        if(String(url).endsWith('/students?guard-check=1&page=1&limit=100')){
          const json=response.json.bind(response);
          response.json=async()=>{window.__oldResponseReady=true;await new Promise(resolve=>{window.__releaseOldResponse=resolve});return json()};
        }
        return response;
      };
      window.__oldSessionRequest=SCHOOLOS_ADAPTER.apiAll('/students?guard-check=1').then(()=>({accepted:true}),()=>({accepted:false}));
      window.__restoreFetch=()=>{window.fetch=original};
    })()`);
    await waitFor(()=>evaluate('window.__oldResponseReady'),'delayed actual response');
    await evaluate('window.__restoreFetch();lockApp()');
    await waitFor(()=>evaluate('!SCHOOLOS_ADAPTER.connected'),'old account logout');
    await signIn('parent@example.invalid');
    await evaluate('window.__releaseOldResponse()');
    assert.deepStrictEqual(await evaluate('window.__oldSessionRequest'),{accepted:false});
    assert(await evaluate("STUDENTS.length===1&&STUDENTS.every(row=>row.id==='QA-001')"));
  });
});
