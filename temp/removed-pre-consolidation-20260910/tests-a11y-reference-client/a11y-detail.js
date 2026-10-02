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
(async () => {
  const port = 5302;
  const server = await startServer(port);
  const browser = await puppeteer.launch({ executablePath: '/opt/google/chrome/chrome', headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  await page.goto(`http://localhost:${port}/login`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 500));
  await page.evaluate(axeSrc);
  const result = await page.evaluate(async () => {
    const r = await axe.run(document, { resultTypes: ['violations'] });
    return r.violations.map((v) => ({ id: v.id, nodes: v.nodes.map((n) => ({ html: n.html, target: n.target, failureSummary: n.failureSummary })) }));
  });
  console.log(JSON.stringify(result, null, 2));
  await browser.close();
  server.close();
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
