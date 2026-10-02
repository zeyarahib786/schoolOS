/** Extends accessibility coverage to the authenticated pages (Students, Staff) using the same
 * mocked-backend approach as e2e-mocked.js - axe-core has only ever been run against the login
 * page until now, since everything else requires an authenticated session this sandbox can't
 * produce against a real backend. */
const puppeteer = require('/home/claude/node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');
const http = require('http');
const axeSrc = fs.readFileSync('/home/claude/node_modules/axe-core/axe.min.js', 'utf8');
const distDir = path.resolve(__dirname, '../client/dist');
const mimeTypes = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css' };

function startServer(port) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let urlPath = req.url.split('?')[0];
      let filePath = path.join(distDir, urlPath);
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) filePath = path.join(distDir, 'index.html');
      const ext = path.extname(filePath);
      fs.readFile(filePath, (err, data) => {
        if (err) { res.writeHead(404); res.end('Not found'); return; }
        res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
        res.end(data);
      });
    });
    server.listen(port, () => resolve(server));
  });
}

const mockUser = { id: 'u1', name: 'Rashid Al Maktoum', email: 'admin@alnoor.ae', role: 'Administrator' };
const mockStudent = { _id: 's1', refId: 'ANS-1042', name: 'Fatima Al Hashimi', grade: 'Grade 10 · A', gender: 'Female', roll: '12', guardianName: 'Khalid Al Hashimi', phone: '+971501234567', feeStatus: 'Paid', attendancePct: 96, gpa: 3.8, status: 'Active' };
const mockAttendance = { _id: 'a1', student: { _id: 's1', name: 'Fatima Al Hashimi', refId: 'ANS-1042', grade: 'Grade 10 · A' }, date: '2026-06-14', session: 'AM', status: 'Present' };
const mockInvoice = { _id: 'i1', refId: 'INV-1001', student: { _id: 's1', name: 'Fatima Al Hashimi', refId: 'ANS-1042', grade: 'Grade 10 · A' }, term: 'Term 2', amount: 12500, currency: 'AED', dueDate: '2026-07-01', status: 'Pending' };
const mockExamResult = { _id: 'r1', exam: 'e1', student: { _id: 's1', name: 'Fatima Al Hashimi', refId: 'ANS-1042', grade: 'Grade 10 · A' }, scores: [{ subject: 'Mathematics', marks: 90 }], averagePercent: 90, grade: 'A+', passing: true };
const mockCurriculumUnit = { _id: 'c1', subject: 'Mathematics', term: 'Term 2', title: 'Quadratic Equations', outcomes: 'Solve quadratic equations.', sequenceOrder: 1 };
const mockBook = { _id: 'b1', isbn: '978-0-13-468599-1', title: 'Clean Code', author: 'Robert Martin', category: 'Non-fiction', totalCopies: 3, availableCopies: 2 };
const mockPayslip = { _id: 'p1', staff: { _id: 'st1', name: 'Rohan Mehta', refId: 'EMP-209', designation: 'Teacher' }, month: '2026-06', basicSalary: 15000, allowances: 2000, deductions: 500, netPay: 16500, status: 'Paid' };
const mockExpenseClaim = { _id: 'ec1', staff: { _id: 'st1', name: 'Rohan Mehta', refId: 'EMP-209', designation: 'Teacher' }, category: 'Travel', amount: 250.5, description: 'Taxi fare', expenseDate: '2026-06-14', status: 'Pending' };
const mockTicket = { _id: 't1', raisedBy: { _id: 'u1', name: 'Rashid Al Maktoum', email: 'admin@alnoor.ae', role: 'Administrator' }, category: 'IT', subject: 'Projector not working', description: 'The projector in Room 12 will not turn on.', priority: 'Medium', status: 'Open' };
const mockCertificate = { _id: 'cert1', certNumber: 'BF-2026-0001', student: { _id: 's1', name: 'Fatima Al Hashimi', refId: 'ANS-1042', grade: 'Grade 10 · A' }, type: 'Bonafide', purpose: 'Visa application', issuedDate: '2026-06-14' };
const mockBooking = { _id: 'bk1', facility: { _id: 'fac1', name: 'Main Hall', type: 'Auditorium' }, date: '2026-06-14', startTime: '09:00', endTime: '10:00', purpose: 'Staff meeting' };
const mockEvent = { _id: 'ev1', title: 'Annual Sports Day', description: 'Inter-house sports competition.', date: '2026-06-14', audience: 'All', booking: 'bk1' };
const mockAuditEntry = { _id: 'a1', action: 'admin@alnoor.ae logged in', module: 'Auth', performedBy: { _id: 'u1', name: 'Rashid Al Maktoum', email: 'admin@alnoor.ae', role: 'Administrator' }, severity: 'Info', createdAt: '2026-06-14T09:00:00.000Z' };
const mockSurvey = { _id: 'sv1', title: 'End of term feedback', description: 'A short poll.', questions: [{ questionText: 'How was this term?', options: ['Great', 'Okay', 'Poor'] }], status: 'Active' };
const mockRoute = { _id: 'rt1', name: 'Route A', vehicle: { _id: 'v1', regNumber: 'DXB-A12345', capacity: 40, driverName: 'Ahmed Khan' }, stops: ['Al Barsha', 'Downtown'], assignedStudents: [{ _id: 's1', name: 'Fatima Al Hashimi', refId: 'ANS-1042' }] };
const mockInventoryItem = { _id: 'inv1', name: 'Whiteboard markers', sku: 'STA-001', category: 'Stationery', quantityOnHand: 25, reorderLevel: 10, unitCost: 5.5 };
const mockHostelRoom = { _id: 'hr1', roomNumber: '101', block: 'A', capacity: 4, occupants: [{ _id: 's1', name: 'Fatima Al Hashimi', refId: 'ANS-1042' }] };
const mockBehaviourIncident = { _id: 'bi1', student: { _id: 's1', name: 'Fatima Al Hashimi', refId: 'ANS-1042', grade: 'Grade 10 · A' }, category: 'Disruption', description: 'Interrupted class.', severity: 'Minor', createdAt: '2026-06-14T09:00:00.000Z' };
const mockClinicVisit = { _id: 'cv1', student: { _id: 's1', name: 'Fatima Al Hashimi', refId: 'ANS-1042', grade: 'Grade 10 · A' }, reason: 'Headache', treatment: 'Rest and water', outcome: 'Returned to class', createdAt: '2026-06-14T09:00:00.000Z' };
const mockWallet = { _id: 'w1', student: { _id: 's1', name: 'Fatima Al Hashimi', refId: 'ANS-1042' }, balance: 45 };
const mockVisitorLog = { _id: 'vl1', visitorName: 'John Smith', purpose: 'Parent-teacher meeting', hostName: 'Rohan Mehta', checkedInAt: '2026-06-14T09:00:00.000Z', status: 'CheckedIn' };
const mockBiometricDevice = { _id: 'bd1', name: 'Main Gate Scanner', location: 'Main Entrance', status: 'Online', lastSyncAt: '2026-06-14T08:00:00.000Z' };
const mockAlumniProfile = { _id: 'al1', student: { _id: 's1', name: 'Fatima Al Hashimi', refId: 'ANS-1042', grade: 'Grade 12 · A' }, graduationYear: 2024, currentEmployer: 'Emirates', contactEmail: 'fatima@example.com' };
const mockAssignment = { _id: 'as1', title: 'Algebra Homework', subject: 'Mathematics', grade: 'Grade 10 · A', dueDate: '2026-06-20', maxScore: 100 };
const mockSubmission = { _id: 'sub1', assignment: { _id: 'as1', title: 'Algebra Homework', subject: 'Mathematics', dueDate: '2026-06-20', maxScore: 100 }, student: { _id: 's1', name: 'Fatima Al Hashimi', refId: 'ANS-1042' }, isLate: false, score: 85, status: 'Graded' };
const mockTimetableSlot = { _id: 'tt1', grade: 'Grade 10 · A', dayOfWeek: 'Monday', periodNumber: 3, subject: 'Mathematics', teacherName: 'Rohan Mehta' };
const mockAnnouncement = { _id: 'an1', title: 'School reopens Monday', body: 'Welcome back to the new term.', audience: 'All', pinned: true, createdAt: '2026-06-14T09:00:00.000Z' };
const mockAdmission = { _id: 'ad1', applicantName: 'Omar Al Farsi', gradeAppliedFor: 'Grade 7 · A', guardianName: 'Yusuf Al Farsi', status: 'Shortlisted', createdAt: '2026-06-14T09:00:00.000Z' };
const mockLeaveRequest = { _id: 'lv1', staff: { _id: 'st1', name: 'Rohan Mehta', refId: 'EMP-1042', department: 'Mathematics', annualLeaveRemaining: 27 }, fromDate: '2026-07-06', toDate: '2026-07-08', days: 3, reason: 'Family travel', status: 'Pending' };
const mockMeetingSlot = { _id: 'ms1', teacher: { _id: 'st1', name: 'Rohan Mehta', refId: 'EMP-1042', department: 'Mathematics' }, date: '2026-07-10', startTime: '14:30', bookedBy: null, bookedForStudent: null };
const mockSchoolDocument = { _id: 'doc1', code: 'POL-001', title: 'Attendance Policy', category: 'Policy', version: 2, description: 'School-wide attendance rules and expectations.', isCurrent: true };
const mockIdCard = { _id: 'card1', serial: 'CARD-2026-000001', subjectType: 'Student', subject: { _id: 's1', name: 'Fatima Al Hashimi', refId: 'ANS-1042' }, issuedDate: '2026-06-01', expiryDate: '2028-06-30', status: 'Active' };
const mockReportsOverview = { students: { byStatus: [{ _id: 'Active', count: 412 }, { _id: 'Alumni', count: 38 }], averages: { avgGpa: 3.42, avgAttendancePct: 93.7 } }, staff: { byType: [{ _id: 'Teaching', count: 54 }, { _id: 'Non-Teaching', count: 21 }] }, fees: { byStatus: [{ _id: 'Paid', count: 310, totalAmount: 775000 }, { _id: 'Pending', count: 88, totalAmount: 220000 }] }, helpdesk: { byStatus: [{ _id: 'Open', count: 6 }, { _id: 'Closed', count: 41 }] } };
const mockSchoolSettings = { schoolName: 'Al Noor International School', academicYear: '2026-2027', timezone: 'Asia/Dubai', currency: 'AED', defaultAnnualLeave: 30 };
const mockMessage = { _id: 'msg1', sender: { _id: 'u2', name: 'Rohan Mehta', email: 'rohan@alnoor.ae' }, recipient: { _id: 'u1', name: 'Rashid Al Maktoum', email: 'admin@alnoor.ae' }, subject: 'Progress update', body: 'Fatima is doing well this term.', readAt: null, createdAt: '2026-06-14T09:00:00.000Z' };
const mockStaff = { _id: 'st1', refId: 'EMP-209', name: 'Rohan Mehta', designation: 'Mathematics Teacher', department: 'Mathematics', type: 'Teaching', status: 'Active', email: 'rohan@alnoor.ae', phone: '+971502223344', joinedDate: '2020-08-15' };

