# API Routes — generated from source (`server/src/app.ts` + each module's routes file)

All paths are mounted under `API_PREFIX` (default `/api/v1`). Full request/response and
behavioural documentation lives in `docs/reference/openapi.yaml` (202 documented paths).

**41 mounted modules · 268 routes total (including the raw-body Resend webhook).**

## `/auth`  (5 routes)
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

## `/roles`  (4 routes, authenticated; administration is Administrator-only)
- `GET /roles/me` — current user’s persisted module-navigation grants
- `GET /roles` — full role matrix plus active account counts
- `POST /roles` — create a reusable permission template by cloning a role (not a new account role)
- `PATCH /roles/:id/permissions/:module` — persist a grant/revocation and audit it

## `/students`  (11 routes, role-gated)
- `GET /students`
- `PUT /students/:id/documents/:key`
- `GET /students/:id/documents/:key`
- `DELETE /students/:id/documents/:key`
- `POST /students/import`
- `PATCH /students/:id/enrollment`
- `PATCH /students/:id/accounts`
- `GET /students/:id`
- `POST /students`
- `PATCH /students/:id`
- `DELETE /students/:id`

Student read responses include `attendanceRecords`, `attendanceEligibleRecords` (Excused excluded from the rate denominator), `assessmentResults`, and `invoiceRecords` alongside live summaries. AI Insights uses these counts to avoid treating absent records as low attendance, low marks, or overdue fees; its priority score is a transparent UI rule, not a prediction.
Parent reads are scoped by `guardianUserId`; Student reads are scoped by `studentUserId`. An unlinked Student account sees an empty roster and cannot read another student's record.
The same linked Student scope now applies to invoice/payment lists, published exam results, library loans and issued certificate lists; unpublished exam results are excluded before pagination.

## `/staff`  (10 routes, role-gated)
- `GET /staff`
- `PUT /staff/:id/documents/:key`
- `GET /staff/:id/documents/:key`
- `DELETE /staff/:id/documents/:key`
- `POST /staff/:id/onboarding/:key/toggle`
- `GET /staff/:id`
- `POST /staff`
- `PATCH /staff/:id/account`
- `PATCH /staff/:id`
- `DELETE /staff/:id`

## `/attendance`  (10 routes, role-gated)
- `GET /attendance/staff`
- `PUT /attendance/staff/me`
- `GET /attendance/absence-requests`
- `POST /attendance/absence-requests`
- `POST /attendance/absence-requests/:id/cancel`
- `POST /attendance/absence-requests/:id/decision`
- `GET /attendance`
- `POST /attendance/mark`
- `PUT /attendance/mark` — legacy authenticated unconditional upsert; atomic/active-student validated
- `PUT /attendance/register` — protected transactional register save; per-entry `expectedUpdatedAt`, correction reason and school-day validation

## `/fees`  (9 routes, role-gated)
- `GET /fees/heads`
- `POST /fees/heads`
- `PATCH /fees/heads/:id`
- `GET /fees`
- `GET /fees/payments`
- `POST /fees/payments`
- `POST /fees/reminders`
- `POST /fees`
- `POST /fees/:id/pay`
- Payment endpoints accept an optional `idempotencyKey` (8–100 chars), scoped to the recorder; same-details retries do not issue another receipt. Amounts must be positive with at most two decimal places. Balance and payment commit in one replica-set transaction. UI selects the exact invoice and explicitly confirms.
- Status filtering derives overdue from school-local today; family student filters intersect ownership. Empty reminder IDs send nothing; reminders skip paid/unlinked/inactive/suspended accounts.
- `GET /fees`
- `GET /fees/payments`
- `POST /fees/payments`
- `POST /fees/reminders`
- `POST /fees`
- `POST /fees/:id/pay`

## `/exams`  (13 routes, role-gated)
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
- `PATCH /exams/:id` — versioned datesheet save (`expectedUpdatedAt`, `schedule` entries with subject/date/startTime/durationMinutes/venue); teaching staff only, draft only.
- `PUT /exams/:id/register` — transactional complete marks batch; each entry contains `studentId`, `scores`, nullable `expectedUpdatedAt`. Changed saved marks require `correctionReason`; stale versions return 409. Legacy `POST /exams/results` creates only; use the register to correct.
- Subject structure cannot change after results exist. Normalized pass threshold is passMark/maxMarks ×100. Summary is teaching-staff-only; families see only owned published results without internal correction history.
- Report cards optionally filter `grade` and retain an immutable issued snapshot; repeated issuance does not rewrite it or imply a signed PDF.
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

## `/curriculum`  (6 routes, role-gated)
- `GET /curriculum` — paginated/searchable units with grade/year/term/subject and archived filters; every authenticated role reads the shared plan, internal history removed for read-only roles
- `GET /curriculum/subjects` — distinct subjects from persisted units
- `POST /curriculum` — add a case-insensitive unique subject/term/title/grade/year unit; missing year uses configured academic year
- `PATCH /curriculum/:id` — edit, complete or reopen with `expectedUpdatedAt` and reason; real dates, no future completion; preserves history
- `DELETE /curriculum/:id` — remove only an unused unit; completed/reviewed records must be archived
- `POST /curriculum/:id/archive` — Administrator/Principal archive/restore with version and reason

