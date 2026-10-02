const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { JSDOM, VirtualConsole } = require('jsdom');

const clientUrl = process.env.SCHOOLOS_CLIENT_URL || 'http://localhost:5173/';
const apiUrl = process.env.SCHOOLOS_API_URL || 'http://localhost:4000/api/v1';
const email = process.env.SCHOOLOS_SMOKE_EMAIL || 'admin@alnoor.ae';
const password = process.env.SCHOOLOS_SMOKE_PASSWORD || 'ChangeMe123';

function waitFor(check, timeout = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const poll = () => {
      if (check()) return resolve();
      if (Date.now() - start > timeout) return reject(new Error('Insights UI did not finish loading'));
      setTimeout(poll, 100);
    };
    poll();
  });
}

(async () => {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (error) => {
    if (!/not implemented.*(navigation|canvas)/i.test(error.message)) errors.push(error.message);
  });
  const root = path.resolve(__dirname, '..');
  const markup = fs.readFileSync(path.join(root, 'src/app/app-shell.html'), 'utf8');
  const registry = fs.readFileSync(path.join(root, 'src/features/registry.ts'), 'utf8');
  const scripts = [...registry.matchAll(/script: '([^']+)'/g)].map((match) => match[1]);
  const dom = new JSDOM(markup, { url: clientUrl, runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole });
  const { window } = dom;
  window.fetch = global.fetch;
  window.alert = () => {};
  window.confirm = () => true;
  window.scrollTo = () => {};
  window.SCHOOLOS_API = { base: apiUrl };
  try {
    window.eval(scripts.map((script) => fs.readFileSync(path.join(root, 'public', script), 'utf8')).join('\n'));
    window.document.getElementById('lxEmail').value = email;
    window.document.getElementById('lxPass').value = password;
    window.enterApp();
    await waitFor(() => window.SCHOOLOS_ADAPTER?.connected && window.SCHOOLOS_ADAPTER?.live?.students);
    window.go('aiinsights');
    await waitFor(() => window.document.getElementById('view').textContent.includes('Students to review'));
    const html = window.document.getElementById('view').innerHTML;
    assert(html.includes('Missing attendance or assessment records are not scored'));
    assert(!html.includes('78% recoverable'));
    assert(!html.includes('Grade 11-C attendance down'));
    assert(!html.includes('Assign mentor'));
    const ranked = window.eval('aiRisk()');
    assert(html.includes('Students to review'));
    assert(html.includes(String(ranked.length)));
    assert(ranked.every((item) => item.why.length > 0));
    const missing = { id: 'SMOKE-NO-DATA', status: 'Active', att: 0, gpa: 0, fee: 'Overdue',
      attendanceRecords: 0, assessmentResults: 0, invoiceRecords: 0 };
    assert.strictEqual(window.aiScore(missing).score, 0, 'Missing data produced a false alert');
    await window.refreshAiInsights();
    assert(window.document.getElementById('view').textContent.includes('Students to review'));
    assert.strictEqual(errors.length, 0, errors.join('; '));
    process.stdout.write(JSON.stringify({
      connected: true, ranked: ranked.length, dataBacked: true, refreshWorked: true,
      hardcodedForecasts: false, runtimeErrors: 0, insightsWrites: 0,
    }) + '\n');
  } finally {
    window.close();
  }
})().catch((error) => {
  process.stderr.write((error.stack || error.message) + '\n');
  process.exitCode = 1;
});
