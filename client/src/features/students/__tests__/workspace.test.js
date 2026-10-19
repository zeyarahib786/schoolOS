import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
const script = readFileSync("public/assets/js/modules/51-students.js", "utf8");
const record = {
  id: "QA-001",
  name: "QA Student",
  grade: "Grade 7 · A",
  roll: "007",
  guardian: "QA Guardian",
  phone: "+971501234567",
  email: "parent@example.invalid",
  status: "Active",
  fee: "Due",
  att: 95,
  attendanceRecords: 20,
  docs: [],
  enrollmentHistory: [],
};
function workspace(role = "Administrator", rows = [record]) {
  const context = {
    state: { role },
    STUDENTS: rows,
    M: {},
    window: {},
    document,
    Blob,
    URL,
    Date,
    Set,
    setTimeout,
    $: (selector) => document.querySelector(selector),
    ic: () => "",
    cellUser: (name, id) => name + " " + id,
    feeBadge: String,
    statusBadge: String,
    canWrite: () => ["Administrator", "Principal", "Teacher"].includes(role),
  };
  runInNewContext(script, context);
  document.body.innerHTML = context.M.students();
  context.filterStudents();
  return context;
}
describe("Students workspace role views", () => {
  for (const role of [
    "Administrator",
    "Principal",
    "Teacher",
    "Accountant",
    "Parent",
    "Student",
  ])
    it("renders correct actions for " + role, () => {
      const context = workspace(role);
      const text = document.body.textContent;
      expect(text.includes("Add student")).toBe(
        ["Administrator", "Principal", "Teacher"].includes(role),
      );
      expect(text.includes("Import CSV")).toBe(
        ["Administrator", "Principal"].includes(role),
      );
      const profile = context.studentProfile(record.id);
      expect(profile.includes("Manage enrollment")).toBe(
        ["Administrator", "Principal"].includes(role),
      );
      expect(profile.includes("Portal links")).toBe(
        ["Administrator", "Principal"].includes(role),
      );
      expect(profile.includes("Message guardian")).toBe(
        ["Administrator", "Principal"].includes(role),
      );
      expect(profile.includes("Edit record")).toBe(
        ["Administrator", "Principal", "Teacher"].includes(role),
      );
      expect(profile.includes("Documents")).toBe(role !== "Accountant");
      if (role === "Parent") expect(text).toContain("My children");
      if (role === "Student") expect(text).toContain("My student profile");
    });
  it("searches guardians, filters enrollment, sorts and retains filter state across renders", () => {
    const c = workspace("Administrator", [
      record,
      {
        ...record,
        id: "QA-002",
        name: "Other",
        guardian: "Different guardian",
        status: "Inactive",
      },
    ]);
    c.studentSetFilter("q", "QA Guardian");
    expect(c.studentFilteredRows()).toHaveLength(1);
    document.body.innerHTML = c.M.students();
    c.filterStudents();
    expect(document.querySelector("#stuSearch").value).toBe("QA Guardian");
    c.studentSetFilter("q", "");
    c.studentSetFilter("status", "Inactive");
    expect(c.studentFilteredRows().map((s) => s.id)).toEqual(["QA-002"]);
  });
  it("escapes stored profile and directory text and presents an unlinked family empty state", () => {
    const c = workspace("Administrator", [
      { ...record, name: "<img src=x onerror=alert(1)>" },
    ]);
    expect(document.querySelector("img")).toBeNull();
    expect(c.studentProfile(record.id)).toContain("&lt;img");
    workspace("Parent", []);
    expect(document.body.textContent).toContain("link your portal account");
  });
  it("parses spreadsheet CSV with BOM, quoted commas/newlines and preserves leading-zero rolls", () => {
    const c = workspace();
    const rows = c.studentCSVParse(
      '\uFEFFrefId,name,grade,gender,roll,guardianName,phone\r\nNEW,"Student, QA","Grade 7 · A",Female,007,"Guardian\nQA",+971501234567',
    );
    expect(rows[0]).toMatchObject({
      name: "Student, QA",
      roll: "007",
      guardianName: "Guardian\nQA",
    });
    expect(c.studentCSVValidate(rows)).toEqual([]);
  });
  it("blocks duplicate admission numbers, invalid input and malformed CSV", () => {
    const c = workspace();
    expect(
      c.studentCSVValidate([
        {
          refId: "qa-001",
          name: "Q",
          grade: "7",
          gender: "Other",
          roll: "1",
          guardianName: "QA",
          phone: "bad",
        },
      ]).length,
    ).toBeGreaterThan(2);
    expect(() => c.studentCSVParse("refId,name\nQ,QA")).toThrow(
      "Missing column",
    );
    expect(() => c.studentCSVParse('"unclosed')).toThrow("Unclosed");
  });
});

