const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { JSDOM, VirtualConsole } = require('jsdom');

const clientUrl = process.env.SCHOOLOS_CLIENT_URL || 'http://localhost:5173/';
const apiUrl = process.env.SCHOOLOS_API_URL || 'http://localhost:4000/api/v1';
const email = process.env.SCHOOLOS_SMOKE_EMAIL || 'admin@alnoor.ae';
const password = process.env.SCHOOLOS_SMOKE_PASSWORD || 'ChangeMe123';

function waitFor(check, label, timeout = 45000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const poll = () => {
      try { if (check()) return resolve(); } catch (_) {}
      if (Date.now() - started > timeout) return reject(new Error('Timed out waiting for ' + label));
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
  window.eval(scripts.map((script) => `${fs.readFileSync(path.join(root, 'public', script), 'utf8')}\n//# sourceURL=${script}`).join('\n'));
  try {
    window.document.getElementById('lxEmail').value = email;
    window.document.getElementById('lxPass').value = password;
    window.enterApp();
    await waitFor(() => window.SCHOOLOS_ADAPTER?.connected, 'authenticated client');
    window.go('documents');
    await waitFor(() => window.document.getElementById('view').textContent.includes('Versioned document records'), 'Documents page');
    await waitFor(() => !window.document.getElementById('view').textContent.includes('Loading documents'), 'Documents API read');
    assert(window.document.getElementById('view').textContent.includes('Show superseded versions'));
    assert(window.document.querySelector('#nav .nav-item[aria-current="page"]')?.textContent.includes('Documents'));
    window.documentHistory(true);
    await waitFor(() => !window.document.getElementById('view').textContent.includes('Loading documents'), 'version history read');
    assert(window.document.getElementById('view').querySelector('input[type="checkbox"]').checked);
    const publishVisible = Boolean(window.document.getElementById('view').querySelector('button[onclick="documentPublishForm()"]'));
    if (['Administrator', 'Principal', 'Teacher'].includes(window.SCHOOLOS_ADAPTER.user.role)) {
      assert(publishVisible);
      window.documentPublishForm();
      assert(window.document.getElementById('documentPdfFile'));
      assert(window.document.getElementById('drawer').textContent.includes('Publish document'));
      const adapter = window.SCHOOLOS_ADAPTER;
      const originalApi = adapter.api;
      let interceptedPdf = null;
      let refreshedAfterPublish = false;
      adapter.api = (route, options) => {
        if (route === '/documents/file' && options?.method === 'POST') {
          interceptedPdf = options;
          return Promise.resolve({ data: { code: 'POL-999', version: 1 } });
        }
        if (options?.method && options.method !== 'GET') throw new Error('Smoke prevented a live write');
        if (route.startsWith('/documents?')) {
          return originalApi(route, options).then((response) => {
            refreshedAfterPublish = true;
            return response;
          });
        }
        return originalApi(route, options);
      };
      const input = window.document.getElementById('documentPdfFile');
      Object.defineProperty(input, 'files', { value: [{
        name: 'Smoke policy.pdf', type: 'application/pdf', size: 32,
        arrayBuffer: () => Promise.resolve(new Uint8Array(32).buffer),
      }] });
      window.documentPublish({ code: 'POL-999', title: 'Smoke policy', category: 'Policy', description: 'UI route test only' });
      await waitFor(() => interceptedPdf, 'PDF publish request interception');
      await waitFor(() => refreshedAfterPublish, 'post-publish list refresh');
      assert.strictEqual(interceptedPdf.headers['Content-Type'], 'application/pdf');
      assert.strictEqual(interceptedPdf.headers['X-Document-Code'], 'POL-999');
      adapter.api = originalApi;
      window.closeDrawer();
    } else assert(!publishVisible);
    assert(!errors.length, errors.join('; '));
    process.stdout.write(JSON.stringify({
      authenticated: true,
      role: window.SCHOOLOS_ADAPTER.user.role,
      documentsNavigation: true,
      liveListRead: true,
      liveHistoryRead: true,
      publishFormForWriter: publishVisible,
      pdfWriteRouteVerifiedWithoutDatabaseWrite: publishVisible,
      databaseWrites: 0,
      runtimeErrors: errors.length,
    }) + '\n');
  } finally {
    window.close();
  }
})().catch((error) => {
  process.stderr.write((error.stack || error.message) + '\n');
  process.exitCode = 1;
});
