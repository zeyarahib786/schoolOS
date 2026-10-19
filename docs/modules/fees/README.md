# Fees & Invoicing

Released interface: `client/public/assets/js/modules/60-fees.js`. API: `server/src/modules/fees/`. This enhancement replaces demo collections/structure with saved invoice balances, payment receipts and configurable fee heads.

## Workflows

- Finance staff raise an invoice for an active student in the configured school currency, with a unique reference, charge description, amount and valid calendar due date.
- Search by reference/student/description, filter by student/status, paginate the complete ledger and export the filtered selection. Billed, collected, outstanding and overdue totals come from those records; different currencies are kept separate.
- Open an invoice to inspect its actual payment history. Collect against that exact invoice, review the student/amount/remaining balance and explicitly confirm. Recording documents money already received; it does not initiate a charge or bank transfer.
- Partial and full payments use integer-cent arithmetic and a MongoDB transaction for the payment record and invoice balance together. Overpayments, extra fractional cents and already-paid charges are rejected. A form keeps its idempotency key across retries; the same key/details replay without another receipt, while changed details conflict.
- Receipts have the full saved payment ID. Invoice, receipt and collections CSV exports contain actual records and neutralize spreadsheet formulas. No receipt count or term chart is fabricated.
- Create/edit/archive reference fee heads with stale-edit protection. These prices do not retroactively alter invoices or automatically bill students.
- Preview up to 100 selected outstanding invoices before confirming in-app reminders. Only active, unsuspended linked Parent accounts receive messages; paid/unlinked records are skipped. An explicitly empty selection sends nothing.
- Overdue means an outstanding invoice whose calendar due date is before today in the configured school timezone. Due today remains due, not overdue.

## Role policy

| Role | Access |
|---|---|
| Administrator / Principal / Accountant | Full invoice and payment ledger; raise/collect/export; fee heads; selected reminders |
| Parent | Own linked children's invoices and payments; ledger and exports; no finance writes |
| Student | Own linked student record's invoices and payments; ledger and exports; no finance writes |
| Teacher | Fees navigation hidden; direct UI restricted; API returns no financial records and rejects writes |

A requested student filter is intersected with family ownership, including payments; requesting another child's ID cannot widen access.

## Verification and operation

Integration suite: `server/tests/fees-enhancements.test.ts`, plus `fees.test.ts` and ownership unit tests. Browser runner: [Fees E2E](../../../tests-e2e/fees/README.md). It exercises real forms, persistence after reload, receipts/CSV, reminders, role controls and mobile layouts using an isolated replica set and fictional accounts.

Transactions require a MongoDB replica set (Atlas or a configured replica set on AWS). Preserve existing invoices and payments when deploying. New optional payment keys and the `FeeHead` collection need no destructive migration; provision/verify the partial unique payment-key index through the application's normal model/index process.

AWS deployment is deferred. This release is manual fee accounting, not bank settlement. Refunds/reversals, instalment plans, automatic bulk billing, tax/accounting integration, signed receipt PDFs and gateway reconciliation remain future work. Do not represent CSV receipts as bank confirmation.

Local release verification: 33 browser workflow cases passed across all six actual authenticated roles, with no JavaScript runtime exceptions. Shared checks passed: 69 integration tests across eight suites, 24 targeted backend unit tests, 78 client tests, both production builds and targeted backend lint. Students also passed its 54-case six-role browser regression. Expected permission denials from unrelated background hydration endpoints are recorded separately; this is not an AWS deployment result. The existing Vite large-chunk advisory remains.

Arabic collections copy now translates the recorded-payment explanation. Invoice/receipt student names and selection labels use the central authenticated name registry without modifying invoice data or option values.
