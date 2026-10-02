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
  const port = 5303;
  const server = await startServer(port);
  const browser = await puppeteer.launch({ executablePath: '/opt/google/chrome/chrome', headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'] });
  const page = await browser.newPage();
  await page.goto(`http://localhost:${port}/students`, { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 500));
  const finalUrl = page.url();
  console.log(JSON.stringify({ requestedPath: '/students', finalUrl, redirectedToLogin: finalUrl.includes('/login') }));
  await browser.close();
  server.close();
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
