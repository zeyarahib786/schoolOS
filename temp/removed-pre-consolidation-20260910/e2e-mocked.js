/**
 * "Mocked-backend" E2E test: exercises the real, built React app in a real browser (Puppeteer),
 * intercepting network calls to the API instead of requiring a live MongoDB - which remains
 * blocked in this sandbox (see VERIFICATION_REPORT.md). This is NOT a substitute for the real
 * integration/E2E suite against a live backend; it is a genuine test of frontend behavior that
 * WOULD otherwise go completely unverified: routing, session revalidation, form validation,
 * error rendering, and API-response handling, using the actual compiled production bundle.
 */
const puppeteer = require('/home/claude/node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');
const http = require('http');

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
const mockStudent = {
  _id: 's1', refId: 'ANS-1042', name: 'Fatima Al Hashimi', grade: 'Grade 10 · A', gender: 'Female',
  roll: '12', guardianName: 'Khalid Al Hashimi', phone: '+971501234567', feeStatus: 'Paid',
  attendancePct: 96, gpa: 3.8, status: 'Active',
};

async function setupMockApi(page, { meStatus = 200, meBody = null } = {}) {
  await page.setRequestInterception(true);
  page.on('request', (req) => {
    const url = req.url();
    if (req.method() === 'OPTIONS' && url.includes('/api/v1/')) {
      req.respond({ status: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE', 'Access-Control-Allow-Headers': 'Content-Type,Authorization' } });
    } else if (url.includes('/api/v1/auth/login') && req.method() === 'POST') {
      const body = JSON.parse(req.postData());
      if (body.password === 'WrongPassword1') {
        req.respond({ status: 401, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid email or password' } }) });
      } else {
        req.respond({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ success: true, data: { user: mockUser, accessToken: 'mock-access', refreshToken: 'mock-refresh' } }) });
      }
    } else if (url.includes('/api/v1/auth/me') && req.method() === 'GET') {
      req.respond({
        status: meStatus,
        contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify(meStatus === 200 ? { success: true, data: { user: meBody ?? mockUser } } : { success: false, error: { code: 'UNAUTHORIZED', message: 'Session is no longer valid' } }),
      });
    } else if (url.includes('/api/v1/students') && req.method() === 'GET') {
      req.respond({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ success: true, data: [mockStudent], meta: { pagination: { page: 1, limit: 20, total: 1, totalPages: 1 } } }) });
    } else if (url.includes('/api/v1/students') && req.method() === 'POST') {
      req.respond({ status: 201, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ success: true, data: { ...mockStudent, _id: 's2', refId: 'ANS-9999' } }) });
    } else {
      req.continue();
    }
  });
}

async function run() {
  const port = 5400;
  const server = await startServer(port);
  const browser = await puppeteer.launch({ executablePath: '/opt/google/chrome/chrome', headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'] });
  const results = {};

  // 1. Unauthenticated user hitting a protected route redirects to /login
  {
    const page = await browser.newPage();
    await page.goto(`http://localhost:${port}/students`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 400));
    results['unauth_redirects_to_login'] = page.url().includes('/login');
    await page.close();
  }

  // 2. Login form: wrong password shows the server's error message, no crash
  {
    const page = await browser.newPage();
    await setupMockApi(page);
    await page.goto(`http://localhost:${port}/login`, { waitUntil: 'networkidle0' });
    await page.type('#email', 'admin@alnoor.ae');
    await page.type('#password', 'WrongPassword1');
    await page.click('button[type="submit"]');
    await new Promise((r) => setTimeout(r, 500));
    const errorText = await page.$eval('[role="alert"]', (el) => el.textContent).catch(() => null);
    results['login_wrong_password_shows_error'] = errorText === 'Invalid email or password';
    results['login_wrong_password_stays_on_login'] = page.url().includes('/login');
    await page.close();
  }

  // 3. Login with correct credentials -> lands on /students, KPI/table render mocked data
  {
    const page = await browser.newPage();
    await setupMockApi(page);
    await page.goto(`http://localhost:${port}/login`, { waitUntil: 'networkidle0' });
    await page.type('#email', 'admin@alnoor.ae');
    await page.type('#password', 'CorrectPassword1');
    await page.click('button[type="submit"]');
    await page.waitForFunction(() => window.location.pathname === '/students', { timeout: 5000 }).catch(() => {});
    await new Promise((r) => setTimeout(r, 500));
    results['login_success_navigates_to_students'] = page.url().includes('/students');
    const bodyText = await page.evaluate(() => document.body.innerText);
    results['students_page_shows_mocked_student'] = bodyText.includes('Fatima Al Hashimi');
    results['students_page_shows_add_button_for_admin'] = bodyText.includes('Add student');
    await page.close();
  }

  // 4. A DEACTIVATED account's cached session gets revalidated and rejected (the fix from this round)
  {
    const page = await browser.newPage();
    await page.evaluateOnNewDocument((user) => {
      localStorage.setItem('schoolos.session.v1', JSON.stringify({ user, accessToken: 'stale-token', refreshToken: 'stale-refresh' }));
    }, mockUser);
    await setupMockApi(page, { meStatus: 401 });
    await page.goto(`http://localhost:${port}/students`, { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => window.location.pathname === '/login', { timeout: 5000 }).catch(() => {});
    results['deactivated_account_redirected_to_login'] = page.url().includes('/login');
    await page.close();
  }

  // 5. A VALID cached session revalidates successfully and stays on /students
  {
    const page = await browser.newPage();
    await page.evaluateOnNewDocument((user) => {
      localStorage.setItem('schoolos.session.v1', JSON.stringify({ user, accessToken: 'stale-token', refreshToken: 'stale-refresh' }));
    }, mockUser);
    await setupMockApi(page, { meStatus: 200 });
    await page.goto(`http://localhost:${port}/students`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 600));
    results['valid_cached_session_stays_on_students'] = page.url().includes('/students');
    await page.close();
  }

  // 6. Add Student modal: client-side validation blocks an invalid submission (no network call)
  {
    const page = await browser.newPage();
    await page.evaluateOnNewDocument((user) => {
      localStorage.setItem('schoolos.session.v1', JSON.stringify({ user, accessToken: 'stale-token', refreshToken: 'stale-refresh' }));
    }, mockUser);
    await setupMockApi(page, { meStatus: 200 });
    await page.goto(`http://localhost:${port}/students`, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 500));
    await page.click('button ::-p-text(Add student)').catch(async () => {
      const buttons = await page.$$('button');
      for (const b of buttons) {
        const text = await page.evaluate((el) => el.textContent, b);
        if (text && text.includes('Add student')) { await b.click(); break; }
      }
    });
    await new Promise((r) => setTimeout(r, 300));
    await page.click('button[type="submit"]');
    await new Promise((r) => setTimeout(r, 300));
    const bodyText = await page.evaluate(() => document.body.innerText);
    results['modal_blocks_empty_submit_with_inline_errors'] = bodyText.includes('is required');
    await page.close();
  }

  console.log(JSON.stringify(results, null, 2));
  const failed = Object.entries(results).filter(([, v]) => v !== true);
  await browser.close();
  server.close();
  if (failed.length) {
    console.error('FAILED CHECKS:', failed.map(([k]) => k));
    process.exit(1);
  }
}

run().catch((e) => { console.error('FATAL', e); process.exit(1); });
