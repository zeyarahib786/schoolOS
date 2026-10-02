const fs = require('fs');
const path = require('path');
const assert = require('assert');
const { JSDOM, VirtualConsole } = require('jsdom');

const root = path.resolve(__dirname, '..');
const clientUrl = process.env.SCHOOLOS_CLIENT_URL || 'http://localhost:5173/';
const apiUrl = process.env.SCHOOLOS_API_URL || 'http://localhost:4000/api/v1';
const password = process.env.SCHOOLOS_SMOKE_PASSWORD || 'ChangeMe123';
const markup = fs.readFileSync(path.join(root, 'src/app/app-shell.html'), 'utf8');
const registry = fs.readFileSync(path.join(root, 'src/features/registry.ts'), 'utf8');
const scripts = [...registry.matchAll(/script: '([^']+)'/g)].map((match) => match[1]);
const bundle = scripts.map((script) => fs.readFileSync(path.join(root, 'public', script), 'utf8')).join('\n');
const unhandled = [];
process.on('unhandledRejection', (error) => {
  unhandled.push(error.message);
  process.stderr.write('Unhandled browser promise: ' + error.message + '\n');
});

function waitFor(check, label, timeout = 30000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const poll = () => {
      if (check()) return resolve();
      if (Date.now() - start > timeout) return reject(new Error(label + ' Dashboard did not finish loading'));
      setTimeout(poll, 100);
    };
    poll();
  });
}

