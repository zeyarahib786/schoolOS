const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { spawn } = require('child_process');
const WebSocket = require('ws');

const chromePath = process.env.SCHOOLOS_CHROME_PATH ||
  path.join(os.homedir(), '.cache/ms-playwright/chromium-1243/chrome-linux64/chrome');
const clientUrl = process.env.SCHOOLOS_CLIENT_URL || 'http://localhost:5173/';
const email = process.env.SCHOOLOS_SMOKE_EMAIL || 'admin@alnoor.ae';
const password = process.env.SCHOOLOS_SMOKE_PASSWORD || 'ChangeMe123';
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'schoolos-documents-browser-'));
const chrome = spawn(chromePath, [
  '--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu',
  '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank',
], { stdio: 'ignore' });

function waitFor(check, label, timeout = 45000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const poll = async () => {
      try { if (await check()) return resolve(); } catch (_) {}
      if (Date.now() - start > timeout) return reject(new Error('Timed out waiting for ' + label));
      setTimeout(poll, 100);
    };
    poll();
  });
}

(async () => {
  let ws;
  try {
    await waitFor(() => fs.existsSync(path.join(profile, 'DevToolsActivePort')), 'Chromium debugger');
    const port = Number(fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]);
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const page = targets.find((target) => target.type === 'page');
    assert(page, 'Chromium page target missing');
    ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { ws.once('open', resolve); ws.once('error', reject); });
    let nextId = 0;
    const pending = new Map();
    ws.on('message', (raw) => {
      const message = JSON.parse(String(raw));
      const callback = pending.get(message.id);
      if (callback) { pending.delete(message.id); callback(message); }
    });
    const cdp = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++nextId;
      pending.set(id, (message) => message.error ? reject(new Error(message.error.message)) : resolve(message.result));
      ws.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async (expression) => {
      const response = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (response.exceptionDetails) throw new Error(response.exceptionDetails.text);
      return response.result.value;
    };
    await cdp('Page.enable');
    await cdp('Runtime.enable');
    await cdp('Page.navigate', { url: clientUrl });
    await waitFor(() => evaluate('typeof window.enterApp === "function"'), 'SchoolOS boot');
    await evaluate(`document.getElementById('lxEmail').value=${JSON.stringify(email)};document.getElementById('lxPass').value=${JSON.stringify(password)};window.enterApp();`);
    try {
      await waitFor(() => evaluate('Boolean(window.SCHOOLOS_ADAPTER && window.SCHOOLOS_ADAPTER.connected)'), 'login');
    } catch (error) {
      const status = await evaluate("({note:document.getElementById('lxNote')?.textContent||'',api:window.SCHOOLOS_API?.base,role:window.SCHOOLOS_ADAPTER?.user?.role||null})");
      throw new Error(error.message + ': ' + JSON.stringify(status));
    }
    await evaluate("window.go('documents')");
    await waitFor(() => evaluate("document.getElementById('view').textContent.includes('Show superseded versions')"), 'Documents page');
    await waitFor(() => evaluate("!document.getElementById('view').textContent.includes('Loading documents')"), 'Documents API read');
    const initial = await evaluate("({role:window.SCHOOLOS_ADAPTER.user.role,nav:document.querySelector('#nav .nav-item[aria-current=page]')?.textContent.includes('Documents'),error:document.getElementById('view').querySelector('[role=alert]')?.textContent||null})");
    assert(initial.nav && !initial.error, JSON.stringify(initial));
    await evaluate('window.documentHistory(true)');
    await waitFor(() => evaluate("document.getElementById('view').querySelector('input[type=checkbox]')?.checked && !document.getElementById('view').textContent.includes('Loading documents')"), 'history read');
    let publishForm = false;
    let downloadUi = false;
    if (['Administrator', 'Principal', 'Teacher'].includes(initial.role)) {
      publishForm = await evaluate("window.documentPublishForm();Boolean(document.getElementById('documentPdfFile'))");
      assert(publishForm);
      await evaluate(`window.__docsIntercepted=false;const originalFetch=window.fetch;window.fetch=(url,opts)=>{if(String(url).endsWith('/documents/file')&&opts?.method==='POST'){window.__docsIntercepted=true;return Promise.resolve(new Response(JSON.stringify({success:true,data:{code:'POL-999',version:1}}),{status:201,headers:{'Content-Type':'application/json'}}));}return originalFetch(url,opts)};const file=new File(['%PDF-1.4\\n%%EOF'],'Smoke.pdf',{type:'application/pdf'});const data=new DataTransfer();data.items.add(file);document.getElementById('documentPdfFile').files=data.files;window.documentPublish({code:'POL-999',title:'Smoke policy',category:'Policy',description:'Browser test only'});`);
      await waitFor(() => evaluate('window.__docsIntercepted===true'), 'intercepted PDF publish');
      await waitFor(() => evaluate("!document.getElementById('drawer').classList.contains('on')"), 'publish UI completion');
    }
    await evaluate(`window.__docsOriginalApi=window.SCHOOLOS_ADAPTER.api;window.SCHOOLOS_ADAPTER.api=(route,opts)=>String(route).startsWith('/documents?')?Promise.resolve({data:[{_id:'fixture-document',code:'POL-998',title:'Fixture policy',category:'Policy',version:1,description:'Browser download test',isCurrent:true,fileId:'fixture-file',filename:'Fixture.pdf'}],meta:{pagination:{page:1,limit:20,total:1,totalPages:1}}}):window.__docsOriginalApi(route,opts);window.__docsDownloadIntercepted=false;const priorFetch=window.fetch;window.fetch=(url,opts)=>{if(String(url).endsWith('/documents/fixture-document/file')){window.__docsDownloadIntercepted=true;return Promise.resolve(new Response(new Blob(['%PDF-1.4\\n%%EOF'],{type:'application/pdf'}),{status:200,headers:{'Content-Type':'application/pdf'}}));}return priorFetch(url,opts)};window.documentReload();`);
    await waitFor(() => evaluate("document.getElementById('view').textContent.includes('Fixture policy')"), 'fixture PDF row');
    downloadUi = await evaluate("window.documentDetail(0);Boolean(document.getElementById('drawer').textContent.includes('Download PDF'))");
    assert(downloadUi);
    await evaluate('window.documentDownload(0)');
    await waitFor(() => evaluate('window.__docsDownloadIntercepted===true'), 'PDF download UI route');
    process.stdout.write(JSON.stringify({
      browser: 'Chromium',
      authenticated: true,
      role: initial.role,
      documentsNavigation: true,
      liveListAndHistoryRead: true,
      pdfPublishUiIntercepted: publishForm,
      pdfDownloadUiIntercepted: downloadUi,
      schoolDatabaseWrites: 0,
    }) + '\n');
  } finally {
    if (ws) ws.close();
    chrome.kill();
    await new Promise((resolve) => chrome.once('exit', resolve));
    await new Promise((resolve) => setTimeout(resolve, 500));
    try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 150 }); } catch (_) {}
  }
})().catch((error) => {
  process.stderr.write((error.stack || error.message) + '\n');
  process.exitCode = 1;
});