describe("Students edit-form safety", () => {
  it("encodes stored text before passing fields to the shared form renderer", () => {
    let captured;
    const context = {
      state: { role: "Administrator" },
      M: {},
      window: {},
      STUDENTS: [
        {
          ...record,
          name: "<img src=x>",
          address: '" autofocus onfocus="alert(1)',
        },
      ],
      guardWrite: () => true,
      formDrawer: (...args) => {
        captured = args;
      },
    };
    runInNewContext(script, context);
    context.studentEditForm(record.id);
    expect(captured[1]).toContain("&lt;img");
    expect(captured[2].find((f) => f.key === "address").val).toContain(
      "&quot;",
    );
  });
  it("renders notification text without treating student data as HTML", () => {
    const infra = readFileSync(
      "public/assets/js/core/40-helpers-infra.js",
      "utf8",
    );
    const start = infra.indexOf("function toast("),
      end = infra.indexOf("/* ===== Live audit", start);
    document.body.innerHTML = '<div id="toasts"></div>';
    const context = {
      document,
      NodeFilter,
      CFG: { country: "UAE", currency: "AED" },
      window: { confirm: () => true },
      $: (s) => document.querySelector(s),
      setTimeout: () => {},
    };
    runInNewContext(["10-localization.js", "11-arabic.js"].map(name => readFileSync("public/assets/js/i18n/" + name, "utf8")).join("\n") + "\n;LANG=\"ar\";", context);
    runInNewContext(infra.slice(start, end), context);
    context.toast("<img src=x onerror=alert(1)>");
    expect(document.querySelector("img")).toBeNull();
    expect(document.querySelector("#toasts").textContent).toContain("<img");
  });
});

it("does not present missing invoices as paid fees", () => {
  const c = workspace();
  expect(document.querySelector("#stuBody").textContent).toContain(
    "Not invoiced",
  );
  c.studentSetFilter("fee", "Paid");
  expect(c.studentFilteredRows()).toHaveLength(0);
  c.studentSetFilter("fee", "Not invoiced");
  expect(c.studentFilteredRows()).toHaveLength(1);
  c.state._spTab = "fees";
  expect(c.studentProfile(record.id)).toContain("No invoices");
});

describe("Students practical profile refinements", () => {
  it("counts recommended details without treating blanks or redacted data as complete", () => {
    const c = workspace();
    const checks = c.studentCompleteness({
      ...record,
      guardian: "—",
      phone: "—",
      address: " ",
      dob: "",
      emergency: "",
    });
    expect(checks.filter((item) => item[1]).map((item) => item[0])).toEqual([
      "Class and roll",
      "Guardian email",
    ]);
    expect(c.studentProfile(record.id)).toContain("Recommended record details");
    expect(c.studentProfile(record.id)).toContain("studentOpenTab");
  });
  for (const role of [
    "Administrator",
    "Principal",
    "Teacher",
    "Accountant",
    "Parent",
    "Student",
  ])
    it("shows only authorized emergency/checklist details for " + role, () => {
      const c = workspace(role, [
        {
          ...record,
          emergency: "+971501112222",
          allergies: "Sensitive allergy",
          medical: "Sensitive note",
        },
      ]);
      const html = c.studentProfile(record.id);
      expect(html.includes('aria-label="Emergency information"')).toBe(
        role !== "Accountant",
      );
      expect(html.includes("Sensitive allergy")).toBe(role !== "Accountant");
      expect(html.includes("Parent portal linked")).toBe(
        ["Administrator", "Principal"].includes(role),
      );
      expect(html.includes('href="tel:+971501112222"')).toBe(
        role !== "Accountant",
      );
      expect(html.includes("Date of birth")).toBe(role !== "Accountant");
    });
  it("uses safe emergency links and escapes profile photo labels", () => {
    const c = workspace("Administrator", [
      {
        ...record,
        name: '<img src=x onerror="alert(1)">',
        emergency: "javascript:alert(1)",
        medical: "<script>alert(1)</script>",
      },
    ]);
    const html = c.studentProfile(record.id);
    expect(html).not.toContain('href="tel:javascript');
    expect(html).not.toContain("<script>alert");
    expect(html).not.toContain("<img src=x");
    expect(html).toContain('id="studentProfilePhoto"');
    expect(html).toContain("Blank medical details mean not recorded");
  });
  it("warns about matching normalized name and DOB despite different admissions and permits explicit cancellation", () => {
    const c = workspace("Administrator", [
      { ...record, name: "QA   Student", dob: "2012-01-02" },
    ]);
    expect(
      c.studentDuplicateCandidates(" qa student ", "2012-01-02", "OTHER"),
    ).toHaveLength(1);
    expect(
      c.studentDuplicateCandidates("QA Student", "2012-01-02", record.id),
    ).toHaveLength(0);
    expect(
      c.studentDuplicateCandidates("QA Student", "2013-01-02", null),
    ).toHaveLength(0);
    expect(c.studentDuplicateCandidates("QA Student", "", null)).toHaveLength(
      0,
    );
    let warning = "";
    c.window.confirm = (message) => {
      warning = message;
      return false;
    };
    expect(c.studentConfirmDuplicates("QA Student", "2012-01-02", null)).toBe(
      false,
    );
    expect(warning).toContain("QA-001");
    c.window.confirm = () => true;
    expect(c.studentConfirmDuplicates("QA Student", "2012-01-02", null)).toBe(
      true,
    );
  });
  it("warns about duplicate people within an import and leaves no import pending after an invalid replacement file", async () => {
    const c = workspace("Administrator", []);
    document.body.innerHTML = '<div id="studentImportPreview"></div>';
    const csv =
      "refId,name,grade,gender,roll,guardianName,phone,dateOfBirth\nNEW-1,QA Student,Grade 7,Male,001,QA Guardian,+971501234567,2012-01-02\nNEW-2,qa student,Grade 7,Male,002,QA Guardian,+971501234567,2012-01-02";
    await c.window.studentImportPreview({
      files: [{ size: csv.length, text: async () => csv }],
    });
    expect(document.body.textContent).toContain("Possible duplicate people");
    expect(c.state._studentImportWarnings).toHaveLength(1);
    await c.window.studentImportPreview({
      files: [{ size: 3, text: async () => "bad" }],
    });
    expect(c.state._studentImportRows).toBeNull();
  });
});

