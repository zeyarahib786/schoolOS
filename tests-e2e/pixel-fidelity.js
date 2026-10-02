const puppeteer = require('puppeteer-core');
const http = require('http'); const fs = require('fs'); const path = require('path');
const { PNG } = require('pngjs'); const pixelmatch = require('pixelmatch');

function serve(root, port) {
  const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png' };
  const s = http.createServer((req, res) => {
    let p = path.join(root, req.url.split('?')[0] === '/' ? 'index.html' : req.url.split('?')[0]);
    fs.readFile(p, (err, data) => {
      if (err) { fs.readFile(path.join(root, 'index.html'), (e2, d2) => { res.writeHead(200, {'Content-Type':'text/html'}); res.end(d2); }); return; }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); res.end(data);
    });
  });
  return new Promise((r) => s.listen(port, () => r(s)));
}

async function journey(page, base, tag) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(tag + ': ' + e.message));
  await page.goto(base, { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForFunction(() => typeof window.enterApp === 'function', { timeout: 15000 });
  await new Promise((r) => setTimeout(r, 700));
  const shots = {};
  shots.landing = await page.screenshot();
  await page.evaluate(() => enterApp('Administrator'));
  await new Promise((r) => setTimeout(r, 900));
  shots.dashboard = await page.screenshot();
  await page.evaluate(() => go('students'));
  await new Promise((r) => setTimeout(r, 2000)); // let the staggered row-entrance animation fully settle
  shots.students = await page.screenshot();
  return { shots, errors };
}

function diff(name, bufA, bufB) {
  const a = PNG.sync.read(bufA), b = PNG.sync.read(bufB);
  if (a.width !== b.width || a.height !== b.height) return { name, error: 'size mismatch' };
  const out = new PNG({ width: a.width, height: a.height });
  const differing = pixelmatch(a.data, b.data, out.data, a.width, a.height, { threshold: 0.1 });
  const total = a.width * a.height;
  fs.writeFileSync(`/mnt/user-data/outputs/screenshots/diff-${name}.png`, PNG.sync.write(out));
  return { name, differing, total, pct: +(100 * differing / total).toFixed(4) };
}

(async () => {
  const s1 = await serve(path.resolve(__dirname, './fixtures/prototype'), 8090);
  const s2 = await serve(path.resolve(__dirname, '../client/dist'), 8091);
  const browser = await puppeteer.launch({ executablePath: '/opt/google/chrome/chrome', headless: 'new', args: ['--no-sandbox'] });

  const p1 = await browser.newPage(); await p1.setViewport({ width: 1440, height: 900 });
  const proto = await journey(p1, 'http://localhost:8090/', 'prototype');
  const p2 = await browser.newPage(); await p2.setViewport({ width: 1440, height: 900 });
  const react = await journey(p2, 'http://localhost:8091/', 'react-client');

  fs.writeFileSync('/mnt/user-data/outputs/screenshots/10-react-asis-landing.png', react.shots.landing);
  fs.writeFileSync('/mnt/user-data/outputs/screenshots/11-react-asis-dashboard.png', react.shots.dashboard);
  fs.writeFileSync('/mnt/user-data/outputs/screenshots/12-react-asis-students.png', react.shots.students);

  const results = ['landing', 'dashboard', 'students'].map((k) => diff(k, proto.shots[k], react.shots[k]));
  console.log(JSON.stringify({ pageErrors: [...proto.errors, ...react.errors], pixelDiff: results }, null, 1));
  await browser.close(); s1.close(); s2.close();
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