## `/classes`  (3 routes, role-gated)
- `GET /classes` — paginated/searchable sections with live active-student roster counts
- `POST /classes` — Administrator/Principal/Teacher creates a unique section; validates teacher eligibility and capacity, then audits creation
- `PATCH /classes/:id` — Administrator/Principal edits room/teacher/stream/capacity/status with `expectedUpdatedAt`; occupied archive and stale edits rejected

- `PATCH /classes/:id` — Administrator/Principal edits room/teacher/stream/capacity/status with `expectedUpdatedAt`; occupied archive and stale edits rejected

## `/library`  (12 routes, role-gated)
- `GET /library/books`
- `POST /library/books`
- `GET /library/loans`
- `POST /library/loans`
- `POST /library/loans/:id/return`
- `GET /library/requests` — staff see all; students/parents see only their linked student requests
- `POST /library/requests` — Student or Parent creates a request for their linked active student
- `POST /library/requests/:id/fulfill` — Administrator, Principal, or Teacher only
- `POST /library/reminders` — sends persisted in-app overdue reminders to linked portal accounts
- `PATCH /library/books/:id`
- `POST /library/loans/:id/renew`
- `POST /library/requests/:id/decision`

## `/payroll`  (4 routes, role-gated)
- `GET /payroll/:id/pdf`
- `GET /payroll`
- `POST /payroll` — active/on-leave staff only; calculated periods cannot overwrite a paid payslip
- `POST /payroll/:id/pay` — atomic Processed → Paid transition

## `/expenses`  (5 routes, role-gated)
- `GET /expenses`
- `POST /expenses`
- `POST /expenses/:id/review`
- `POST /expenses/:id/pay`
- `POST /expenses/:id/cancel`

## `/helpdesk`  (5 routes, role-gated)
- `GET /helpdesk/assignees`
- `POST /helpdesk/:id/replies`
- `GET /helpdesk`
- `POST /helpdesk`
- `POST /helpdesk/:id/transition`

## `/certificates`  (8 routes, role-gated)
- `GET /certificates/pdf-status`
- `GET /certificates/:id/pdf`
- `GET /certificates/requests`
- `POST /certificates/requests`
- `POST /certificates/:id/cancel`
- `GET /certificates`
- `POST /certificates`
- `POST /certificates/:id/decision`

Certificate types: Bonafide, Transfer, Character, Study, ReportCard, Provisional.
Pending requests get a REQ reference and can be approved/rejected by Administrator or
Principal. Approval allocates the issued number. Printed copies need a school signature;
this API does not digitally sign or publicly verify certificates.

## `/facilities`  (6 routes, role-gated)
- `PATCH /facilities/facilities/:id`
- `POST /facilities/bookings/:id/cancel`
- `GET /facilities/facilities`
- `POST /facilities/facilities`
- `GET /facilities/bookings`
- `POST /facilities/bookings`

## `/events`  (4 routes, role-gated)
- `GET /events`
- `POST /events`
- `PATCH /events/:id`
- `POST /events/:id/cancel`

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

## `/transport`  (13 routes, role-gated)
- `GET /transport/vehicles`
- `POST /transport/vehicles`
- `PATCH /transport/vehicles/:id/maintenance` — takes its active route to depot and blocks it from returning to the road
- `GET /transport/routes`
- `GET /transport/incidents`
- `POST /transport/routes`
- `PATCH /transport/routes/:id/operational-status` — persists the existing on-road/delayed controls
- `POST /transport/routes/:id/incidents` and `GET /transport/incidents` — persist the existing incident panel
- `POST /transport/routes/:id/assign`
- `PATCH /transport/vehicles/:id`
- `PATCH /transport/routes/:id`
- `POST /transport/routes/:id/remove`
- `PATCH /transport/incidents/:id`

## `/inventory`  (9 routes, role-gated)
- `GET /inventory/items`
- `POST /inventory/items`
- `POST /inventory/items/:id/adjust` — atomic stock adjustment with a persistent movement record; cannot make stock negative
- `GET /inventory/purchase-orders`
- `POST /inventory/purchase-orders`
- `POST /inventory/purchase-orders/:id/send`
- `POST /inventory/purchase-orders/:id/receive`
- `POST /inventory/purchase-orders/:id/cancel`
- `PATCH /inventory/items/:id`

## `/hostel`  (14 routes, role-gated)
- `GET /hostel/rooms`
- `POST /hostel/rooms`
- `GET /hostel/leave`
- `POST /hostel/leave`
- `POST /hostel/leave/:id/transition`
- `GET /hostel/roll-call`
- `PUT /hostel/roll-call`
- `PUT /hostel/roll-call/all`
- `GET /hostel/maintenance`
- `POST /hostel/maintenance`
- `POST /hostel/maintenance/:id/resolve`
- `POST /hostel/rooms/:id/allocate`
- `PATCH /hostel/rooms/:id`
- `POST /hostel/rooms/:id/discharge`

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

