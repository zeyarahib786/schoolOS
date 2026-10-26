const fs = require("fs"),
  os = require("os"),
  path = require("path"),
  { spawn } = require("child_process");
const WebSocket = require(
  path.resolve(__dirname, "../../client/node_modules/ws"),
);
async function waitFor(check, label, timeout = 45000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      if (await check()) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 100));
  }
  throw Error("Timed out: " + label);
}
module.exports = async function runBrowser(suite, run, options = {}) {
  const profile = fs.mkdtempSync(
    path.join(os.tmpdir(), "schoolos-" + suite + "-browser-"),
  );
  const chrome = spawn(
    process.env.SCHOOLOS_CHROME_PATH ||
      path.join(
        os.homedir(),
        ".cache/ms-playwright/chromium-1243/chrome-linux64/chrome",
      ),
    [
      "--headless=new",
      "--no-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--remote-debugging-port=0",
      "--user-data-dir=" + profile,
      "about:blank",
    ],
    { stdio: "ignore" },
  );
  let ws;
  const role =
      options.role || process.env.SCHOOLOS_TEST_ROLE || "Administrator",
    cases = [],
    issues = [];
  try {
    await waitFor(
      () => fs.existsSync(path.join(profile, "DevToolsActivePort")),
      "browser debugger",
    );
    const port = fs
      .readFileSync(path.join(profile, "DevToolsActivePort"), "utf8")
      .split("\n")[0];
    let page;
    await waitFor(async () => {
      const targets = await (
        await fetch("http://127.0.0.1:" + port + "/json/list")
      ).json();
      page = targets.find((target) => target.type === "page");
      return Boolean(page?.webSocketDebuggerUrl);
    }, "browser page target");
    ws = new WebSocket(page.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => {
      ws.once("open", resolve);
      ws.once("error", reject);
    });
    const pending = new Map();
    let id = 0;
    ws.on("message", (raw) => {
      const m = JSON.parse(String(raw));
      if (pending.has(m.id)) {
        pending.get(m.id)(m);
        pending.delete(m.id);
      }
      if (m.method === "Runtime.exceptionThrown")
        issues.push({
          type: "javascript",
          detail:
            m.params.exceptionDetails.exception?.description ||
            m.params.exceptionDetails.text,
        });
      if (
        m.method === "Network.responseReceived" &&
        m.params.response.status >= 400
      )
        issues.push({
          type: "http",
          status: m.params.response.status,
          url: m.params.response.url,
        });
      if (m.method === "Page.javascriptDialogOpening")
        cdp("Page.handleJavaScriptDialog", { accept: true }).catch(() => {});
    });
    const cdp = (method, params = {}) =>
      new Promise((resolve, reject) => {
        const next = ++id;
        pending.set(next, (m) =>
          m.error ? reject(Error(m.error.message)) : resolve(m.result),
        );
        ws.send(JSON.stringify({ id: next, method, params }));
      });
    const evaluate = async (expression) => {
      const r = await cdp("Runtime.evaluate", {
        expression,
        returnByValue: true,
        awaitPromise: true,
      });
      if (r.exceptionDetails)
        throw Error(
          r.exceptionDetails.exception?.description || r.exceptionDetails.text,
        );
      return r.result.value;
    };
    const api = (route, method = "GET", body) =>
      evaluate(
        `SCHOOLOS_ADAPTER.api(${JSON.stringify(route)},{method:${JSON.stringify(method)}${body ? ",body:JSON.stringify(" + JSON.stringify(body) + ")" : ""}})`,
      );
    const step = async (name, fn) => {
      try {
        await waitFor(
          () => evaluate("!state.parentSaving"),
          "previous save finished",
        );
        cases.push({ name, pass: true, details: await fn() });
      } catch (e) {
        cases.push({ name, pass: false, error: e.message, stack: e.stack });
      }
      console.log(JSON.stringify({ role, ...cases.at(-1) }));
    };
    const fill = (values) =>
      evaluate(
        `(()=>{for(const[k,v]of Object.entries(${JSON.stringify(values)})){const e=document.querySelector('#drawer [data-fkey="'+k+'"]');if(!e)throw Error('Missing field '+k);e.value=v;e.dispatchEvent(new Event('change',{bubbles:true}));}document.querySelector('#drawer .df .btn.primary').click()})()`,
      );
    const screenshot = async (label) => {
      await waitFor(
        () => evaluate('!document.querySelector("#toasts .toast")'),
        "toast animation finished",
        5000,
      );
      await new Promise((r) => setTimeout(r, 400));
      const shot = await cdp("Page.captureScreenshot", { format: "png" });
      fs.writeFileSync(
        "/tmp/schoolos-" + suite + "-" + role + "-" + label + ".png",
        Buffer.from(shot.data, "base64"),
      );
    };
    await cdp("Page.enable");
    await cdp("Runtime.enable");
    await cdp("Network.enable");
    if (process.env.SCHOOLOS_TEST_BLOCK_FONTS === "true")
      await cdp("Network.setBlockedURLs", {
        urls: ["*fonts.googleapis.com*", "*fonts.gstatic.com*"],
      });
    if (options.viewport)
      await cdp("Emulation.setDeviceMetricsOverride", {
        ...options.viewport,
        deviceScaleFactor: 1,
        mobile: false,
      });
    await cdp("Page.navigate", {
      url: options.origin || "http://127.0.0.1:5179/",
    });
    await waitFor(
      () =>
        evaluate(
          "typeof window.enterApp==='function' && Boolean(window.SCHOOLOS_ADAPTER)",
        ),
      "app boot",
    );
    await evaluate(
      `document.getElementById('lxEmail').value=${JSON.stringify(options.email || process.env.SCHOOLOS_SMOKE_EMAIL || "administrator@example.invalid")};document.getElementById('lxPass').value=${JSON.stringify(options.password || process.env.SCHOOLOS_SMOKE_PASSWORD || "LocalFixture123!")};selectLandingRole(${JSON.stringify(role)});enterApp()`,
    );
    try {
      await waitFor(
        () => evaluate("Boolean(SCHOOLOS_ADAPTER.connected)"),
        "authenticated login",
      );
    } catch (error) {
      const note = await evaluate(
        "document.getElementById('lxNote')?.textContent || ''",
      );
      throw Error(
        error.message +
          (note ? ": " + note : "") +
          "; response failures: " +
          JSON.stringify(issues.filter((i) => i.type === "http")),
      );
    }
    await run({ role, step, api, evaluate, waitFor, fill, cdp, screenshot });
    fs.writeFileSync(
      "/tmp/schoolos-" + suite + "-browser-" + role + ".json",
      JSON.stringify({ role, cases, issues }, null, 2),
    );
    if (
      cases.some((c) => !c.pass) ||
      issues.some(
        (i) =>
          i.type === "javascript" || (i.type === "http" && i.status === 500),
      )
    )
      process.exitCode = 1;
  } finally {
    if (ws) ws.close();
    chrome.kill();
  }
};
