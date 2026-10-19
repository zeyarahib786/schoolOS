# Staff & HR

The active Staff workspace uses the full server directory with search, department/status filters, pagination, leadership exports and employee profiles. Attendance counts use real attendance records; on-leave counts use dated approved requests. No fixed payroll/attendance percentages are invented.

Administrator/Principal manages employees, documents, joining checklists and portal links. Accountant sees the directory for payroll, with other employees' document/checklist/history metadata removed. Teacher sees only the explicitly linked profile. Parent/Student cannot read HR records, even if a legacy link exists. Eligible existing active staff-role accounts may link by matching email; family-role accounts never auto-link. Office can explicitly link/unlink a different existing staff account with a reason. Account-link transactions serialize changes and prevent one account from being linked to multiple profiles.

Employee edits require `expectedUpdatedAt` and a change reason, retaining dated employment-status and annual-balance history. Uploads/checklist changes use a version guard. Identity, qualification, photo, experience, visa and attestation uploads are private; authorized users can view supported PDF/images or download documents. Office activation from Onboarding requires required ID/degree/photo files and all joining tasks. Files are served private/no-store. Active staff with operational history cannot be deleted; use an employment status change instead.

## Leave and attendance

Staff-role users request their own leave; office may request for another employee. Requests validate real calendar dates, range length and overlap. Day counts include weekends; holiday/workday policies are not inferred. Annual leave uses the stored annual balance. Sick, Casual and Unpaid categories do not automatically deduct that balance; separate entitlement rules remain school configuration work.

Overlap checks serialize per employee. Approval and annual deduction run in one transaction; concurrent decisions cannot deduct twice or leave a half-approved record. Office cannot decide its own leave. Pending requests can be cancelled by their owner or office. Approved cancellation requires office review and transactionally refunds annual days once. All decisions/cancellations retain notes/history. Self-attendance uses the existing real account/day endpoint.

Deactivating employment does not independently deactivate the portal User account; manage account status through the account administration workflow. Multiple concurrent portal roles, holiday policies, recruitment/contract templates and jurisdiction-specific employment rules are outside this release.

## Verification

`server/tests/staff.test.ts`, `leave.test.ts`, `payroll.test.ts` and `staff-enhancements.test.ts` passed 45 isolated integration tests. Coverage includes legacy family-link prevention, private HR files, stale edits, concurrent overlap/approval/refunds, exact payroll and owned binary PDFs. [Staff E2E](../../../tests-e2e/staff/README.md) covers all six actual roles and full onboarding uploads/activation. Ownership/day-count units passed 24 tests. All 48 browser workflow cases passed across the six roles, with zero JavaScript exceptions. Both builds and targeted lint passed. Deployment remains deferred.

## Arabic directory and profile

Employee display names use saved language translations when present and a display-only name transliteration fallback otherwise. Directory search accepts localized names and known job titles, while edits and exports retain original record values. Arabic job titles, calendar-day balances, onboarding checklist items and document-type labels switch back to English without changing API values. Phones use Arabic digits inside isolated left-to-right elements in both directory and profile; employee identifiers, emails and uploaded filenames stay unchanged. Unknown custom job titles require an approved translation in the locale catalog.

Regression checks cover actual directory/profile markup, canonical data preservation, dropdown values, language reversal and role-specific browser workflows in `tests-e2e/staff/`.
