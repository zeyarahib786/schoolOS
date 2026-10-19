import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, it, expect } from "vitest";
function workspace() {
  const c = {
    state: { role: "Accountant" },
    M: {},
    SCHOOLOS_ADAPTER: { settings: { currency: "AED" }, feePayments: [] },
    INVOICES: [],
    Intl,
    document,
  };
  c.window = c;
  runInNewContext(
    readFileSync("public/assets/js/modules/51-students.js", "utf8"),
    c,
  );
  runInNewContext(
    readFileSync("public/assets/js/modules/60-fees.js", "utf8"),
    c,
  );
  return c;
}
describe("Released fee ledger", () => {
  it("keeps currency totals separate and uses exact rounded cents", () => {
    const c = workspace();
    const totals = c.feeTotals(
      [
        { currency: "AED", paid: 0.1 },
        { currency: "AED", paid: 0.2 },
        { currency: "USD", paid: 8 },
      ],
      "paid",
    );
    expect(totals).toContain("AED");
    expect(totals).toContain("US$8.00");
    expect(totals).toContain("0.30");
    expect(totals).not.toContain("8.30");
  });
  it("exports the full filtered ledger", () => {
    const c = workspace();
    c.INVOICES = [
      {
        id: "INV-1",
        student: "=CMD()",
        studentRef: "QA-001",
        term: "Tuition",
        studentId: "1",
        currency: "AED",
        amt: 10,
        paid: 2,
        balance: 8,
        dueDate: "2026-11-10",
        status: "Due",
      },
      {
        id: "INV-2",
        student: "Other",
        studentRef: "QA-002",
        term: "Tuition",
        studentId: "2",
        currency: "AED",
        amt: 20,
        paid: 0,
        balance: 20,
        status: "Paid",
      },
    ];
    c.feeFilters().student = "1";
    let rows;
    c.studentDownloadCSV = (_name, r) => {
      rows = r;
    };
    c.feeExport();
    expect(rows).toHaveLength(2);
    expect(rows[1]).toContain(8);
  });
});