## `/visitors`  (4 routes, role-gated)
- `GET /visitors`
- `POST /visitors`
- `POST /visitors/:id/checkout`
- `PATCH /visitors/:id`

## `/biometric`  (4 routes, role-gated)
- `GET /biometric`
- `POST /biometric`
- `POST /biometric/:id/sync`
- `PATCH /biometric/:id`

## `/alumni`  (4 routes, role-gated)
- `GET /alumni`
- `POST /alumni/graduate`
- `GET /alumni/eligibility/:id`
- `PATCH /alumni/:id`

## `/lms`  (9 routes, role-gated)
- `GET /lms/courses`
- `POST /lms/courses`
- `GET /lms/assignments`
- `POST /lms/assignments`
- `POST /lms/assignments/:id/submit`
- `GET /lms/submissions`
- `POST /lms/submissions/:id/grade`
- `PATCH /lms/assignments/:id`
- `PATCH /lms/courses/:id`

## `/timetable`  (6 routes, authenticated and role-gated)
- `GET /timetable`
- `POST /timetable`
- `POST /timetable/publish`
- `POST /timetable/swap` — atomically swaps two scheduled periods or moves one into a free period
- `PATCH /timetable/:id`
- `DELETE /timetable/:id`

## `/announcements`  (5 routes, role-gated)
- `GET /announcements/audience-preview`
- `PATCH /announcements/:id` — author/reviewer edits of Draft only, full content plus required `expectedUpdatedAt`.
- `GET /announcements` — published notices by audience; reviewers also see drafts/pending, teachers see their own unpublished notices
- `POST /announcements` — create Draft or Pending approval; direct Published requires Administrator or Principal
- `PATCH /announcements/:id/status` — Draft → Pending approval by author/reviewer; Pending approval → Published or Draft by reviewer
- Status transitions accept optional `expectedUpdatedAt` and `reviewNote`; UI always sends the version. Teacher submits own draft, Administrator/Principal reviews pending notices.
- `GET /announcements` — published notices by audience; reviewers also see drafts/pending, teachers see their own unpublished notices
- `POST /announcements` — create Draft or Pending approval; direct Published requires Administrator or Principal
- `PATCH /announcements/:id/status` — Draft → Pending approval by author/reviewer; Pending approval → Published or Draft by reviewer

## `/admissions`  (8 routes, role-gated)
- `GET /admissions`
- `POST /admissions` — keeps the full existing application form (guardian, source, date of birth, previous school and notes)
- `PUT /admissions/:id/documents/:key` — stores the six existing admission document slots securely (`id`, `birth`, `photo`, `report`, `immun`, `tc`)
- `POST /admissions/:id/documents/:key/mark-received` — records verified paper documents without pretending a digital file exists
- `GET /admissions/:id/documents/:key`
- `DELETE /admissions/:id/documents/:key`
- `POST /admissions/:id/transition` — auditable pipeline, waitlist, decline and restore; required ID/birth/photo are enforced before offer
- `POST /admissions/:id/enroll` — creates the Student only after an accepted, document-complete application

## `/leave`  (4 routes)
- `GET /leave`
- `POST /leave` — self-service, or Administrator/Principal may submit the existing HR form for a selected staff member
- `POST /leave/:id/decide`
- `POST /leave/:id/cancel`

## `/meetings`  (8 routes, role-gated)
- `GET /meetings` — leadership sees all; Parent sees open/own bookings; Teacher sees open/own teacher bookings; Accountant/Student see open slots only
- `POST /meetings` — leadership publishes for an existing teaching staff record; Teacher publishes only their own linked staff slots
- `POST /meetings/:id/book`
- `POST /meetings/:id/book-on-behalf` — leadership books the existing slot for a correctly linked guardian/student
- `POST /meetings/:id/confirm` — confirms Pending PTM only
- `POST /meetings/:id/cancel` — returns a booked slot to Available and clears participant data
- `POST /meetings/:id/reschedule` — atomically moves a booking to an available slot for the same teacher
- `POST /meetings/:id/notify` — reports unconfigured participant delivery (400), or no participants (409)

## `/documents`  (4 routes, authenticated)
- `GET /documents` — current records by default; optional version history
- `GET /documents/:id/file` — download that exact version's PDF; 404 for paper-only records
- `POST /documents/file` — publish a version with an attached PDF, max 8 MB (same write roles)
- `POST /documents` — publish metadata-only version (Administrator/Principal/Teacher)

## `/id-cards`  (5 routes, Administrator/Principal/Teacher only)
- `GET /id-cards` — filter by holder type or Active/Lost/Revoked state
- `POST /id-cards` — issues one card only to an active Student/Staff holder
- `POST /id-cards/:id/report-lost` — atomic Active → Lost transition
- `POST /id-cards/:id/revoke` — atomic Active → Revoked transition
- `GET /id-cards/:id/pdf`

## `/reports`  (1 route, Administrator/Principal only)
- `GET /reports/insights`
- `GET /reports/overview` — school-wide student grade/status, staff, admissions, exam-grade counts, invoice billed/collected totals in the saved school currency (including partial payments and effective overdue status), plus six monthly attendance rates from saved marks; months without marks return `null` rate

