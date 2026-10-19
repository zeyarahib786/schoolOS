const fs = require('fs');
try { fs.unlinkSync('/tmp/schoolos-students-seed-ready'); } catch {}
require('../students/server.cjs');
(async () => {
  for (let n = 0; n < 200 && !fs.existsSync('/tmp/schoolos-students-seed-ready'); n++)
    await new Promise(resolve => setTimeout(resolve, 200));
  if (!fs.existsSync('/tmp/schoolos-students-seed-ready')) throw Error('Base seed failed');
  fs.writeFileSync('/tmp/schoolos-performance-seed-ready', 'ready');
})().catch(error => { console.error(error); process.exit(1); });
