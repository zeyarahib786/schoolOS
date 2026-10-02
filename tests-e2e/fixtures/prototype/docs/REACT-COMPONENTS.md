# React Component Architecture — reverse-engineered from the rendering layer

**36 page modules** (`M.<name>`) currently render as template-string HTML
swapped into `#view` on navigation. Each maps directly to a top-level React route/page component.
The app already has a proven, reused shared-component vocabulary (`kpi()`, `detailDrawer()`,
`formDrawer()`, `fld()`, `chip()`, `avatar()`, `subTabs()`, `segBtns()`) — these are the actual
component boundaries the React port should use, since they're already the seams every module
in the app calls into consistently.

## Suggested top-level structure

```
src/
  app/
    App.tsx                 — shell, routing, role/theme/language context
    routes.tsx               — one route per module below
  components/
    ui/
      Kpi.tsx                — from kpi() — stat card, optional onClick drill-down
      Chip.tsx                — from chip() — status pill
      Avatar.tsx              — from avatar()
      DetailDrawer.tsx        — from detailDrawer() — slide-over record view (title/stats/sections/footer)
      FormDrawer.tsx          — from formDrawer()+fld() — generic form renderer incl. showIf conditional fields
      SubTabs.tsx             — from subTabs()
      SegmentedControl.tsx    — from segBtns()
      DataTable.tsx           — generic sortable/filterable table (every module's `.tbl`)
    ai/
      AiAssistBar.tsx         — from aiAssistBar() — default-content + rewrite, reused ~15 places
    media/
      MultiMediaPicker.tsx    — from socialMediaPicker() — multi photo/video upload
      DocCapture.tsx          — from docCaptureHtml() — document/evidence upload slots
  features/                  — one folder per module, matching the current M.* boundary
    admissions/                — Admissions
    aiinsights/                — AI Insights
    alumni/                — Alumni
    attendance/                — Attendance
    audit/                — Audit Log
    behaviour/                — Behaviour
    biometric/                — Biometric Sync
    cafeteria/                — Cafeteria
    calendar/                — Events Calendar
    certificates/                — Certificates
    classes/                — Classes & Sections
    comm/                — Communication
    crm/                — Enrolment CRM
    curriculum/                — Curriculum
    dashboard/                — Dashboard
    exams/                — Exams & Gradebook
    expenses/                — Expenses
    facilities/                — Facilities & Bookings
    fees/                — Fees & Invoicing
    health/                — Health & Clinic
    helpdesk/                — Helpdesk
    hostel/                — Hostel
    inventory/                — Inventory
    library/                — Library
    lms/                — Learning (LMS)
    parents/                — Parents
    payroll/                — Payroll
    reports/                — Reports & Analytics
    roles/                — Roles & Access
    settings/                — Settings
    staff/                — Staff & HR
    students/                — Students
    surveys/                — Surveys & Feedback
    timetable/                — Timetable
    transport/                — Transport
    visitors/                — Visitor Management
  lib/
    api/                    — one client per API-ROUTES.md module group
    store/                  — auth/role/theme/language global state (Zustand or Redux Toolkit)
    hooks/                  — useCanWrite(), useRole(), useAiAssist(), useShowIf()
```

## Page modules (route → feature folder)

| Route path | Module | Page title |
|---|---|---|
| `/admissions` | `M.admissions` | Admissions |
| `/aiinsights` | `M.aiinsights` | AI Insights |
| `/alumni` | `M.alumni` | Alumni |
| `/attendance` | `M.attendance` | Attendance |
| `/audit` | `M.audit` | Audit Log |
| `/behaviour` | `M.behaviour` | Behaviour |
| `/biometric` | `M.biometric` | Biometric Sync |
| `/cafeteria` | `M.cafeteria` | Cafeteria |
| `/calendar` | `M.calendar` | Events Calendar |
| `/certificates` | `M.certificates` | Certificates |
| `/classes` | `M.classes` | Classes & Sections |
| `/comm` | `M.comm` | Communication |
| `/crm` | `M.crm` | Enrolment CRM |
| `/curriculum` | `M.curriculum` | Curriculum |
| `/dashboard` | `M.dashboard` | Dashboard |
| `/exams` | `M.exams` | Exams & Gradebook |
| `/expenses` | `M.expenses` | Expenses |
| `/facilities` | `M.facilities` | Facilities & Bookings |
| `/fees` | `M.fees` | Fees & Invoicing |
| `/health` | `M.health` | Health & Clinic |
| `/helpdesk` | `M.helpdesk` | Helpdesk |
| `/hostel` | `M.hostel` | Hostel |
| `/inventory` | `M.inventory` | Inventory |
| `/library` | `M.library` | Library |
| `/lms` | `M.lms` | Learning (LMS) |
| `/parents` | `M.parents` | Parents |
| `/payroll` | `M.payroll` | Payroll |
| `/reports` | `M.reports` | Reports & Analytics |
| `/roles` | `M.roles` | Roles & Access |
| `/settings` | `M.settings` | Settings |
| `/staff` | `M.staff` | Staff & HR |
| `/students` | `M.students` | Students |
| `/surveys` | `M.surveys` | Surveys & Feedback |
| `/timetable` | `M.timetable` | Timetable |
| `/transport` | `M.transport` | Transport |
| `/visitors` | `M.visitors` | Visitor Management |

## Migration notes grounded in what the current code actually does
- **Conditional form fields (`showIf`)**: built this session as a generic mechanism (drives
  "New student name", "Other (not listed)", grade/department pickers, etc. across 4+ forms).
  In React this becomes a `watch()`-driven field (e.g. react-hook-form) rather than DOM
  show/hide — cleaner in a real framework than the vanilla-JS version had to be.
- **AI assist bar**: currently a rule-based default-content + text-transform "rewrite". Should
  stay a clearly-labelled non-AI utility unless wired to a real model API — do not silently
  upgrade its UI to look more "AI" than the backend actually is.
- **Role gating (`canWrite()`, `WRITE_ROLES`)**: currently client-side only, which is correct for
  a UI-only demo but insufficient for production — every mutating endpoint must re-check role
  server-side (see SECURITY-COMPLIANCE.md).
- **Cross-module data links** (e.g. Events↔Facilities shared booking ledger built this session,
  student↔guardian message threads, exam↔certificate report-card generation) are currently
  enforced by in-memory array lookups. In MongoDB these become either embedded refs or a
  populated join — the FACILITIES/BOOKINGS relationship in particular should be a proper
  referenced relationship with a unique compound index on (facility, date, time) to preserve
  the double-booking prevention already built and tested client-side.