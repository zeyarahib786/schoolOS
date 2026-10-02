const fs = require('fs');
const os = require('os');
const path = require('path');
const assert = require('assert');
const { spawn } = require('child_process');
const WebSocket = require('ws');

const chromePath = process.env.SCHOOLOS_CHROME_PATH || path.join(os.homedir(), '.cache/ms-playwright/chromium-1243/chrome-linux64/chrome');
const clientUrl = process.env.SCHOOLOS_CLIENT_URL || 'http://localhost:5173/';
const email = process.env.SCHOOLOS_SMOKE_EMAIL || 'admin@alnoor.ae';
const password = process.env.SCHOOLOS_SMOKE_PASSWORD || 'ChangeMe123';
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'schoolos-reports-browser-'));
const chrome = spawn(chromePath, ['--headless=new', '--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--remote-debugging-port=0', '--user-data-dir=' + profile, 'about:blank'], { stdio: 'ignore' });

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
  let socket;
  try {
    await waitFor(() => fs.existsSync(path.join(profile, 'DevToolsActivePort')), 'Chromium debugger');
    const port = Number(fs.readFileSync(path.join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]);
    const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json();
    const page = targets.find((target) => target.type === 'page');
    socket = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { socket.once('open', resolve); socket.once('error', reject); });
    let sequence = 0;
    const pending = new Map();
    socket.on('message', (raw) => {
      const message = JSON.parse(String(raw));
      const callback = pending.get(message.id);
      if (callback) { pending.delete(message.id); callback(message); }
    });
    const cdp = (method, params = {}) => new Promise((resolve, reject) => {
      const id = ++sequence;
      pending.set(id, (message) => message.error ? reject(new Error(message.error.message)) : resolve(message.result));
      socket.send(JSON.stringify({ id, method, params }));
    });
    const evaluate = async (expression) => {
      const result = await cdp('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
      return result.result.value;
    };
    await cdp('Page.enable'); await cdp('Runtime.enable');
    await cdp('Page.navigate', { url: clientUrl });
    await waitFor(() => evaluate('typeof window.enterApp === "function"'), 'SchoolOS boot');
    await evaluate(`document.getElementById('lxEmail').value=${JSON.stringify(email)};document.getElementById('lxPass').value=${JSON.stringify(password)};window.enterApp();`);
    await waitFor(() => evaluate('Boolean(window.SCHOOLOS_ADAPTER && window.SCHOOLOS_ADAPTER.connected)'), 'login');
    const role = await evaluate('window.SCHOOLOS_ADAPTER.user.role');
    const navHasModule = await evaluate("Array.from(document.querySelectorAll('#nav .nav-item')).some((item)=>item.textContent.includes('Reports & Analytics'))");
    if (['Administrator', 'Principal'].includes(role)) {
      assert(navHasModule);
      await evaluate("window.go('reports')");
      await waitFor(() => evaluate("document.getElementById('view').textContent.includes('Reports & Analytics')"), 'Reports page');
      await waitFor(() => evaluate("document.getElementById('view').textContent.includes('Data: live')"), 'live reports data');
      const exported = await evaluate(`window.__reportExport=null;window.exportCSV=(filename,headers,rows)=>{window.__reportExport={filename,headers,rows}};document.querySelector('#view button[onclick^="exportCSV"]').click();window.__reportExport`);
      assert.strictEqual(exported.filename, 'reports-summary.csv');
      assert(exported.rows.some((row) => row[0] === 'Students'));
      process.stdout.write(JSON.stringify({ browser: 'Chromium', authenticated: true, role, reportsNavigation: true, liveOverviewRead: true, exportUiVerified: true, schoolDatabaseWrites: 0 }) + '\n');
    } else {
      assert(!navHasModule);
      process.stdout.write(JSON.stringify({ browser: 'Chromium', authenticated: true, role, reportsNavigation: false, managementReportHidden: true, schoolDatabaseWrites: 0 }) + '\n');
    }
  } finally {
    if (socket) socket.close();
    chrome.kill();
    await new Promise((resolve) => chrome.once('exit', resolve));
    await new Promise((resolve) => setTimeout(resolve, 500));
    try { fs.rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 150 }); } catch (_) {}
  }
})().catch((error) => { process.stderr.write((error.stack || error.message) + '\n'); process.exitCode = 1; });
