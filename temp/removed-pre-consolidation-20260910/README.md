# Solvagence SchoolOS — MERN Rebuild (Stage 1)

A staged, production-grade MERN rebuild of the Solvagence SchoolOS prototype (see
`docs/MIGRATION-ROADMAP.md` for the full 36-module plan this is
Stage 1 of).

**This is Stage 1, not the complete 36-module system.** It implements Authentication, Students,
Staff & HR, Attendance, Fees & Invoicing, Exams & Gradebook, Curriculum, Library, Payroll, Expenses, Helpdesk, Certificates,
Facilities & Bookings, Events Calendar, Audit Log, Surveys & Feedback, Transport, Inventory, Hostel, Behaviour, Health & Clinic, Cafeteria, Visitors, Biometric, Alumni, LMS, Timetable, Announcements, Admissions, Leave, Meetings, Documents, ID Cards, Reports, Settings, and Messages end-to-end — all 36 modules —
real MongoDB persistence, a versioned REST API, JWT access/refresh auth, server-side RBAC, input
in Stage 2 onward.

See `VERIFICATION_REPORT.md` for exactly what has and has not been executed and verified.

## Modules complete: 36 of 36 — ALL MODULES COMPLETE
Auth · Students · Staff & HR · Attendance · Fees & Invoicing · Exams & Gradebook · Curriculum ·
Library · Payroll · Expenses · Helpdesk · Certificates · Facilities & Bookings · Events
Calendar · Audit Log · Surveys & Feedback · Transport · Inventory · Hostel · Behaviour · Health & Clinic · Cafeteria · Visitors · Biometric · Alumni · LMS · Timetable · Announcements · Admissions · Leave · Meetings · Documents · ID Cards · Reports · Settings · Messages — each with a real Mongoose schema, RBAC or a deliberate no-ownership decision, a working
React page, and its own test suite.

**See `READINESS_REPORT.md` for the definitive final status** - what's genuinely done, what's
tested, and an honest answer on production readiness. See `VERIFICATION_REPORT.md` for the exact
count of what's been executed versus written-but-blocked, and `SCALABILITY.md` for an honest
account of what's actually load-bearing versus merely designed-for.

## What's new since the first Stage 1 pass
A follow-up gap review against the full engineering prompt found and closed several real issues:
ownership-based access control (a genuine IDOR fix, not just role gating), a high-severity Vite
dependency CVE, two real WCAG 2.1 AA failures (caught by an actual axe-core scan, not review),
Prettier (previously absent), frontend validation, an accessible Add Student modal, route-level
code splitting, and an idempotent seed script. See `VERIFICATION_REPORT.md` for the full,
command-by-command account.

## Stack

- **Backend**: Node.js 20, TypeScript (strict), Express 4, Mongoose 8, Zod validation, JWT auth
- **Frontend**: React 18, TypeScript (strict), Vite, React Router, Zustand
- **Database**: MongoDB 7
- **Infra**: Docker + Docker Compose, GitHub Actions CI

## Repository layout

