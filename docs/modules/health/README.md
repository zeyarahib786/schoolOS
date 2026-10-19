# Health & Clinic

The released screen uses saved clinic records with a full paginated load, search, date/severity/outcome filters, due follow-ups, record drawers and leadership-only filtered CSV export. Counts use actual stored records and the configured school timezone; no immunisation percentage is invented.

Administrator/Principal sees the clinic register and manages outcomes, family-contact confirmation and follow-up dates/notes. Teacher may record today's handover, but cannot browse historical medical records or change follow-ups. Parent sees explicitly linked children; Student sees the profile explicitly linked to their login. Accountant and unrelated accounts see no clinic history. Family-contact confirmation records a staff action; it does not claim email/SMS delivery.

New visits require an active student and valid non-future school calendar date. Only the office can backdate records. Follow-up dates cannot precede the visit. Corrections require the current `expectedUpdatedAt` and a reason; concurrent stale changes return 409, and dated outcome history is retained. Original clinical reason, recorded care, medication and vitals stay on the visit. General audit entries reference record IDs rather than exposing clinical reasons. No delete workflow erases clinic history.

The module records staff actions and observations; it does not prescribe care. Immunisation registries, medication stock/dosage authorization, nurse-specific roles, independent custody rules and integrations with clinical systems remain separate capabilities. No automatic external medical notification is enabled.

## Verification

Integration suites: `server/tests/health.test.ts`, `health-enhancements.test.ts`. They verify active-student rules, real calendar dates, office-only backdating, owned family reads, denied history/updates, versioned corrections, contact timestamps, pagination and audit privacy. The original family fixture now links accounts through an authorized office user instead of a Teacher.

Browser workflows: [Health E2E](../../../tests-e2e/health/README.md), using actual forms, safe literal HTML, filters, saved updates/history, reload and mobile views across six roles. Local verification: 13 integration tests and 29 browser cases passed across six authenticated roles, with zero JavaScript exceptions. Both builds and targeted lint passed. Deployment remains deferred.
