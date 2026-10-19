# Payroll

The active payroll screen loads saved records with employee/period search, status/month filtering, pagination and filtered CSV exports. Administrator/Principal/Accountant generates and manages payroll; Teacher reads only the explicitly linked employee's records. Parent/Student cannot read payroll, including through legacy HR links.

Amounts validate two decimal places and calculate in integer cents. Each employee/month has one record. New records retain currency and employee-name/reference/designation snapshots. Corrections require the current `expectedUpdatedAt` and a reason, preserve the previous/resulting net amount and cannot change a different period accidentally. Paid periods are locked against regeneration.

Recording Paid requires current version, actual non-future payment date, method and reference. The transition is atomic and cannot occur twice. It records payment already made outside SchoolOS; no transfer or settlement occurs here. Bank WPS files and banking-provider setup remain deferred. CSV exports clearly identify actual figures, currency, status and payment references.

Authorized users can download a real payslip PDF. These payroll copies are explicitly unsigned; certificate-based signing is available for issued school certificates, not silently claimed for every payroll file. Snapshot amounts and employee identity remain stable; PDF decoration uses current school settings. PDFs use private/no-store caching. Paid-month adjustments require a later-period school accounting workflow; reversing paid salary is not offered.

## Verification

Regression/financial tests live in `server/tests/payroll.test.ts` and the shared `staff-enhancements.test.ts`: decimal accuracy, invalid months, stale corrections, paid locks, simultaneous paid transitions, references and owned PDF access. Browser coverage is part of [Staff operations E2E](../../../tests-e2e/staff/README.md), with six actual roles. See [Staff & HR](../staff/README.md) for recorded shared release results and leave behavior. Deployment remains deferred.
