# Documentation index

Start with the root [README](../README.md) for the current application architecture. Use [Local setup](setup/local.md) for installation and [Build and deployment guide](setup/deployment.md) for frontend/API builds and hosting configuration.

| Reference | Scope |
|---|---|
| [OpenAPI contract](reference/openapi.yaml) | Request/response schemas and documented endpoint behavior |
| [API routes](reference/api-routes.md) | Navigable route summary and role/ownership notes |
| [MongoDB schema](reference/mongodb-schema.md) | Model and index reference |
| [Testing guide](testing/README.md) | Checks, prerequisites, smoke-test side effects, and coverage limits |
| [Students status](modules/students/testing.md) | Student profile and ownership verification notes |
| [Documents status](modules/documents/testing.md) | Versioned document records and file workflows |
| [ID Cards status](modules/idcards/testing.md) | Issuance, replacement, and registry checks |
| [Certificates](modules/certificates/README.md) | Registry, actual PDF downloads and configured certificate-based signing |
| [Reports status](modules/reports/testing.md) | Database-backed report overview and exports |
| [Frontend feature guide](../client/src/features/README.md) | Shell runtime bundling and React migration boundary |

Route/model source files are the implementation authority when a summary differs from code. Individual testing-status documents describe their recorded verification runs, not a certification of every current deployed workflow.

`tests-e2e/fixtures/prototype/` is a historical comparison fixture. `temp/removed-pre-consolidation-20260910/` preserves old deployment guides, migration plans, and reports. Those documents do not define the current production architecture.

- [Insights](modules/aiinsights/README.md) — complete recorded evidence and leadership dashboard review.
- [Audit](modules/audit/README.md) — filtered server activity and recorded exports.
- [Roles](modules/roles/README.md) and [Settings](modules/settings/README.md) — full workspace visibility and versioned school configuration.
- [Reports](modules/reports/README.md) — school-day ledger and actual recorded attendance summaries.
- [Surveys](modules/surveys/README.md) — audience-scoped questions and atomic complete responses.
- [Helpdesk](modules/helpdesk/README.md) — owned conversations and traceable support resolution.
- [Facilities](modules/facilities/README.md) — reviewed venues and transaction-protected reservations.
- [Alumni](modules/alumni/README.md) — reviewed graduation, operational clearance and owned contact profiles.
- [ID Cards](modules/idcards/README.md) — owned records, expiry review and traced replacements.
- [Documents](modules/documents/README.md) — atomic reviewed publication, version history and actual PDF preview.
- [Visitors](modules/visitors/README.md) — confirmed admission, issued badges and physical departure history.
- [Biometric registry](modules/biometric/README.md) — saved devices and inspections; hardware ingestion is unconfigured.
- [School calendar](modules/calendar/README.md) — audience-scoped events and atomic venue reservations.
- [Inventory](modules/inventory/README.md) — inspected stock and transactional purchase-order receipts.
- [Expenses](modules/expenses/README.md) — independent claim decisions and referenced reimbursements.
- [Cafeteria](modules/cafeteria/README.md) — atomic wallets, immutable ledger and reviewed dietary instructions.
- [Hostel](modules/hostel/README.md) — recorded accommodation, owned gate passes and confirmed roll-call.
- [Transport](modules/transport/README.md) — private family riders, transactional allocation and reviewed route operations.
- [Library](modules/library/README.md) — transactional circulation, actual request fulfilment and family borrowing views.
- [Learning (LMS)](modules/lms/README.md) — Teacher AI Studio for assignments/quizzes, lesson plans, grading suggestions, parent drafts and progress summaries; mapped teaching access, scheduled coursework and reminders.
- [Curriculum](modules/curriculum/README.md) — grade/year teaching plans, recorded completion and preserved review history.
- [Staff & HR](modules/staff/README.md) — employee profiles, private documents, onboarding and transactional leave.
- [Payroll](modules/payroll/README.md) — exact figures, versioned corrections, referenced payments and owned PDFs.
- [Behaviour & Pastoral Care](modules/behaviour/README.md) — private pastoral notes, merits and versioned case decisions.
- [Health & Clinic](modules/health/README.md) — actual clinic register, private family views and versioned follow-ups.
- [Product enhancement roadmap](roadmap.md) — agreed module sequence and acceptance criteria.
- [Fees & Invoicing](modules/fees/README.md) — actual invoices, atomic collections, receipts and fee heads.
- [Exams & Results](modules/exams/README.md) — assessment schemes, saved datesheets, protected marks and publication.
- [Communication](modules/communication/README.md) — versioned notice approvals and participant-owned private messages.
- [Classes & Sections](modules/classes/README.md) — persisted section configuration, full rosters and role boundaries.
- [Attendance](modules/attendance/README.md) — class registers, corrections, family ownership, absence decisions and staff records.
- [Parents enhancement release](modules/parents/README.md) — guardian records, owned family access, conversations, appointments and rollout notes.
- [Students enhancement release](modules/students/README.md) — features, six-role access policy, verification and rollout notes.

## Where to maintain documentation

| Folder/file | Purpose |
|---|---|
| `setup/` | Local installation and deployment |
| `reference/` | API/OpenAPI and database contracts |
| `testing/README.md` | Shared test instructions |
| `modules/<module>/` | Related feature/release and testing notes |
| `roadmap.md` | One shared enhancement plan |

Update the existing module document for subsequent enhancements; do not add a separate dated release report each time. Temporary run artifacts belong outside tracked source files. Contributor placement and naming rules are maintained in [AGENTS.md](../AGENTS.md).

- [Arabic/RTL](modules/localization/README.md) — reversible display localization, protected record values and six-role workflow coverage.
- [Timetable](modules/timetable/README.md), [CRM](modules/crm/README.md) and [Admissions](modules/admissions/README.md) — saved scheduling and enrollment workflows.

- [Production loading checks](../tests-e2e/performance/README.md), [school pilot](../tests-e2e/pilot/README.md) and [operations drills](../tests-e2e/operations/README.md) — repeatable readiness checks; current rollout guidance stays in the existing deployment document.

- [Notifications](modules/notifications/README.md) — private saved inbox, unread history, CRM events and Resend delivery setup.
