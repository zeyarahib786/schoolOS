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
  const value = line.slice(key.length + 1).trim();
  return value.replace(/^(['"])(.*)\1$/, '$2');
}

(async () => {
  const runtimeErrors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('warn', (...args) => process.stderr.write(args.map(String).join(' ') + '\n'));
  virtualConsole.on('jsdomError', (error) => { if (!/not implemented.*(navigation|canvas)/i.test(error.message)) runtimeErrors.push(error.message); });
  const clientRoot = path.resolve(__dirname, '..');
  const repoRoot = path.resolve(clientRoot, '..');
  const markup = fs.readFileSync(path.join(clientRoot, 'src/app/app-shell.html'), 'utf8');
  const registry = fs.readFileSync(path.join(clientRoot, 'src/features/registry.ts'), 'utf8');
  const scripts = [...registry.matchAll(/script: '([^']+)'/g)].map((match) => match[1]);
  const dom = new JSDOM(markup, { url: clientUrl, runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole });
  const { window } = dom;
  window.fetch = global.fetch; window.alert = () => {}; window.confirm = () => true; window.scrollTo = () => {};
  window.SCHOOLOS_API = { base: apiUrl };
  window.eval(scripts.map((script) => `${fs.readFileSync(path.join(clientRoot, 'public', script), 'utf8')}\n//# sourceURL=${script}`).join('\n'));
  const marker = `Parents Smoke ${Date.now()}`;
  let api; let guardian; let originalPortal; let bookedSlot;
  try {
    window.document.getElementById('lxEmail').value = email;
    window.document.getElementById('lxPass').value = password;
    window.enterApp();
    await waitFor(() => window.SCHOOLOS_ADAPTER?.connected && window.SCHOOLOS_ADAPTER.live.parents && window.toggleGuardianPortal?.__apiBacked, 'Parents hydration and workflow');
    api = window.SCHOOLOS_ADAPTER;
    guardian = api.guardianRows.find((row) => row.portal === 'Active'); originalPortal = guardian.portal;
    window.go('parents');
    await waitFor(() => window.document.body.textContent.includes('Parents & Guardians') && window.document.body.textContent.includes(guardian.name), 'Parents rendering');

    window.toggleGuardianPortal(guardian.id);
    const changedPortal = originalPortal === 'Active' ? 'Suspended' : 'Active';
    await waitFor(async () => (await api.api('/guardians?limit=100')).data.find((row) => row._id === guardian.mongoId)?.portalStatus === changedPortal, 'portal update');
    await waitFor(() => api.guardianRows.find((row) => row.id === guardian.id)?.portal === changedPortal, 'portal hydration');
    window.toggleGuardianPortal(guardian.id);
    await waitFor(async () => (await api.api('/guardians?limit=100')).data.find((row) => row._id === guardian.mongoId)?.portalStatus === originalPortal, 'portal restore');

    window.sendToParents({ audience: 'Individual guardian', guardian: `${guardian.name} (${guardian.id})`, channel: 'In-app only', subject: marker, message: marker });
    await waitFor(async () => (await api.api('/guardians/broadcasts?limit=100')).data.some((row) => row.subject === marker), 'broadcast persistence');

    const input = window.document.createElement('input'); input.id = 'threadReply'; input.value = marker + ' reply'; window.document.body.appendChild(input);
    window.sendThreadReply(guardian.id);
    await waitFor(async () => (await api.api(`/guardians/${guardian.mongoId}/messages`)).data.some((row) => row.text === marker + ' reply'), 'thread reply persistence');

    bookedSlot = api.parentMeetings.find((row) => row.status === 'Available');
    if (!bookedSlot) throw new Error('No available seeded PTM slot');
    const students = await api.api('/students?limit=100');
    const child = students.data.find((row) => guardian.children.includes(row.refId));
    window.bookMeetingForm(bookedSlot.id);
    window.confirmBooking({ guardian: `${guardian.name} (${guardian.id})`, student: `${child.name} - ${child.grade}`, note: marker });
    await waitFor(async () => (await api.api('/meetings?limit=100')).data.find((row) => row._id === bookedSlot.id)?.status === 'Confirmed', 'PTM booking');
    await window.notifyMeeting(bookedSlot.id);
    await waitFor(() => api.parentMeetings.find((row) => row.id === bookedSlot.id)?.status === 'Confirmed', 'PTM notify refresh');
    window.cancelMeeting(bookedSlot.id);
    await waitFor(async () => (await api.api('/meetings?limit=100')).data.find((row) => row._id === bookedSlot.id)?.status === 'Available', 'PTM cancellation restore');

    const result = {
      connected: api.connected, parentsHydrated: api.live.parents, guardianCount: api.guardianRows.length,
      portalWired: Boolean(window.toggleGuardianPortal.__apiBacked), broadcastWired: Boolean(window.sendToParents.__apiBacked),
      threadWired: Boolean(window.sendThreadReply.__apiBacked), meetingBookWired: Boolean(window.confirmBooking.__apiBacked),
      meetingActionsWired: Boolean(window.cancelMeeting.__apiBacked && window.doReschedule.__apiBacked && window.notifyMeeting.__apiBacked),
      rendered: window.document.body.textContent.includes('Parents & Guardians'), stateRestored: true, runtimeErrors,
    };
    if (!result.connected || !result.parentsHydrated || result.guardianCount < 3 || !result.portalWired || !result.broadcastWired ||
      !result.threadWired || !result.meetingBookWired || !result.meetingActionsWired || !result.rendered || runtimeErrors.length) throw new Error(JSON.stringify(result));
    process.stdout.write(`${JSON.stringify(result)}\n`);
  } finally {
    if (api && guardian && originalPortal) {
      await api.api(`/guardians/${guardian.mongoId}/portal`, { method: 'PATCH', body: JSON.stringify({ status: originalPortal === 'Suspended' ? 'Suspended' : 'Active' }) }).catch(() => {});
    }
    if (api && bookedSlot) {
      const rows = await api.api('/meetings?limit=100').catch(() => ({ data: [] }));
      if (rows.data.find((row) => row._id === bookedSlot.id)?.status !== 'Available') await api.api(`/meetings/${bookedSlot.id}/cancel`, { method: 'POST' }).catch(() => {});
    }
    const uri = envValue(path.join(repoRoot, 'server/.env'), 'MONGO_URI');
    if (uri) {
      const { MongoClient } = require(path.join(repoRoot, 'server/node_modules/mongodb'));
      const mongo = new MongoClient(uri);
      try {
        await mongo.connect();
        const db = mongo.db(new URL(uri).pathname.slice(1) || 'schoolos');
        if (guardian && originalPortal) await db.collection('guardians').updateOne({ _id: new (require(path.join(repoRoot, 'server/node_modules/mongodb')).ObjectId)(guardian.mongoId) }, { $set: { portalStatus: originalPortal } });
        await db.collection('parentbroadcasts').deleteMany({ subject: marker });
        await db.collection('guardianmessages').deleteMany({ text: { $in: [marker, marker + ' reply'] } });
      } finally { await mongo.close(); }
    }
    window.close();
  }
})().catch((error) => { process.stderr.write(`${error.stack || error.message}\n`); process.exitCode = 1; });

