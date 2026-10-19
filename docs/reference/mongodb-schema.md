# MongoDB Schema Reference — generated from source (`server/src/models/`)

One section per Mongoose model: fields with types as declared, plus declared indexes.
The source files remain the single source of truth; this is a navigable summary.

## AbsenceRequest
- `student`: Schema.Types.ObjectId
- `requestedBy`: Schema.Types.ObjectId
- `decidedBy`: Schema.Types.ObjectId
- `fromDate`: Date
- `toDate`: Date
- `days`: Number
- `type`: String — enum ['Medical', 'Family event', 'Travel', 'Religious observance', 'Other']
- `note`: String
- `status`: String — enum ['Pending', 'Approved', 'Rejected', 'Cancelled']
- `decisionNote`: String
- `decidedAt`: Date

## AccessRole
- `key`: String — normalized unique role key
- `name`: String
- `description`: String
- `basedOn`: String — source role used when cloning a custom role
- `isSystem`: Boolean
- `permissions`: Map<String, Boolean> — explicit grant for each of 11 governed UI modules
- Unique index: `key`

## AdmissionApplication
- `applicantName`: String
- `gradeAppliedFor`: String
- `gender`: String — enum ['Male', 'Female']; optional only for legacy CRM conversions and required before enrolment
- `guardianName`: String
- `phone`: String
- `dateOfBirth`, `nationality`, `guardianRelationship`, `guardianEmail`: Applicant and guardian details
- `source`, `previousSchool`: Existing admissions-form context
- `status`: String — enum ['Applied', 'Shortlisted', 'Interviewed', 'Accepted', 'Enrolled', 'Rejected', 'Waitlisted']
- `notes`: String
- `decisionReason`, `decisionOutcome`, `previousStatus`: Auditable decline/waitlist/restore context
- `documents[]`: Six existing document slots with secure GridFS metadata or verified-paper receipt timestamp
- `history[]`: `{ from, to, reason, outcome, performedBy, at }` pipeline audit entries
- `enrolledStudent`: Schema.Types.ObjectId

## Transport
- `Vehicle.status`: String — enum ['Available', 'Maintenance']; maintenance safely prevents route operation
- `Route.stops[]`: `{ name, address, pincode, time, lat, lng }` — preserves the existing route-map detail
- `Route.status`: String — enum ['Depot', 'On road', 'Delayed']
- `Route.onTimePct`, `Route.gpsId`, `Route.assignedStudents[]`: Operational route data and rider assignment
- `TransportIncident`: `{ route, type, severity, location, description, status, reportedBy }`

## AlumniProfile
- `student`: Schema.Types.ObjectId
- `graduationYear`: Number
- `currentEmployer`: String
- `contactEmail`: String
- `notes`: String

## Announcement
- `status`: Draft/Pending approval/Published; `reviewNote`: optional reviewer feedback.
- `updatedAt` is the draft/status optimistic edit token.
- `title`: String
- `body`: String
- `audience`: String — enum ['All', 'Staff', 'Parents', 'Students']
- `pinned`: Boolean
- `publishedBy`: Schema.Types.ObjectId

## Assignment
- `title`: String
- `description`: String
- `subject`: String
- `grade`: String
- `dueDate`: Date
- `maxScore`: Number
- `createdBy`: Schema.Types.ObjectId

## Attendance
- `student`: Schema.Types.ObjectId
- `date`: Date
- `session`: String — enum ['AM', 'PM']
- `status`: String — enum ['Present', 'Absent', 'Late', 'Excused']
- `markedBy`: Schema.Types.ObjectId
- `notes`: String

## AuditLog
- `action`: String
- `module`: String
- `performedBy`: Schema.Types.ObjectId
- `severity`: String — enum ['Info', 'Warning', 'Critical']

## BehaviourIncident
- `student`: Schema.Types.ObjectId
- `category`: String
- `description`: String
- `severity`: String — enum ['Minor', 'Moderate', 'Serious']
- `reportedBy`: Schema.Types.ObjectId
- `actionTaken`: String

