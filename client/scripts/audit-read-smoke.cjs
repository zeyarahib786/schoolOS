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
      if (Date.now() - start > timeout) return reject(new Error('Audit UI did not finish loading'));
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
    await waitFor(() => window.SCHOOLOS_ADAPTER?.connected && window.SCHOOLOS_ADAPTER?.live?.audit);
    window.go('audit');
    await waitFor(() => window.document.body.textContent.includes('server-recorded events loaded'));
    assert(window.document.body.textContent.includes(`${window.SCHOOLOS_ADAPTER.auditTotal} server-recorded events loaded`));
    assert(window.document.body.textContent.includes('Export log'));
    let refreshReads = 0;
    let interceptedExports = 0;
    const realFetch = window.fetch;
    window.fetch = (url, options) => {
      if (options?.method === 'POST' && String(url).endsWith('/audit-log/exports')) {
        interceptedExports += 1;
        assert.strictEqual(options.body, '{}');
        return Promise.resolve(new Response(JSON.stringify({ success: true, data: { recorded: true } }), {
          status: 200, headers: { 'Content-Type': 'application/json' },
        }));
      }
      if (options?.method && options.method !== 'GET') return Promise.reject(new Error('Smoke prevented a live write'));
      if (String(url).includes('/audit-log')) refreshReads += 1;
      return realFetch(url, options);
    };
    let exported = null;
    const realExport = window.exportCSV;
    window.exportCSV = (_name, _headers, rows) => { exported = rows; };
    await window.exportAuditLog();
    window.exportCSV = realExport;
    assert.strictEqual(interceptedExports, 1, 'Audit export was not acknowledged by the server');
    assert.strictEqual(exported?.length, window.SCHOOLOS_ADAPTER.auditTotal, 'Audit export omitted server pages');
    assert(exported.every((row) => ['Info', 'Warning', 'Critical'].includes(row[4])));
    window.logAudit('Smoke browser-only event', 'Audit Test');
    window.render();
    assert(!window.document.body.textContent.includes('Smoke browser-only event'), 'Browser fabricated an audit event');
    await window.refreshAuditLog();
    assert(refreshReads > 0, 'Audit refresh made no API read');
    window.fetch = realFetch;
    assert(!errors.length, errors.join('; '));
    process.stdout.write(JSON.stringify({ connected: true, auditLoaded: true, auditRendered: true, browserFakeBlocked: true, refreshReads, interceptedExports, runtimeErrors: 0, auditWrites: 0 }) + '\n');
  } finally {
    window.close();
  }
})().catch((error) => {
  process.stderr.write((error.stack || error.message) + '\n');
  process.exitCode = 1;
});
