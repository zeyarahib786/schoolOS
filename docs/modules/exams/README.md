# Exams & Results

Released interface: `client/public/assets/js/modules/59-exams.js`. API: `server/src/modules/exams/`. Multiple assessment schemes, genuine datesheets and saved results replace first-exam-only demo screens.

## Workflows

- Create/select an assessment with unique subjects, term/year, maximum marks and pass marks. Scores are normalized against that assessment's maximum, including maxima other than 100. Passing uses `passMark / maxMarks × 100`. Grade/pass decisions use the unrounded score percentage; displayed averages round to one decimal and never promote a below-threshold score.
- Maintain a persisted datesheet with subject, calendar date, start time, duration and venue. Start times are school-local wall-clock times. Stale schedule edits conflict; published schedules are locked.
- Enter explicit scores for every configured subject for an active student. Zero is valid and a blank is not zero. Unknown/missing/duplicate subjects and scores outside the maximum are rejected.
- Correct saved marks through the versioned register and record a reason. Previous scores, editor and timestamp remain in correction history. A concurrent stale editor receives a conflict; a failed row rolls back the entire batch. Legacy result creation cannot silently overwrite an existing result.
- Subject changes are allowed only before results exist; locked schemes and removing the final subject are rejected.
- Review and publish complete saved results, locking marks and saving notifications for active, unsuspended linked Parent accounts. Repeated publication does not duplicate those notifications. Reopen for moderation to hide current results from families while corrections are made.
- Student/class filters drive actual result counts, averages, passing/support counts, subject averages and grade distributions. Empty/unassessed states are explicit; no estimated ranks or demo trends are displayed. CSV exports use the selected assessment and saved scores.
- Register report-card records once per assessment/student, optionally by class. Each stores an immutable snapshot of issued scores and assessment/student details. Repeating issuance reports existing records; later moderation does not rewrite the original issued snapshot. Open a result to view/export its original issued snapshot. This is not a signed PDF.

Default grade bands: A+ ≥85%, A ≥70%, B ≥60%, C ≥50%, D below 50%. Passing follows the assessment's separate configured threshold; these are not configurable school grading policies yet.

## Role policy

| Role | Access |
|---|---|
| Administrator / Principal / Teacher | Create/select schemes, datesheets, marks/corrections, real summaries, publication/moderation, report-card records and exports |
| Parent | Published results for own linked children; published datesheets and own exports |
| Student | Published results for own linked student record; published datesheets and own exports |
| Accountant | Academic navigation hidden; direct screen restricted; no results, summary or writes |

Family result queries intersect requested IDs with ownership and published state. Internal correction history is removed from family responses. Student profile assessment counts/GPA also exclude draft assessments, preventing a draft-results leak through another module. Scheme metadata is available through the authenticated scheme API; it contains no marks.

## Verification and operation

Integration suites: `server/tests/exams-enhancements.test.ts`, `exams.test.ts`, and Students profile regressions. Browser runner: [Exams E2E](../../../tests-e2e/exams/README.md). It covers actual scheme/schedule/mark forms, zero scores, correction reasons/history, publication/reopening, class-filtered issuance, exports, reload persistence and mobile layouts across all six roles.

Marks, publication and report-card issuance require MongoDB replica-set transactions. New schedule/correction arrays are additive. Historical certificate records may lack snapshots; the application does not invent historical scores for them. Publication rejects incomplete legacy results; review/correct them before publishing.

AWS deployment is deferred. Configurable grade bands/weighting, absent/exempt assessment statuses, academic-year progression, board-specific transcripts, signed report PDFs and full assessment timetable conflict detection remain future work.

Local release verification: 46 browser workflow cases passed across all six actual authenticated roles, with no JavaScript runtime exceptions. Shared checks passed: 69 integration tests across eight suites, 24 targeted backend unit tests, 78 client tests, both production builds and targeted backend lint. Students also passed its 54-case six-role browser regression. Expected permission denials from unrelated background hydration endpoints are recorded separately; this is not an AWS deployment result. The existing Vite large-chunk advisory remains.