## BiometricDevice
- `name`: String
- `location`: String
- `status`: String — enum ['Online', 'Offline']
- `lastSyncAt`: Date

## Book
- `isbn`: String
- `title`: String
- `author`: String
- `category`: String
- `totalCopies`: Number
- `availableCopies`: Number

## Booking
- `facility`: Schema.Types.ObjectId
- `date`: Date
- `startTime`: String
- `endTime`: String
- `bookedBy`: Schema.Types.ObjectId
- `purpose`: String

## CafeteriaTransaction
- `wallet`: Schema.Types.ObjectId
- `type`: String — enum ['TopUp', 'Purchase']
- `amount`: Number
- `description`: String

## CafeteriaWallet
- `student`: Schema.Types.ObjectId
- `balance`: Number

## Certificate
- `assessmentSnapshot`: optional immutable issued exam/student/score/grade snapshot for generated ReportCard records. Historical cards may have no snapshot; no historical values are fabricated.
- `certNumber`: String
- `student`: Schema.Types.ObjectId
- `type`: String — enum ['Bonafide', 'Transfer', 'Character', 'Study', 'ReportCard']
- `purpose`: String
- `issuedBy`: Schema.Types.ObjectId
- `issuedDate`: Date

## ClinicVisit
- `student`: Schema.Types.ObjectId
- `reason`: String
- `treatment`: String
- `outcome`: String — enum ['Returned to class', 'Sent home', 'Referred to hospital']
- `recordedBy`: Schema.Types.ObjectId

## Counter

## CurriculumUnit
- `subject`: String
- `term`: String
- `title`: String
- `outcomes`: String
- `sequenceOrder`: Number
- `plannedDate`: Date (optional)
- `completedDate`: Date or null — drives completed/planned coverage state
- `framework`: String
- `owner`: String
- unique case-insensitive compound index: `subject + term + title`

## ClassSection
- `room`: String — optional classroom label (max 60)
- `status`: String — Active (default) or Archived
- `grade`: String
- `section`: String — A to F
- `stream`: String — enum ['Foundation', 'Primary', 'General', 'Commerce', 'Science', 'Arts']
- `teacherStaffId`: Schema.Types.ObjectId → Staff (optional; must resolve to active teaching staff when assigned)
- `representativeStudentId`: Schema.Types.ObjectId → Student (optional)
- `capacity`: Number — 1 to 100
- `filled` is derived at read time from active Student records whose `grade` equals `grade + ' · ' + section`; it is not duplicated in MongoDB
- unique case-insensitive compound index: `grade + section`

## Event
- `title`: String
- `description`: String
- `date`: Date
- `audience`: String — enum ['All', 'Students', 'Staff', 'Parents']
- `booking`: Schema.Types.ObjectId
- `createdBy`: Schema.Types.ObjectId

## Exam
- `schedule`: persisted subject/date/startTime/durationMinutes/venue entries; empty by default. Dates/time are school-local calendar/wall-clock values.
- `name`: String
- `term`: String
- `subjects`: [String]
- `maxMarks`: Number
- `passMark`: Number
- `locked`: Boolean

## ExamResult
- `corrections`: reason, changedAt, changedBy and previousScores; versioned writes retain prior marks. Families do not receive this internal array.
- `subject`: String
- `marks`: Number
- `exam`: Schema.Types.ObjectId
- `student`: Schema.Types.ObjectId
- `scores`: [examScoreSchema]
- `recordedBy`: Schema.Types.ObjectId

Exam results are one per `(exam, student)`. Scores, averages, grades and rank are derived or
updated safely from the live result; published state is held by `Exam.locked`, not copied into
each student record.

## ExpenseClaim
- `staff`: Schema.Types.ObjectId
- `category`: String
- `amount`: Number
- `description`: String
- `expenseDate`: Date
- `status`: String — enum ['Pending', 'Approved', 'Rejected']
- `reviewedBy`: Schema.Types.ObjectId
- `reviewNotes`: String

## Facility
- `name`: String
- `type`: String
- `capacity`: Number

