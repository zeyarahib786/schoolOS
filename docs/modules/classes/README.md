# Classes & Sections

The released screen is `client/public/assets/js/modules/56-classes.js`. It manages persisted teaching groups and uses active Student records for live occupancy; the React screen remains unreleased. Deployment is deferred.

## Workflows

- Administrator, Principal and Teacher can view/search sections, inspect the **full** roster, create sections, export filtered sections/rosters and open the selected class's Attendance register.
- Administrator and Principal can edit stream, room, capacity and class teacher, clear a teacher assignment, archive an empty section and restore it. Concurrent edits return 409 rather than overwrite another editor's changes.
- Active teaching staff are identified by name plus staff reference to distinguish identical names. Inactive/non-teaching assignments are rejected by the API.
- Sections with active students cannot be archived. Create/edit capacity cannot be lower than the current active roster. Grade/section identity remains stable so existing Student and Timetable references are preserved.
- Filters persist across navigation, grade sorting is numeric, empty states are explicit, dynamic text is escaped, exports use the shared spreadsheet-safe CSV writer and mobile KPI cards stay compact.
- Full rosters include Active, Inactive and Alumni records; occupancy counts Active only. Student profile access uses the existing staff policy. No medical/guardian fields appear in roster exports.

Accountant, Parent and Student do not receive Classes management navigation or editing controls. Authenticated `GET /classes` remains available for existing API compatibility; it returns section metadata/counts, not student rosters. Teacher section creation is retained from the existing policy; configuration editing belongs to school managers.

## Contract and verification

`GET /classes`, `POST /classes` and `PATCH /classes/:id`. PATCH requires `expectedUpdatedAt`, capacity, stream and status; room is optional and teacher assignment can be explicitly `null`. Duplicate grade/section and invalid teacher/capacity/archive states return 409.

Run `node tests-e2e/classes/run.cjs`; see [Classes browser instructions](../../../tests-e2e/classes/README.md). Backend regression: `npm run test:integration --prefix server -- --runTestsByPath tests/classes.test.ts tests/classAttendanceEnhancements.test.ts`.

The isolated authenticated suite covers all six role boundaries, full 16-student rosters, filters, create/edit/archive/restore, class-to-attendance navigation and desktop/mobile rendering. Test data and screenshots stay under `/tmp`; tests never use live credentials.

## Remaining school configuration work

This release manages current teaching groups. Academic-year rollover, bulk promotion/transfers with roll reassignment, custom grade/section labels beyond KG 1–Grade 12 / A–F, multiple subject teachers and configurable teacher-assigned-class authorization require separate work. Capacity is checked when saving section configuration; it is not a database-wide admissions quota or a concurrent enrollment reservation. Student changes continue through the existing Students workflow. Archived sections must be kept empty operationally until enrollment/class-reference enforcement is added across all intake/import paths.

Recorded local verification: Classes 29 browser workflow checks and Attendance 50, across all six authenticated roles; Students regression 54 browser checks. Backend combined regression passed 66 checks, with a further 10-check focused enhancement run covering transactional rollback. Ownership/timezone unit checks passed 8 checks. No runtime exceptions remained after the focused Principal regression rerun. API role denials and intentionally rejected correction/stale writes are expected in network evidence.

Final client regression: 71 checks passed; client/server production builds and targeted backend lint passed. Vite retains the existing large-bundle advisory. Deployment and any historical data migration require a separate rollout.
