# Expenses

The released workspace lists saved staff claims with search, status filters, pagination, CSV export, responsive details and dated history. It distinguishes Pending, Approved, Rejected, Cancelled and Paid. Totals derive from visible claims; prototype budgets are no longer presented as actual accounting data.

Administrator, Principal, Teacher and Accountant submit only for their linked staff profile. Teacher sees only their own claims. Finance/leadership sees all claims; Parent/Student receives no records, including when a legacy staff link exists. Submission records a real past/current school-calendar expense date, positive two-decimal amount, category, description, optional vendor and receipt reference. Uploaded receipt files are not yet part of this workflow.

Administrator, Principal and Accountant independently approve/reject another submitter's Pending claim. Saved version and review notes are mandatory. Atomic status/version conditions prevent two reviewers from overwriting each other's decisions. Recorded submitter identity and staff ownership prevent self-review. The submitter can cancel only their own Pending saved version; cancellation retains history.

Finance records reimbursement only for an Approved current version, with actual payment date, method, reference and confirmation reason. Paid records cannot be paid again or reviewed/cancelled. This records an already confirmed reimbursement; it does not move money or contact a bank. Receipt evidence storage, editable/resubmitted claims, policy limits, budget allocations, taxes and accounting integrations remain future capabilities.

## Verification

See [browser workflows](../../../tests-e2e/expenses/README.md). Isolated integration tests cover staff privacy, independent review, concurrent decision protection, one-time referenced reimbursement, own cancellation and amount/calendar validation. Production deployment remains deferred.

Recorded verification: 12 integration tests, seven unit tests and all 27 six-role browser cases passed. Both builds and targeted lint passed.
