# Testing guide

Different checks answer different questions: page rendering, form opening, persisted writes, ownership isolation, exports, and external delivery must be verified separately. Use a fictional local or dedicated test database for scripts that mutate records.

## Automated checks

From the repository root:

```bash
npm --prefix client ci
npm --prefix client run typecheck
npm --prefix client test
npm --prefix client run build
npm --prefix server ci
npm --prefix server run format:check
npm --prefix server run lint
npm --prefix server run typecheck
npm --prefix server run test:unit
npm --prefix server run test:integration
npm --prefix server run build
```

Client tests use Vitest/JSDOM; the Cafeteria regression test evaluates its renderer against empty and populated menus. Server Jest projects separate unit tests from integration tests. Integration setup creates a temporary `MongoMemoryReplSet` with WiredTiger, connects Mongoose, and clears collections between tests. A compatible MongoDB binary must be cached or downloadable; test failures caused by binary/network prerequisites do not establish a feature failure.

CI runs these checks, dependency audits, and Docker builds. It does not deploy or run the browser smoke scripts.

## Focused client smoke scripts

Scripts are declared in `client/package.json` under `test:smoke:*`. Most non-browser scripts evaluate the local shell/source scripts through JSDOM and connect to an API. They test the local source against that API, not the JavaScript downloaded from a deployed URL.

| Script family | What to account for |
|---|---|
| `curriculum`, `crm` | Create/update records and exercise live persistence; inspect each script's cleanup |
| `classes`, `parents` | Delegates to the corresponding `tests-e2e/<module>/run.cjs` with isolated local fixtures |
| `roles` | Changes live state; inspect cleanup before execution |
| `communication:read`, `settings:read`, `audit:read`, `insights:read`, `dashboard:read` | Read/render checks may include intercepted actions or fixture substitutions; inspect assertions |
| `documents` | Source-based document UI/API checks; inspect file/publish substitutions |
| `documents:browser`, `idcards:browser`, `reports:browser` | Real Chromium loading; some mutations/downloads are intercepted rather than persisted |

Common variables are `SCHOOLOS_CLIENT_URL`, `SCHOOLOS_API_URL`, `SCHOOLOS_SMOKE_EMAIL`, and `SCHOOLOS_SMOKE_PASSWORD`. Browser scripts use `SCHOOLOS_CHROME_PATH` to locate a preinstalled Chromium executable and otherwise default to a cache path under `~/.cache/ms-playwright/chromium-1243/`. They communicate through Chrome DevTools using `ws`; they do not install a browser.

A local example, using the seed's fictional Administrator account:

```bash
SCHOOLOS_CLIENT_URL=http://localhost:5173/ \
SCHOOLOS_API_URL=http://localhost:4000/api/v1 \
npm --prefix client run test:smoke:curriculum
```

For browser scripts, `SCHOOLOS_CLIENT_URL` selects the page, while the page's built/development API configuration controls its API requests. Set `SCHOOLOS_CHROME_PATH` to your installed browser before running a browser script.

Do not point a mutation script at a deployed API while its MongoDB cleanup still targets a different local database. Inspect cleanup and intercepted requests first. Some scripts alter existing permissions or portal state, and some delete audit entries for their cleanup scope; they are not general production health checks.

## Historical E2E tools

See [tests-e2e/README.md](../../tests-e2e/README.md). The utilities there are not wired into npm or CI and have extra browser/package/filesystem assumptions. Prototype audits and mocked write-through captures cannot establish real backend persistence.

## Recorded October 8, 2026 checks

The live Administrator browser pass inspected 38 module screens: 37 rendered, while direct Cafeteria navigation failed with an empty-menu `MENU[0].day` access. Cafeteria was disabled in live settings. It also opened 27 forms, exercised 51 tab/navigation actions, and verified selected Curriculum and CRM persisted workflows. Fictional records created for those selected writes were deleted; their audit history may remain.

The subsequent local fix verification passed the frontend build, 20 client tests, production browser rendering of all 38 modules, empty-menu handling, and authenticated local login/API hydration/navigation. The production browser observed the main React bundle plus one hashed runtime asset, replacing 53 sequential runtime requests.

