const puppeteer = require('puppeteer-core');
const http = require('http'); const fs = require('fs'); const path = require('path');

const ROOT = process.argv[2] || path.resolve(__dirname, './fixtures/prototype');
const MIME = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  let p = path.join(ROOT, req.url.split('?')[0] === '/' ? 'index.html' : req.url.split('?')[0]);
  fs.readFile(p, (err, data) => {
    if (err) { fs.readFile(path.join(ROOT, 'index.html'), (e2, d2) => { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end(d2); }); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' }); res.end(data);
  });
});

(async () => {
  await new Promise((r) => server.listen(8093, r));
  const browser = await puppeteer.launch({ executablePath: '/opt/google/chrome/chrome', headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 900 });
  let pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));

  await page.goto('http://localhost:8093/', { waitUntil: 'networkidle2', timeout: 30000 });
  await page.waitForFunction(() => typeof window.enterApp === 'function', { timeout: 15000 });
  await page.evaluate(() => enterApp('Administrator'));
  await new Promise((r) => setTimeout(r, 700));

  const modules = await page.evaluate(() => Object.keys(M));
  const report = { modules: modules.length, missingHandlers: {}, clickErrors: {}, deadButtons: {}, formResults: {}, workflowResults: {} };

  for (const mod of modules) {
    pageErrors = [];
    await page.evaluate((m) => { try { go(m); } catch (e) { window.__goErr = e.message; } }, mod);
    await new Promise((r) => setTimeout(r, 120));
    const goErr = await page.evaluate(() => { const e = window.__goErr; window.__goErr = null; return e; });
    if (goErr) { report.clickErrors[mod] = ['NAVIGATION: ' + goErr]; continue; }

    // Phase 1: every onclick in the current view must reference an existing global function
    const missing = await page.evaluate(() => {
      const out = new Set();
      document.querySelectorAll('#view [onclick]').forEach((el) => {
        const m = el.getAttribute('onclick').match(/^\s*([A-Za-z_$][\w$]*)\s*\(/);
        if (m && typeof window[m[1]] !== 'function') out.add(m[1]);
      });
      return [...out];
    });
    if (missing.length) report.missingHandlers[mod] = missing;

    // Dead buttons: real <button> elements with no onclick, no type=submit inside a form, not disabled
    const dead = await page.evaluate(() => {
      const out = [];
      document.querySelectorAll('#view button:not([onclick]):not([disabled])').forEach((b) => {
        if (b.type === 'submit' && b.closest('form')) return;
        if (b.closest('[onclick]')) return; // parent handles it
        out.push((b.textContent || b.getAttribute('aria-label') || b.className).trim().slice(0, 40));
      });
      return out;
    });
    if (dead.length) report.deadButtons[mod] = dead;

    // Phase 2: click every distinct onclick element; record page errors; reset overlays
    const clickables = await page.evaluate(() => {
      const seen = new Set(); const out = [];
      document.querySelectorAll('#view [onclick]').forEach((el, i) => {
        const sig = el.getAttribute('onclick');
        if (seen.has(sig)) return; seen.add(sig);
        el.setAttribute('data-audit', 'c' + i); out.push('c' + i);
      });
      return out;
    });
    const errsHere = [];
    for (const id of clickables) {
      const before = pageErrors.length;
      try { await page.click(`[data-audit="${id}"]`); } catch (e) { /* covered/off-screen: acceptable */ }
      await new Promise((r) => setTimeout(r, 60));
      if (pageErrors.length > before) {
        const sig = await page.evaluate((i) => { const el = document.querySelector(`[data-audit="${i}"]`); return el ? el.getAttribute('onclick') : i; }, id);
        errsHere.push({ onclick: sig, error: pageErrors[pageErrors.length - 1] });
      }
      await page.evaluate(() => {
        if (typeof closeDrawer === 'function') try { closeDrawer(); } catch (e) {}
        if (typeof closeDetail === 'function') try { closeDetail(); } catch (e) {}
        document.querySelectorAll('.modal.open,.overlay.open,[data-open="true"]').forEach((el) => el.classList.remove('open'));
      });
      await page.keyboard.press('Escape');
    }
    if (errsHere.length) report.clickErrors[mod] = errsHere;

    // Phase 3: generic create-workflow - find an Add/New button, open, fill, submit
    // Fresh navigation first: phase 2's tab-clicking may have left a sub-view without the action
    await page.evaluate((m) => go(m), mod);
    await new Promise((r) => setTimeout(r, 150));
    pageErrors = [];
    const wf = await page.evaluate(async (m) => {
      const view = document.querySelector('#view');
      const priority = [
        /new visit|check in|allocate room|run payroll|enter marks|mark all|submit register|message parents|quick action|roll-call|generate report/i,
        /(^|\s)(add|new|create|issue|raise|book|log|record|publish)\s/i,
      ];
      const all = [...view.querySelectorAll('[onclick],button')].filter((b) => !/export|print|wps/i.test(b.textContent || ''));
      let addBtn = null;
      for (const rx of priority) { addBtn = all.find((b) => rx.test(' ' + (b.textContent || '') + ' ')); if (addBtn) break; }
      if (!addBtn) return { skipped: 'no add-style button' };
      addBtn.click();
      await new Promise((r) => setTimeout(r, 250));
      const scope = document.querySelector('.drawer.open, .modal.open, #drawer.open, [class*="drawer"][class*="open"]') || document;
      const inputs = [...scope.querySelectorAll('input:not([type=hidden]):not([type=checkbox]):not([type=radio]), textarea')].filter((i) => i.offsetParent);
      const selects = [...scope.querySelectorAll('select')].filter((s) => s.offsetParent);
      if (!inputs.length && !selects.length) return { skipped: 'no visible form after add click' };
      inputs.forEach((inp, idx) => {
        const t = (inp.type || 'text').toLowerCase();
        inp.value = t === 'number' ? '7' : t === 'date' ? '2026-09-01' : t === 'email' ? 'audit@alnoor.ae' : t === 'tel' ? '+971500000000' : t === 'time' ? '09:00' : 'Audit Sample ' + idx;
        inp.dispatchEvent(new Event('input', { bubbles: true }));
      });
      selects.forEach((s) => { if (s.options.length > 1) { s.selectedIndex = 1; s.dispatchEvent(new Event('change', { bubbles: true })); } });
      const submit = [...scope.querySelectorAll('button,[onclick]')].find((b) => /save|submit|create|add|confirm|issue|record|book|raise|log|send|run|lock|publish|apply|start|proceed|generate|allocate|mark|done/i.test(b.textContent || ''));
      if (!submit) return { filled: inputs.length + selects.length, skipped: 'no submit button found' };
      submit.click();
      await new Promise((r) => setTimeout(r, 300));
      return { filled: inputs.length + selects.length, submitted: true };
    }, mod);
    if (pageErrors.length) wf.errors = pageErrors.slice();
    report.workflowResults[mod] = wf;
    await page.evaluate(() => {
      if (typeof closeDrawer === 'function') try { closeDrawer(); } catch (e) {}
      document.querySelectorAll('.drawer.open,.modal.open').forEach((el) => el.classList.remove('open'));
    });
  }

  fs.writeFileSync('/home/claude/interaction-report.json', JSON.stringify(report, null, 1));
  const gaps = Object.keys(report.missingHandlers).length + Object.keys(report.clickErrors).length + Object.keys(report.deadButtons).length +
    Object.values(report.workflowResults).filter((w) => w.errors).length;
  console.log(JSON.stringify({
    modulesAudited: report.modules,
    modulesWithMissingHandlers: Object.keys(report.missingHandlers).length,
    modulesWithClickErrors: Object.keys(report.clickErrors).length,
    modulesWithDeadButtons: Object.keys(report.deadButtons).length,
    workflowsSubmitted: Object.values(report.workflowResults).filter((w) => w.submitted).length,
    workflowsWithErrors: Object.values(report.workflowResults).filter((w) => w.errors).length,
    totalGapClusters: gaps,
  }, null, 1));
  await browser.close(); server.close();
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
