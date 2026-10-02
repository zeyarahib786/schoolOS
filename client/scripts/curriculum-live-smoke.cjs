const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const clientUrl = process.env.SCHOOLOS_CLIENT_URL || 'http://localhost:5173/';
const apiUrl = process.env.SCHOOLOS_API_URL || 'http://localhost:4000/api/v1';
const email = process.env.SCHOOLOS_SMOKE_EMAIL || 'admin@alnoor.ae';
const password = process.env.SCHOOLOS_SMOKE_PASSWORD || 'ChangeMe123';
const title = `Curriculum UI smoke ${Date.now()}`;
let createdId;

function waitFor(check, label, timeout = 60000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const poll = () => {
      try { if (check()) return resolve(); } catch (_) { /* scripts may still be loading */ }
      if (Date.now() - started > timeout) return reject(new Error(`Timed out waiting for ${label}`));
      setTimeout(poll, 100);
    };
    poll();
  });
}

(async () => {
  const runtimeErrors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.sendTo(console, { omitJSDOMErrors: true });
  virtualConsole.on('jsdomError', (error) => {
    if (!/not implemented.*(navigation|canvas)/i.test(error.message)) runtimeErrors.push(error.message);
  });
  const clientRoot = path.resolve(__dirname, '..');
  const markup = fs.readFileSync(path.join(clientRoot, 'src/app/app-shell.html'), 'utf8');
  const registrySource = fs.readFileSync(path.join(clientRoot, 'src/features/registry.ts'), 'utf8');
  const scripts = [...registrySource.matchAll(/script: '([^']+)'/g)].map((match) => match[1]);
  const dom = new JSDOM(markup, {
    url: clientUrl,
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    virtualConsole,
  });
  const { window } = dom;
  window.fetch = global.fetch;
  window.alert = () => {};
  window.confirm = () => true;
  window.scrollTo = () => {};
  window.SCHOOLOS_API = { base: apiUrl };
  const bundle = scripts.map((script) => {
    const source = fs.readFileSync(path.join(clientRoot, 'public', script), 'utf8');
    return `${source}\n//# sourceURL=${script}`;
  }).join('\n');
  window.eval(bundle);
  try {
    await waitFor(() => typeof window.enterApp === 'function' && window.document.getElementById('lxEmail'), 'client scripts');
    window.document.getElementById('lxEmail').value = email;
    window.document.getElementById('lxPass').value = password;
    window.enterApp();
    await waitFor(() => window.SCHOOLOS_ADAPTER && window.SCHOOLOS_ADAPTER.connected && window.SCHOOLOS_ADAPTER.live.curriculum, 'authenticated Curriculum hydration');

    const stale = await window.SCHOOLOS_ADAPTER.api('/curriculum?search=Curriculum%20UI%20smoke&limit=100');
    await Promise.all((stale.data || []).map((unit) => window.SCHOOLOS_ADAPTER.api(`/curriculum/${unit._id}`, { method: 'DELETE' })));

    window.go('curriculum');
    window.saveUnit({ subject: 'Mathematics', term: 'Term 2', title, date: '2026-10-20', outcomes: 'Verify retained UI persistence' });
    await waitFor(() => {
      const row = (window.SCHOOLOS_ADAPTER.curriculumUnits || []).find((unit) => unit.title === title);
      if (row) createdId = row.mongoId;
      return Boolean(createdId);
    }, 'persisted unit creation');
    await waitFor(() => window.document.body.textContent.includes(title), 'rendered created Curriculum unit');

    await window.markUnitDone('Mathematics', title);
    await waitFor(() => Boolean((window.SCHOOLOS_ADAPTER.curriculumUnits || []).find((unit) => unit.mongoId === createdId)?.completedDate), 'completed coverage');
    await window.markUnitPlanned('Mathematics', title);
    await waitFor(() => (window.SCHOOLOS_ADAPTER.curriculumUnits || []).find((unit) => unit.mongoId === createdId)?.completedDate === null, 'reopened coverage');

    await waitFor(() => window.document.body.textContent.includes(title), 'rendered Curriculum unit');
    const result = {
      connected: window.SCHOOLOS_ADAPTER.connected,
      curriculumHydrated: window.SCHOOLOS_ADAPTER.live.curriculum,
      createWired: Boolean(window.saveUnit.__wrapped),
      completeWired: Boolean(window.markUnitDone.__apiBacked),
      reopenWired: Boolean(window.markUnitPlanned.__apiBacked),
      persistedAndRendered: window.document.body.textContent.includes(title),
      runtimeErrors: runtimeErrors.length,
      runtimeErrorMessages: runtimeErrors,
    };
    if (Object.values(result).some((value) => value === false) || result.runtimeErrors) throw new Error(JSON.stringify(result));
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } finally {
    if (createdId && window.SCHOOLOS_ADAPTER) {
      await window.SCHOOLOS_ADAPTER.api(`/curriculum/${createdId}`, { method: 'DELETE' }).catch(() => {});
    }
    window.close();
  }
})().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