async function checkRole(role, email, name) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (error) => {
    if (!/not implemented.*(navigation|canvas)/i.test(error.message)) errors.push(error.message);
  });
  const dom = new JSDOM(markup, { url: clientUrl, runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole });
  const { window } = dom;
  window.fetch = (...args) => global.fetch(...args).then((response) => {
    if (!response.ok && process.env.SCHOOLOS_DASHBOARD_DEBUG) process.stderr.write(role + ' API ' + response.status + ' ' + String(args[0]) + '\n');
    return response;
  });
  window.alert = () => {};
  window.confirm = () => true;
  window.scrollTo = () => {};
  window.SCHOOLOS_API = { base: apiUrl };
  try {
    // Expose the in-memory list only inside this isolated jsdom instance for print formatting checks.
    window.eval(bundle + '\nwindow.__smokeCertificateRows = CERTS;');
    window.document.getElementById('lxEmail').value = email;
    window.document.getElementById('lxPass').value = password;
    window.enterApp();
    await waitFor(() => (window.SCHOOLOS_ADAPTER?.connected && window.SCHOOLOS_ADAPTER?.live?.students)
      || (!window.document.getElementById('lxEnter')?.disabled
        && window.document.getElementById('lxNote')?.textContent !== 'Signing in…'), role, 60000)
      .catch((error) => {
        throw new Error(error.message + '; login note: '
          + window.document.getElementById('lxNote')?.textContent);
      });
    assert(window.SCHOOLOS_ADAPTER?.connected, role + ' login unavailable: ' + window.document.getElementById('lxNote')?.textContent);
    window.go('dashboard');
    const body = window.document.getElementById('view').textContent;
    if (role === 'Student') assert(body.includes(name.split(' ')[0]), 'Student dashboard did not greet the linked learner');
    else if (role !== 'Accountant') assert(body.includes(name), role + ' did not show the authenticated user');
    else assert(body.includes('Finance overview'));
    assert(!body.includes('Today 03:00'), 'Dashboard still claimed a fake backup');
    assert(!body.includes('2148000'), 'Dashboard still showed fixed financial totals');
    if (role === 'Administrator') {
      assert(body.includes('Recent AM attendance'));
      assert(body.includes('Backup status'));
      assert(body.includes('Not verified'));
      const actual = window.dashboardAttendance();
      const captured = {};
      window.exportCSV = (filename, headers, rows) => { captured.filename = filename; captured.headers = headers; captured.rows = rows; };
      window.exportDashboardSummary();
      assert.strictEqual(captured.filename, 'dashboard-summary.csv');
      assert(captured.rows.some((row) => row[0] === 'Present AM' && row[1] === actual.present));
      const office = window.officeAttendanceOverview();
      assert(office.includes(name), 'Office attendance did not use the signed-in user');
      window.go('certificates');
      const certificateBody = window.document.getElementById('view').textContent;
      assert(certificateBody.includes('Server records'), 'Certificates page did not show server-record status');
      assert(!certificateBody.includes('QR-signed') && !certificateBody.includes('Verified online'),
        'Certificates page still claims unsupported verification');
      assert(![...window.document.querySelectorAll('#view button')]
        .some((button) => button.textContent.trim() === 'PDF'),
      'Certificates page labels an HTML record as PDF');
      const templates = window.templateLibrary();
      assert(!templates.includes('v2.1') && !templates.includes('EN/AR'),
        'Certificate templates still claim unsupported versioning or translation');
      window.issueCertForm();
      const issueDrawer = window.document.getElementById('drawer').textContent;
      assert(issueDrawer.includes('ANS-1042') && issueDrawer.includes('Issue record')
        && issueDrawer.includes('Submit for approval'),
        'Certificate form did not identify the selected student by roster reference');
      window.closeDrawer();
      const student = window.myStudent();
      const fixture = {
        ref: 'SMOKE-BF-0001', mongoId: 'fixture-only', studentId: student.mongoId,
        name: student.name, cls: student.grade, kind: 'Bonafide', type: 'Bonafide Letter',
        issuedAt: '2026-09-30T12:00:00.000Z', date: '30 Sep', issuedBy: name,
        purpose: 'Browser format check', status: 'Issued',
      };
      const copies = [];
      window.__smokeCertificateRows.push(fixture);
      window.downloadDoc = (filename, html) => { copies.push({ filename, html }); };
      window.downloadCertificate(student.name, fixture.type, fixture.ref, student.grade);
      window.__smokeCertificateRows.pop();
      assert.strictEqual(copies.length, 1, 'Issued certificate fixture did not download');
      assert(copies[0].html.includes(fixture.ref) && copies[0].html.includes('Browser format check')
        && copies[0].html.includes('not a signed or certified school document'),
      'Certificate print copy omitted real record fields or unsigned notice');
      window.go('dashboard');
    }
    if (role === 'Accountant') {
      assert(body.includes('Payroll net'));
      assert(!body.includes('June 2025'));
      let exported = null;
      window.exportCSV = (_name, _headers, rows) => { exported = rows; };
      window.exportAccountantSummary();
      assert(exported.some((row) => row[0] === 'Overdue balance'));
    }
    if (role === 'Teacher') assert(body.includes('Published timetable') || body.includes('Timetable unavailable'));
    if (role === 'Student') {
      assert(body.includes('Your school records at a glance.'), 'Student dashboard did not render');
      assert(body.includes('My GPA') && body.includes('Assignments due'), 'Student dashboard KPIs missing');
      const linked = window.dashboardLinkedStudent();
      assert(linked && linked.name === name, 'Student login was not linked to its own roster record');
      assert.strictEqual(window.myAbsenceStudent()?.id, linked.id, 'Student absence action used a different student');
      const copies = [];
      window.downloadDoc = (filename, html) => { copies.push({ filename, html }); };
      window.dashboardDownloadFeeStatement(linked.id);
      assert(copies.some((copy) => copy.html.includes('Fee ledger statement')
        && copy.html.includes('not a signed or certified school document')),
      'Student fee statement did not use a clearly unsigned ledger copy');
      const beforeCertificate = copies.length;
      window.downloadCertificate(linked.name, 'Bonafide Letter', '', linked.grade);
      const certificateList = await window.SCHOOLOS_ADAPTER.api('/certificates?studentId=' + encodeURIComponent(linked.mongoId));
      const hasBonafide = (certificateList.data || []).some((record) => record.type === 'Bonafide');
      if (hasBonafide) {
        assert.strictEqual(copies.length, beforeCertificate + 1);
        assert(copies.at(-1).html.includes('Certificate record for school signature')
          && copies.at(-1).html.includes('not a signed or certified school document'));
      } else assert.strictEqual(copies.length, beforeCertificate, 'No issued certificate still produced a document');
    }
    if (role === 'Parent') {
      assert(body.includes('Messages'));
      assert(!body.includes('next due 01 Sep'));
      const linked = window.dashboardLinkedStudent();
      assert(linked, 'Parent has no linked student in the seeded smoke account');
      const copies = [];
      window.downloadDoc = (filename, html) => { copies.push({ filename, html }); };
      window.dashboardDownloadFeeStatement(linked.id);
      assert(copies.some((copy) => copy.html.includes('Fee ledger statement') && copy.html.includes('not a signed or certified school document')),
        'Parent fee statement did not use a clearly unsigned ledger copy');
      const beforeAssessment = copies.length;
      window.dashboardDownloadAssessment(linked.id);
      if (window.dashboardGrades(linked).length) {
        assert.strictEqual(copies.length, beforeAssessment + 1);
        assert(copies.at(-1).html.includes('Published assessment summary'));
      } else {
        assert.strictEqual(copies.length, beforeAssessment, 'Unpublished or missing grades produced a report');
      }
      // Exercise the Student dashboard without creating a demo account in the live database.
      // This is a UI-only role simulation; Student API ownership is covered by server integration tests.
      window.setRole('Student');
      window.go('dashboard');
      const studentBody = window.document.getElementById('view').textContent;
      assert(studentBody.includes('Your school records at a glance.'), 'Student dashboard did not render');
      assert(studentBody.includes('My GPA') && studentBody.includes('Assignments due'), 'Student dashboard KPIs missing');
      assert.strictEqual(window.myAbsenceStudent()?.id, linked.id, 'Student absence action used a different student');
    }
    assert.strictEqual(errors.length, 0, errors.join('; '));
    return { role, connected: true, runtimeErrors: 0 };
  } finally {
    window.close();
  }
}

(async () => {
  const roles = [
    ['Administrator', 'admin@alnoor.ae', 'Rashid Al Maktoum'],
    ['Principal', 'principal@alnoor.ae', 'Dr. Salma Haddad'],
    ['Teacher', 'teacher@alnoor.ae', 'Rohan Mehta'],
    ['Accountant', 'accountant@alnoor.ae', 'Joseph Thomas'],
    ['Parent', 'parent@alnoor.ae', 'Khalid Al Hashimi'],
    ['Student', 'student@alnoor.ae', 'Fatima Al Hashimi'],
  ];
  const results = [];
  const selected = (process.env.SCHOOLOS_DASHBOARD_ROLES || '').split(',').map((role) => role.trim()).filter(Boolean);
  for (const [role, email, name] of roles.filter(([role]) => !selected.length || selected.includes(role))) {
    process.stderr.write('Checking ' + role + ' dashboard\n');
    results.push(await checkRole(role, email, name));
  }
  assert.strictEqual(unhandled.length, 0, 'Dashboard generated unhandled browser promises');
  process.stdout.write(JSON.stringify({ results, unhandled, dashboardWrites: 0 }) + '\n');
})().catch((error) => {
  process.stderr.write((error.stack || error.message) + '\n');
  process.exitCode = 1;
});
