# Students enhancement release — updated 9 October 2026

The active production renderer remains `client/public/assets/js/modules/51-students.js`. This release enhances that screen and its server APIs; the unreleased React Students page is not used.

## What changed

- Responsive directory with accessible search, class/enrollment/fee/document filters, sorting, row counts, pagination and filter persistence when navigating away and back. Filters reset when the signed-in role changes.
- Role-specific family headings, explicit unlinked-account empty states, full profile tabs and complete editable intake fields. Optional contact/medical fields can be cleared; roll numbers preserve leading zeroes. Intake accepts school-specific class names.
- Attendance/results/invoices without underlying records are shown as missing data rather than invented percentages or paid fees. Filtered CSV export matches the current view and protects spreadsheet formula cells.
- Identity, birth and photo document upload/replace/remove/view/download controls, with persistence across reload. The View button opens an authenticated image/PDF preview; unsupported types such as Word offer a download fallback. Close with the close button, backdrop or Escape. Protected preview object URLs are released on close.
- CSV template, spreadsheet-compatible quoted CSV parsing, row validation and preview before explicit confirmation. Imports support up to 200 records per request, reject duplicate admission numbers and invalid rows, and persist atomically through a MongoDB transaction. XLSX files are not supported by this release; export spreadsheets as UTF-8 CSV.
- Administrator/Principal enrollment changes retain previous/new status, reason, effective date and actor. Linked school records are preserved. Existing generic status edits also append history.
- Portal linking/unlinking by existing active Parent/Student email. Wrong-role/inactive/missing accounts are rejected. A Student account cannot belong to two student records; a Parent can have multiple linked children. This action does not create users or send invitations.
- Account registration outside test mode now requires authenticated Administrator access. Public callers cannot mint an Administrator account to bypass the Students role policy.
- Student profiles, edit-field values and notification text are escaped to prevent stored data from becoming HTML. API validation messages include actionable validation details.

## Practical profile refinements

- The profile header shows the student's photo, admission number, class and enrollment status. JPEG/PNG/WebP photos load through the authenticated document API; missing/unavailable/non-image files retain initials. No token is embedded in an image URL, and stale drawer responses do not replace another student's photo. Accountant views retain initials and never request protected photos.
- Overview starts with emergency information: guardian and emergency phone links, blood group, allergies and medical notes. It is available to the existing authorized staff and linked family views; Accountant views omit it. Blank medical details explicitly mean not recorded, not absence of a condition.
- The recommended profile checklist links directly to Contacts, Academics, Overview, Documents or manager-only Portal links. Counts use only fields available to the current role; Accountant checks do not penalize redacted medical/doc fields. Parent/Student views direct corrections to school administration. Recommendations do not block admission.
- Create/edit warns before saving when a different admission has the same normalized name and exact birth date. Staff can cancel to investigate or explicitly save a separate student. Editing the same record does not match itself. CSV preview detects matching people both in the current roster and earlier rows in the file; confirmation warns again before importing.
- Duplicate-person detection is a **UI advisory based on the hydrated roster**, not a server-enforced identity guarantee. Different/missing DOB, spelling variants and concurrent admissions can evade this warning. Existing admission-number uniqueness remains enforced by the API. No automatic merging is performed.

## Role policy

| Role | Read scope | Edit/create | Import/enrollment/account links | Student documents |
|---|---|---|---|---|
| Administrator | School roster | Yes | Yes | Read/write |
| Principal | School roster | Yes | Yes | Read/write |
| Teacher | School roster (existing policy) | Yes | No | Read/write |
| Accountant | School roster | No | No | Hidden; API download denied |
| Parent | Linked children only | No | No | Own linked children, read only |
| Student | Own linked record only | No | No | Own record, read only |

Accountant responses omit medical notes, allergies, blood group, birth date, document metadata and enrollment history. Only school managers receive portal-account IDs. Sensitive parent/student ownership is enforced by API queries and individual document reads, not just UI visibility.

## Validation

- Client tests: 58 passed, including all six UI roles, filters, CSV parsing/validation, missing-invoice states and HTML escaping.
- Students API suites: 26 passed, covering real account links, all six authenticated roles, ownership attacks, denied writes, transaction rollback/no partial import, history and optional field clearing.
- Actual Chromium: 54 checks passed across six independently authenticated local role sessions. Principal/Teacher UI edits persisted. Administrator full edit, enrollment transitions, account links, document upload/download/reload, preview/confirm import and filtered CSV download persisted. New coverage verifies protected photo rendering across roles, checklist navigation, duplicate create/edit/import cancellation and explicit overrides, mobile profile geometry, uploaded-image View controls across authorized roles, and authenticated PDF preview.
- Mobile checks: 390 px viewport; workspace and search remain within viewport. Desktop and mobile screenshots were visually inspected.
- No captured runtime exceptions. Some non-admin roles receive expected HTTP 403 from unrelated optional module APIs during shell hydration; no unexpected HTTP failures occurred in the final run.
- Combined Students/auth integration run: 37 passed across three suites (26 Students checks plus 11 existing authentication checks).
- Registration access unit tests: 3 passed; the production-style guard was also tested with real JWTs in the integration suite.
- Production builds passed. Source changes are local; AWS has not been deployed during this enhancement.

Reproducible browser checks: [Students browser runner](../../../tests-e2e/students/README.md). Local evidence: `/tmp/schoolos-students-browser-*.json`, `/tmp/schoolos-students-*-desktop.png`, `/tmp/schoolos-students-*.png`, `/tmp/schoolos-students-api-tests.log`.

## Rollout and boundaries

Deploy backend before frontend. CSV transactions require a MongoDB replica set. Before adding the `student_portal_unique` partial unique index to an existing deployment, check for legacy duplicate non-null Student account links and resolve any duplicates. Previous untracked enrollment changes cannot be reconstructed from this new history field.

This is an enhanced Students release, not a claim of feature parity with every commercial SIS. Multiple guardian/custody relationships, full academic-year rollover/promotion, configurable intake fields, fuzzy duplicate matching and server-side duplicate-person review, scoped teacher-class access and multi-school tenancy remain separate planned work. Parents enhancement is now tracked in its own [release document](../parents/README.md); the agreed sequence is recorded in [Product roadmap](../../roadmap.md).

Attendance refinement: profile/dashboard/export rates now match the Attendance module’s Excused-excluding denominator; records containing only Excused sessions are labeled "Excused only". See [Attendance](../attendance/README.md) for operational rules.

## Arabic directory and profile display

Student and guardian display names use saved translations when available, with a display-only transliteration fallback for older records. English names, edit-field values and stored records remain canonical; directory search accepts both original and localized names. Automatically transliterated names should be reviewed against the person's preferred Arabic spelling.

Phone numbers use localized digits inside isolated left-to-right elements, including emergency-call buttons; `tel:` links retain the original dialing value. Admission identifiers and email addresses remain isolated left-to-right. Profile headings, completeness check labels, explanatory copy, action buttons, accessible-record counts and pagination translate to Arabic and switch back to English, including an already-open profile.

Document completeness labels, empty-upload messages and replacement controls are localized too; uploaded filenames remain unchanged.

Regression coverage: the localization unit suite and [Arabic browser checks](../../../tests-e2e/arabic/README.md) exercise six roles, profile tabs, stored-name preference, legacy-name fallback and phone direction using isolated fictional fixtures.

Student editing includes a separate optional **Student’s own email** field (`studentEmail`). It can be saved or cleared independently of guardian contact email and is offered when generating a student login in Settings → Login accounts.