These are recorded checks, not a claim that the AWS site contains the latest build. Post-deployment performance has to be measured again. Other-role isolation, payment settlement, payroll execution, physical biometric devices, notification delivery, every upload/export, and concurrency behavior were not all verified by that browser pass. Feature-specific historical checks are linked from [docs/README.md](../README.md).

## Live workflow regression fixes (8 October 2026)

Regression coverage includes LMS course creation and persistence, authentication/role and input rejection, Staff onboarding file uploads and rollback after upload failure, and payroll period rendering/CSV download with exact amounts and spreadsheet escaping. The old WPS button was a toast-only placeholder; the replacement is a labeled payroll CSV export, not a bank-upload SIF.

Run the client regression suite with `npm test --prefix client` and the LMS integration suite from `server` with `npm test -- --selectProjects integration --runTestsByPath tests/lms.test.ts`. Integration tests use an isolated temporary MongoDB replica set and need permission to open local ports.

Validation for these fixes: both production builds passed, 25 client tests and 12 LMS integration tests passed. Isolated local Chromium verified three saved Staff attachments, LMS course survival after full reload, actual payroll period display and CSV download. Final browser run captured no runtime/network errors. This verifies local changes; AWS requires deployment of backend and frontend before a live retest.

## Students enhancement verification

See [Students release](../modules/students/README.md) and [reproducible six-role browser runner](../../tests-e2e/students/README.md). The Students API regression command is `npm test --prefix server -- --selectProjects integration --runTestsByPath tests/students.test.ts tests/students-enhancements.test.ts`. Browser tests use temporary local data; production is not modified.

Authenticated module browser suites: [Students](../../tests-e2e/students/README.md) and [Parents](../../tests-e2e/parents/README.md). Run them sequentially because they share local ports; both use isolated temporary databases.

Classes and Attendance maintained suites: [Classes](../../tests-e2e/classes/README.md), [Attendance](../../tests-e2e/attendance/README.md). Both use the shared isolated runner and cover six authenticated role views.

## Fees, Exams and Communication enhancement verification

Maintained isolated suites: [Fees](../../tests-e2e/fees/README.md), [Exams](../../tests-e2e/exams/README.md), [Communication](../../tests-e2e/communication/README.md). Each authenticates six actual roles and performs persisted forms, reload checks, exports where supported and mobile views. Run sequentially.

```bash
npm run test:integration --prefix server -- --runTestsByPath tests/fees-enhancements.test.ts tests/exams-enhancements.test.ts tests/communication-enhancements.test.ts tests/fees.test.ts tests/exams.test.ts tests/messages.test.ts tests/announcements.test.ts tests/students-enhancements.test.ts
npm run test:unit --prefix server -- --runInBand --runTestsByPath tests/unit/fees.ownership.test.ts tests/unit/exams.ownership.test.ts tests/unit/exams.grading.test.ts tests/unit/messages.ownership.test.ts
```

New coverage proves integer-cent accounting, transaction rollback/concurrent payments, request replay, family filter intersection, versioned schedules/corrections, publication and profile privacy, class-filtered immutable report-card snapshots, actual audience counts, private replies and participant-specific archive/read state. These are local release checks; external payment settlement, signed PDFs and external notification delivery remain outside the release.

## External delivery, PDF signing and pastoral care

Maintained local suites: [Delivery/PDF](../../tests-e2e/delivery/README.md), [Health](../../tests-e2e/health/README.md), [Behaviour](../../tests-e2e/behaviour/README.md). Run sequentially with the shared runner. Live provider secrets and school signing identity are deferred. Delivery fixtures never start the external worker; server tests mock provider responses and verify signed callbacks. PDF tests use a temporary fictional certificate plus OpenSSL cryptographic verification and tamper rejection.

```bash
npm run test:integration --prefix server -- --runTestsByPath tests/notifications.test.ts tests/certificates-pdf.test.ts tests/health.test.ts tests/health-enhancements.test.ts tests/behaviour.test.ts tests/behaviour-enhancements.test.ts
```

