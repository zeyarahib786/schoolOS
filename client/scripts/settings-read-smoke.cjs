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
      if (Date.now() - start > timeout) return reject(new Error('Settings UI did not finish loading'));
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
    await waitFor(() => window.SCHOOLOS_ADAPTER?.connected && window.SCHOOLOS_ADAPTER?.live?.settings);
    const adapter = window.SCHOOLOS_ADAPTER;
    window.go('settings');
    await waitFor(() => window.document.body.textContent.includes('School profile & academic structure'));
    const nameInput = [...window.document.querySelectorAll('input')].find((node) => node.getAttribute('onchange') === "updateProfile('legalName',this.value)");
    assert(nameInput, 'School profile input missing');
    assert.strictEqual(nameInput.value, adapter.settings.schoolName);
    assert.strictEqual(nameInput.disabled, adapter.user.role !== 'Administrator');
    const yearInput = [...window.document.querySelectorAll('input')].find((node) => node.getAttribute('onchange') === "updateProfile('academicYear',this.value)");
    const zoneInput = [...window.document.querySelectorAll('input')].find((node) => node.getAttribute('onchange') === "updateProfile('timezone',this.value)");
    const leaveInput = [...window.document.querySelectorAll('input')].find((node) => node.getAttribute('onchange') === "updateProfile('defaultAnnualLeave',this.value)");
    assert.strictEqual(yearInput?.value, adapter.settings.academicYear);
    assert.strictEqual(zoneInput?.value, adapter.settings.timezone);
    assert.strictEqual(Number(leaveInput?.value), adapter.settings.defaultAnnualLeave);
    const actualAmount = window.money(8400);
    window.setCurrency(adapter.settings.currency === 'USD' ? 'EUR' : 'USD');
    assert.strictEqual(window.money(8400), actualAmount, 'Currency preview relabeled a financial amount');
    window.applyRegion('India');
    assert.strictEqual(window.money(8400), actualAmount, 'Region preview relabeled a financial amount');
    let interceptedWrites = 0;
    if (adapter.user.role === 'Administrator') {
      const liveFetch = window.fetch;
      window.fetch = (url, options) => {
        if (options?.method === 'PUT' && String(url).endsWith('/settings')) {
          interceptedWrites += 1;
          const payload = JSON.parse(options.body);
          assert.strictEqual(payload.schoolName, 'Settings UI Smoke School');
          return Promise.resolve(new Response(JSON.stringify({ data: payload }), {
            status: 200, headers: { 'Content-Type': 'application/json' },
          }));
        }
        if (options?.method && options.method !== 'GET') return Promise.reject(new Error('Smoke prevented a live write'));
        return liveFetch(url, options);
      };
      window.updateProfile('legalName', 'Settings UI Smoke School');
      await waitFor(() => adapter.settings.schoolName === 'Settings UI Smoke School');
      assert.strictEqual(interceptedWrites, 1);
      const wasDisabled = (adapter.settings.disabledModules || []).includes('hostel');
      window.toggleModule('hostel');
      await waitFor(() => (adapter.settings.disabledModules || []).includes('hostel') !== wasDisabled);
      assert.strictEqual(interceptedWrites, 2);
      window.fetch = liveFetch;
      adapter.user.role = 'Principal';
      window.render();
      const readOnlyName = [...window.document.querySelectorAll('input')].find((node) => node.getAttribute('onchange') === "updateProfile('legalName',this.value)");
      assert.strictEqual(readOnlyName.disabled, true);
      assert([...window.document.querySelectorAll('[role="switch"]')].some((node) => node.getAttribute('aria-disabled') === 'true'));
    }
    assert(!errors.length, errors.join('; '));
    process.stdout.write(JSON.stringify({ connected: true, settingsLoaded: true, profileRendered: true, profileEditable: !nameInput.disabled, runtimeErrors: 0, settingsWrites: 0, interceptedWrites }) + '\n');
  } finally {
    window.close();
  }
})().catch((error) => {
  process.stderr.write((error.stack || error.message) + '\n');
  process.exitCode = 1;
});