## HostelRoom
- `roomNumber`: String
- `block`: String
- `capacity`: Number

## IdCard
- `serial`: String
- `subjectType`: String — enum ['Student', 'Staff']
- `subject`: Schema.Types.ObjectId
- `issuedDate`: Date
- `expiryDate`: Date
- `status`: String — enum ['Active', 'Lost', 'Revoked']
- `replaces`: Schema.Types.ObjectId

## InventoryItem
- `name`: String
- `sku`: String
- `category`: String
- `quantityOnHand`: Number
- `reorderLevel`: Number
- `unitCost`: Number
- `supplier`: String
- `location`: String
- `condition`: String — enum ['Good', 'Worn', 'Damaged']
- `lastCounted`: Date
- `movements`: [{ `date`, `type`, `quantityDelta`, `note`, `recordedBy` }]

## Invoice
- `refId`: String
- `student`: Schema.Types.ObjectId
- `term`: String
- `amount`: Number
- `paidAmount`: Number
- `currency`: String
- `dueDate`: Date
- `status`: String — enum ['Pending', 'Paid', 'Overdue']
- `paidDate`: Date

`(staff, month)` is unique. A `Paid` payslip is immutable: the repository’s update filter and
payment transition are both state-guarded, so concurrent run/pay requests cannot revert or
double-pay a payroll period.
- `paymentMethod`: String — enum ['Card', 'Bank transfer', 'Cash', 'Cheque', 'Online portal']

## FeeHead
- `name`, `appliesTo`, `amount`, `currency`, `frequency` (Annual/Term/One-time), `status` (Active/Archived), timestamps.
- Reference pricing only; existing invoices are immutable with respect to fee-head edits.

## InvoicePayment
- `idempotencyKey`: optional requester-prefixed key; partial unique index applies to stored strings. Payment record and invoice balance update share one transaction.
- `invoice`: Schema.Types.ObjectId
- `student`: Schema.Types.ObjectId
- `amount`: Number
- `currency`: String
- `paymentMethod`: String — enum ['Card', 'Bank transfer', 'Cash', 'Cheque', 'Online portal']
- `reference`: String
- `recordedBy`: Schema.Types.ObjectId
- `paidAt`: Date

## LeaveRequest
- `staff`: Schema.Types.ObjectId
- `fromDate`: Date
- `toDate`: Date
- `days`: Number
- `reason`: String
- `status`: String — enum ['Pending', 'Approved', 'Denied']
- `decidedBy`: Schema.Types.ObjectId

## Loan
- `book`: Schema.Types.ObjectId
- `student`: Schema.Types.ObjectId
- `issuedDate`: Date
- `dueDate`: Date
- `returnedDate`: Date
- `status`: String — enum ['Active', 'Returned', 'Overdue']
- `reminderCount`: Number
- `lastReminderAt`: Date

## BookRequest
- `book`: Schema.Types.ObjectId
- `student`: Schema.Types.ObjectId
- `requestedBy`: Schema.Types.ObjectId
- `note`: String
- `status`: String — enum ['Pending', 'Fulfilled']
- `fulfilledBy`: Schema.Types.ObjectId
- `fulfilledAt`: Date

## MeetingSlot
- `teacher`: Schema.Types.ObjectId
- `date`: Date
- `startTime`: String
- `bookedBy`: Schema.Types.ObjectId
- `bookedForStudent`: Schema.Types.ObjectId

## Message
- `replyTo`: optional reference to originating private message, restricted to its participants.
- `archivedBy`: user ObjectId array, default empty; per-participant visibility only.
- Recipient-only `readAt` records the first successful read, including concurrent opens.
- `sender`: Schema.Types.ObjectId
- `recipient`: Schema.Types.ObjectId
- `subject`: String
- `body`: String
- `readAt`: Date

## Payslip
- `staff`: Schema.Types.ObjectId
- `month`: String
- `basicSalary`: Number
- `allowances`: Number
- `deductions`: Number
- `netPay`: Number
- `status`: String — enum ['Draft', 'Processed', 'Paid']
- `paidDate`: Date

