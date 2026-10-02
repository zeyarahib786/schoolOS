const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const clientUrl = process.env.SCHOOLOS_CLIENT_URL || 'http://localhost:5173/';
const apiUrl = process.env.SCHOOLOS_API_URL || 'http://localhost:4000/api/v1';
const email = process.env.SCHOOLOS_SMOKE_EMAIL || 'admin@alnoor.ae';
const password = process.env.SCHOOLOS_SMOKE_PASSWORD || 'ChangeMe123';

function waitFor(check, label, timeout = 60000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const poll = () => {
      try { if (check()) return resolve(); } catch (_) { /* runtime is still hydrating */ }
      if (Date.now() - started > timeout) return reject(new Error(`Timed out waiting for ${label}`));
      setTimeout(poll, 100);
    };
    poll();
  });
}

(async () => {
  const runtimeErrors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (error) => {
    if (!/not implemented.*(navigation|canvas)/i.test(error.message)) runtimeErrors.push(error.message);
  });
  const clientRoot = path.resolve(__dirname, '..');
  const markup = fs.readFileSync(path.join(clientRoot, 'src/app/app-shell.html'), 'utf8');
  const registrySource = fs.readFileSync(path.join(clientRoot, 'src/features/registry.ts'), 'utf8');
  const scripts = [...registrySource.matchAll(/script: '([^']+)'/g)].map((match) => match[1]);
  const dom = new JSDOM(markup, { url: clientUrl, runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole });
  const { window } = dom;
  window.fetch = global.fetch;
  window.alert = () => {};
  window.confirm = () => true;
  window.scrollTo = () => {};
  window.SCHOOLOS_API = { base: apiUrl };
  const bundle = scripts.map((script) => `${fs.readFileSync(path.join(clientRoot, 'public', script), 'utf8')}\n//# sourceURL=${script}`).join('\n');
  window.eval(bundle);

  try {
    window.document.getElementById('lxEmail').value = email;
    window.document.getElementById('lxPass').value = password;
    window.enterApp();
    await waitFor(() => window.SCHOOLOS_ADAPTER?.connected && window.SCHOOLOS_ADAPTER.live.classes, 'Classes hydration');
    window.go('classes');
    await waitFor(() => window.document.body.textContent.includes('Grade 10 · A'), 'seeded class rendering');
    const response = await window.SCHOOLOS_ADAPTER.api('/classes?limit=100');
    const grade10A = (response.data || []).find((row) => row.className === 'Grade 10 · A');
    const result = {
      connected: window.SCHOOLOS_ADAPTER.connected,
      classesHydrated: window.SCHOOLOS_ADAPTER.live.classes,
      addSectionWired: Boolean(window.addClass.__wrapped),
      persistedSections: (response.data || []).length,
      liveRosterCount: grade10A?.filled,
      teacherResolved: grade10A?.teacherStaffId?.name === 'Rohan Mehta',
      rendered: window.document.body.textContent.includes('Grade 10 · A'),
      runtimeErrors,
    };
    if (!result.connected || !result.classesHydrated || !result.addSectionWired || result.persistedSections < 12 || result.liveRosterCount < 1 || !result.teacherResolved || !result.rendered || runtimeErrors.length) {
      throw new Error(JSON.stringify(result));
    }
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } finally {
    window.close();
  }
})().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
