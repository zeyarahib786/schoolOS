/* ---- AI Insights: transparent rules over loaded school records, not an ML forecast. ---- */
function aiReady() {
  var api = window.SCHOOLOS_ADAPTER;
  return Boolean(api && api.connected && api.live && api.live.students);
}
function aiScore(s) {
  var score = 0, why = [];
  if (s.attendanceRecords > 0 && s.att < 85) { score += 40; why.push('Attendance ' + s.att + '%'); }
  else if (s.attendanceRecords > 0 && s.att < 92) { score += 18; why.push('Attendance ' + s.att + '%'); }
  if (s.assessmentResults > 0 && s.gpa < 3) { score += 35; why.push('Assessment average ' + s.gpa + '/4'); }
  else if (s.assessmentResults > 0 && s.gpa < 3.4) { score += 15; why.push('Assessment average ' + s.gpa + '/4'); }
  if (s.invoiceRecords > 0 && s.fee === 'Overdue') { score += 25; why.push('Overdue invoice'); }
  else if (s.invoiceRecords > 0 && s.fee === 'Due') { score += 8; why.push('Open invoice'); }
  return { s: s, score: Math.min(score, 99), why: why };
}
function aiRisk() {
  if (!aiReady()) return [];
  return STUDENTS.filter(function (s) { return s.status === 'Active'; }).map(aiScore)
    .filter(function (r) { return r.score >= 30; }).sort(function (a, b) { return b.score - a.score; });
}
function aiRiskDetail(index) {
  var r = aiRisk()[index];
  if (!r) return '';
  var s = r.s, band = r.score >= 70 ? 'red' : r.score >= 50 ? 'amber' : 'blue';
  var attendance = s.attendanceRecords > 0 ? s.att + '%' : 'No records';
  var academic = s.assessmentResults > 0 ? s.gpa + '/4' : 'No results';
  return detailDrawer({
    title: escHtml(s.name), sub: escHtml(s.id + ' · ' + s.grade + ' · priority ' + r.score),
    color: band === 'red' ? '#E11D2A' : band === 'amber' ? '#E2920C' : '#2563EB',
    stats: [['Priority score', r.score + '/99', band], ['Attendance', attendance, s.attendanceRecords > 0 && s.att < 85 ? 'red' : 'gray'],
      ['Assessments', academic, s.assessmentResults > 0 && s.gpa < 3 ? 'red' : 'gray'], ['Fees', s.invoiceRecords > 0 ? s.fee : 'No invoices', 'gray']],
    sections: [{ h: 'Recorded signals', html: '<div class="card pad" style="box-shadow:none">' +
      r.why.map(function (w) { return '<div class="lrow" style="border:0;padding:6px 0"><span style="font-size:13px">' + escHtml(w) + '</span></div>'; }).join('') + '</div>' },
      { h: 'Review', rows: [['Interpretation', 'Rule-based priority only'], ['Next step', 'Open the student record and verify the underlying data']] }],
    footer: [['Open student', 'aiOpenStudent(' + index + ')'],
      ['Close', 'closeDrawer()', true]]
  });
}
function aiOpenStudent(index) {
  var item = aiRisk()[index];
  if (!item) return;
  closeDrawer();
  go('students');
  setTimeout(function () { openDrawer(studentProfile(item.s.id)); }, 120);
}
function aiCards(risk, overdue, low) {
  var cards = [];
  if (risk.length) cards.push({ sev: 'Review', c: 'red', ic: 'students',
    t: risk.length + ' students have multiple recorded signals',
    d: 'Rule-based priority from recorded attendance, assessments and invoice status. Verify each student before taking action.',
    a: 'Review list', target: 'ranked' });
  if (overdue.length) cards.push({ sev: 'Review', c: 'red', ic: 'fees',
    t: overdue.length + ' overdue invoices',
    d: 'Outstanding balance: ' + aed(overdue.reduce(function (sum, i) { return sum + (Number(i.balance) || 0); }, 0)) + '. Check the fee ledger for details.',
    a: 'Open fees', target: 'fees' });
  var attendance = STUDENTS.filter(function (s) { return s.status === 'Active' && s.attendanceRecords > 0 && s.att < 85; });
  if (attendance.length) cards.push({ sev: 'Review', c: 'amber', ic: 'att',
    t: attendance.length + ' students below 85% recorded attendance',
    d: 'Based on attendance records currently loaded for active students; no trend or cause is inferred.',
    a: 'Open attendance', target: 'attendance' });
  if (low.length) cards.push({ sev: 'Review', c: 'amber', ic: 'inv',
    t: low.length + ' stock items below reorder level',
    d: 'Compare current stock with each item\'s saved minimum before ordering.',
    a: 'Open inventory', target: 'inventory' });
  return cards;
}
function aiCardAction(target) {
  if (target === 'ranked') { document.getElementById('aiRanked').scrollIntoView({ behavior: 'smooth' }); return; }
  go(target);
}
function refreshAiInsights() {
  var api = window.SCHOOLOS_ADAPTER;
  if (!api || !api.connected) { toast('Sign in to refresh school data'); return Promise.resolve(); }
  return api.hydrate().then(function () {
    state.aiRefreshed = new Date().toLocaleTimeString();
    render();
    toast('Insights recalculated from loaded records');
  }).catch(function (e) { toast('Insights refresh failed — ' + e.message); });
}
M.aiinsights = function () {
  var loaded = aiReady(), risk = loaded ? aiRisk() : [];
  var api = window.SCHOOLOS_ADAPTER;
  var feesLoaded = loaded && api.live.fees;
  var inventoryLoaded = loaded && api.live.INVENTORY;
  var overdue = feesLoaded ? INVOICES.filter(function (i) { return i.status === 'Overdue'; }) : [];
  var low = inventoryLoaded ? INVENTORY.filter(function (i) { return Number(i.stock) < Number(i.min); }) : [];
  var cards = loaded ? aiCards(risk, overdue, low) : [];
  var balance = overdue.reduce(function (sum, i) { return sum + (Number(i.balance) || 0); }, 0);
  return '<div class="page-head"><div class="ph-l"><h2>AI Insights</h2>' +
    '<p style="margin-bottom:2px">Recorded school data, prioritized for human review.</p>' +
    '<p class="muted" style="font-size:11.5px">Transparent rule-based scoring; not a predictive ML model or an automated decision. Missing attendance or assessment records are not scored.</p></div>' +
    '<div class="ph-r"><button class="btn" onclick="refreshAiInsights()">' + ic('ai', 16) + ' Refresh</button></div></div>' +
    '<div class="card pad" style="margin-bottom:16px;background:linear-gradient(135deg,var(--brand-soft),#fff);border-color:var(--brand-line)">' +
    '<div class="flex ac" style="gap:12px"><span class="kp-ic" style="width:42px;height:42px;background:var(--brand);color:#fff">' + ic('ai', 20) + '</span>' +
    '<div style="flex:1"><div style="font-weight:600;color:var(--slate-900)">Ask the assistant</div>' +
    '<div class="muted" style="font-size:12.5px">Navigation and product help only; it does not answer questions about individual records or forecast outcomes.</div></div>' +
    '<button class="btn primary" onclick="openBot()">' + ic('ai', 15) + ' Ask for help</button></div></div>' +
    '<div class="grid cols-4" style="margin-bottom:18px">' +
    kpi('students', '#E11D2A', 'Students to review', loaded ? String(risk.length) : '—', null) +
    kpi('fees', '#E2920C', 'Overdue balance', feesLoaded ? aed(balance) : '—', null) +
    kpi('inv', '#2563EB', 'Low stock', inventoryLoaded ? String(low.length) : '—', null) +
    kpi('ai', '#0E7C39', 'Engine', 'Rule-based', { dir: 'flat', v: state.aiRefreshed ? 'refreshed ' + state.aiRefreshed : 'recorded data', note: 'not ML' }) + '</div>' +
    '<div class="sec-head" style="margin:0 0 12px"><h3 style="font-size:15px">Priority insights</h3><span class="muted" style="font-size:12px">' +
    (loaded ? 'Calculated ' + nowTime() : 'Student data unavailable') + '</span></div>' +
    '<div class="grid cols-2" style="margin-bottom:18px">' +
    cards.map(function (c) { return '<div class="card pad" style="border-left:3px solid ' + CVAR[c.c] + '">' +
      '<div class="flex ac" style="gap:10px;margin-bottom:8px"><span class="kp-ic" style="width:34px;height:34px;background:' + CVAR[c.c] + '1a;color:' + CVAR[c.c] + '">' + ic(c.ic, 16) + '</span>' +
      '<div style="flex:1;font-weight:600;color:var(--slate-900);font-size:14px">' + escHtml(c.t) + '</div>' + chip(c.sev, c.c) + '</div>' +
      '<div class="muted" style="font-size:12.5px;line-height:1.5;margin-bottom:12px">' + escHtml(c.d) + '</div>' +
      '<button class="btn sm" onclick="aiCardAction(' + JSON.stringify(c.target).replace(/"/g, '&quot;') + ')">' + c.a + ' ' + ic('arrow', 13) + '</button></div>'; }).join('') +
    (!cards.length ? '<div class="card pad muted">' + (loaded ? 'No current records cross these review thresholds.' : 'Unable to load student records. Refresh or check the API.') + '</div>' : '') +
    '</div><div class="card pad" id="aiRanked"><div class="sec-head" style="margin-bottom:6px"><h3 style="font-size:15px">Students to review · ranked</h3>' +
    '<span class="muted" style="font-size:12px">Click a student to inspect recorded signals</span></div>' +
    '<div class="tbl-wrap"><table class="tbl"><thead><tr><th>Student</th><th>Grade</th><th class="right">Attendance</th><th class="right">GPA</th><th>Signals</th><th style="width:150px">Priority</th></tr></thead><tbody>' +
    risk.map(function (r, index) { var band = r.score >= 70 ? 'red' : r.score >= 50 ? 'amber' : 'blue';
      return '<tr style="cursor:pointer" onclick="openDrawer(aiRiskDetail(' + index + '))"><td>' + cellUser(escHtml(r.s.name), escHtml(r.s.id)) +
        '</td><td>' + escHtml(r.s.grade) + '</td><td class="right num">' + (r.s.attendanceRecords > 0 ? r.s.att + '%' : '—') +
        '</td><td class="right num">' + (r.s.assessmentResults > 0 ? r.s.gpa : '—') +
        '</td><td><span class="muted" style="font-size:12px">' + escHtml(r.why.slice(0, 2).join(' · ')) + '</span></td>' +
        '<td><div class="flex ac" style="gap:10px">' + cbar(r.score, band) +
        '<span class="num" style="font-size:12px;font-weight:700;color:' + CVAR[band] + ';min-width:24px">' + r.score + '</span></div></td></tr>';
    }).join('') +
    (!risk.length ? '<tr><td colspan="6"><div class="empty"><div class="ei">' + ic('ai', 26) + '</div><h3>No students to review</h3><p>' +
      (loaded ? 'No recorded signals cross the current priority threshold.' : 'Student data could not be loaded.') + '</p></div></td></tr>' : '') +
    '</tbody></table></div></div>';
};