async function setupMockApi(page) {
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const url = req.url();
    const cors = { 'Access-Control-Allow-Origin': '*' };
    if (req.method() === 'OPTIONS') {
      req.respond({ status: 204, headers: { ...cors, 'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' } });
    } else if (url.includes('/api/v1/auth/me')) {
      req.respond({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ success: true, data: { user: mockUser } }) });
    } else if (url.includes('/api/v1/students')) {
      req.respond({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ success: true, data: [mockStudent], meta: { pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } } }) });
    } else if (url.includes('/api/v1/staff')) {
      req.respond({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ success: true, data: [mockStaff], meta: { pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } } }) });
    } else if (url.includes('/api/v1/attendance')) {
      req.respond({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ success: true, data: [mockAttendance], meta: { pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } } }) });
    } else if (url.includes('/api/v1/fees')) {
      req.respond({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ success: true, data: [mockInvoice], meta: { pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } } }) });
    } else if (url.includes('/api/v1/exams/results')) {
      req.respond({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ success: true, data: [mockExamResult], meta: { pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } } }) });
    } else if (url.includes('/api/v1/curriculum')) {
      req.respond({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ success: true, data: [mockCurriculumUnit], meta: { pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } } }) });
    } else if (url.includes('/api/v1/library/books')) {
      req.respond({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ success: true, data: [mockBook], meta: { pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } } }) });
    } else if (url.includes('/api/v1/payroll')) {
      req.respond({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ success: true, data: [mockPayslip], meta: { pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } } }) });
    } else if (url.includes('/api/v1/expenses')) {
      req.respond({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ success: true, data: [mockExpenseClaim], meta: { pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } } }) });
    } else if (url.includes('/api/v1/helpdesk')) {
      req.respond({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ success: true, data: [mockTicket], meta: { pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } } }) });
    } else if (url.includes('/api/v1/certificates')) {
      req.respond({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ success: true, data: [mockCertificate], meta: { pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } } }) });
    } else if (url.includes('/api/v1/facilities/bookings')) {
      req.respond({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ success: true, data: [mockBooking], meta: { pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } } }) });
    } else if (url.includes('/api/v1/events')) {
      req.respond({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ success: true, data: [mockEvent], meta: { pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } } }) });
    } else if (url.includes('/api/v1/audit-log')) {
      req.respond({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ success: true, data: [mockAuditEntry], meta: { pagination: { total: 1 } } }) });
    } else if (url.includes('/api/v1/surveys')) {
      req.respond({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ success: true, data: [mockSurvey], meta: { pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } } }) });
    } else if (url.includes('/api/v1/transport/routes')) {
      req.respond({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ success: true, data: [mockRoute], meta: { pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } } }) });
    } else if (url.includes('/api/v1/inventory/items')) {
      req.respond({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ success: true, data: [mockInventoryItem], meta: { pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } } }) });
    } else if (url.includes('/api/v1/hostel/rooms')) {
      req.respond({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ success: true, data: [mockHostelRoom], meta: { pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } } }) });
    } else if (url.includes('/api/v1/behaviour')) {
      req.respond({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ success: true, data: [mockBehaviourIncident], meta: { pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } } }) });
    } else if (url.includes('/api/v1/health-records')) {
      req.respond({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ success: true, data: [mockClinicVisit], meta: { pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } } }) });
    } else if (url.includes('/api/v1/cafeteria/wallets')) {
      req.respond({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ success: true, data: [mockWallet], meta: { pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } } }) });
    } else if (url.includes('/api/v1/visitors')) {
      req.respond({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ success: true, data: [mockVisitorLog], meta: { pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } } }) });
    } else if (url.includes('/api/v1/biometric')) {
      req.respond({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ success: true, data: [mockBiometricDevice] }) });
    } else if (url.includes('/api/v1/alumni')) {
      req.respond({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ success: true, data: [mockAlumniProfile], meta: { pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } } }) });
    } else if (url.includes('/api/v1/lms/assignments')) {
      req.respond({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ success: true, data: [mockAssignment], meta: { pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } } }) });
    } else if (url.includes('/api/v1/lms/submissions')) {
      req.respond({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ success: true, data: [mockSubmission] }) });
    } else if (url.includes('/api/v1/timetable')) {
      req.respond({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ success: true, data: [mockTimetableSlot] }) });
    } else if (url.includes('/api/v1/announcements')) {
      req.respond({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ success: true, data: [mockAnnouncement], meta: { pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } } }) });
    } else if (url.includes('/api/v1/admissions')) {
      req.respond({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ success: true, data: [mockAdmission], meta: { pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } } }) });
    } else if (url.includes('/api/v1/leave')) {
      req.respond({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ success: true, data: [mockLeaveRequest], meta: { pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } } }) });
    } else if (url.includes('/api/v1/meetings')) {
      req.respond({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ success: true, data: [mockMeetingSlot], meta: { pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } } }) });
    } else if (url.includes('/api/v1/documents')) {
      req.respond({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ success: true, data: [mockSchoolDocument], meta: { pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } } }) });
    } else if (url.includes('/api/v1/id-cards')) {
      req.respond({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ success: true, data: [mockIdCard], meta: { pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } } }) });
    } else if (url.includes('/api/v1/reports/overview')) {
      req.respond({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ success: true, data: mockReportsOverview }) });
    } else if (url.includes('/api/v1/settings')) {
      req.respond({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ success: true, data: mockSchoolSettings }) });
    } else if (url.includes('/api/v1/messages')) {
      req.respond({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ success: true, data: [mockMessage], meta: { pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } } }) });
    } else {
      req.continue();
    }
  });
}

