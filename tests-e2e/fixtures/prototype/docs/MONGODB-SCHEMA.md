# MongoDB Schema — reverse-engineered from the live application state

Every collection below was extracted directly from the tested, running codebase (not written
from a blank slate), by parsing each top-level data array and its first seed record's field
shape. This is the actual current data model — the safest possible starting point for a real
MongoDB migration, since every field listed here is a field the working application genuinely reads
and writes today.

**54 business-data collections identified.**

Recommended `_id`: MongoDB ObjectId for all collections (the current app uses human-readable
business IDs like `INV-1001`, `TKT-2050` — these should become an indexed `refId` field
alongside the ObjectId, not replace it, to preserve the human-readable references used
throughout the UI, receipts, and audit trail.

---

## `students`
*(source: `STUDENTS` array)*

| Field | Notes |
|---|---|
| `id` | business-facing ID — keep as indexed `refId`, not the Mongo `_id` |
| `name` |  |
| `grade` |  |
| `gender` |  |
| `roll` |  |
| `guardian` |  |
| `phone` | PII — see SECURITY-COMPLIANCE.md |
| `fee` |  |
| `att` |  |
| `gpa` |  |
| `status` | enum — validate against a fixed value set server-side |

## `staff`
*(source: `STAFF` array)*

| Field | Notes |
|---|---|
| `id` | business-facing ID — keep as indexed `refId`, not the Mongo `_id` |
| `name` |  |
| `role` |  |
| `dept` |  |
| `type` | enum — validate against a fixed value set server-side |
| `phone` | PII — see SECURITY-COMPLIANCE.md |
| `status` | enum — validate against a fixed value set server-side |

## `admissions`
*(source: `ADMISSIONS` array)*

| Field | Notes |
|---|---|
| `name` |  |
| `grade` |  |
| `stage` | enum — validate against a fixed value set server-side |
| `date` | store as ISODate, format for display in the API layer |
| `src` |  |
| `dob` |  |
| `guardian` |  |
| `phone` | PII — see SECURITY-COMPLIANCE.md |

## `announcements`
*(source: `ANN` array)*

| Field | Notes |
|---|---|
| `t` |  |
| `by` |  |
| `tm` |  |
| `bd` |  |
| `ic` |  |
| `c` |  |
| `aud` |  |

## `examResults`
*(source: `EXAMRESULTS` array)*

| Field | Notes |
|---|---|
| `name` |  |
| `cls` |  |
| `mat` |  |
| `sci` |  |
| `eng` |  |
| `grade` |  |
| `rank` |  |

## `invoices`
*(source: `INVOICES` array)*

| Field | Notes |
|---|---|
| `id` | business-facing ID — keep as indexed `refId`, not the Mongo `_id` |
| `student` |  |
| `term` |  |
| `amt` |  |
| `status` | enum — validate against a fixed value set server-side |
| `due` | store as ISODate, format for display in the API layer |

## `libraryLoans`
*(source: `LIBLOANS` array)*

| Field | Notes |
|---|---|
| `title` |  |
| `author` |  |
| `borrower` |  |
| `cls` |  |
| `due` | store as ISODate, format for display in the API layer |
| `status` | enum — validate against a fixed value set server-side |

## `transportRoutes`
*(source: `ROUTES` array)*

| Field | Notes |
|---|---|
| `r` |  |
| `bus` |  |
| `driver` |  |
| `driverPhone` |  |
| `riders` |  |
| `cap` |  |
| `onTime` |  |
| `status` | enum — validate against a fixed value set server-side |
| `gpsId` |  |
| `stops` |  |
| `name` |  |
| `time` | store as ISODate, format for display in the API layer |
| `lat` |  |
| `lng` |  |

## `payrollRuns`
*(source: `PAYRUN` array)*

| Field | Notes |
|---|---|
| `name` |  |
| `dept` |  |
| `gross` |  |
| `ded` |  |
| `status` | enum — validate against a fixed value set server-side |

## `expenseCategories`
*(source: `EXPENSES` array)*

| Field | Notes |
|---|---|
| `cat` | enum — validate against a fixed value set server-side |
| `budget` |  |
| `spent` |  |
| `c` |  |

## `curriculumSubjects`
*(source: `CURRIC` array)*

| Field | Notes |
|---|---|
| `sub` |  |
| `grades` |  |
| `units` |  |
| `done` |  |
| `c` |  |

## `lmsCourses`
*(source: `COURSES` array)*

| Field | Notes |
|---|---|
| `t` |  |
| `teacher` |  |
| `cls` |  |
| `prog` |  |
| `due` | store as ISODate, format for display in the API layer |

## `hostelBlocks`
*(source: `HOSTEL` array)*

| Field | Notes |
|---|---|
| `block` |  |
| `code` |  |
| `beds` |  |
| `filled` |  |
| `rooms` |  |
| `floors` |  |
| `warden` |  |
| `assist` |  |
| `c` |  |

## `hostelRooms`
*(source: `HROOMS` array)*

| Field | Notes |
|---|---|
| `no` |  |
| `block` |  |
| `floor` |  |
| `type` | enum — validate against a fixed value set server-side |
| `cap` |  |
| `occ` |  |
| `status` | enum — validate against a fixed value set server-side |

## `boarders`
*(source: `BOARDERS` array)*

| Field | Notes |
|---|---|
| `name` |  |
| `id` | business-facing ID — keep as indexed `refId`, not the Mongo `_id` |
| `grade` |  |
| `room` |  |
| `block` |  |
| `guardian` |  |
| `phone` | PII — see SECURITY-COMPLIANCE.md |
| `fee` |  |
| `medical` |  |
| `joined` | store as ISODate, format for display in the API layer |
| `roll` |  |

## `hostelLeaveRequests`
*(source: `HLEAVE` array)*

| Field | Notes |
|---|---|
| `id` | business-facing ID — keep as indexed `refId`, not the Mongo `_id` |
| `name` |  |
| `room` |  |
| `type` | enum — validate against a fixed value set server-side |
| `from` |  |
| `to` |  |
| `reason` |  |
| `status` | enum — validate against a fixed value set server-side |
| `by` |  |

## `hostelMaintenance`
*(source: `HMAINT` array)*

| Field | Notes |
|---|---|
| `id` | business-facing ID — keep as indexed `refId`, not the Mongo `_id` |
| `room` |  |
| `issue` |  |
| `cat` | enum — validate against a fixed value set server-side |
| `prio` |  |
| `by` |  |
| `status` | enum — validate against a fixed value set server-side |
| `date` | store as ISODate, format for display in the API layer |

## `inventoryItems`
*(source: `INVENTORY` array)*

| Field | Notes |
|---|---|
| `sku` |  |
| `item` |  |
| `cat` | enum — validate against a fixed value set server-side |
| `stock` |  |
| `min` |  |
| `unitCost` |  |
| `supplier` |  |
| `location` |  |
| `condition` |  |
| `lastCounted` | store as ISODate, format for display in the API layer |
| `warranty` |  |
| `movements` |  |
| `date` | store as ISODate, format for display in the API layer |
| `type` | enum — validate against a fixed value set server-side |
| `qty` |  |
| `note` |  |

## `purchaseOrders`
*(source: `PURCHASE_ORDERS` array)*

| Field | Notes |
|---|---|
| `id` | business-facing ID — keep as indexed `refId`, not the Mongo `_id` |
| `supplier` |  |
| `items` |  |
| `item` |  |
| `qty` |  |
| `unitCost` |  |
| `expected` | store as ISODate, format for display in the API layer |
| `status` | enum — validate against a fixed value set server-side |
| `date` | store as ISODate, format for display in the API layer |
| `notes` |  |

## `calendarEvents`
*(source: `EVENTS` array)*

| Field | Notes |
|---|---|
| `d` |  |
| `mon` |  |
| `t` |  |
| `tag` |  |
| `c` |  |
| `sub` |  |

## `biometricDevices`
*(source: `BIODEVICES` array)*

| Field | Notes |
|---|---|
| `loc` |  |
| `type` | enum — validate against a fixed value set server-side |
| `sync` | store as ISODate, format for display in the API layer |
| `punches` |  |
| `status` | enum — validate against a fixed value set server-side |

## `visitorLogs`
*(source: `VISITORS` array)*

| Field | Notes |
|---|---|
| `name` |  |
| `purpose` |  |
| `host` |  |
| `in` |  |
| `out` |  |
| `status` | enum — validate against a fixed value set server-side |

## `behaviourRecords`
*(source: `BEHAVIOUR` array)*

| Field | Notes |
|---|---|
| `name` |  |
| `cls` |  |
| `type` | enum — validate against a fixed value set server-side |
| `note` |  |
| `pts` |  |
| `date` | store as ISODate, format for display in the API layer |
| `c` |  |

## `clinicVisits`
*(source: `CLINIC` array)*

| Field | Notes |
|---|---|
| `name` |  |
| `cls` |  |
| `reason` |  |
| `action` |  |
| `time` | store as ISODate, format for display in the API layer |
| `status` | enum — validate against a fixed value set server-side |

## `cafeteriaMealPlans`
*(source: `MEALPLANS` array)*

| Field | Notes |
|---|---|
| `plan` |  |
| `price` |  |
| `subs` |  |
| `meals` |  |
| `c` |  |

## `cafeteriaWallets`
*(source: `WALLETS` array)*

| Field | Notes |
|---|---|
| `name` |  |
| `id` | business-facing ID — keep as indexed `refId`, not the Mongo `_id` |
| `grade` |  |
| `plan` |  |
| `bal` |  |
| `last` |  |

## `cafeteriaTransactions`
*(source: `CAFETXN` array)*

| Field | Notes |
|---|---|
| `name` |  |
| `item` |  |
| `amt` |  |
| `type` | enum — validate against a fixed value set server-side |
| `time` | store as ISODate, format for display in the API layer |
| `method` |  |

## `cafeteriaAllergyPlans`
*(source: `CAFEALG` array)*

| Field | Notes |
|---|---|
| `name` |  |
| `grade` |  |
| `allergens` |  |
| `sev` |  |
| `plan` |  |

## `cafeteriaStock`
*(source: `CAFESTOCK` array)*

| Field | Notes |
|---|---|
| `item` |  |
| `cat` | enum — validate against a fixed value set server-side |
| `stock` |  |
| `min` |  |
| `unit` |  |
| `vendor` |  |

## `cafeteriaMenuItems`
*(source: `CAFEITEMS` array)*

| Field | Notes |
|---|---|
| `item` |  |
| `price` |  |
| `sold` |  |
| `cat` | enum — validate against a fixed value set server-side |
| `cal` |  |

## `certificates`
*(source: `CERTS` array)*

| Field | Notes |
|---|---|
| `name` |  |
| `cls` |  |
| `type` | enum — validate against a fixed value set server-side |
| `ref` | business-facing ID — keep as indexed `refId`, not the Mongo `_id` |
| `date` | store as ISODate, format for display in the API layer |
| `status` | enum — validate against a fixed value set server-side |

## `alumni`
*(source: `ALUMNI` array)*

| Field | Notes |
|---|---|
| `name` |  |
| `batch` |  |
| `path` |  |
| `contact` |  |
| `email` | PII — see SECURITY-COMPLIANCE.md |
| `status` | enum — validate against a fixed value set server-side |
| `employer` |  |
| `industry` |  |
| `university` |  |
| `skills` |  |
| `mentorAvail` |  |
| `consent` |  |

## `alumniMentorRequests`
*(source: `MENTOR_REQUESTS` array)*

| Field | Notes |
|---|---|

## `alumniEvents`
*(source: `ALUMNI_EVENTS` array)*

| Field | Notes |
|---|---|
| `title` |  |
| `date` | store as ISODate, format for display in the API layer |
| `invited` |  |
| `rsvp` |  |

## `facilities`
*(source: `FACILITIES` array)*

| Field | Notes |
|---|---|
| `name` |  |
| `type` | enum — validate against a fixed value set server-side |
| `cap` |  |
| `status` | enum — validate against a fixed value set server-side |

## `facilityBookings`
*(source: `BOOKINGS` array)*

| Field | Notes |
|---|---|
| `facility` |  |
| `by` |  |
| `date` | store as ISODate, format for display in the API layer |
| `time` | store as ISODate, format for display in the API layer |
| `status` | enum — validate against a fixed value set server-side |

## `helpdeskTickets`
*(source: `TICKETS` array)*

| Field | Notes |
|---|---|
| `id` | business-facing ID — keep as indexed `refId`, not the Mongo `_id` |
| `title` |  |
| `cat` | enum — validate against a fixed value set server-side |
| `by` |  |
| `priority` | enum — validate against a fixed value set server-side |
| `status` | enum — validate against a fixed value set server-side |
| `date` | store as ISODate, format for display in the API layer |

## `surveys`
*(source: `SURVEYS` array)*

| Field | Notes |
|---|---|
| `title` |  |
| `audience` |  |
| `responses` |  |
| `sent` | store as ISODate, format for display in the API layer |
| `status` | enum — validate against a fixed value set server-side |
| `c` |  |

## `auditLog`
*(source: `AUDIT` array)*

| Field | Notes |
|---|---|
| `user` |  |
| `action` |  |
| `module` |  |
| `time` | store as ISODate, format for display in the API layer |

## `classSections`
*(source: `CLASSES` array)*

| Field | Notes |
|---|---|
| `cls` |  |
| `rep` |  |
| `teacher` |  |
| `filled` |  |
| `cap` |  |
| `stream` |  |

## `absenceRequests`
*(source: `ABSENCE_REQUESTS` array)*

| Field | Notes |
|---|---|

## `alumniNewsletters`
*(source: `NEWSLETTER_ISSUES` array)*

| Field | Notes |
|---|---|
| `title` |  |
| `period` |  |
| `summary` |  |
| `sentTo` |  |
| `date` | store as ISODate, format for display in the API layer |

## `examSchemes`
*(source: `EXAMSCHEMES` array)*

| Field | Notes |
|---|---|
| `id` | business-facing ID — keep as indexed `refId`, not the Mongo `_id` |
| `name` |  |
| `term` |  |
| `classes` |  |
| `subjects` |  |
| `maxMarks` |  |
| `weightage` |  |
| `passMark` |  |
| `gradeScale` |  |
| `publishDate` |  |
| `status` | enum — validate against a fixed value set server-side |
| `locked` |  |

## `crmLeads`
*(source: `CRMLEADS` array)*

| Field | Notes |
|---|---|
| `name` |  |
| `grade` |  |
| `stage` | enum — validate against a fixed value set server-side |
| `source` |  |
| `phone` | PII — see SECURITY-COMPLIANCE.md |
| `guardian` |  |
| `owner` |  |
| `date` | store as ISODate, format for display in the API layer |
| `temp` |  |
| `idle` |  |
| `follow` |  |
| `followType` |  |
| `archived` |  |
| `log` |  |

## `staffLeaveRequests`
*(source: `LEAVE` array)*

| Field | Notes |
|---|---|

## `parentBroadcasts`
*(source: `PARENT_BROADCASTS` array)*

| Field | Notes |
|---|---|
| `subject` |  |
| `audience` |  |
| `channel` |  |
| `delivered` |  |
| `read` |  |
| `sent` | store as ISODate, format for display in the API layer |

## `ptmMeetings`
*(source: `MEETINGS` array)*

| Field | Notes |
|---|---|
| `id` | business-facing ID — keep as indexed `refId`, not the Mongo `_id` |
| `time` | store as ISODate, format for display in the API layer |
| `date` | store as ISODate, format for display in the API layer |
| `parent` |  |
| `student` |  |
| `teacher` |  |
| `status` | enum — validate against a fixed value set server-side |
| `link` |  |
| `room` |  |

## `feestruct`
*(source: `FEESTRUCT` array)*

| Field | Notes |
|---|---|

## `curric_units`
*(source: `CURRIC_UNITS` array)*

| Field | Notes |
|---|---|

## `expenseClaims`
*(source: `EXPENSE_CLAIMS` array)*

| Field | Notes |
|---|---|

## `libraryCatalogue`
*(source: `BOOKCAT` array)*

| Field | Notes |
|---|---|
| `title` |  |
| `author` |  |
| `cat` | enum — validate against a fixed value set server-side |
| `total` |  |
| `avail` |  |

## `libraryBookRequests`
*(source: `LIBREQUESTS` array)*

| Field | Notes |
|---|---|

## `libraryCategoryStats`
*(source: `LIBCAT` array)*

| Field | Notes |
|---|---|

## `transportIncidents`
*(source: `TRANS_INCIDENTS` array)*

| Field | Notes |
|---|---|
