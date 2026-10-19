const fs = require("fs");
try {
  fs.unlinkSync("/tmp/schoolos-classes-seed-ready");
} catch {}
require("../classes/server.cjs");
(async () => {
  for (
    let i = 0;
    i < 200 && !fs.existsSync("/tmp/schoolos-classes-seed-ready");
    i++
  )
    await new Promise((r) => setTimeout(r, 200));
  if (!fs.existsSync("/tmp/schoolos-classes-seed-ready"))
    throw Error("Classes seed failed");
  fs.writeFileSync("/tmp/schoolos-attendance-seed-ready", "ready");
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
