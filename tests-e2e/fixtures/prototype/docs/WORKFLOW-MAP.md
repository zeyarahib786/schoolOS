# Solvagence SchoolOS — End-to-End Workflow Map (MERN Conversion Blueprint)

Extracted from the certified frontend code (61 datasets · 100 mutation handlers · 36 modules). Every workflow below is implemented and QA-verified in the current build.

## 1. Architecture translation
| Frontend today | MERN target |
|---|---|
| `assets/js/data/*` in-memory arrays | MongoDB collections (`data/fixtures/*.json` seeds them 1:1) |
| `window.*` mutation handlers (100) | Express REST endpoints + Mongoose services |
| `M.*` render functions (36) | React feature modules / routes |
| `logAudit()` | Audit middleware → append-only `audit_events` collection |
| `exportCSV()` / `downloadICS()` | Server-side export endpoints with role checks |
| `pendingApprovals()` / `approvalDetail()` | `/api/approvals` aggregation + decision endpoints |
| `PERMS` role matrix (UI) | Server-enforced RBAC middleware |

## 2. Verified end-to-end workflows
1. Lead → Enrolment (CRM full lifecycle → Admissions → Student record)
2. Hire → Active employee (mandatory docs → gated activation)
3. Staff leave apply → approve/reject
4. Timetable: edit → drag-swap → conflict detection → publish gate → teacher/room views
5. Attendance: AM/PM sessions → submit → lock → audit
6. Cross-module approvals: staff leave, certificates, gate passes, maintenance
7. Hostel: room allocation → roll-call → gate pass → maintenance resolve
8. Cafeteria: wallet top-up → transaction ledger → allergy flags → stock reorder
9. Certificates: request → approve/reject → template library
10. Admissions: controlled stage transitions → decline-with-reason → waitlist → restore
11. Guardians: independent entity → multi-child linkage → portal lifecycle
12. Calendar: month view → event detail → cancel/restore → notify audience
13. Notifications: derived alerts with deep links
14. Localization: EN/AR/UR/HI with RTL

## 3. Backend additions the frontend deliberately defers
RBAC enforcement, auth/MFA/sessions, real delivery (email/SMS/WhatsApp), payment gateway,
tamper-proof audit storage, file scanning, ML models, multi-tenant config.

## 4. Full inventories
**Datasets (61):** `ADMISSIONS`, `ADM_DOCS`, `ALUMNI`, `ANN`, `AUDIT`, `AV`, `BEHAVIOUR`, `BIODEVICES`, `BOARDERS`, `BOOKINGS`, `BOT_HISTORY`, `BOT_KB`, `BOT_SUGGEST`, `CAFEALG`, `CAFEITEMS`, `CAFESTOCK`, `CAFETXN`, `CERTS`, `CLASSES`, `CLINIC`, `COURSES`, `CRMLEADS`, `CRMSTAGES`, `CURRIC`, `EVENTS`, `EXAMRESULTS`, `EXAMSCHED`, `EXPENSES`, `FACILITIES`, `FEESTRUCT`, `FLEETADD`, `HLEAVE`, `HMAINT`, `HOSTEL`, `HROOMS`, `INVENTORY`, `INVOICES`, `LANG_ENABLED`, `LEAVE`, `LIBCAT`, `LIBLOANS`, `LX_FEAT_ICONS`, `MEALPLANS`, `MENU`, `OPTIONAL`, `PAYRUN`, `PERMROWS`, `PURCHASE_ORDERS`, `ROLES`, `ROUTES`, `STAFF`, `STAFF_DOCS`, `STAGES`, `STUDENTS`, `STUDENT_DOCS`, `SURVEYS`, `TICKETS`, `TT`, `TTCLASSES`, `VISITORS`, `WALLETS`

**Mutation handlers (100):** `activateStaff`, `addAllergy`, `addAlumni`, `addCafeStock`, `addClass`, `addCourse`, `addCurricUnit`, `addDevice`, `addEvent`, `addFeeHead`, `addHostelLeave`, `addInventory`, `addLead`, `addMaint`, `addMenu`, `addPlan`, `addRole`, `addRoute`, `addStaffLeave`, `addStudent`, `addTitle`, `addVehicle`, `admDocDownload`, `admDocDrop`, `admDocMark`, `admDocPick`, `admDocRemove`, `admDocView`, `advanceAdmission`, `advanceTicket`, `allocateRoom`, `approveCert`, `approveLeave`, `approveStaffLeave`, `assignSub`, `bookFacility`, `cancelEvent`, `checkInVisitor`, `checkOutVisitor`, `closeSurvey`, `createEnquiry`, `createStaff`, `createSurvey`, `createTicket`, `cycleRoll`, `downloadICS`, `exportSurvey`, `genReportCards`, `genWPS`, `houseLbRows`, `issueBook`, `issueCert`, `launchSurvey`, `logBehaviour`, `logClinic`, `logExpense`, `markAllRoll`, `postAnnouncement`, `printBadgeFor`, `printLatestBadge`, `publishTT`, `raisePO`, `recordPayment`, `rejectAdmission`, `rejectCert`, `rejectLeave`, `rejectStaffLeave`, `resolveMaint`, `restoreAdmission`, `returnLeave`, `runPayroll`, `saveAdmDecline`, `saveFollowup`, `saveLost`, `saveMarks`, `saveSchedule`, `saveTTPeriod`, `sendAlumniNewsletter`, `sendFeeReminders`, `sendLibraryReminders`, `staffDocDownload`, `staffDocDrop`, `staffDocMark`, `staffDocPick`, `staffDocRemove`, `staffDocView`, `stuDocDownload`, `stuDocDrop`, `stuDocMark`, `stuDocPick`, `stuDocRemove`, `stuDocView`, `syncBio`, `toggleGuardianPortal`, `togglePerm`, `toggleStaffTask`, `topUpWallet`, `ttDragStart`, `ttDrop`, `waitlistAdmission`

**Modules (36):** `admissions`, `aiinsights`, `alumni`, `attendance`, `audit`, `behaviour`, `biometric`, `cafeteria`, `calendar`, `certificates`, `classes`, `comm`, `crm`, `curriculum`, `dashboard`, `exams`, `expenses`, `facilities`, `fees`, `health`, `helpdesk`, `hostel`, `inventory`, `library`, `lms`, `parents`, `payroll`, `reports`, `roles`, `settings`, `staff`, `students`, `surveys`, `timetable`, `transport`, `visitors`
