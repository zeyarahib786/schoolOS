import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, it, expect } from "vitest";
function workspace(role = "Parent") {
  const c = {
    state: { role },
    M: {},
    SCHOOLOS_ADAPTER: {
      exams: [
        {
          _id: "published",
          locked: true,
          name: "Published",
          term: "Term 1",
          subjects: ["Math"],
          maxMarks: 50,
        },
        { _id: "draft", locked: false, name: "Draft", subjects: ["Science"] },
      ],
      examResults: [],
      certificates: [],
    },
  };
  c.window = c;
  runInNewContext(
    readFileSync("public/assets/js/modules/51-students.js", "utf8"),
    c,
  );
  runInNewContext(
    readFileSync("public/assets/js/modules/59-exams.js", "utf8"),
    c,
  );
  return c;
}
describe("Released assessment selection and issued records", () => {
  it("never selects a draft for a family even when an old staff selection remains", () => {
    const c = workspace();
    c.state.examSelectedId = "draft";
    expect(c.examSelected()._id).toBe("published");
    expect(c.examList()).toHaveLength(1);
    c.state.role = "Teacher";
    expect(c.examList()).toHaveLength(2);
  });
  it("exports an immutable issued snapshot rather than newer moderated marks", () => {
    const c = workspace("Teacher");
    c.SCHOOLOS_ADAPTER.certificates = [
      {
        type: "ReportCard",
        status: "Issued",
        purpose: "Exam:published",
        student: { _id: "child" },
        certNumber: "RC-QA",
        assessmentSnapshot: {
          examName: "Published",
          term: "Term 1",
          studentRef: "QA-001",
          studentName: "Child",
          grade: "Grade 7",
          scores: [{ subject: "Math", marks: 0 }],
          maxMarks: 50,
          averagePercent: 0,
          letterGrade: "D",
        },
      },
    ];
    c.SCHOOLOS_ADAPTER.examResults = [
      {
        exam: "published",
        student: { _id: "child" },
        scores: [{ subject: "Math", marks: 40 }],
        averagePercent: 80,
      },
    ];
    let rows;
    c.studentDownloadCSV = (_name, r) => {
      rows = r;
    };
    c.examCardExport("child");
    expect(rows[1]).toContain(0);
    expect(rows[1]).not.toContain(40);
    expect(rows[1]).not.toContain(80);
    expect(c.examIssuedCard("stranger")).toBeUndefined();
  });
});
