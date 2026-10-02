# API Routes — generated from source (`server/src/app.ts` + each module's routes file)

All paths are mounted under `API_PREFIX` (default `/api/v1`). Full request/response and
behavioural documentation lives in `docs/openapi.yaml` (142 validated paths).

**40 mounted modules · 202 routes total.**

## `/auth`  (5 routes)
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

## `/roles`  (4 routes, authenticated; administration is Administrator-only)
- `GET /roles/me` — current user’s persisted module-navigation grants
- `GET /roles` — full role matrix plus active account counts
- `POST /roles` — create a custom role by cloning an existing role
- `PATCH /roles/:id/permissions/:module` — persist a grant/revocation and audit it

## `/students`  (5 routes, role-gated)
- `GET /students`
- `GET /students/:id`
- `POST /students`
- `PATCH /students/:id`
- `DELETE /students/:id`

Student read responses include `attendanceRecords`, `assessmentResults`, and `invoiceRecords` alongside live summaries. AI Insights uses these counts to avoid treating absent records as low attendance, low marks, or overdue fees; its priority score is a transparent UI rule, not a prediction.
Parent reads are scoped by `guardianUserId`; Student reads are scoped by `studentUserId`. An unlinked Student account sees an empty roster and cannot read another student's record.
The same linked Student scope now applies to invoice/payment lists, published exam results, library loans and issued certificate lists; unpublished exam results are excluded before pagination.

## `/staff`  (9 routes, role-gated)
- `GET /staff`
- `GET /staff/:id`
- `PUT /staff/:id/documents/:key`
- `GET /staff/:id/documents/:key`
- `DELETE /staff/:id/documents/:key`
- `POST /staff/:id/onboarding/:key/toggle`
- `POST /staff`
- `PATCH /staff/:id`
- `DELETE /staff/:id`

## `/attendance`  (9 routes, role-gated)
- `GET /attendance/staff`
- `PUT /attendance/staff/me`
- `GET /attendance/absence-requests`
- `POST /attendance/absence-requests`
- `POST /attendance/absence-requests/:id/cancel`
- `POST /attendance/absence-requests/:id/decision`
- `GET /attendance`
- `POST /attendance/mark`
- `PUT /attendance/mark`

## `/fees`  (6 routes, role-gated)
- `GET /fees`
- `GET /fees/payments`
- `POST /fees/payments`
- `POST /fees/reminders`
- `POST /fees`
- `POST /fees/:id/pay`

## `/exams`  (11 routes, role-gated)
- `GET /exams`
- `POST /exams`
- `GET /exams/:id/summary`
- `POST /exams/:id/publish` — locks marks, publishes results and notifies linked guardians
- `POST /exams/:id/reopen` — reopens a published exam for moderation
- `POST /exams/:id/report-cards` — idempotently generates persistent report cards for published results
- `POST /exams/:id/results/:studentId/notify` — sends the existing “share with guardian” notice
- `POST /exams/:id/subjects`
- `DELETE /exams/:id/subjects/:subject`
- `GET /exams/results`
- `POST /exams/results`

## `/curriculum`  (5 routes, role-gated)
- `GET /curriculum` — live paginated/searchable units; readable by every authenticated role
- `GET /curriculum/subjects` — distinct subjects from persisted units
- `POST /curriculum` — add a unique subject/term/title unit and audit the change
- `PATCH /curriculum/:id` — edit, mark completed, or reopen coverage and audit the change
- `DELETE /curriculum/:id` — remove a unit with a Warning audit entry

## `/classes`  (2 routes, role-gated)
- `GET /classes` — paginated/searchable sections with live active-student roster counts
- `POST /classes` — Administrator/Principal/Teacher creates a unique section; validates teacher eligibility and capacity, then audits creation

## `/library`  (9 routes, role-gated)
- `GET /library/books`
- `POST /library/books`
- `GET /library/loans`
- `POST /library/loans`
- `POST /library/loans/:id/return`
- `GET /library/requests` — staff see all; students/parents see only their linked student requests
- `POST /library/requests` — Student or Parent creates a request for their linked active student
- `POST /library/requests/:id/fulfill` — Administrator, Principal, or Teacher only
- `POST /library/reminders` — sends persisted in-app overdue reminders to linked portal accounts

## `/payroll`  (3 routes, role-gated)
- `GET /payroll`
- `POST /payroll` — active/on-leave staff only; calculated periods cannot overwrite a paid payslip
- `POST /payroll/:id/pay` — atomic Processed → Paid transition

## `/expenses`  (3 routes, role-gated)
- `GET /expenses`
- `POST /expenses`
- `POST /expenses/:id/review`

