# Attendance

The released screen is `client/public/assets/js/modules/58-attendance.js`. It replaces demo trends, fabricated staff names and toast-only notification promises with saved records. Deployment is deferred.

## Register and reporting

- Choose a class, date and AM/PM session. Only active students are included; roster order follows roll numbers.
- Blank rows explicitly show **Not marked**. Administrator, Principal and Teacher can mark Present, Late, Absent or Excused, bulk mark a class Present, add per-student notes and save a complete register.
- Drafts persist when changing class/session/date or navigating away. Switching context asks before leaving a dirty draft; reloading saved data asks before discarding it. A browser refresh/close warns about unsaved drafts; drafts live in memory and are not recovered after refreshing.
- Saved corrections need a reason. Each entry includes its last observed timestamp (or null for an unmarked entry); stale writes return 409. A batch is transactional, so a stale/invalid entry cannot partly save the class. Dates are normalized to UTC midnight calendar keys, while the current/future school day uses the school setting's timezone.
- Monthly summaries show **both AM and PM** for the complete authorized roster. Exports contain actual saved records for the selected class/month, including notes.
- Rate = (Present + Late) / (Present + Late + Absent); Excused and unmarked sessions are excluded. No counted sessions displays a dash. Student profile/dashboard rates use the same Excused-excluding rule; profiles with only Excused records say "Excused only". Follow-up flags below 85% only after at least 10 counted sessions. These are visible operational rules, not predictions.

Parent sees linked children and Student sees their linked record; both are read-only for marking. Requested child filters intersect ownership instead of overriding it. Accountant sees staff attendance only and receives no student-register controls. Staff self-attendance stores actual authenticated records; Teacher sees own staff row, managers/Accountant can view submitted staff rows. Unmarked staff are not assumed present and no reminder delivery is claimed.

## Absence requests

Parent can submit a request for a selected linked active child; teaching roles can submit/review school requests. Student can read owned request history but cannot submit/review/cancel requests. Pending/approved overlapping requests are rejected. Requests are limited to 60 days and retain their decision notes/status.

Approval and its attendance updates occur transactionally. Unmarked or Absent sessions become Excused; Present/Late records remain untouched. Pending requests can be cancelled by their requester or a reviewer. Pending status is checked during the update so a concurrent decision/cancel cannot silently replace a final decision. Approval/rejection from dashboard opens the same explicit decision form. External email/SMS are not sent.

## API and verification

The active screen uses `PUT /attendance/register` with `{date, session, entries: [{studentId, status, notes, expectedUpdatedAt}], correctionReason?}`. Student IDs must be unique, existing and active; future calendar days are rejected. A missing correction reason returns 400 and stale timestamps return 409.

Existing `POST/PUT /attendance/mark` remain for API compatibility: student validation, UTC date normalization and atomic batches are enforced; legacy PUT is an authenticated unconditional upsert and does not enforce the new endpoint's optimistic-version/correction-reason contract. Integrations needing protected corrections should use `/register`.

Run `node tests-e2e/attendance/run.cjs`; [six-role browser suite](../../../tests-e2e/attendance/README.md). Backend: `npm run test:integration --prefix server -- --runTestsByPath tests/attendance.test.ts tests/classAttendanceEnhancements.test.ts`. Unit timezone/ownership checks: `npm run test:unit --prefix server -- --runTestsByPath tests/unit/attendance.dates.test.ts tests/unit/attendance.ownership.test.ts`.

Tests use temporary MongoDB and real authenticated Chromium actions. They verify explicit blanks, validation, register persistence, corrections/concurrent-editor rejection, separate sessions, saved summaries, absence create/approve/cancel, staff self-marking, ownership and mobile layouts. Screenshots/reports stay under `/tmp`.

## Remaining extensions

A configurable school-day/holiday calendar, period/subject attendance, register approval/locking, append-only per-entry revision history, durable offline drafts, school-wide alert policy and biometric synchronization are separate enhancements. Approval currently covers every calendar day and both sessions in a date range; configure school-day policy before treating that as a statutory register. Historical attendance is currently fully hydrated by the shared adapter; large schools need bounded month loading/aggregate reports. Existing legacy timestamped records may require a reviewed migration before being treated as canonical calendar-day keys. Tenant isolation remains a platform project; this is not a claim of universal-school or regulatory certification.

Recorded local verification: Classes 29 browser workflow checks and Attendance 50, across all six authenticated roles; Students regression 54 browser checks. Backend combined regression passed 66 checks, with a further 10-check focused enhancement run covering transactional rollback. Ownership/timezone unit checks passed 8 checks. No runtime exceptions remained after the focused Principal regression rerun. API role denials and intentionally rejected correction/stale writes are expected in network evidence.

Final client regression: 71 checks passed; client/server production builds and targeted backend lint passed. Vite retains the existing large-bundle advisory. Deployment and any historical data migration require a separate rollout.

## Arabic attendance views

Daily instructions, active-student counts, monthly/follow-up headings and explanations, absence requests and staff self-attendance controls use Arabic UI copy. Student/staff names use the shared locale display helper; admission identifiers retain their original order. Absence-request student options display localized names while preserving the canonical option values used to find the submitted student. English switching updates already-open dropdowns without changing selections. School timezone identifiers remain unchanged as configuration values.

Regression checks exercise actual daily/monthly/follow-up/staff markup, Arabic names, English reversal, option-value preservation and all six role views through the Attendance browser suite.

## Opt-in confirmed guardian alerts

In the daily register, teaching roles can select **Notify guardians for saved Absent/Late records**, then choose In-app only, Email request or SMS request. Alerts are off by default and live inside each unsaved register draft. Class/date/session changes preserve separate preferences. Save still requires a complete roster and the existing correction reasons/version checks. Alert intent is stored in the same transaction as the records; a failed register save cannot queue alerts. Only today's school-calendar register can request alerts. Teacher alert requests additionally require an active teaching mapping for that class in the current academic year; unrelated legacy attendance permissions are not broadened.

The minute worker processes explicit requests for actual Absent/Late records, never blank, Present or Excused rows. Only the active linked primary Parent account receives the in-app event. Inactive students, suspended parents and changed/revoked teaching access are excluded. External requests use the selected configured provider, verified account contact and existing office approval for Teachers. SNS configuration is still required for real SMS. If a channel/contact is unavailable, the in-app event remains and no external delivery is invented. Background processing records an alert summary without modifying the register's edit timestamp.

An event is deduplicated per student register row/status/parent, including repeated saves by different staff. Changing Absent to Late creates a distinct status update; saving a note or the same absence does not automatically resend it. Pending external jobs recheck status and current guardian linkage before delivery. Previously delivered messages and saved inbox history cannot be recalled; the authoritative register shows corrections. For another intentional external attempt, inspect/retry the existing job through Communication under its safe retry rules.

The new controls use a stacked mobile layout. All 62 six-role Attendance browser checks passed, including opt-in controls, draft selection retention, family read-only views and mobile register/monthly widths. See the [LMS continuation verification](../lms/README.md#pending-homework-reminders) for shared API/unit coverage. No real families were contacted.
