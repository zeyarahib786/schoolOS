import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
const source = readFileSync("public/assets/js/modules/55-parents.js", "utf8");
const helpers = readFileSync("public/assets/js/modules/51-students.js", "utf8");
const child = {
  id: "QA-001",
  name: "QA Child",
  grade: "Grade 7 · A",
  roll: "007",
  guardian: "QA Guardian",
  phone: "+971501234567",
};
const guardian = {
  id: "GRD-QA",
  mongoId: "123",
  name: "QA Guardian",
  relation: "Mother",
  phone: "+971501234567",
  email: "",
  children: ["QA-001"],
  userId: null,
  portal: "Invited",
  pickup: false,
  financial: true,
  custody: "Not recorded",
  consents: { media: null, trips: false, medical: true },
  updatedAt: "2026-10-09T00:00:00.000Z",
};
function workspace(role = "Administrator", rows = [guardian]) {
  const c = {
    state: { role, parentsLoad: "ready" },
    M: {},
    window: {},
    STUDENTS: [child],
    STAFF: [],
    document,
    Date,
    Set,
    setTimeout,
    $: (sel) => document.querySelector(sel),
    ic: () => "",
    canWrite: () => ["Administrator", "Principal", "Teacher"].includes(role),
    getSubTab: () => "directory",
    subTabs: () => "",
    cellUser: String,
    feeBadge: String,
    statusBadge: String,
    openDrawer: (html) => {
      document.body.innerHTML = html;
    },
    formDrawer: (...args) => {
      c.form = args;
    },
  };
  runInNewContext(
    helpers +
      "\n" +
      source +
      "\nglobalThis.setGuardians=v=>GUARDIANS=v;globalThis.setThreads=v=>MSG_THREADS=v;",
    c,
  );
  c.setGuardians(rows);
  document.body.innerHTML = c.M.parents();
  c.filterParents();
  return c;
}
describe("Parents role-aware workspace", () => {
  for (const role of [
    "Administrator",
    "Principal",
    "Teacher",
    "Accountant",
    "Parent",
    "Student",
  ])
    it("enforces the " + role + " view", () => {
      const c = workspace(role),
        text = document.body.textContent;
      expect(text.includes("Add guardian")).toBe(
        ["Administrator", "Principal"].includes(role),
      );
      expect(text.includes("Parents access is restricted")).toBe(
        ["Teacher", "Accountant", "Student"].includes(role),
      );
      if (role === "Parent") expect(text).toContain("My family");
      if (c.parentAllowed()) {
        const profile = c.guardianDetail(guardian.id);
        expect(profile.includes("Edit guardian")).toBe(
          ["Administrator", "Principal"].includes(role),
        );
        expect(profile.includes("Portal account")).toBe(
          ["Administrator", "Principal"].includes(role),
        );
      }
    });
  it("uses real counts and does not invent contact emails, portal activity, consent or children", () => {
    const c = workspace();
    expect(document.body.textContent).not.toContain("98%");
    expect(document.body.textContent).toContain("No email recorded");
    expect(c.guardianDetail(guardian.id)).toContain("Not recorded");
    expect(c.parentConsent(null)).toBe("Not recorded");
    expect(c.parentConsent(false)).toBe("Declined");
    c.setGuardians([]);
    expect(c.buildGuardians()).toHaveLength(0);
  });
  it("searches children and phone, filters pickup and persists filters across renders", () => {
    const c = workspace("Administrator", [
      guardian,
      { ...guardian, id: "GRD-2", name: "Other", children: [], pickup: true },
    ]);
    c.parentSetFilter("q", "QA Child");
    expect(c.parentFilteredRows()).toHaveLength(1);
    document.body.innerHTML = c.M.parents();
    c.filterParents();
    expect(document.getElementById("parSearch").value).toBe("QA Child");
    c.parentSetFilter("q", "");
    c.parentSetFilter("pickup", "Yes");
    expect(c.parentFilteredRows()[0].id).toBe("GRD-2");
  });
  it("escapes stored guardian profiles, messages and edit values", () => {
    const unsafe = '<img src=x onerror="alert(1)">';
    const c = workspace("Administrator", [
      { ...guardian, name: unsafe, note: unsafe },
    ]);
    expect(c.guardianDetail(guardian.id)).not.toContain("<img src=x");
    c.setThreads({
      "GRD-QA": [
        {
          direction: "out",
          text: unsafe,
          from: unsafe,
          createdAt: "2026-10-09",
        },
      ],
    });
    expect(c.guardianThread(guardian.id)).not.toContain("<img src=x");
    c.guardianEditForm(guardian.id);
    expect(c.form[2].find((f) => f.key === "name").val).toContain("&lt;img");
  });
  it("never falls back to demo guardians when API data is unavailable", () => {
    const c = workspace();
    c.state.parentsLoad = "error";
    c.state.parentsError = "Server unavailable";
    const text = c.M.parents();
    expect(text).toContain("Server unavailable");
    expect(text).toContain("Retry");
    expect(text).not.toContain("QA Guardian");
  });
});

it("blocks opening another management form while a save is pending", () => {
  const c = workspace();
  let message = "";
  c.toast = (value) => {
    message = value;
  };
  c.state.parentSaving = true;
  c.guardianEditForm(guardian.id);
  expect(c.form).toBeUndefined();
  expect(message).toContain("current save");
});
it("fetches every directory page without eagerly fetching guardian message threads", async () => {
  const c = workspace(),
    calls = [];
  c.setInterval = () => 0;
  c.clearInterval = () => {};
  c.render = () => {};
  c.window.enterApp = () => {};
  c.window.lockApp = () => {};
  c.window.SCHOOLOS_ADAPTER = {
    connected: true,
    user: { _id: "qa", role: "Administrator" },
    live: {},
    api: async (path) => {
      calls.push(path);
      if (path.startsWith("/guardians?")) {
        const page = path.includes("page=2") ? 2 : 1;
        return {
          data: [
            {
              _id: String(page),
              refId: "GRD-" + page,
              name: "Guardian " + page,
              studentIds: [],
            },
          ],
          meta: { pagination: { totalPages: 2 } },
        };
      }
      return { data: [] };
    },
  };
  runInNewContext(
    readFileSync("public/assets/js/core/97-parents-api-adapter.js", "utf8"),
    c,
  );
  expect(await c.window.refreshParents()).toBe(true);
  expect(c.buildGuardians()).toHaveLength(2);
  expect(calls).toContain("/guardians?limit=100&page=2");
  expect(calls.some((path) => path.includes("/messages"))).toBe(false);
});