## `/helpdesk`  (3 routes, role-gated)
- `GET /helpdesk`
- `POST /helpdesk`
- `POST /helpdesk/:id/transition`

## `/certificates`  (3 routes, role-gated)
- `GET /certificates`
- `POST /certificates`
- `POST /certificates/:id/decision`

Certificate types: Bonafide, Transfer, Character, Study, ReportCard, Provisional.
Pending requests get a REQ reference and can be approved/rejected by Administrator or
Principal. Approval allocates the issued number. Printed copies need a school signature;
this API does not digitally sign or publicly verify certificates.

## `/facilities`  (4 routes, role-gated)
- `GET /facilities/facilities`
- `POST /facilities/facilities`
- `GET /facilities/bookings`
- `POST /facilities/bookings`

## `/events`  (2 routes, role-gated)
- `GET /events`
- `POST /events`

## `/audit-log`  (2 routes, Administrator/Principal)
- `GET /audit-log` — `page`, `limit` (max 100), `module`, `severity`; returns stable newest-first records and `meta.pagination` with `page`, `limit`, `total`, `totalPages`. The UI exports all loaded server pages, not browser-generated events.
- `POST /audit-log/exports` — records a fixed server-authored Warning event for the authenticated export requester; rejects client-supplied fields. No arbitrary create/update/delete route exists.

## `/surveys`  (6 routes, role-gated)
- `GET /surveys`
- `POST /surveys`
- `POST /surveys/:id/activate`
- `POST /surveys/:id/close`
- `GET /surveys/:id/results`
- `POST /surveys/:id/respond`

## `/transport`  (9 routes, role-gated)
- `GET /transport/vehicles`
- `POST /transport/vehicles`
- `GET /transport/routes`
- `POST /transport/routes`
- `POST /transport/routes/:id/assign`
- `PATCH /transport/routes/:id/operational-status` — persists the existing on-road/delayed controls
- `POST /transport/routes/:id/incidents` and `GET /transport/incidents` — persist the existing incident panel
- `PATCH /transport/vehicles/:id/maintenance` — takes its active route to depot and blocks it from returning to the road

## `/inventory`  (7 routes, role-gated)
- `GET /inventory/items`
- `POST /inventory/items`
- `POST /inventory/items/:id/adjust` — atomic stock adjustment with a persistent movement record; cannot make stock negative
- `GET /inventory/purchase-orders`
- `POST /inventory/purchase-orders`
- `POST /inventory/purchase-orders/:id/send`
- `POST /inventory/purchase-orders/:id/receive`
- `POST /inventory/purchase-orders/:id/cancel`

## `/hostel`  (12 routes, role-gated)
- `GET /hostel/rooms`
- `POST /hostel/rooms`
- `POST /hostel/rooms/:id/allocate`
- `GET /hostel/leave`
- `POST /hostel/leave`
- `POST /hostel/leave/:id/transition`
- `GET /hostel/roll-call`
- `PUT /hostel/roll-call`
- `PUT /hostel/roll-call/all`
- `GET /hostel/maintenance`
- `POST /hostel/maintenance`
- `POST /hostel/maintenance/:id/resolve`

## `/behaviour`  (3 routes, role-gated)
- `GET /behaviour`
- `POST /behaviour`
- `PATCH /behaviour/:id/status`

## `/health-records`  (3 routes, role-gated)
- `GET /health-records`
- `POST /health-records`
- `PATCH /health-records/:id`

## `/cafeteria`  (8 routes, role-gated)
- `GET /cafeteria/wallets`
- `GET /cafeteria/transactions`
- `GET /cafeteria/allergy-plans`
- `POST /cafeteria/allergy-plans`
- `GET /cafeteria/menu`
- `PUT /cafeteria/menu/item`
- `POST /cafeteria/wallets/top-up`
- `POST /cafeteria/wallets/purchase`

## `/visitors`  (3 routes, role-gated)
- `GET /visitors`
- `POST /visitors`
- `POST /visitors/:id/checkout`

## `/biometric`  (3 routes, role-gated)
- `GET /biometric`
- `POST /biometric`
- `POST /biometric/:id/sync`

## `/alumni`  (2 routes, role-gated)
- `GET /alumni`
- `POST /alumni/graduate`

## `/lms`  (5 routes, role-gated)
- `GET /lms/assignments`
- `POST /lms/assignments`
- `POST /lms/assignments/:id/submit`
- `GET /lms/submissions`
- `POST /lms/submissions/:id/grade`

## `/timetable`  (6 routes, authenticated and role-gated)
- `GET /timetable`
- `POST /timetable`
- `PATCH /timetable/:id`
- `DELETE /timetable/:id`
- `POST /timetable/publish`
- `POST /timetable/swap` — atomically swaps two scheduled periods or moves one into a free period

