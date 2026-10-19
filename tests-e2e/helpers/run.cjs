const { spawn } = require("child_process");
const fs = require("fs");
const suite = process.env.SCHOOLOS_TEST_MODULE || "students";
if (!["students", "parents", "classes", "attendance", "fees", "exams", "communication", "delivery", "health", "behaviour", "staff", "curriculum", "lms", "library", "transport", "hostel", "cafeteria", "expenses", "inventory", "calendar", "biometric", "visitors", "certificates", "documents", "idcards", "alumni", "facilities", "helpdesk", "surveys", "reports", "platform", "audit", "insights", "arabic", "timetable", "crm", "admissions", "performance", "pilot"].includes(suite))
  throw Error("Unknown test module");
const suiteDir = require("path").resolve(__dirname, "..", suite);
const readyFile = "/tmp/schoolos-" + suite + "-seed-ready";
const root = require("path").resolve(__dirname, "../..");
try {
  fs.unlinkSync(readyFile);
} catch {}
const backend = spawn(
  process.execPath,
  [require("path").join(suiteDir, "server.cjs")],
  {
    stdio: [
      "ignore",
      fs.openSync("/tmp/schoolos-" + suite + "-server.log", "w"),
      "inherit",
    ],
  },
);
const frontend = spawn(
  process.execPath,
  [
    root + "/client/node_modules/vite/bin/vite.js",
    ...(process.env.SCHOOLOS_TEST_BUILD === "true" ? ["preview"] : []),
    "--host",
    "127.0.0.1",
    "--port",
    "5179",
    "--strictPort",
  ],
  {
    cwd: root + "/client",
    env: { ...process.env, VITE_API_BASE_URL: "http://127.0.0.1:4400/api/v1" },
    stdio: "ignore",
  },
);
(async () => {
  try {
    for (let i = 0; i < 200 && !fs.existsSync(readyFile); i++)
      await new Promise((r) => setTimeout(r, 200));
    if (!fs.existsSync(readyFile)) throw Error("Test seed not ready");
    const allRoles = ["Principal", "Teacher", "Accountant", "Parent", "Student", "Administrator"];
    const requestedRoles = process.env.SCHOOLOS_TEST_ROLES?.split(',');
    if (requestedRoles?.some(role => !allRoles.includes(role))) throw Error('Unknown requested test role');
    for (const role of allRoles.filter(role => !requestedRoles || requestedRoles.includes(role))) {
      const browser = spawn(
        process.execPath,
        [require("path").join(suiteDir, "browser.cjs")],
        {
          env: {
            ...process.env,
            SCHOOLOS_TEST_ROLE: role,
            SCHOOLOS_SMOKE_EMAIL:
              role === "Administrator"
                ? "administrator@example.invalid"
                : role.toLowerCase() + "@example.invalid",
          },
          stdio: "inherit",
        },
      );
      await new Promise((resolve) =>
        browser.on("exit", (code) => {
          if (code) process.exitCode = code;
          resolve();
        }),
      );
    }
  } finally {
    backend.kill();
    frontend.kill();
  }
})();
