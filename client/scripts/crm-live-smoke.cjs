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
    const poll = async () => {
      try { if (await check()) return resolve(); } catch (_) {}
      if (Date.now() - started > timeout) return reject(new Error(`Timed out waiting for ${label}`));
      setTimeout(poll, 100);
    };
    poll();
  });
}

(async () => {
  const runtimeErrors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('warn', (...args) => process.stderr.write(args.map(String).join(' ') + '\n'));
  virtualConsole.on('jsdomError', (error) => {
    if (!/not implemented.*(navigation|canvas)/i.test(error.message)) runtimeErrors.push(error.message);
  });
  const clientRoot = path.resolve(__dirname, '..');
  const markup = fs.readFileSync(path.join(clientRoot, 'src/app/app-shell.html'), 'utf8');
  const registry = fs.readFileSync(path.join(clientRoot, 'src/features/registry.ts'), 'utf8');
  const scripts = [...registry.matchAll(/script: '([^']+)'/g)].map((match) => match[1]);
  const dom = new JSDOM(markup, { url: clientUrl, runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole });
  const { window } = dom;
  const crmUiLead = (name) => window.SCHOOLOS_ADAPTER?.crmRows?.find((row) => row.name === name);
  window.fetch = global.fetch; window.alert = () => {}; window.confirm = () => true; window.scrollTo = () => {};
  window.SCHOOLOS_API = { base: apiUrl };
  window.eval(scripts.map((script) => `${fs.readFileSync(path.join(clientRoot, 'public', script), 'utf8')}\n//# sourceURL=${script}`).join('\n'));
  const smokeName = `CRM Smoke ${Date.now()}`;
  try {
    window.document.getElementById('lxEmail').value = email;
    window.document.getElementById('lxPass').value = password;
    window.enterApp();
    await waitFor(() => window.SCHOOLOS_ADAPTER?.connected && window.SCHOOLOS_ADAPTER.live.crm && window.addLead?.__apiBacked, 'CRM hydration and workflow');
    const leftovers = await window.SCHOOLOS_ADAPTER.api('/crm?search=CRM%20Smoke&limit=100');
    for (const row of leftovers.data || []) {
      if (!row.archived) await window.SCHOOLOS_ADAPTER.api('/crm/' + row._id + '/archive', { method: 'POST', body: JSON.stringify({ reason: 'Automated smoke cleanup' }) });
      await window.SCHOOLOS_ADAPTER.api('/crm/' + row._id, { method: 'DELETE' });
    }
    if ((leftovers.data || []).length) await window.SCHOOLOS_ADAPTER.hydrate();
    window.go('crm');
    await waitFor(() => window.document.body.textContent.includes('Enrolment CRM') && window.document.body.textContent.includes('Zayd Haddad'), 'CRM rendering');
    window.addLead({ name: smokeName, grade: 'Grade 4', guardian: 'Smoke Guardian', phone: '+971 50 777 8899', source: 'Website', temp: 'Warm', owner: 'Front Office' });
    await waitFor(async () => (await window.SCHOOLOS_ADAPTER.api('/crm?search=' + encodeURIComponent(smokeName))).data.length === 1, 'lead create');
    await waitFor(() => crmUiLead(smokeName)?.mongoId, 'created lead hydration');
    window.advanceLead(smokeName);
    await waitFor(async () => (await window.SCHOOLOS_ADAPTER.api('/crm?search=' + encodeURIComponent(smokeName))).data[0]?.stage === 'Contacted', 'stage advance');
    await waitFor(() => crmUiLead(smokeName)?.stage === 'Contacted', 'advanced lead hydration');
    window.quickSchedule(smokeName, 3);
    await waitFor(async () => Boolean((await window.SCHOOLOS_ADAPTER.api('/crm?search=' + encodeURIComponent(smokeName))).data[0]?.followUpDate), 'follow-up');
    await waitFor(() => crmUiLead(smokeName)?.follow != null, 'follow-up hydration');
    window.archiveLead(smokeName);
    await waitFor(async () => (await window.SCHOOLOS_ADAPTER.api('/crm?search=' + encodeURIComponent(smokeName))).data[0]?.archived === true, 'archive');
    await waitFor(() => crmUiLead(smokeName)?.archived === true, 'archive hydration');
    window.deleteLead(smokeName);
    await waitFor(async () => (await window.SCHOOLOS_ADAPTER.api('/crm?search=' + encodeURIComponent(smokeName))).data.length === 0, 'cleanup');
    await waitFor(() => !crmUiLead(smokeName), 'delete hydration');
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const persisted = await window.SCHOOLOS_ADAPTER.api('/crm?limit=100');
    const result = {
      connected: window.SCHOOLOS_ADAPTER.connected, crmHydrated: window.SCHOOLOS_ADAPTER.live.crm,
      persistedLeads: persisted.data.length, addLeadWired: Boolean(window.addLead.__apiBacked),
      stageWired: Boolean(window.advanceLead.__apiBacked), followUpWired: Boolean(window.quickSchedule.__apiBacked),
      archiveDeleteWired: Boolean(window.archiveLead.__apiBacked && window.deleteLead.__apiBacked),
      rendered: window.document.body.textContent.includes('Zayd Haddad'), smokeLeadCleaned: true, runtimeErrors,
    };
    if (!result.connected || !result.crmHydrated || result.persistedLeads < 11 || !result.addLeadWired || !result.stageWired ||
      !result.followUpWired || !result.archiveDeleteWired || !result.rendered || runtimeErrors.length) throw new Error(JSON.stringify(result));
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } finally { window.close(); }
})().catch((error) => { process.stderr.write(`${error.stack || error.message}\n`); process.exitCode = 1; });