describe("Uploaded student document viewing", () => {
  for (const role of ["Administrator", "Principal", "Teacher", "Accountant", "Parent", "Student"])
    it("offers View for an uploaded document in the authorized " + role + " profile", () => {
      const c = workspace(role, [{ ...record, docs: [{ key: "photo", label: "Student photo", file: { name: "Photo.png", type: "image/png" } }] }]);
      c.state._spTab = "documents";
      const html = c.studentProfile(record.id);
      expect(html.includes('>View</button>')).toBe(role !== "Accountant");
      expect(html.includes('>Download</button>')).toBe(role !== "Accountant");
    });
  const previewScript = readFileSync("public/assets/js/core/44-document-capture.js", "utf8");
  function previewContext() {
    document.body.innerHTML = '<button id="trigger">View</button>';
    document.getElementById("trigger").focus();
    const downloads = [];
    const context = { document, window: {}, setTimeout, X_ICON: "×", fmtSize: String, ic: () => "", toast: () => {} };
    runInNewContext(previewScript, context);
    context.dlUrl = (url, name) => downloads.push({ url, name });
    return { context, downloads };
  }
  it("previews images and closes with Escape, restores focus and releases the protected URL", () => {
    const { context } = previewContext();
    let released = false;
    context.docPreview({ name: "Photo.png", type: "image/png", url: "blob:photo", onClose: () => { released = true; } });
    expect(document.querySelector('.doc-lightbox img').getAttribute('src')).toBe("blob:photo");
    expect(document.querySelector('.doc-lightbox').getAttribute('aria-modal')).toBe("true");
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    expect(document.querySelector('.doc-lightbox')).toBeNull();
    expect(released).toBe(true);
    expect(document.activeElement.id).toBe("trigger");
  });
  it("previews PDFs inside the dialog and closes via the visible close button", () => {
    const { context } = previewContext();
    context.docPreview({ name: "Birth.pdf", type: "application/pdf", url: "blob:pdf" });
    expect(document.querySelector('.doc-lightbox iframe').getAttribute('src')).toBe("blob:pdf");
    document.querySelector('[aria-label="Close preview"]').click();
    expect(document.querySelector('.doc-lightbox')).toBeNull();
  });
  it("offers a safe download fallback for Word documents with quoted or HTML filenames", () => {
    const { context, downloads } = previewContext();
    const name = "Parent's <img src=x onerror=alert(1)>.docx";
    context.docPreview({ name, type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: 10, url: "blob:word" });
    expect(document.querySelector('.doc-lightbox').textContent).toContain(name);
    expect(document.querySelector('.doc-lightbox img')).toBeNull();
    document.querySelector('.doc-lb-fallback button').click();
    expect(downloads).toEqual([{ url: "blob:word", name }]);
    document.querySelector('[aria-label="Close preview"]').click();
  });
  it("keeps previews open on content clicks and closes on the backdrop", () => {
    const { context } = previewContext();
    context.docPreview({ name: "Photo.png", type: "image/png", url: "blob:photo" });
    document.querySelector('.doc-lb-box').click();
    expect(document.querySelector('.doc-lightbox')).not.toBeNull();
    document.querySelector('.doc-lightbox').click();
    expect(document.querySelector('.doc-lightbox')).toBeNull();
  });
});

describe('Attendance rate availability',()=>{
 it('distinguishes missing registers, all-Excused records and counted rates',()=>{
  const context=workspace();
  expect(context.studentAttendanceLabel({attendanceRecords:0,attendanceEligibleRecords:0,att:100})).toBe('Not recorded');
  expect(context.studentAttendanceLabel({attendanceRecords:2,attendanceEligibleRecords:0,att:100})).toBe('Excused only');
  expect(context.studentAttendanceLabel({attendanceRecords:3,attendanceEligibleRecords:2,att:50})).toBe('50%');
 });
});
