const puppeteer = require('/home/claude/node_modules/puppeteer-core');
const fs = require('fs');
const axeSrc = fs.readFileSync('/home/claude/node_modules/axe-core/axe.min.js', 'utf8');

(async () => {
  const browser = await puppeteer.launch({ executablePath: '/opt/google/chrome/chrome', headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto('http://localhost:5308/src/dev-harness/datatable-harness.html', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 500));

  // 1. Real axe-core scan
  await page.evaluate(axeSrc);
  const violations = await page.evaluate(async () => {
    const r = await axe.run(document, { resultTypes: ['violations'] });
    return r.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length }));
  });

  // 2. Real keyboard operability check: Tab to the row, press Enter, confirm the click handler fired
  await page.keyboard.press('Tab'); // focus first row (no earlier focusable elements on this page)
  const focusedTag = await page.evaluate(() => document.activeElement.tagName);
  const focusedRole = await page.evaluate(() => document.activeElement.getAttribute('role'));
  await page.keyboard.press('Enter');
  await new Promise((r) => setTimeout(r, 200));
  const titleAfterEnter = await page.title();

  console.log(JSON.stringify({ axeViolations: violations, focusedTag, focusedRole, titleAfterEnter, keyboardActivationWorked: titleAfterEnter === 'clicked:1' }, null, 2));
  await browser.close();
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
