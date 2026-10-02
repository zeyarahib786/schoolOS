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
function envValue(file, key) {
  const line = fs.readFileSync(file, 'utf8').split(/\r?\n/).find((entry) => entry.startsWith(key + '='));
  if (!line) return null;
  return line.slice(key.length + 1).trim().replace(/^(['"])(.*)\1$/, '$2');
}

(async () => {
  const runtimeErrors = [], startedAt = new Date(), customName = `Smoke Librarian ${Date.now()}`;
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('warn', (...args) => process.stderr.write(args.map(String).join(' ') + '\n'));
  virtualConsole.on('jsdomError', (error) => { if (!/not implemented.*(navigation|canvas)/i.test(error.message)) runtimeErrors.push(error.message); });
  const clientRoot = path.resolve(__dirname, '..'), repoRoot = path.resolve(clientRoot, '..');
  const markup = fs.readFileSync(path.join(clientRoot, 'src/app/app-shell.html'), 'utf8');
  const registry = fs.readFileSync(path.join(clientRoot, 'src/features/registry.ts'), 'utf8');
  const scripts = [...registry.matchAll(/script: '([^']+)'/g)].map((match) => match[1]);
  const dom = new JSDOM(markup, { url: clientUrl, runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole });
  const { window } = dom;
  window.fetch = global.fetch; window.alert = () => {}; window.confirm = () => true; window.scrollTo = () => {};
  window.SCHOOLOS_API = { base: apiUrl };
  window.eval(scripts.map((script) => `${fs.readFileSync(path.join(clientRoot, 'public', script), 'utf8')}\n//# sourceURL=${script}`).join('\n'));
  let api, teacher, original;
  try {
    window.document.getElementById('lxEmail').value = email;
    window.document.getElementById('lxPass').value = password;
    window.enterApp();
    await waitFor(() => window.SCHOOLOS_ADAPTER?.connected && window.SCHOOLOS_ADAPTER.live.roles && window.SCHOOLOS_ADAPTER.rolesWorkflowInstalled, 'Roles hydration and workflow');
    api = window.SCHOOLOS_ADAPTER;
    window.go('roles');
    await waitFor(() => window.document.body.textContent.includes('Roles & Access') && window.document.body.textContent.includes('Permission matrix'), 'Roles rendering');
    teacher = api.accessRoles.find((role) => role.name === 'Teacher'); original = Boolean(teacher.permissions['AI Insights']);
    const roleIndex = api.accessRoles.findIndex((role) => role.name === 'Teacher'), rowIndex = api.accessModules.indexOf('AI Insights');
    window.togglePerm(rowIndex, roleIndex);
    await waitFor(async () => Boolean((await api.api('/roles')).data.roles.find((role) => role.name === 'Teacher').permissions['AI Insights']) === !original, 'permission persistence');
    await waitFor(() => Boolean(api.accessRoles.find((role) => role.name === 'Teacher').permissions['AI Insights']) === !original, 'permission UI hydration');
    window.togglePerm(rowIndex, roleIndex);
    await waitFor(async () => Boolean((await api.api('/roles')).data.roles.find((role) => role.name === 'Teacher').permissions['AI Insights']) === original, 'permission restore');
    window.addRole({ role: customName, base: 'Teacher', desc: 'Automated smoke role' });
    await waitFor(async () => (await api.api('/roles')).data.roles.some((role) => role.name === customName), 'custom role persistence');
    await waitFor(() => window.document.body.textContent.includes(customName), 'custom role rendering');
    const exported = [];
    window.exportCSV = (filename, headers, rows) => exported.push({ filename, headers, rows });
    window.exportRoleMatrix();
    const result = {
      connected: api.connected, rolesHydrated: api.live.roles, definedRoles: api.accessRoles.length,
      governedModules: api.accessModules.length, togglePersistedAndRestored: true,
      customRolePersisted: api.accessRoles.some((role) => role.name === customName),
      liveUserCount: api.rbacTotalUsers, exportIncludesCustomRole: exported[0]?.rows.some((row) => row[0] === customName),
      rendered: window.document.body.textContent.includes('Permission matrix'), runtimeErrors,
    };
    if (!result.connected || !result.rolesHydrated || result.definedRoles < 7 || result.governedModules !== 11 ||
      !result.customRolePersisted || !result.exportIncludesCustomRole || !result.rendered || runtimeErrors.length) throw new Error(JSON.stringify(result));
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } finally {
    if (api && teacher && typeof original === 'boolean') {
      const fresh = await api.api('/roles').catch(() => null), current = fresh?.data?.roles?.find((role) => role.name === 'Teacher');
      if (current && Boolean(current.permissions['AI Insights']) !== original) await api.api(`/roles/${teacher._id}/permissions/${encodeURIComponent('AI Insights')}`, { method: 'PATCH', body: JSON.stringify({ enabled: original }) }).catch(() => {});
    }
    const uri = envValue(path.join(repoRoot, 'server/.env'), 'MONGO_URI');
    if (uri) {
      const { MongoClient } = require(path.join(repoRoot, 'server/node_modules/mongodb'));
      const mongo = new MongoClient(uri);
      try {
        await mongo.connect(); const db = mongo.db(new URL(uri).pathname.slice(1) || 'schoolos');
        await db.collection('accessroles').deleteMany({ name: customName });
        await db.collection('auditlogs').deleteMany({ module: 'Roles & Access', createdAt: { $gte: startedAt } });
      } finally { await mongo.close(); }
    }
    window.close();
  }
})().catch((error) => { process.stderr.write(`${error.stack || error.message}\n`); process.exitCode = 1; });