## `/settings`  (2 routes, role-gated)
- `GET /settings` — saved school profile, academic settings, and disabled-module visibility; authenticated read
- `PUT /settings` — Administrator-only, audited save of school profile, academic settings, and module visibility; currency changes that conflict with existing invoices are rejected, and module switches do not revoke API permissions

## `/messages`  (4 routes)
- `GET /messages`
- `POST /messages`
- `POST /messages/:id/read`
- `POST /messages/:id/archive` with `{archived:boolean}` — current participant's personal archive/restore; non-parties receive 404. `GET /messages` accepts `archived=true|false` alongside inbox/sent/all box.
- New messages accept optional `replyTo`; requester and recipient must be the original participants. Recipients must be active/unsuspended. Only recipient may set first read timestamp; no Administrator bypass.
- `GET /messages`
- `POST /messages`
- `POST /messages/:id/read`
## `/guardians`  (10 routes, leadership management and owned Parent reads/replies)
- `GET /guardians` — paginated guardian directory; Parent scoped to own explicit `userId` and currently owned populated children
- `GET /guardians/broadcasts` and `POST /guardians/broadcasts` — persisted audience-targeted parent broadcasts; only `In-app only` delivery is active
- `POST /guardians/broadcasts`
- `PATCH /guardians/:id/portal` — leadership activates/suspends linked portal access; suspension blocks existing JWTs, login and refresh
- `GET /guardians/:id/messages` and `POST /guardians/:id/messages` — leadership or owning Parent thread; school messages are `out`, Parent replies are `in`
- `POST /guardians/:id/messages`
- `GET /guardians/:id` — leadership or owning Parent only
- `POST /guardians` and `PATCH /guardians/:id` — leadership contact/child/consent save; edits require `expectedUpdatedAt`
- `PATCH /guardians/:id`
- `PATCH /guardians/:id/account` — leadership links/unlinks existing active Parent by `parentEmail` (nullable); requires `expectedUpdatedAt`, atomically updates child portal ownership

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

## `/notifications` (staff external delivery)
- `GET /notifications/status` — server-side provider configuration status, without secrets
- `GET /notifications` — paginated jobs; leadership sees all external jobs, Teacher only own
- `POST /notifications` — active-account recipient, Email/SMS channel, subject/body and `idempotencyKey`; Teacher awaits approval
- `POST /notifications/:id/approve` — leadership only, Awaiting approval → Pending
- `POST /notifications/:id/cancel` — owned/leadership Pending or Awaiting approval only
- `POST /notifications/:id/retry` — conservative retry of failed jobs; ambiguous SMS and expired email idempotency cannot retry
- `POST /notifications/resend-webhook` — original raw payload verified with Svix headers/secret; no bearer auth; persistent event deduplication

## Certificate PDF downloads
- `GET /certificates/pdf-status` — signing configuration presence, never signing secrets
- `GET /certificates/:id/pdf?signed=false|true` — ownership-scoped issued PDF binary; official signing creation requires Administrator/Principal; authorized readers may download cached signed copies

## Health follow-up contract

`POST /health-records` also accepts optional `visitDate`, `followUpDate` (YYYY-MM-DD) and `followUpNote`. Dates use the configured school calendar, cannot be future visits, and only leadership may backdate. `PATCH /health-records/:id` requires `expectedUpdatedAt` and `reason`; it changes outcome/contact/follow-up, accepts `followUpDate:null` to clear a completed follow-up, and preserves dated outcome history. Teacher cannot patch. Student reads use its explicit student account link; Parent reads use its guardian account link.

## Behaviour review contract

`POST /behaviour` accepts `incidentDate`, `followUpDate`, `visibility` (Shared with family/Staff only) and type-aware points. Pastoral notes default private; merits default +2 and Closed. `PATCH /behaviour/:id/status` requires status, `expectedUpdatedAt` and reason; accepts recorded `actionTaken`, follow-up date/null and leadership-only `assignedToEmail`. Closing requires resolution and clears follow-up. Teacher can review only own Logged records; leadership reviews escalated/closed cases. Family GET is linked-student scoped, excludes private pastoral notes and removes private witness/assignment/history fields.

## Staff, leave and payroll refinements

- `PATCH /staff/:id` requires `expectedUpdatedAt` and `changeReason`; profile/status/annual balance edits retain dated history. Optional annual balance is 0–366 calendar days.
- `PATCH /staff/:id/account` requires nullable existing account email, current version and reason; office-only, eligible active staff roles, no duplicate linked profiles. Parent/Student HR reads are denied even with a legacy link. Accountant directory excludes other employees' private document/history/checklist fields.
- HR document download enforces own/office access and private/no-store caching; photo uploads require JPEG/PNG/WebP. Versioned upload/checklist changes prevent stale overwrite.
- `POST /leave` accepts Annual/Sick/Casual/Unpaid type, real calendar from/to dates and reason. Overlaps serialize per employee. Approval and annual balance changes are transactional; office cannot decide own leave.
- `POST /leave/:id/cancel` accepts reason; own Pending or office Pending/Approved only. Approved annual cancellation transactionally restores days once and records history.
- `POST /payroll` validates actual YYYY-MM months and cent amounts; correcting a saved period requires its current `expectedUpdatedAt` and `correctionReason`.
- `POST /payroll/:id/pay` requires version, actual `paidDate`, `paymentMethod` and `paymentReference`; atomically records external payment already made, without transferring money.
- `GET /payroll/:id/pdf` returns an owned actual binary unsigned payslip copy; family/other-employee access denied.