## PurchaseOrder
- `item`: Schema.Types.ObjectId
- `quantity`: Number
- `unitCost`: Number
- `refId`: String
- `supplier`: String
- `lines`: [purchaseOrderLineSchema]
- `status`: String — enum ['Draft', 'Sent', 'Received']
- `orderedBy`: Schema.Types.ObjectId
- `expectedDelivery`: Date
- `notes`: String
- `receivedDate`: Date

## Route
- `name`: String
- `vehicle`: Schema.Types.ObjectId
- `stops`: [String]

## SchoolDocument
- `code`: String
- `title`: String
- `category`: String — enum ['Policy', 'Form', 'Circular', 'Guideline']
- `version`: Number
- `description`: String
- `isCurrent`: Boolean
- `publishedBy`: Schema.Types.ObjectId

## SchoolSettings
- `_id`: String
- `schoolName`: String
- `academicYear`: String
- `timezone`: String
- `currency`: String
- `defaultAnnualLeave`: Number

## Staff
- `refId`: String
- `name`: String
- `designation`: String
- `department`: String
- `type`: String — enum ['Teaching', 'Non-Teaching']
- `status`: String — enum ['Active', 'Onboarding', 'On Leave', 'Inactive']
- `email`: String
- `phone`: String
- `joinedDate`: Date
- `userId`: Schema.Types.ObjectId
- `annualLeaveRemaining`: Number
- `documents`: GridFS metadata for Passport/ID, degree, photo and optional compliance documents
- `onboarding`: persisted checklist entries `{ key, label, done }`

## StaffAttendance
- `user`: Schema.Types.ObjectId
- `name`: String
- `role`: String — enum ['Administrator', 'Principal', 'Teacher', 'Accountant', 'Parent', 'Student']
- `date`: Date
- `status`: String — enum ['Present', 'Remote', 'Late']
- `markedAt`: Date

## Student
- `refId`: String
- `name`: String
- `grade`: String
- `gender`: String — enum ['Male', 'Female']
- `roll`: String
- `guardianName`: String
- `dateOfBirth`: Date
- `nationality`: String
- `guardianRelationship`: String — enum ['Father', 'Mother', 'Guardian', 'Other']
- `guardianEmail`: String
- `guardianUserId`: Schema.Types.ObjectId
- `studentUserId`: Schema.Types.ObjectId
- `phone`: String
- `emergencyContact`: String
- `preferredLanguage`: String
- `address`: String
- `previousSchool`: String
- `previousGrade`: String
- `languages`: String
- `bloodGroup`: String — enum ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
- `allergies`: String
- `medicalNotes`: String
- `transportRequirement`: String — enum ['No', 'One-way', 'Two-way']
- `documents`: embedded metadata array (`key`, `label`, GridFS `fileId`, `filename`, `contentType`,
  `size`, `uploadedAt`); file bytes live in the `studentDocuments` GridFS bucket
- `feeStatus`: String — enum ['Paid', 'Pending', 'Overdue']
- `attendancePct`: Number
- `gpa`: Number
- `status`: String — enum ['Active', 'Inactive', 'Alumni']

## Submission
- `assignment`: Schema.Types.ObjectId
- `student`: Schema.Types.ObjectId
- `content`: String
- `submittedAt`: Date
- `isLate`: Boolean
- `score`: Number
- `feedback`: String
- `status`: String — enum ['Submitted', 'Graded']

## Survey
- `questionText`: String
- `options`: [String]
- `title`: String
- `description`: String
- `questions`: [surveyQuestionSchema]
- `status`: String — enum ['Draft', 'Active', 'Closed']
- `createdBy`: Schema.Types.ObjectId

## SurveyResponse
- `questionIndex`: Number
- `selectedOption`: String
- `survey`: Schema.Types.ObjectId
- `respondent`: Schema.Types.ObjectId
- `answers`: [surveyAnswerSchema]