async function run() {
  const port = 5410;
  const server = await startServer(port);
  const browser = await puppeteer.launch({ executablePath: '/opt/google/chrome/chrome', headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'] });
  const results = {};

  for (const route of ['/students', '/staff', '/attendance', '/fees', '/exams', '/curriculum', '/library', '/payroll', '/expenses', '/helpdesk', '/certificates', '/facilities', '/events', '/audit-log', '/surveys', '/transport', '/inventory', '/hostel', '/behaviour', '/health', '/cafeteria', '/visitors', '/biometric', '/alumni', '/lms', '/timetable', '/announcements', '/admissions', '/leave', '/meetings', '/documents', '/id-cards', '/reports', '/settings', '/messages']) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.evaluateOnNewDocument((user) => {
      localStorage.setItem('schoolos.session.v1', JSON.stringify({ user, accessToken: 'mock-token', refreshToken: 'mock-refresh' }));
    }, mockUser);
    await setupMockApi(page);
    await page.goto(`http://localhost:${port}${route}`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 700));
    await page.evaluate(axeSrc);
    const violations = await page.evaluate(async () => {
      const r = await axe.run(document, { resultTypes: ['violations'] });
      return r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length }));
    });
    results[route] = violations;
    await page.close();
  }

  console.log(JSON.stringify(results, null, 2));
  const anyViolations = Object.values(results).some((v) => v.length > 0);
  await browser.close();
  server.close();
  if (anyViolations) process.exit(1);
}

run().catch((e) => { console.error('FATAL', e); process.exit(1); });