LMS refinements: `PATCH /lms/assignments/:id` and `PATCH /lms/courses/:id` require `expectedUpdatedAt` and a review reason. Assignment scope/maximum score locks after submissions. Grading `POST /lms/submissions/:id/grade` also requires version/reason and preserves grading history. Family assignment/course lists are grade-scoped; drafts and internal review history are hidden. Course/assignment creation supports academicYear and subject, with optional matching course linkage.

Library refinements: `PATCH /library/books/:id` reviews title/author/category/shelf with version/reason; `POST /library/loans/:id/renew` extends due date with version/reason. `POST /library/requests` supports explicit authorized `studentId`. `POST /library/requests/:id/fulfill` accepts a due date and transactionally issues a linked loan. `POST /library/requests/:id/decision` accepts Rejected (staff) or Cancelled (authorized family/staff), with reason. Reminders are portal-only with an atomic 24-hour repeat guard.

Transport refinements: `PATCH /transport/vehicles/:id` reviews driver/capacity/expiry/state with version/reason. Maintenance and operational-status endpoints now also require version/reason. `PATCH /transport/routes/:id` reviews plans/archive, `POST /transport/routes/:id/remove` removes a rider with version/reason, and `PATCH /transport/incidents/:id` records status/resolution/version/reason. Assign accepts a saved stopName. Family routes and vehicles are linked-student scoped and exclude other riders; GPS remains unconfigured.

Hostel refinements: `PATCH /hostel/rooms/:id` reviews room/warden/policy/archive with version/reason; `POST /hostel/rooms/:id/discharge` records boarder discharge with version/reason. Allocate accepts explicit bedLabel and serializes one room per active student. Family leave/roll reads are owned; Parent/Student can request a pass or cancel their pending request. Gate transitions require expectedUpdatedAt/reason; approval additionally requires pickup contact and guardianConsentConfirmed, departure records actual pickup within approved dates. Roll corrections require version/reason; bulk present preserves all previous marks. Maintenance resolve supports reviewed status/resolution/version/reason.

## Cafeteria reviewed workflows

`POST /cafeteria/wallets/top-up` and `/wallets/purchase` accept positive two-decimal `amount`, `studentId`, `description`, optional wallet-scoped `requestId`, recorded `method` and `reference`. Wallet/ledger writes commit atomically; identical request IDs replay without another charge, changed details return 409. Only Administrator/Principal/Accountant writes. Parent and Student wallet/transaction reads intersect linked student ownership; Teacher receives no finance rows.

`POST /cafeteria/allergy-plans` corrects existing instructions only with `expectedUpdatedAt` and reason, preserving previous values. Office roles manage; family receives only owned current plans. `PUT /cafeteria/menu/item` requires version/reason when replacing an existing dish. Menu slots are recurring weekly entries. No external payment, automated allergy compatibility or catering certification is implied.

## Expenses reviewed workflows

`POST /expenses` submits only for the recorder's linked staff profile. `expenseDate` is a real school-calendar YYYY-MM-DD, amount is positive/two-decimal, optional vendor/receiptReference are retained. `POST /expenses/:id/review` requires `expectedUpdatedAt`, Approved/Rejected status and reviewNotes; finance roles cannot review their own claim. Atomic Pending/version conditions prevent competing decisions. `POST /expenses/:id/cancel` accepts version/reason and cancels only an own Pending claim. `POST /expenses/:id/pay` is finance-only and accepts version, actual paidDate, Cash/Bank transfer/Cheque paymentMethod, paymentReference and reason; only Approved can become Paid. All transitions retain history; no bank transfer is initiated. Families receive no claims.

## Inventory reviewed workflows

All `/inventory` routes require Administrator/Principal/Teacher/Accountant. `PATCH /inventory/items/:id` corrects metadata with `expectedUpdatedAt` and reason; quantity is excluded and previous fields are retained. Stock adjustments optionally check saved version and always preserve movements/nonnegative quantity. Purchase-order creation rejects duplicate item lines, non-cent costs and invalid delivery days. Send/cancel/receive endpoints accept optional saved version/reason and enforce atomic current status; receipt writes every stock line and movement/order history in one transaction, rolling back on missing items. Sent denotes a recorded dispatch; no external supplier message occurs.

## Calendar lifecycle

`GET /events` intersects audience/date/status filters with family scopes. `POST /events` atomically creates an event and optional facility reservation. `PATCH /events/:id` accepts full title/description/date/audience plus expectedUpdatedAt/reason, retains history and disallows changing a reserved venue day. `POST /events/:id/cancel` requires version/reason; event and reservation cancellation commit together and cancelled intervals no longer block booking. Read-only roles receive no internal event history. Dates are real YYYY-MM-DD.