## Ticket
- `raisedBy`: Schema.Types.ObjectId
- `category`: String
- `subject`: String
- `description`: String
- `priority`: String — enum ['Low', 'Medium', 'High', 'Urgent']
- `status`: String — enum ['Open', 'Assigned', 'Resolved', 'Closed']
- `assignedTo`: Schema.Types.ObjectId
- `resolutionNotes`: String

## TimetableSlot
- `grade`: String
- `dayOfWeek`: String — enum ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
- `periodNumber`: Number
- `subject`: String
- `teacherName`: String
- `room`: String (optional)
- `isSubstitute`: Boolean
- `status`: String — enum ['Draft', 'Published']

Unique scheduling indexes prevent class, teacher, and room double-booking for the same day and period.

## User
- `name`: String
- `email`: String
- `passwordHash`: String
- `role`: String
- `isActive`: Boolean
- `refreshTokenVersion`: Number

## Vehicle
- `regNumber`: String
- `capacity`: Number
- `driverName`: String
- `driverPhone`: String

## VisitorLog
- `visitorName`: String
- `purpose`: String
- `hostName`: String
- `checkedInAt`: Date
- `checkedOutAt`: Date
- `status`: String — enum ['CheckedIn', 'CheckedOut']
- `checkedInBy`: Schema.Types.ObjectId
## CrmLead
- `name`, `grade`, `guardian`, `phone`, `guardianEmail`: Prospective family identity and contact data
- `stage`: String — enum [New, Contacted, Toured, Application, Won]
- `source`: String — enum [Website, Walk-in, Referral, Agent, Event, Instagram, Facebook, Google]
- `owner`: String
- `temperature`: String — enum [Hot, Warm, Cold]
- `followUpDate`, `followUpType`: Persisted next-action schedule
- `archived`, `archiveReason`: Reversible archive state and reason
- `lastActivityAt`: Date used to derive the existing idle-day indicator
- `activityLog[]`: `{ action, occurredAt }` retained CRM timeline

A case-insensitive unique compound index on `name + phone` prevents duplicate leads.
## Guardian
- `refId`: String — unique human-readable guardian reference
- `name`, `relation`, `phone`, `email`: Guardian identity/contact fields; email is optional and may be shared
- `userId`: optional Schema.Types.ObjectId — explicit existing Parent login; partial unique index `guardian_portal_unique`
- `studentIds`: [Schema.Types.ObjectId] — populated links to Student records, supporting siblings
- `portalStatus`: String — enum [`Active`, `Invited`, `Suspended`]
- `lastLoginAt`: Date — actual successful Parent login, not portal activation
- `pickupAuthorized`, `financialResponsible`: Boolean
- `custody`: String
- `consents`: embedded `{ media, trips, medical }` nullable booleans; null means not recorded
- `note`: String

## ParentBroadcast
- `subject`, `message`, `audience`, `audienceLabel`, `channel`: Existing parent broadcast fields
- `grade`, `className`, `guardianId`: Audience-specific targeting fields
- `recipientCount`, `deliveredCount`, `readCount`: Persisted delivery counters
- `sentBy`: Schema.Types.ObjectId — User

## GuardianMessage
- `guardianId`: Schema.Types.ObjectId — Guardian
- `direction`: String — enum [`out`, `in`]
- `from`, `text`: Thread display sender and body
- `broadcastId`: optional Schema.Types.ObjectId — ParentBroadcast
- `sentBy`: optional Schema.Types.ObjectId — User

## MeetingSlot (Parents/PTM additions)
- `bookedGuardian`: optional Schema.Types.ObjectId — Guardian; used for leadership bookings
- `status`: String — enum [`Available`, `Pending`, `Confirmed`]
- `room`, `link`, `note`: Existing PTM UI fields now persisted

The teacher/date/start-time unique index remains authoritative. Parent self-booking and leadership booking both atomically claim only `Available` slots; rescheduling runs in a MongoDB transaction.

## External delivery and issued PDF artifacts