## `/announcements`  (3 routes, role-gated)
- `GET /announcements` — published notices by audience; reviewers also see drafts/pending, teachers see their own unpublished notices
- `POST /announcements` — create Draft or Pending approval; direct Published requires Administrator or Principal
- `PATCH /announcements/:id/status` — Draft → Pending approval by author/reviewer; Pending approval → Published or Draft by reviewer

## `/admissions`  (8 routes, role-gated)
- `GET /admissions`
- `POST /admissions` — keeps the full existing application form (guardian, source, date of birth, previous school and notes)
- `PUT /admissions/:id/documents/:key` — stores the six existing admission document slots securely (`id`, `birth`, `photo`, `report`, `immun`, `tc`)
- `POST /admissions/:id/documents/:key/mark-received` — records verified paper documents without pretending a digital file exists
- `GET` / `DELETE /admissions/:id/documents/:key`
- `POST /admissions/:id/transition` — auditable pipeline, waitlist, decline and restore; required ID/birth/photo are enforced before offer
- `POST /admissions/:id/enroll` — creates the Student only after an accepted, document-complete application

## `/leave`  (3 routes)
- `GET /leave`
- `POST /leave` — self-service, or Administrator/Principal may submit the existing HR form for a selected staff member
- `POST /leave/:id/decide`

## `/meetings`  (8 routes, role-gated)
- `GET /meetings`
- `POST /meetings`
- `POST /meetings/:id/book`
- `POST /meetings/:id/book-on-behalf` — leadership books the existing slot for a correctly linked guardian/student
- `POST /meetings/:id/confirm` — confirms Pending PTM only
- `POST /meetings/:id/cancel` — returns a booked slot to Available and clears participant data
- `POST /meetings/:id/reschedule` — atomically moves a booking to an available slot for the same teacher
- `POST /meetings/:id/notify` — audits the existing participant reminder action

## `/documents`  (4 routes, authenticated)
- `GET /documents` — current records by default; optional version history
- `POST /documents` — publish metadata-only version (Administrator/Principal/Teacher)
- `POST /documents/file` — publish a version with an attached PDF, max 8 MB (same write roles)
- `GET /documents/:id/file` — download that exact version's PDF; 404 for paper-only records

## `/id-cards`  (4 routes, Administrator/Principal/Teacher only)
- `GET /id-cards` — filter by holder type or Active/Lost/Revoked state
- `POST /id-cards` — issues one card only to an active Student/Staff holder
- `POST /id-cards/:id/report-lost` — atomic Active → Lost transition
- `POST /id-cards/:id/revoke` — atomic Active → Revoked transition

## `/reports`  (1 route, Administrator/Principal only)
- `GET /reports/overview` — school-wide student grade/status, staff, admissions, exam-grade counts, invoice billed/collected totals in the saved school currency (including partial payments and effective overdue status), plus six monthly attendance rates from saved marks; months without marks return `null` rate

## `/settings`  (2 routes, role-gated)
- `GET /settings` — saved school profile, academic settings, and disabled-module visibility; authenticated read
- `PUT /settings` — Administrator-only, audited save of school profile, academic settings, and module visibility; currency changes that conflict with existing invoices are rejected, and module switches do not revoke API permissions

## `/messages`  (3 routes)
- `GET /messages`
- `POST /messages`
- `POST /messages/:id/read`
## `/guardians`  (6 routes, Administrator/Principal only)
- `GET /guardians` — real guardian directory with populated linked children
- `PATCH /guardians/:id/portal` — activates or suspends portal access
- `GET /guardians/broadcasts` and `POST /guardians/broadcasts` — persisted audience-targeted parent broadcasts; only `In-app only` delivery is active
- `GET /guardians/:id/messages` and `POST /guardians/:id/messages` — persisted guardian conversation thread

## `/crm`  (9 routes, Administrator/Principal only)
- `GET /crm` — paginated lead funnel with stage, archive and search filters
- `POST /crm` — captures the existing New lead form and rejects duplicates
- `POST /crm/:id/advance` — advances exactly one retained funnel stage
- `PUT /crm/:id/follow-up` — schedules quick or custom follow-up dates
- `POST /crm/:id/activity` — persists call, email, WhatsApp, meeting, tour and note history
- `POST /crm/:id/archive` — archives manual, stale or lost leads with a reason
- `POST /crm/:id/restore` — restores an archived lead to the funnel
- `POST /crm/:id/convert` — creates one Admissions application and marks the lead Won
- `DELETE /crm/:id` — permanently deletes only an already archived lead