## Biometric registry and unconfigured connector

`POST /biometric` registers mode/manufacturer/serial/name/location with Unknown status. `PATCH /biometric/:id` requires full metadata, enabled/status, expectedUpdatedAt/reason, and an actual nonfuture observedAt for Online/Offline manual inspections. Review history is retained. `POST /biometric/:id/sync` returns 409 when the connector is unconfigured, without fabricating Online, lastSyncAt or attendance. All infrastructure routes require Administrator/Principal/Teacher.

## Visitor desk workflows

`POST /visitors` requires hostConfirmed=true and records optional phone/organization/badge/identityChecked/notes. Active badges cannot be assigned twice; checkout releases the unique badge slot. `PATCH /visitors/:id` accepts full metadata plus version/reason, preserves previous details and requires renewed hostConfirmed when changing the host. Physical timestamps/status are excluded from corrections. `POST /visitors/:id/checkout` optionally checks saved version, records actual departure actor/time and history. Administrator/Principal/Teacher only. Date-filtered lists use configured school-calendar boundaries.

## Certificate family request lifecycle

`GET /certificates/requests` returns staff request records or own family submissions for linked students. `POST /certificates/requests` is Parent/Student only, accepts studentId/type/purpose and creates Pending without issuing a document. Student serialization prevents duplicate Pending types and rechecks ownership inside the transaction. `POST /certificates/:id/cancel` is own-family Pending only, with expectedUpdatedAt/reason. Office decisions optionally accept saved version/reason; UI supplies them. Standard issued lists intersect explicit student filters with family ownership; cancelled/pending staff records remain hidden from family issued lists.

## Document reviewed publication

Document list accepts literal `q` and category/history filters. Metadata `POST /documents` accepts optional expectedVersion/publicationReason; the UI uses expectedVersion=0 for a new code and the current displayed version for republication. Code serialization, superseding and next-version insertion commit in one transaction. PDF publication accepts X-Document-Expected-Version/X-Document-Publication-Reason headers; failed publication removes unreferenced uploaded bytes. Earlier files remain available. Downloads are authenticated/private/no-store; shared policies are readable by every role.

## Owned ID card records

ID card lists are office-wide for Administrator/Principal/Teacher, linked-student-only for Parent/Student, and own-staff-only for Accountant. Active/Expired filtering uses the current school day; expiry is inclusive. `GET /id-cards/:id/pdf` returns an authenticated private unsigned record copy under the same ownership scope. Owned holders may POST report-lost; issuance/revoke remain office-only. Lost/revoke optionally accept expectedUpdatedAt/reason and append history. Issuance rechecks active-holder eligibility and records serial/card together in a replica-set transaction.

### Reviewed alumni records

GET `/alumni` parses pagination and scopes Parent/Student to linked records, withholding school notes/history. GET `/alumni/eligibility/:id` previews Active status and outstanding library/transport/hostel links for Administrator/Principal/Teacher. POST `/alumni/graduate` requires `academicCompletionConfirmed: true`, a non-future graduation year and supports student `expectedUpdatedAt`; the transaction rechecks clearance before committing Student status and AlumniProfile. PATCH `/alumni/:id` accepts `expectedUpdatedAt`, `reason`, `currentEmployer`, `contactEmail`, `allowContact` and office-only `notes`. School staff or the owned Student can review; Parents cannot edit. No external invitations or mentoring workflow is implied.

### Reviewed facilities and cancellations

Facilities reads require Administrator/Principal/Teacher/Accountant. PATCH `/facilities/facilities/:id` requires teaching-staff role, `expectedUpdatedAt`, `reason`, name/type/capacity and Available/Maintenance status. Maintenance blocks new bookings without silently cancelling existing reservations. POST `/facilities/bookings/:id/cancel` requires version/reason; active event-linked bookings return 409 and must cancel through Calendar. Booking dates are real YYYY-MM-DD values.

### Helpdesk conversations and reviewed resolution

GET `/helpdesk` parses defaults and keeps ownership filters. GET `/helpdesk/assignees` returns only active staff name/reference/designation for support roles; it does not grant HR detail access. POST `/helpdesk/:id/replies` requires `expectedUpdatedAt` and `message`, scoped to the ticket owner or support role, and rejects closed/stale tickets. Status transitions append actor/time/from/to/notes/assignment history and support `expectedUpdatedAt`; Resolved requires meaningful resolution notes. Returning Assigned to Open clears the current assignment without erasing history. The UI always supplies version and notes.

### Audience-scoped surveys

GET `/surveys` parses pagination, returns `hasResponded` for the current user and scopes non-management roles to Active/Closed surveys for All or their role audience. Survey creation supports All/Staff/Parents/Students; options must be unique. Activate only transitions Draft/Scheduled → Active; close only transitions Active → Closed. Closed cannot reopen. Respond requires every question exactly once, valid options and audience access; a replica-set transaction serializes survey closure and response commit. Unique survey/respondent prevents duplicate submissions. Results are restricted to Administrator/Principal/Teacher and return aggregate counts only. Scheduling remains a recorded intention requiring manual activation; no automatic scheduler is implied.