`NotificationDelivery` persists sender/recipient refs, frozen destination/from identity, channel, subject/body, request fingerprint, status/attempt timestamps and provider/error metadata. Unique `requestKey` prevents duplicate queue submissions. The worker atomically claims Pending jobs; Unknown outcomes are not silently resent. `NotificationEvent` has unique provider event ID and retained provider ID/type/time to reconcile verified callbacks arriving before the send response.

`CertificatePdf` holds certificate ref, private binary content, signed flag, SHA-256, optional signer-certificate fingerprint, creator and timestamps. Unique `(certificate, signed)` preserves the first generated bytes for each variant. Include this collection in backups. Binary content is excluded from normal model selection.

`ClinicVisit` now stores school-calendar `visitDate`, optional `followUpDate`/`followUpNote`, and dated outcome correction `history` with actor, reason, previous/resulting outcome and contact/follow-up state. Leadership updates use `updatedAt` optimistic concurrency; contact confirmations have server timestamps. Existing records without `visitDate` use their creation date in the school timezone for display.

`BehaviourIncident` adds school-calendar `incidentDate`, `followUpDate`, family/staff `visibility`, assigned active staff account and dated status decision history. Updates use optimistic concurrency; merits are saved closed with type-appropriate points. Family reads exclude staff-only notes and internal witness/assignment/history data.

`Staff.profileHistory` preserves dated actor/reason, previous/resulting employment status and annual balance. Account linking serializes against the linked User to prevent duplicate employee links without silently rewriting existing legacy profiles. `LeaveRequest` adds type, Cancelled status, decision timestamp/note and retained decision history; annual deduction/refund is committed with its corresponding status change in one transaction. Annual days are calendar days, not an invented workday/holiday policy.

`Payslip` adds currency and employee identity snapshots, correction actor/reason/previous/resulting net amount, and recorded payment date/method/reference/actor. Paid periods remain locked. Amount inputs validate two decimal places and calculations use integer cents. PDFs are generated from actual scoped records; payroll PDF copies are not represented as digitally signed certificates.

CurriculumUnit now stores grade, academicYear, archived and dated before/after review history. Its case-insensitive unique index includes subject, term, title, grade and academicYear. Existing databases need the documented Curriculum scope migration; legacy scope is explicitly All grades / Legacy.

Course records include subject, academicYear, archived and dated review reasons. Assignment records include optional course, academicYear, Draft/Published/Closed state, acceptLate and before/after review history. Submission records retain gradedBy/gradedAt and prior/current grade history. The existing assignment/student unique index remains; submission/publication concurrency uses a transaction and assignment version write.

Book adds shelf and dated metadata review reasons. Loan adds renewalCount and dated issue/return/renewal history. BookRequest adds loan linkage, decisionReason and Rejected/Cancelled states. Circulation, fulfilled requests and reminders now use real transactions; per-student writes serialize allowance/duplicate checks without an extra production unique-index migration.

Transport: Vehicle adds insuranceExpiry, driverLicenseExpiry and review history. Route adds archived, studentStops and dated allocation/operation history; existing assignedStudents remains the authorization relation. TransportIncident adds occurredAt, resolution/resolvedAt and versioned review history. Transactions serialize student/vehicle allocation without adding production uniqueness constraints; family projections remove unrelated roster and history data.

HostelRoom adds status/archived, genderPolicy, warden/contact, explicit bed allocations and dated review/allocation history. HostelLeave adds requestedBy, pickup contact, recorded consent, actual departedAt/returnedAt, cancellation and transition history. HostelRollCall adds correction history; bulk inserts preserve existing status/version. HostelMaintenance adds resolution and dated review history. Allocation and overlapping requests serialize per Student in transactions; family projections strip other boarders.

## Cafeteria reviewed records

CafeteriaWallet retains one student wallet and a cent-exact balance. CafeteriaTransaction is an immutable TopUp/Purchase ledger with optional recorded method/reference, recorder and balanceAfter; partial unique `(wallet, requestId)` applies only when a string request ID exists. Wallet and ledger commit in a replica-set transaction, serialized per active student. Legacy transactions retain unknown metadata rather than fabricated values. CafeteriaAllergyPlan preserves dated reviewer/reason/previous instruction history; CafeteriaMenu preserves reviewed previous dishes for each recurring weekday/meal slot.