[Staff operations E2E](../../tests-e2e/staff/README.md) covers HR, leave and payroll across six roles, including actual file uploads and checklist activation. Server regression command:

```bash
npm run test:integration --prefix server -- --runTestsByPath tests/staff.test.ts tests/leave.test.ts tests/payroll.test.ts tests/staff-enhancements.test.ts
```

Fixtures prove simultaneous same-request approval deducts once, overlapping submissions cannot race, approved cancellation refunds once, and payroll uses exact cents/current versions/payment references. No bank transfer or real salary payment is performed.

## Curriculum

16 Curriculum integration cases and 35 six-role browser workflows passed, including scoped uniqueness, calendar dates, stale edits, archive/restore and an old-index migration. Both builds and targeted lint passed. Browser workflows and commands: [Curriculum E2E](../../tests-e2e/curriculum/README.md). Temporary logs remain in `/tmp`; rollout needs the documented scope migration, which was not run against production.

## Learning (LMS)

17 integration, 17 unit and 48 six-role browser cases passed. Coverage includes family grade scope, drafts, transactional submissions, date-only school-timezone deadlines, grading history and actual course archive/restore. Builds and targeted lint passed. See [LMS E2E](../../tests-e2e/lms/README.md).

## Library

20 integration and 44 six-role browser cases passed, plus the dashboard arrival shortcut regression run. Tests include transactional stock/loans, concurrent borrower allowance, real fulfilment, child ownership, versioned renewals and atomic portal reminder repeat guards. Builds and targeted lint passed. See [Library E2E](../../tests-e2e/library/README.md).

## Transport

14 integration and 53 six-role browser cases passed, including actual route/rider/incident/maintenance/archive workflows, family roster privacy, concurrency and truthful legacy-map behavior. Library/Transport ownership/validation units passed 17 tests. Both builds and targeted lint passed. See [Transport E2E](../../tests-e2e/transport/README.md).

## Hostel

17 integration, six unit and 49 six-role browser cases passed. Workflows include actual bed allocations, gate-pass consent/departure/return, owned family cancellation, roll-call corrections/bulk preservation, rapid date switching, maintenance and archive/restore. Both builds and targeted lint passed. See [Hostel E2E](../../tests-e2e/hostel/README.md).

Cafeteria: `npm --prefix server run test:integration -- --runTestsByPath tests/cafeteria.test.ts tests/cafeteria-workflows.test.ts` covers atomic wallet/ledger writes, cent arithmetic, retry idempotency, reviewed care plans and role ownership. Five ownership unit tests and all 29 six-role browser cases passed; see [Cafeteria workflows](../../tests-e2e/cafeteria/README.md).

Expenses: `npm --prefix server run test:integration -- --runTestsByPath tests/expenses.test.ts` verifies independent/concurrent review, one-time referenced reimbursement and own cancellation. Seven ownership unit tests and 27 six-role browser cases passed; see [Expenses workflows](../../tests-e2e/expenses/README.md).

Inventory: `npm --prefix server run test:integration -- --runTestsByPath tests/inventory.test.ts` verifies stock receipt rollback/concurrency and versioned inspections. Eight transition unit tests and 28 six-role browser cases passed; see [Inventory workflows](../../tests-e2e/inventory/README.md).

Calendar: `npm --prefix server run test:integration -- --runTestsByPath tests/events.test.ts tests/facilities.test.ts` verifies venue/audience/lifecycle behavior; all 19 integration, nine overlap unit and 21 six-role browser cases passed. See [Calendar workflows](../../tests-e2e/calendar/README.md).

Biometric registry: seven API and 21 six-role browser cases passed; no physical hardware ingestion is claimed. See [Biometric workflows](../../tests-e2e/biometric/README.md).

Visitors: 10 admission/checkout integration tests and all 21 six-role browser cases passed. See [Visitor workflows](../../tests-e2e/visitors/README.md).

Certificates: 16 registry/request/PDF integration tests, nine unit tests and 22 six-role browser cases passed; production identity remains deferred. See [Certificate workflows](../../tests-e2e/certificates/README.md).

