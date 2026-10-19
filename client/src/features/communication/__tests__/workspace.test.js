import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, it, expect } from "vitest";
function workspace() {
  const c = {
    state: { role: "Parent", module: "comm" },
    M: {},
    ANN: [],
    SCHOOLOS_ADAPTER: { user: { _id: "parent-1" }, settings: {} },
    document,
    render: () => {},
    toast: () => {},
    ic: () => "",
    avc: () => "#2563EB",
    darken: () => "#2563EB",
    initials: () => "",
    setTimeout: () => {},
  };
  c.window = c;
  runInNewContext(
    readFileSync("public/assets/js/modules/51-students.js", "utf8"),
    c,
  );
  const details = readFileSync(
    "public/assets/js/core/42-detail-drawer.js",
    "utf8",
  ).split("/* ---- Reusable content assistant")[0];
  runInNewContext(details, c);
  runInNewContext(
    readFileSync("public/assets/js/modules/61-communication.js", "utf8"),
    c,
  );
  return c;
}
describe("Private message workspace", () => {
  it("clears cached conversations when another account logs in", () => {
    const c = workspace();
    c.commState().messages = [{ subject: "Private family issue" }];
    c.commState().loaded = true;
    c.SCHOOLOS_ADAPTER.user = { _id: "parent-2" };
    expect(c.commState().messages).toHaveLength(0);
    expect(c.commState().loaded).toBe(false);
  });
  it("discards a late inbox response after switching to Sent", async () => {
    const c = workspace();
    let resolve;
    c.SCHOOLOS_ADAPTER.apiAll = () =>
      new Promise((r) => {
        resolve = r;
      });
    c.commState().tab = "Inbox";
    const load = c.commLoadMessages();
    c.commState().tab = "Sent";
    resolve({ data: [{ subject: "Inbox only" }] });
    await load;
    expect(c.commState().messages).toHaveLength(0);
    expect(c.commState().loaded).toBe(false);
  });
  it("renders literal HTML safely in private message titles and bodies", async () => {
    const c = workspace();
    c.commState().messages = [
      {
        _id: "message",
        subject: "<img src=x onerror=alert(1)>",
        body: "<script>window.injected=true</script>",
        sender: { _id: "teacher", name: "<b>Teacher</b>" },
        recipient: { _id: "parent-1", name: "Parent" },
        readAt: "2026-10-01T12:00:00Z",
      },
    ];
    c.openDrawer = (html) => {
      document.body.innerHTML = html;
    };
    await c.commMessageDetail("message");
    expect(document.querySelector("img")).toBeNull();
    expect(document.querySelector("script")).toBeNull();
    expect(document.body.textContent).toContain("<img src=x onerror=alert(1)>");
  });
});