```
mern/
  server/                  Express + TypeScript API
    src/
      config/              env validation (incl. DB connection pool tuning), DB connection
      middleware/           auth, RBAC, validation, error handling, request context
      models/               Mongoose schemas (User, Student, Staff, Attendance, Invoice, Exam, ExamResult)
      modules/
        auth/                register/login/refresh/logout - controller/service/validation/routes
        students/            full CRUD vertical slice - controller/service/repository/validation/routes
        staff/                staff directory, self-service ownership scoping
        attendance/           bulk marking, DB-enforced duplicate prevention
        fees/                 invoicing, payment recording, Accountant-specific write role
        exams/                exam schemes, results, computed grades, MongoDB aggregation
        curriculum/            no ownership scoping - open read access, role-gated writes
        library/               atomic concurrency-safe loan issuing, proven under real concurrent requests
        payroll/               self-service scoping, upsert-based generation, deliberately stored netPay
        expenses/              self-submit/other-approves split, explicit self-approval prevention
        helpdesk/               real finite state machine for ticket status, create open to all roles
        certificates/           atomic sequence generation via a Counter collection, proven under 10-way concurrency
        facilities/             real MongoDB transaction prevents double-booking - requires a replica set, see LOCAL_SETUP.md
        events/                 genuinely reuses facilities' transaction-safe booking creation, not a parallel copy
        audit/                  append-only, ONE route total, no create/update/delete exist; wired into Auth's real login/logout
        surveys/                embedded questions, unique-index-enforced one-response-per-user, second real aggregation
        transport/              third concurrency mechanism (atomic capacity-guarded seat assignment), proven under real concurrency
        inventory/              a different transaction use case (multi-item all-or-nothing), proven with a real 3-item PO
        hostel/                 deliberately reuses Transport's capacity-guarded allocation pattern for room occupancy
        behaviour/              standard Parent-scoping pattern, applied consistently with Attendance/Fees/Exams
        health/                 deliberate write/read asymmetry (Teacher records but cannot browse), proven both directions
        cafeteria/              fourth concurrency mechanism (atomic guarded balance decrement, same shape as Library's stock)
        visitors/               first whole-module role gate - no ownership scoping, entire module restricted at the router
        biometric/              reuses Visitors' whole-module gate; simplest data shape in this build
        alumni/                 third transaction use case (cross-collection consistency); closes a real pre-existing Student model gap
        lms/                    dual-relationship scoping (studentUserId + guardianUserId); Student-only submission; boundary-tested late detection
        timetable/              compound uniqueness applied to scheduling; clash = 409, cross-grade parallel proven allowed
        announcements/          content-declared visibility (audience on the document, role->audience-set mapping)
        admissions/             first branching state machine; fourth transaction (enrollment mirrors graduation) with rollback proof
        leave/                  guarded decrement at approval time (concurrency-proven); first sub-WRITE_ROLES gate; self-approval blocked
        meetings/               atomic slot claim (two-parent race proven); Parent-only booking, own child only
        documents/              partial unique index (new technique): one current version per code, DB-enforced version chains
        idcards/                first polymorphic reference (refPath: Student+Staff in one registry); replacement lineage linked
        reports/                first cross-collection $group aggregation; first management-only read
        settings/               first singleton (fixed _id); first Administrator-only gate; audited via Audit module
        messages/               bidirectional $or ownership, NO administrative override; 404-not-403 existence protection
      seed/                  idempotent demo-data seed script
      utils/                 ApiError, logger, response envelope
    tests/                   Jest + Supertest integration tests (in-memory MongoDB) + unit tests
  client/                  React + TypeScript + Vite SPA
    src/
      app/                   App shell, routing, AppShell navigation, ProtectedRoute
      components/ui/         Kpi, Chip, DataTable - shared component library
      features/
        auth/                LoginPage + auth API client
        students/             StudentsPage + AddStudentModal + students API client
        staff/                 StaffPage + staff API client
        attendance/            AttendancePage + attendance API client
        fees/                  FeesPage + fees API client
        exams/                 ExamsPage + exams API client
        curriculum/             CurriculumPage + curriculum API client
        library/                LibraryPage + library API client
        payroll/                PayrollPage + payroll API client
        expenses/               ExpensesPage + expenses API client
        helpdesk/               HelpdeskPage + helpdesk API client
        certificates/           CertificatesPage + certificates API client
        facilities/             FacilitiesPage + facilities API client
        events/                 EventsPage + events API client
        audit/                  AuditLogPage + audit API client
        surveys/                SurveysPage + surveys API client
        transport/              TransportPage + transport API client
        inventory/              InventoryPage + inventory API client
        hostel/                 HostelPage + hostel API client
        behaviour/              BehaviourPage + behaviour API client
        health/                 HealthPage + health API client
        cafeteria/              CafeteriaPage + cafeteria API client
        visitors/               VisitorsPage + visitors API client
        biometric/              BiometricPage + biometric API client
        alumni/                 AlumniPage + alumni API client
        lms/                    LmsPage + lms API client
        timetable/              TimetablePage + timetable API client
        announcements/          AnnouncementsPage + announcements API client
        admissions/             AdmissionsPage + admissions API client
        leave/                  LeavePage + leave API client
        meetings/               MeetingsPage + meetings API client
        documents/              DocumentsPage + documents API client
        idcards/                IdCardsPage + idcards API client
        reports/                ReportsPage + reports API client
        settings/               SettingsPage + settings API client
        messages/               MessagesPage + messages API client
      lib/
        api/                 axios client with automatic token refresh
        store/                 Zustand auth store
        validation/            shared Zod schemas mirroring backend validation
  tests-a11y/              axe-core accessibility scans (Login page, DataTable component)
  tests-e2e/               mocked-backend E2E scenarios + authenticated-page a11y scans
  docs/
    openapi.yaml            API specification (Swagger/OpenAPI 3.0)
  .github/workflows/ci.yml   lint, typecheck, test, build, audit on every PR
  docker-compose.yml
  LOCAL_SETUP.md
  AWS_DEPLOYMENT.md
  VERIFICATION_REPORT.md
```

## Quick start

See `LOCAL_SETUP.md` for full instructions, Docker steps, and troubleshooting.