Documents current release: 12 integration tests and 21 six-role browser cases passed, with actual uploads/previews/old-version downloads. Historical fixture-intercepted browser notes are superseded for these workflows; see [Documents workflows](../../tests-e2e/documents/README.md).

ID Cards: 15 integration tests and 21 six-role browser cases passed, including owned PDFs and replacement lineage. See [ID Card workflows](../../tests-e2e/idcards/README.md).

Alumni: 10 integration tests and 19 six-role browser cases passed. See [Alumni workflows](../../tests-e2e/alumni/README.md).

Facilities: 24 combined Facilities/Calendar integration tests and 15 six-role browser cases passed. See [Facilities workflows](../../tests-e2e/facilities/README.md).

Helpdesk: 15 integration tests and 21 six-role browser cases passed. See [Helpdesk workflows](../../tests-e2e/helpdesk/README.md).

Surveys: 14 integration tests, 11 unit tests and 21 six-role browser cases passed. See [Survey workflows](../../tests-e2e/surveys/README.md).

Reports: seven integration tests and 14 six-role browser cases passed. See [Reports workflows](../../tests-e2e/reports/README.md).

Roles/Settings: 19 integration tests, six unit tests and 19 six-role browser cases passed. See [Platform workflows](../../tests-e2e/platform/README.md).

Audit: 12 integration tests and 16 six-role browser cases passed. See [Audit workflows](../../tests-e2e/audit/README.md).

Recorded Insights/dashboard: ten combined Insights/Reports integration tests and 14 six-role browser cases passed. See [Insights workflows](../../tests-e2e/insights/README.md).


## Final shared regression

Arabic/RTL: 36 six-role browser cases passed, including all 38 registered workspace views per role, translated shell/help/command search, saved tickets, preserved dropdown values and form edits, date/error display, permission-aware expired-token file downloads and mobile geometry. See [Arabic checks](../../tests-e2e/arabic/README.md).

Timetable: 18 six-role browser cases passed; CRM: 20; Admissions: 12. The fixtures cover actual saved assignments and substitutes, full CRM pagination and duplicate-name identity, and document-gated enrollment. Their module documentation records remaining product boundaries.

The current backend regression passed all 69 integration suites. The combined Jest process reached its heap limit after 65 suites; the four remaining suites passed in fresh, bounded runs. This is a test-process memory limit, not a successful all-in-one command. For large integration runs, invoke bounded groups using `npm --prefix server run test:integration -- --runTestsByPath tests/<suite>.test.ts ...`. Do not read real environment secrets or run test fixtures against the production database.

The full unit run passed 347 checks; the client run passed 82 checks. Builds passed; server lint has one existing `curriculum.migrate.ts` console warning. At that earlier run, the Vite large-chunk warning and dependency advisories were unresolved; the production readiness regression below supersedes their status. Production Resend/SMS/signing credentials, hardware integration and deployment remain deferred.

The final browser regression passed 37 suites across 222 authenticated role runs: 1,099 workflow cases with zero failed cases and zero JavaScript runtime exceptions. Arabic additionally visited every registered workspace (228 view visits). Initial Attendance failures followed a prolonged execution pause and a local MongoDB connection timeout; the full fresh Attendance run passed. Delivery assertions were moved to the current record drawer, and the Chromium harness now waits for a page target. CRM late-response drawer replacement was fixed and verified with a deliberately delayed real API response. The fresh reports contain no HTTP 500 responses; intended authorization, stale-edit and expired-token responses remain recorded separately.

## Production readiness regression (supersedes earlier dependency/build warnings)

The previous module-release counts above are historical. The new readiness work passed a clean full run of **70 integration suites / 561 tests**, **75 backend unit suites / 359 tests**, and **12 client suites / 83 tests**. Run the whole integration corpus with `npm --prefix server run test:integration:all`; it starts fresh Jest processes in groups of eight to bound retained memory. Existing `test:integration -- --runTestsByPath ...` remains available for focused verification. CI now uses the bounded full runner. Server formatting, lint and builds pass; the previous console warning is resolved. Fresh dependency audits are zero for backend and frontend, including development dependencies.

