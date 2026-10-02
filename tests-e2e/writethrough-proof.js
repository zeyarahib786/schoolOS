const puppeteer = require('puppeteer-core');
const http = require('http'); const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '../client/dist');
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' };
const server = http.createServer((req, res) => {
  let p = path.join(ROOT, req.url.split('?')[0] === '/' ? 'index.html' : req.url.split('?')[0]);
  fs.readFile(p, (err, data) => { if (err) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); res.end(data); });
});
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': '*' };
const seededStaff = { _id: '64b7f1a2c3d4e5f60718293b', refId: 'EMP-209', name: 'Rohan Mehta', designation: 'Mathematics Teacher', department: 'Mathematics', type: 'Teaching', status: 'Active', phone: '+971502223344' };
const seededInvoice = { _id: '64b7f1a2c3d4e5f60718293c', refId: 'INV-7101', student: { _id: '64b7f1a2c3d4e5f60718293a', name: 'Fatima Al Hashimi' }, term: 'Term 1', amount: 2500, status: 'Pending', dueDate: '2026-09-01' };
const seededStudent = { _id: '64b7f1a2c3d4e5f60718293a', refId: 'ANS-1042', name: 'Fatima Al Hashimi', grade: 'Grade 10 · A', gender: 'Female', roll: '12', guardianName: 'Khalid Al Hashimi', phone: '+971501234567', feeStatus: 'Paid', attendancePct: 96, gpa: 3.8, status: 'Active' };
(async () => {
  await new Promise((r) => server.listen(8091, r));
  const browser = await puppeteer.launch({ executablePath: '/opt/google/chrome/chrome', headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  const posts = []; const errors = []; const logs = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.text().includes('[SchoolOS]')) logs.push(m.text()); });
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const url = req.url();
    if (!url.startsWith('http://localhost:4000')) return req.continue();
    if (req.method() === 'OPTIONS') return req.respond({ status: 204, headers: cors });
    const ok = (data, meta) => req.respond({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ success: true, data, ...(meta ? { meta } : {}) }) });
    if (url.endsWith('/health')) return req.respond({ status: 200, headers: cors, body: '{"status":"ok"}' });
    if (url.includes('/auth/login')) return ok({ accessToken: 'mock-token', refreshToken: 'r', user: { role: 'Administrator' } });
    if (req.method() === 'POST') { posts.push({ path: url.replace('http://localhost:4000/api/v1', ''), body: JSON.parse(req.postData() || '{}') }); return req.respond({ status: 201, contentType: 'application/json', headers: cors, body: JSON.stringify({ success: true, data: { _id: 'new' } }) }); }
    if (url.includes('/students')) return ok([seededStudent], { pagination: { page: 1, limit: 100, total: 1, totalPages: 1 } });
    if (url.includes('/staff')) return ok([seededStaff], { pagination: { page: 1, limit: 100, total: 1, totalPages: 1 } });
    if (url.includes('/fees')) return ok([seededInvoice], { pagination: { page: 1, limit: 100, total: 1, totalPages: 1 } });
    return ok([], { pagination: { page: 1, limit: 100, total: 0, totalPages: 0 } });
  });
  await page.goto('http://localhost:8091/', { waitUntil: 'networkidle2' });
  await page.waitForFunction(() => window.SCHOOLOS_ADAPTER && window.SCHOOLOS_ADAPTER.connected === true, { timeout: 15000 });
  await page.evaluate(() => enterApp('Administrator'));
  await new Promise((r) => setTimeout(r, 500));
  // Drive the exact handlers the forms call, with form-shaped values (the drawer passes inputs by name)
  await page.evaluate(() => {
    go('students'); addStudent({ first_name: 'Noor', last_name: 'Al Ameri', grade: 'Grade 9', gender: 'Female', guardian: 'Saeed Al Ameri', phone: '+971 50 111 2222' });
    go('staff'); createStaff({ first_name: 'Hala', last_name: 'Nasser', role: 'Science Teacher', dept: 'Science', type: 'Teaching', phone: '+971 50 333 4444' });
    go('helpdesk'); createTicket({ title: 'Projector flickering in Rm 204', category: 'IT', priority: 'High', desc: 'Flickers every few minutes.' });
    go('visitors'); checkInVisitor({ visitor_name: 'Mariam Yousef', purpose: 'Parent meeting', host_person_visiting: 'Dr. Salma Haddad' });
    go('behaviour'); logBehaviour({ student_name: 'Fatima Al Hashimi', category: 'Merit', severity: 'Minor', description: 'Helped a classmate.', action: 'Merit awarded' });
    go('health'); logClinic({ student_name: 'Fatima Al Hashimi', reason: 'Headache', medicine: 'Rest and water', outcome: 'Returned to class' });
    go('admissions'); createEnquiry({ first_name: 'Layla', last_name: 'Hassan', grade: 'Grade 6', gender: 'Female', guardian: 'Omar Hassan', phone: '+971 50 555 6666', source: 'Website' });
    go('inventory'); addInventory({ item_name: 'Whiteboard markers', sku: 'WBM-100', category: 'Stationery', quantity_in_stock: '120', reorder_minimum: '30', unit_cost: '2.5', supplier: 'OfficeMax', location: 'Store A' });
    go('calendar'); addEvent({ event_title: 'Science Fair', type: 'Academic', date: '2026-10-15', venue: 'Main Hall', audience: 'Parents' });
    go('curriculum'); saveUnit({ subject: 'Mathematics', term: 'Term 1', title: 'Quadratic equations', outcomes: 'Solve by factoring and formula', date: '2026-09-10' });
    go('transport'); addVehicle({ plate_number: 'DXB 12345', capacity: '45', driver: 'Ali Rahman', type: 'Bus' });
    go('fees'); recordPayment({ student_pick: 'Fatima Al Hashimi', amount_aed: '2500', method: 'Bank transfer' });
    go('staff'); addStaffLeave({ emp: 'Rohan Mehta', type: 'Annual', from: '2026-09-20', to: '2026-09-24' });
    go('dashboard'); submitMyLeave({ type: 'Sick', from: '2026-09-02', to: '2026-09-03' });
    go('library'); addTitle({ title: 'Introduction to Algorithms', author: 'Cormen', category: 'Computer Science', copies: '3' });
    go('comm'); postAnnouncement({ title: 'Parent-teacher evening', message: 'Thursday 6pm in the main hall.', audience: 'Parents', category: 'Events', priority: 'High' });
    go('parents'); sendToParents({ subject: 'Uniform reminder', message: 'Winter uniform starts Monday.', audience: 'All parents', channel: 'App' });
    go('surveys'); createSurvey({ title: 'Cafeteria satisfaction', type: 'Feedback', audtype: 'Students', questions: 'Is the food fresh?\nAre queues short?' });
    go('cafeteria'); topUpWallet({ name: 'Fatima Al Hashimi', amount: '100', method: 'Card' });
    go('biometric'); addDevice({ location: 'East gate', mode: 'Fingerprint' });
    go('certificates'); issueCert({ student_name: 'Fatima Al Hashimi', document_type: 'Bonafide Letter', class: 'Grade 10 · A', notes: 'For visa application' });
    go('parents'); saveMeetingSlot({ teacher: 'Rohan Mehta', date: '2026-09-12', time: '10:30', room: 'Room 12' });
  });
  await new Promise((r) => setTimeout(r, 1500));
  console.log(JSON.stringify({ posts, pageErrors: errors, adapterLogs: logs.filter((l) => /saved|rejected|kept/.test(l)) }, null, 1));
  fs.writeFileSync(path.resolve(__dirname, 'captured-posts.json'), JSON.stringify(posts));
  await browser.close(); server.close();
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
