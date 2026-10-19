# SchoolOS enhancement roadmap

User decision, 8 October 2026: enhance one module at a time, starting with Students. Complete implementation and test Administrator, Principal, Teacher, Accountant, Parent and Student views before moving to the next module. Do not treat a render-only check as workflow verification. Deployment is deferred.

Sequence: Students → Parents → Classes & Sections → Attendance → Fees → Exams/Results → Communication → Health/Behaviour → Staff operations. Transport, Hostel, Library, Cafeteria and LMS priority depends on the school's operations. Platform foundations include school isolation, role permissions, audit history, configurable academic years and tested backups/restores.

## Students release acceptance

- Polished responsive directory with meaningful role-specific headings, live counts, persistent search/filters, sorting, pagination and filtered exports.
- Full profile and edit workflows, uploaded documents and clear empty states.
- Previewed CSV intake compatible with spreadsheet-exported CSV; validation and all-or-nothing writes.
- Administrator/Principal account linking to existing active Parent/Student users; ownership remains enforced server-side.
- Enrollment changes preserve dated reasons/history rather than deleting linked academic/financial records.
- Tests cover all six actual authenticated roles, denied writes, ownership attacks, import validation, document persistence, profile reload, empty states and mobile views.
- No claim of complete parity with every commercial SIS. Advanced academic-year promotion, multiple guardian custody, configurable intake fields and full multi-school tenancy need separate implementation before claiming universal-school readiness.