### Report calculation basis

GET `/reports/overview` remains Administrator/Principal only. The response includes generatedAt, configured timezone, asOfDay and explicit calculation basis. Fee amounts/outstanding are rounded to cents and Due includes the saved due day in school timezone. Attendance summaries use actual recorded Present/Late divided by non-Excused marks in the rolling six-month window through the school day, with null for no eligible records. Historical Student GPA remains a legacy profile value and is not presented as computed assessment GPA. The overview reads collections independently, without claiming an audited accounting snapshot.

### Reviewed school configuration and full workspace visibility

GET `/roles` and `/roles/me` include the 37 released workspace visibility keys. Initialization fills absent keys only, preserving existing administrator decisions and saved versions on no-op reads. PATCH `/roles/:id/permissions/:module` supports `expectedUpdatedAt` and `reason`, preserves actor/time/module/enabled history, and blocks disabling Administrator Roles & Access/Settings recovery navigation. Grants affect navigation; API actions still enforce server roles and ownership. Custom roles are reusable templates and cannot be assigned to accounts by this API. PUT `/settings` supports `expectedRevision`; stale writes return 409 and successful saves increment revision. Existing clients may omit the version; released UI always supplies it. GET settings remains readable to authenticated users.

### Filtered audit register

GET `/audit-log` supports literal `q` action search, exact `module`, severity, real-calendar `dateFrom`/`dateTo` and server pagination. Dates span the configured school timezone; reversed ranges return 400. Administrator/Principal only. Released filtered CSV fetches every matching page before recording the fixed server-owned export acknowledgement. No arbitrary audit creation/update/delete endpoint exists. This API is append-only, without claiming cryptographic tamper resistance against database administrators.

### Recorded leadership review signals

GET `/reports/insights` is Administrator/Principal only. It aggregates actual recorded Attendance/ExamResult/Invoice evidence for Active students, fixed priority rules and saved low-stock thresholds, returning generation time, school day, currency and evidence. No legacy Student GPA/attendance value, predictive model, external AI delivery or automatic student decision is used.

## `/inbox` (private saved notifications)

All authenticated roles; every operation is scoped to the authenticated recipient, including administrators.

- `GET /inbox?page=1&unread=true` — 25-row pages; metadata includes recipient-scoped unread count.
- `POST /inbox/:id/read` — idempotent read action; another account's ID returns 404.
- `POST /inbox/read-all` — mark only the caller's unread events read.

CRM leadership additionally uses `GET /crm/assignees`, `POST /crm/:id/assign` (`ownerId`), `POST /crm/:id/complete-follow-up` (`note`) and `POST /crm/:id/email` (`subject`, `body`, `idempotencyKey`). Email destinations come from the saved enquiry; delivery jobs are tracked under `/notifications`. `/advance` cannot move Application to Won; `/convert` creates and links an actual admission application.

CRM contact/outreach additions (Administrator/Principal only):

- `PATCH /crm/:id` — editable student/guardian contact fields, grade/source/temperature, required `updatedAt` optimistic concurrency token; 409 for stale/archived/converted/duplicate enquiries.
- `POST /crm/bulk-email` — reviewed `recipients: [{id,email}]` (1–100), `subject`, `body`, `idempotencyKey`; persisted idempotent batch, deduplicated addresses and per-record skipped reasons.
- `GET /crm/:id/deliveries` — latest 100 summaries for this lead, excluding body/request keys; cancellation and guarded retry use existing notification routes.

### Teacher LMS automation

- `GET /lms/teaching-options` — leadership-only active teacher accounts and active class sections.
- `GET /lms/teaching-assignments` — leadership directory; Teacher sees own active assignments only.
- `POST /lms/teaching-assignments` — leadership assigns/reactivates `{teacher,classSection,subject,academicYear}`.
- `PATCH /lms/teaching-assignments/:id` — leadership updates `{active,expectedUpdatedAt}` with stale-write protection.
- `GET /lms/templates` — Teacher sees own/private plus leadership shared templates; leadership sees all, latest 100.
- `POST /lms/templates` — teaching roles save `{name,title,description,subject,maxScore,acceptLate,shared}`; only leadership can set `shared:true`.
- `DELETE /lms/templates/:id` — leadership or owning Teacher deletes a template.
- `POST /lms/assignments/batch` — teaching roles submit `{assignment,grades,idempotencyKey}`; at most 20 target sections, atomic validated writes and idempotent replay.

Assignment create/update additionally accepts `status:Scheduled`, `publishAt` (ISO timestamp with offset), and `notifyEmail` (default false). Teachers require exact active class/subject/year mappings on reads/writes/grading. Scheduled coursework is hidden from family roles. Publishing creates scoped inbox events; automatic Teacher emails use the existing office-approval queue. There is no public endpoint for bypassing the scheduler or approval checks.

