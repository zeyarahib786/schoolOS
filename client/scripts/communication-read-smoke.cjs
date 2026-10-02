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
      if (Date.now() - start > timeout) return reject(new Error('Communication UI did not finish loading'));
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
    await waitFor(() => window.SCHOOLOS_ADAPTER?.connected && window.SCHOOLOS_ADAPTER.live.ANN && window.SCHOOLOS_ADAPTER.live.parents);
    window.go('comm');
    await waitFor(() => window.document.body.textContent.includes('Recent announcements'));
    const content = window.document.body.textContent;
    assert(content.includes('Delivery rate') && content.includes('Not tracked'));
    assert(content.includes('In-app portal'));
    assert(window.sendToParents.__apiBacked, 'Parents broadcast adapter is not installed');
    const adapter = window.SCHOOLOS_ADAPTER;
    assert(adapter.live.reports, 'Management reports did not hydrate');
    assert(adapter.reportsOverview.attendance.monthly.length === 6);
    window.go('reports');
    await waitFor(() => window.document.body.textContent.includes('Attendance trend (6 mo)'));
    assert(window.document.body.textContent.includes('Reports & Analytics'));
    window.go('comm');
    const guardian = adapter.guardianRows[0];
    assert(guardian, 'No guardian available for parent broadcast wiring check');
    const originalApi = adapter.api;
    const originalFetch = window.fetch;
    const originalRender = window.render;
    let renderCount = 0;
    window.render = function () {
      renderCount += 1;
      return originalRender.apply(this, arguments);
    };
    const moduleWrites = [];
    adapter.api = (route, options) => {
      if (route === '/guardians/broadcasts' && options?.method === 'POST') {
        moduleWrites.push(route);
        return Promise.resolve({ data: { _id: 'smoke-only' } });
      }
      return originalApi(route, options);
    };
    window.fetch = (url, options) => {
      if (options?.method && options.method !== 'GET') {
        moduleWrites.push(String(url));
        return Promise.reject(new Error('Smoke test prevented a live write'));
      }
      return originalFetch(url, options);
    };
    window.sendToParents({
      audience: 'Individual guardian', guardian: guardian.name + ' (' + guardian.id + ')',
      channel: 'In-app only', subject: 'Smoke wiring only', message: 'Smoke wiring only',
    });
    await waitFor(() => moduleWrites.length > 0);
    await waitFor(() => renderCount >= 2);
    assert.deepStrictEqual(moduleWrites, ['/guardians/broadcasts']);
    adapter.api = originalApi;
    window.fetch = originalFetch;
    window.render = originalRender;
    assert(!errors.length, errors.join('; '));
    process.stdout.write(JSON.stringify({
      connected: true,
      announcementsLoaded: true,
      parentsLoaded: true,
      communicationRendered: true,
      parentBroadcastAdapter: true,
      reportsRendered: true,
      runtimeErrors: errors.length,
      moduleWrites: 0,
      interceptedBroadcasts: 1,
    }) + '\n');
  } finally {
    window.close();
  }
})().catch((error) => {
  process.stderr.write((error.stack || error.message) + '\n');
  process.exitCode = 1;
});