Commercial reference patterns: [Fedena student information](https://fedena.com/student-information-system-sis) and [PowerSchool SIS](https://www1.powerschool.com/solutions/student-information/powerschool-sis/): unified records, document management and family access. These are design references, not compatibility promises.

## Students progress

The initial Students enhancement release and the next practical profile refinements are implemented and validated across six authenticated roles: protected photo/header, actionable completeness checks, authorized emergency information and advisory name/DOB duplicate warnings for create/edit/import. See [Students release details](modules/students/README.md). Deployment is deferred. Parents has also been enhanced; see its progress below. Advanced capabilities listed above remain explicit future work.

## Parents progress

The first Parents enhancement release implements persisted guardian create/edit, multiple linked children, recorded consent states, explicit existing-account linking, enforced portal suspension, own-family conversations, previewed in-app broadcasts and date-based meetings. See [Parents release details](modules/parents/README.md). Classes & Sections and Attendance have also been completed together at the user’s explicit request; see below. External delivery/video and multiple independent Parent logins per child remain later work.

## Classes & Sections and Attendance

The user authorized completing both modules before stopping. Classes now includes full rosters, section create/edit, room/teacher/capacity configuration, archive/restore, stale edit protection, filters and exports. Attendance now includes class/session registers, explicit unmarked rows, protected corrections, actual monthly/follow-up reporting, absence decisions and real staff self-attendance. See [Classes](modules/classes/README.md) and [Attendance](modules/attendance/README.md) for role policy, tested workflows and limits. Both enhancement releases have passed local workflow testing across all six authenticated roles; AWS deployment remains deferred. The user subsequently authorized Fees, Exams/Results and Communication together; see below.

## Fees, Exams/Results and Communication

The user explicitly authorized completing all three modules before stopping. Fees now has exact invoices, atomic/idempotent partial/full collections, genuine receipts, configured fee heads and selected portal reminders. Exams now has multiple schemes, saved datesheets, versioned marks/reasons/history, published-only family views, real analysis and immutable report-card records. Communication now has versioned notice drafts/approval and private inbox/sent/replies/read/personal archive workflows. See [Fees](modules/fees/README.md), [Exams](modules/exams/README.md) and [Communication](modules/communication/README.md) for acceptance, verification and remaining boundaries. All three passed 129 local browser workflow cases across six authenticated roles, with backend/client regression checks. Deployment remains deferred. The user has now authorized the remaining modules sequentially, with each module tested before the next, followed by complete Arabic UI/RTL verification. Production provider secrets and authorized certificate setup are deferred; continue independent implementation.


## Remaining authorized sequence

- [x] External delivery and certificate-based PDFs: nine integration and 35 six-role browser checks passed locally; live credentials and SMS provider deferred.
- [x] Health: 13 integration tests and 29 six-role browser cases passed.
- [x] Behaviour: 10 focused integration tests and 33 six-role browser cases passed; ownership units and builds passed.
- [x] Staff operations (including payroll): 45 integration tests, 24 unit tests and 48 six-role browser cases passed.
- [x] Curriculum: 16 integration tests and 35 six-role browser cases passed; builds and lint passed.
- [x] LMS: 17 integration tests, 17 unit tests and 48 six-role browser cases passed; builds and lint passed.
- [x] Library: 20 integration tests and 44 six-role browser cases passed; dashboard shortcut verified, builds and lint passed.
- [x] Transport: 14 integration tests and 53 six-role browser cases passed; builds, lint and shared ownership/validation units passed.
- [x] Hostel: 17 integration tests, six unit tests and 49 six-role browser cases passed; builds and lint passed.
- [x] Cafeteria: 15 integration tests, five unit tests and 29 six-role browser cases passed; builds and lint passed.
- [x] Expenses: 12 integration tests, seven unit tests and 27 six-role browser cases passed; builds and lint passed.
- [x] Inventory: 14 integration tests, eight unit tests and 28 six-role browser cases passed; builds and lint passed.
- [x] Calendar: 19 integration tests including Facilities regressions, nine unit tests and 21 six-role browser cases passed; builds and lint passed.
- [x] Biometric registry: seven integration tests and 21 six-role browser cases passed; builds and lint passed. Hardware ingestion remains unconfigured.
- [x] Visitors: 10 integration tests and 21 six-role browser cases passed; builds and lint passed.
- [x] Certificates: 16 integration tests, nine unit tests and 22 six-role browser cases passed; builds and lint passed.
- [x] Documents: 12 integration tests and 21 six-role browser cases passed; builds and lint passed.
- [x] ID Cards: 15 integration tests and 21 six-role browser cases passed; builds and lint passed.
- [x] Alumni: 10 integration tests and 19 six-role browser cases passed; both builds passed.
- [x] Facilities: 24 combined Facilities/Calendar integrations and 15 six-role browser cases passed; both builds passed.
- [x] Helpdesk: 15 integration tests and 21 six-role browser cases passed; both builds passed.
- [x] Surveys: 14 integrations, 11 unit tests and 21 six-role browser cases passed; builds and lint passed.
- [x] Reports: seven integration tests and 14 six-role browser cases passed; both builds passed.
- [x] Roles/Settings: 19 integrations, six unit tests and 19 six-role browser cases passed; both builds passed.
- [x] Audit: 12 integration tests and 16 six-role browser cases passed; both builds passed.
- [x] Recorded Insights/dashboard: ten combined integrations and 14 six-role browser cases passed; both builds passed.
- [x] Timetable follow-through: 18 six-role browser cases verify saved classes, explicit substitutes and truthful publication.
- [x] CRM follow-through: 20 six-role browser cases verify full pagination, record identity and saved follow-ups without simulated posting.
- [x] Admissions follow-through: 12 six-role browser cases verify staff access, escaped applicant values, record identity and document-gated enrollment.
- [x] Arabic/RTL: 36 six-role browser cases passed, including all 38 registered workspaces per role, shell/command/help text, saved tickets, preserved enums, reversible forms, protected file token refresh and mobile layout. Three localization unit cases also passed. Authored record text and uploaded files keep their original language.

This is the user's approved work sequence, not a completion claim. Each checkbox requires implementation and meaningful verification. Existing releases retain their recorded coverage; deployment remains deferred.

## Production readiness priorities (current authorization)

The user requested all five priorities in order. The latest decision explicitly defers AWS deployment: terminal access is not configured, and the user will deploy manually or supply details later. Provider credentials and the authorized signing identity also remain deferred.

1. **Security — implemented/tested:** zero backend/frontend dependency advisories, immediate logout/deactivation/role-change revocation, rejected stale account responses, safe production configuration and native OpenSSL PDF signing. Demo seeding is prohibited in production.
2. **Performance — implemented/tested:** lazy React pages, UTF-8 runtime, nonblocking external fonts, gzip and corrected cache policy. Thirty production browser cases passed across six roles; initial main JavaScript is about 198 KB versus 536 KB. Large-school all-module hydration remains an explicit scaling limitation.
3. **Operations — implemented/tested locally:** encrypted backup/restore, writable-replica readiness, private API caching policy, bounded structured metrics, graceful delivery drain and verified static rollback. Ten backup, nine rollback and nine native Nginx checks passed. Scheduling/alarms and API rollback need actual hosting configuration.
4. **Pilot QA — automated checks passed:** 36 six-role cases with 3,031 students and real saved workflows, all Arabic workspaces, mobile and session reload. Full backend regression passed 70 suites/561 cases, backend units 359 and client checks 83. Real school staff and native Arabic reviewer acceptance remain external steps.
5. **Release preparation — implemented/tested:** secret-free frontend/backend package, hashes, public API build metadata and redacted provider/certificate preflight. Six package and five subprocess preflight checks passed. Deployment and live provider verification are deferred by the user.

See [deployment](setup/deployment.md), [shared testing](testing/README.md), [pilot](../tests-e2e/pilot/README.md) and [operations drills](../tests-e2e/operations/README.md). Historical module counts above describe earlier runs. No claim is made of commercial-product parity, certified Arabic translation, live AWS capacity, a production backup or actual provider delivery.

## Notifications and CRM follow-through

User priority, 15 October 2026: finish a persisted personal notification centre, strengthen CRM account assignment/follow-up completion, and integrate both. Implementation includes private inbox history/read state, 10-second visible-page polling, due reminders, private-message events, account-backed CRM ownership, admission conversion links and prospect email queueing via Resend. Provider setup/live delivery remains external configuration. Resend has no documented SMS API; The user selected AWS SNS for SMS; actual sending remains disabled until AWS configuration is available. Deployment remains deferred.

CRM daily admissions follow-through now includes saved-contact editing with stale-save protection, corrected email-client recipients, reviewed/deduplicated bulk Resend queues and per-enquiry delivery history/cancellation/safe retry. Six-role browser checks and isolated integration checks passed. The operator confirmed live individual email receipt; signed-webhook and AWS SNS live verification remain setup tasks. Deployment remains deferred.

## Teacher workflow automation

User approved starting teacher automation on 16 October 2026. First delivery implements account-backed LMS class/subject/year mapping, reusable private/shared assignment templates, atomic multi-section creation, scheduled publishing and linked portal notifications with optional approval-gated Resend requests. Configure mappings through the leadership LMS view before teacher use. Subsequent priorities remain deadline/non-submitter reminders, attendance-triggered alerts and grading/progress-digest assistance; those are not included in this first delivery. Deployment remains deferred.

17 October 2026 continuation: opt-in pending-homework reminders and same-day confirmed guardian attendance alerts are implemented and tested. Existing approval/provider gates remain; SMS live setup and external verification are pending. Grading/feedback assistance and consolidated progress digests remain the next teacher-workflow priority. Deployment remains deferred.

## Teacher AI priorities (user-approved, 18 October 2026)

Build in order: Assignment/Quiz Studio → Lesson plans → Grading assistance → Parent-message drafts → Progress summaries. Each generates a private editable draft; execution requires teacher review and current teaching permissions. The maintained implementation/configuration/verification notes are in [LMS](modules/lms/README.md#teacher-ai-studio). Actual AI generation uses server-side provider configuration; the user deferred live AI verification. Do not describe fixture responses as live model quality verification. Deployment remains deferred.
