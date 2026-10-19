# Reports & Analytics module status

The live client exposes Reports & Analytics only to Administrator and Principal.
This exactly matches the server policy because the overview combines
school-wide student, exam, staffing, attendance, fee, admission, and helpdesk
data. Teacher, Accountant, Parent, and Student roles cannot see the
management-wide navigation item or call the API successfully.

The existing dashboard retains its UI and uses the live
`GET /api/v1/reports/overview` aggregation:

- active-student and staffing figures;
- enrolment by grade;
- six-month attendance trend;
- exam-grade distribution;
- billed/collected fee figures and collection rate;
- a CSV summary export based on the loaded live overview.

The server computes summaries from database collections rather than static
screen values. Attendance excludes Excused marks from its denominator; empty
months show no rate instead of a fabricated percentage.

Verification on 2026-10-01:

- Focused Reports tests: **5/5 passed**, covering authentication, management
  role protection, database aggregation, and empty-data shape.
- Full backend regression: **108/108 suites, 751/751 tests passed**.
- Client production build and unit suite: **18/18 tests passed**.
- Real headless Chromium Administrator smoke passed: login, Reports navigation,
  live overview read, and CSV export UI.
- Real Chromium Accountant and Parent smokes passed: Reports navigation hidden,
  matching the server’s management-only rule.
- All browser checks made **zero school-database writes**.

Operational boundary: this module is a live management overview and CSV
summary export. It does not create scheduled reports, custom report builders,
or signed/PDF report packs; those would be separate future enhancements.