Teacher follow-up automation extends existing contracts without a public cron/dispatch endpoint:

- LMS create/update and batch assignment payloads accept `remindersEnabled` (default false). Published assignments use pending-only inbox reminders in the 24-hour pre-deadline and first 48 post-deadline hours, once per stage/deadline/recipient. `notifyEmail` retains its existing approval rules.
- `PUT /attendance/register` additionally accepts `notifyGuardians` (default false) and `notificationChannel:InApp|Email|SMS` (default InApp). Alert requests are restricted to today's register; Teacher requests require an active current-year class mapping. Alert intent is saved transactionally with the attendance rows.

Neither API reports a successful register/assignment save as a delivered message. Worker-generated external requests recheck source state and linked recipient eligibility before dispatch.

### Teacher AI Studio (under `/api/v1/lms/ai`)

Teacher/Principal/Administrator only. All draft routes are author-owned, and Teacher context must still be actively assigned.

| Method | Route | Behaviour |
| --- | --- | --- |
| GET | `/status` | Enabled/configured/provider/model; never credentials |
| GET | `/students?grade=&subject=&academicYear=` | Active authorised class students; id/name/reference only |
| GET | `/drafts` | Latest 50 author-owned accessible draft summaries |
| POST | `/drafts` | Kind, teaching scope, topic, language/options and UUID requestId; persist reviewed-work draft |
| GET | `/drafts/:id` | Private draft/content/source facts |
| PATCH | `/drafts/:id` | Validated content and expectedUpdatedAt; Draft only |
| POST | `/drafts/:id/apply` | reviewed:true, expectedUpdatedAt and matching SaveAssignment/Grade/Message action; transactional/idempotent |

Kinds: Assignment, Quiz, LessonPlan, Feedback, ParentMessage, Progress. Parent/Progress require studentId; Feedback requires submissionId. SaveAssignment requires an offset-aware deadline and optionally Scheduled publishAt. Message uses InApp/Email/SMS; Teacher external requests await approval. LessonPlan/Progress are saved/downloadable drafts and have no implicit mutation action. Exact schemas live in `server/src/modules/lms/lms.ai.validation.ts`.

Assignments accept structured questions; submit accepts `answers:[{questionId,value}]` or legacy non-empty content. Answer keys/rubrics and objective-score suggestions are never included in family assignment/submission responses.

### Managed portal accounts

- `GET /auth/profile`: authenticated own account and linked identity/child/teaching records; no user-ID override. Temporary-password sessions receive account metadata only.
- `POST /auth/password`: `{currentPassword,newPassword}`; strong password validation, changes password and revokes all sessions. Sign in again.
- `GET /auth/accounts/directory?q=&grade=`: Administrator only, literal name/reference search, maximum 50 records each for students, staff and guardians; exact class filters students and linked guardians before the limit, while staff search remains school-wide. Returns independent saved/active class choices.
- `POST /auth/accounts`: Administrator only, `{kind:Student|Staff|Guardian,recordId,role?:Teacher|Principal|Accountant,email?}`. Creates linked account atomically, returns one-time temporary credentials with `Cache-Control: no-store`.
- `POST /auth/accounts/:id/reset`: Administrator only, active non-Administrator accounts; resets temporary credentials and revokes old sessions.
- `POST /auth/login` requires the `{email,password,role}` payload; `email` accepts an account email or generated login ID. Temporary accounts must use `/auth/password` before accessing school APIs. Existing accounts remain supported.

- `GET /auth/accounts/:id`: Administrator-only login metadata for corrections, including current `updatedAt`; no credentials/hash.
- `PATCH /auth/accounts/:id`: Administrator-only `{name,email,reason,expectedUpdatedAt}`; stale/duplicate corrections return 409, unknown fields are rejected. Returns `{user,sessionRevoked}`; changing email revokes sessions. School-record links, role, login ID and password are not editable here.

`POST /auth/login` now requires `{email,password,role}` for every caller. `role` must be one of Administrator, Principal, Teacher, Accountant, Parent or Student and must match the stored account role. Missing/unknown values return 400; wrong credentials or a mismatched role return 401 without tokens. Login ID/email lookup remains case-insensitive. New student IDs use `SCHOOL_LOGIN_CODE-STU-academicYearStart-classSection-roll` (roll padded to at least three characters); employee/guardian IDs use `SCHOOL_LOGIN_CODE-EMP|GRD-recordReference`. Existing IDs remain valid.

Provisioning email policy: `/auth/accounts` uses an alternate real email only when `email` is explicitly supplied. It never silently copies Staff/Guardian contact email. Omitted email provisions an ID-only account; its internal storage alias is rejected for email login and email delivery. Student emails matching recorded guardian contacts and reserved internal addresses are rejected. `/auth/accounts/directory` includes `proposedLoginId` for each school record for the read-only generation preview; invalid class/roll/year or unsupported references return null previews and are validated on provisioning.

The student account directory includes `studentEmail` (own mailbox), distinct from guardian contact email. Student create/update accepts optional `studentEmail`; update `clearFields` can remove it. The generation form suggests recorded own email for each role without automatically enabling email sign-in.