[Production loading checks](../../tests-e2e/performance/README.md) passed 30 cases across six roles: actual built assets, unreleased React page exclusion, every classic workspace, Arabic, cold font-provider failure, immediate logout revocation and a deliberately delayed prior-account response. Main JavaScript is about 198 KB (previously 536 KB), and the UTF-8 classic runtime is about 1.57 MB (previously 2.32 MB).

[Isolated pilot](../../tests-e2e/pilot/README.md) passed 36 cases across six roles with 3,031 students, 60 sections, 6,000 attendance entries and 3,000 invoices. It verifies family ownership, roster pagination/search, finance permissions/idempotency, persisted Arabic tickets, delayed-list save refresh, all Arabic workspaces, mobile layout and session reload. The pilot found and fixed a real Helpdesk list/save race. Local staff-role login observations were roughly 3.8–5.6 seconds with the large fixture and concurrent QA workload; legacy all-module hydration still scales with dataset size. These are not AWS load-test guarantees.

[Operations drills](../../tests-e2e/operations/README.md) cover ten encrypted backup/restore checks, nine static rollback checks, nine native Nginx checks, six package integrity checks and five subprocess preflight/production-seed checks. Records are fictional, databases are isolated, artifacts remain in `/tmp`, and no actual bank payment or live external delivery was performed. Docker image verification is pending an available Docker engine. Deployment/provider setup remains user-deferred, and native Arabic terminology plus school-staff acceptance require actual human review.

## Continuing local review

13 October 2026: local MongoDB replica set, API and frontend were started for review. The empty local database received the documented fictional demo seed; no production database was used. Arabic terminology was reviewed against its actual school context, and the localization catalog has 3,433 keys with no empty Arabic entries. Updated unit/browser verification is recorded in the [localization acceptance guide](../modules/localization/README.md); human school-staff/native-speaker acceptance remains open.

Personal notifications / CRM: `server/tests/crm-inbox.test.ts` checks recipient isolation, saved read state, pagination, account assignment, due-event deduplication and mocked prospect email delivery. `server/tests/unit/notification-sns.test.ts` checks AWS SNS acceptance, missing credentials and ambiguous timeouts without network sends. The six-role CRM browser suite also covers the bell inbox, persisted assignment/completion, exact lead links and Arabic controls. See [Notifications](../modules/notifications/README.md).

Teacher automation adds `server/tests/lms-automation.test.ts` (nine cases for mapping boundaries, templates, atomic batch retries, schedules/revocation, linked notifications, approval gates, grading scope and concurrent event deduplication). Run `npm run test:integration --prefix server -- --testPathPatterns=lms-automation`. Frontend teacher-control tests are under `client/src/features/lms/__tests__/`. LMS browser fixtures now assign real teaching mappings; 54 checks across six roles passed. Fixtures and provider mocks do not send live messages.

Teacher continuation: `server/tests/teacher-reminders.test.ts` contains 10 isolated cases covering before/overdue deduplication, non-submitters, suspended guardians, stale queued jobs, transactional attendance opt-in, mapped teacher approval, unavailable channels and cross-staff repeat saves. `client/src/features/attendance/__tests__/alerts.test.js` covers clean-draft alert selection retention and context isolation. Final continuation checks: 120 client, 364 server unit, 34 distinct targeted API checks, 54 LMS and 62 Attendance browser workflows; both builds and backend lint passed. Provider/live delivery remains outside this fixture verification.

Teacher AI Studio: run `npm run test:integration --prefix server -- --testPathPatterns='teacher-ai|lms-enhancements|lms-automation|notifications'`, `npm run test:unit --prefix server -- --runInBand`, `npm test --prefix client`, then build the backend and run `SCHOOLOS_TEST_MODULE=lms node tests-e2e/helpers/run.cjs`. Use the temporary-Mongo prerequisites above. The LMS fixture intercepts the AI provider only; it tests actual drafts, permission checks and reviewed school-record actions. Live generation quality and provider account access are not established by fixture tests. Configuration and usage are maintained in [LMS](../modules/lms/README.md#teacher-ai-studio).
