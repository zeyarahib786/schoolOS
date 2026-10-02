const puppeteer = require('/home/claude/node_modules/puppeteer-core');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { spawn } = require('child_process');

const axeSrc = fs.readFileSync('/home/claude/node_modules/axe-core/axe.min.js', 'utf8');
const distDir = path.resolve(__dirname, '../client/dist');

const mimeTypes = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css' };

function startServer(port) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      // SPA fallback: any non-asset path serves index.html so React Router can handle it.
      let urlPath = req.url.split('?')[0];
      let filePath = path.join(distDir, urlPath);
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        filePath = path.join(distDir, 'index.html');
      }
      const ext = path.extname(filePath);
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end('Not found');
          return;
        }
        res.writeHead(200, { 'Content-Type': mimeTypes[ext] || 'application/octet-stream' });
        res.end(data);
      });
    });
    server.listen(port, () => resolve(server));
  });
}

(async () => {
  const port = 5301;
  const server = await startServer(port);

  const browser = await puppeteer.launch({
    executablePath: '/opt/google/chrome/chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
  });

  const results = {};
  const pages = [{ name: 'login-page', url: `http://localhost:${port}/login` }];

  for (const { name, url } of pages) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    await page.goto(url, { waitUntil: 'networkidle0' });
    await new Promise((r) => setTimeout(r, 500));
    await page.evaluate(axeSrc);
    const result = await page.evaluate(async () => {
      const r = await axe.run(document, { resultTypes: ['violations'] });
      return r.violations.map((v) => ({ id: v.id, impact: v.impact, description: v.description, nodes: v.nodes.length }));
    });
    results[name] = result;
    await page.close();
  }

  console.log(JSON.stringify(results, null, 2));
  await browser.close();
  server.close();
})().catch((e) => {
  console.error('FATAL', e);
  process.exit(1);
});