## Expense claim lifecycle

ExpenseClaim retains submitter identity, staff, vendor/receiptReference, cent-exact amount and actual expenseDate. Status adds Cancelled/Paid alongside Pending/Approved/Rejected. Review/payment/cancellation append dated actor/action/reason history. Paid claims retain actual paidDate/paymentMethod/paymentReference. Legacy submitter/receipt/payment metadata remains absent rather than inferred. Atomic status and updatedAt filters protect one-time decisions and reimbursements.

## Inventory inspection and receipt history

InventoryItem retains metadata review history (actor/date/reason/previous fields) and stock movements. PurchaseOrder retains dated actor/action/reason history. Receipt adds stock movements for every referenced item and commits with Received status/receivedDate in one transaction; missing items cause rollback. Metadata edits use updatedAt CAS without changing stock; signed movements prevent negative stock.

## Calendar reservation lifecycle

Event adds Scheduled/Cancelled status and dated review/cancellation history with previous metadata. Booking adds Active/Cancelled status and cancelledAt; legacy absent status remains active for overlap checks. Event/reservation creation and cancellation share a replica-set transaction and facility serialization; stale event cancellation rolls back reservation changes. Booking rows remain preserved, and overlap queries exclude Cancelled rows.

## Biometric inspection records

BiometricDevice adds Unknown/default observed state, mode, manufacturer, serialNumber, enabled, observedAt and dated reviewer/reason/previous-state history. Existing legacy status/sync fields remain persisted but do not constitute proof of actual hardware connectivity. Unconfigured sync performs no writes or attendance imports.

## Visitor desk admission records

VisitorLog adds phone/organization/badge, hostConfirmed/identityChecked, desk notes, checkedOutBy and dated correction/checkout history. A partial unique active string-badge index prevents duplicate issuance until CheckedOut. Physical check-in/out timestamps cannot be overwritten through metadata correction; updatedAt protects reviewed changes and optional-version checkout.

## Certificate request cancellation

Certificate adds Cancelled request status and decisionReason. Own family cancellation preserves the request reference, purpose, decision actor/time and reason. Pending type duplication serializes on the Student record; family ownership is rechecked in the same transaction. Issued PDF assets remain immutable and are not rewritten by request lifecycle changes.

## Atomic shared document publication

SchoolDocument adds publicationReason. Counter keys `document-publication-<CODE>` serialize code publishing; prior-current superseding and next immutable version commit together in a replica-set transaction. Optional expectedVersion rejects stale/current-code mismatches. Existing partial unique current code and unique code/version indexes remain; GridFS rollback cleanup removes failed uploads with no metadata reference.

## ID card status history and eligibility

IdCard adds dated actor/action/reason history. Issuance serializes/rechecks Active Student/Staff, allocates its Counter serial and creates the card in one transaction. Partial unique Active holder remains; replacement linkage resolves the most recent Lost/Revoked card. Expired is derived from the valid-through day without mutating saved status. Owned card records/PDFs intersect role scope.

AlumniProfile records school academic-completion confirmation and graduating actor. Contact permission defaults false. Reviewed profile changes preserve previous contact/employer/notes/permission with actor, time and reason; Student-linked reads omit school-only notes/history. The unique student index remains the graduation uniqueness guard.

Facility availability defaults Available; reviewed metadata preserves previous fields with actor/time/reason. The internal bookingRevision serializes availability changes and reservation transactions. Booking cancellations preserve status/history and actual cancelledAt; cancelled reservations no longer block overlap checks.

Ticket retains ordered replies with actor, role label, time and message, plus transition history with from/to, actor, time, notes and selected assignee. Atomic status/version checks prevent stale transitions; closed tickets reject conversation updates.

Survey audience defaults All (legacy absent field also means All). Internal responseRevision serializes response transactions and lifecycle updates. SurveyResponse retains the unique survey/respondent key; complete single-choice answer sets prevent duplicate-question tally inflation.

