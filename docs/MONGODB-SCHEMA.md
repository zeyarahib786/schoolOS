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
- `name`: String
- `term`: String
- `subjects`: [String]
- `maxMarks`: Number
- `passMark`: Number
- `locked`: Boolean

## ExamResult
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

## InvoicePayment
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
- `name`, `relation`, `phone`, `email`: Guardian identity/contact fields; email is unique
- `studentIds`: [Schema.Types.ObjectId] — populated links to Student records, supporting siblings
- `portalStatus`: String — enum [`Active`, `Invited`, `Suspended`]
- `lastLoginAt`: Date
- `pickupAuthorized`, `financialResponsible`: Boolean
- `custody`: String
- `consents`: embedded `{ media, trips, medical }` booleans
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