AccessRole extends absent visibility keys without replacing existing grants. Permission reviews preserve actor/time/module/enabled/reason history; no-op role hydration leaves updatedAt unchanged. SchoolSettings revision defaults zero and increments per save; expectedRevision protects the released UI against stale whole-school writes.

### Personal notification inbox and CRM ownership

`inboxnotifications` stores recipient, deduplication event key, title/body, module/record reference and persisted `readAt`. Unique `(recipient,eventKey)` prevents repeated reminders; `(recipient,createdAt)` supports personal history. No global read override is provided.

CRM leads additionally store `ownerUserId` (active CRM-enabled User), `applicationId` (converted AdmissionApplication) and `followUpNotifiedFor` (worker batching marker). Legacy office-owner labels remain supported. CRM prospect email jobs store `crmLead` instead of requiring a portal User recipient; ordinary portal-recipient jobs still require `recipient`. Contacts are revalidated before provider sending.

### CRM email batch identity

`CrmEmailBatch` (`crmemailbatches`) stores unique `requestKey`, payload `fingerprint`, initiating `sender` and timestamps. Individual `NotificationDelivery` rows hold the reviewed CRM destination and message; each lead/batch has a stable queue key. Delivery lookup has an index on `{crmLead:1, createdAt:-1}`. `CrmLead.phone` defaults to an empty string for consistent duplicate identity; reads also recognise legacy missing phone values. Contact editing uses `updatedAt` for optimistic concurrency.

### Teacher assignment automation

`TeachingAssignment` binds actual User teacher accounts to active ClassSection references, an exact class label, subject and academicYear. Unique index: `{teacher,classSection,subject,academicYear}`; revocation sets `active:false`. `AssignmentTemplate` stores reusable coursework fields, creator and school-wide sharing flag. `AssignmentBatch` stores unique requestKey and payload fingerprint for atomic multi-section creation.

Assignment status additionally supports Scheduled, with `publishAt`, `publisher`, `publicationEvent`, `publicationNotifiedAt`, `notifyEmail`, `automationSummary` and optional `batchKey`. A partial unique `{batchKey,grade}` index prevents duplicate section jobs. Historical assignments without publicationEvent receive no retroactive alerts. InboxNotification supports `module:lms`. NotificationDelivery's optional `lmsAssignment` links automated emails to coursework for membership/publication revalidation before provider sending. Family assignment responses omit internal automation/batch markers.

Assignment reminder fields: `remindersEnabled` (false by default), `remindedBeforeFor`, `remindedOverdueFor` (last processed deadline per stage), and `reminderSummary`. Attendance opt-in fields: `alertRequestedAt`, `alertProcessedAt`, `alertChannel` and `alertSummary`. Bookkeeping updates preserve source edit timestamps. InboxNotification accepts `module:attendance`. NotificationDelivery's trusted optional reminder deadline/stage or attendance row/status context allows pre-dispatch state and membership validation; stable `auto:` request keys prevent staff-change duplicates. No historical delivery state is backfilled.

### Teacher AI Studio additions

- `teacheraidrafts`: author User reference; unique `(owner,requestId)`; canonical request fingerprint, bounded typed request/content, provider model, curriculum source references-as-title/timestamp, numeric source facts, submission/assessment source version, lifecycle Generating/Draft/Failed/Applied, applied record/action fingerprint. Never stores API keys. Latest 50 accessible author drafts are listed; retention is manual.
- `assignments.questions`: structured MCQ/ShortAnswer array with stable id, prompt/options/marks and protected answer/rubric. Validation enforces unique ids, MCQ choices/answer membership, and total marks. Existing submitted-work lock also protects questions.
- `submissions.answers`: questionId/value responses; `objectiveScore` is a teaching-only deterministic suggestion. Structured responses also produce readable `content`; legacy text submissions remain supported.
- `notificationdeliveries.teacherAiDraft`: trusted internal draft reference for approval-queued parent messages. A current active child/parent link and active teacher scope are checked again before external delivery.
