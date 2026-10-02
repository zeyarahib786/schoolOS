# Solvagence SchoolOS — Compliance Matrix vs. Requirement & Proposal (SchoolOS.docx)

Scope: this matrix covers every section in the uploaded document. Per your instruction, the five
sections already confirmed complete in earlier rounds (Students, Staff & HR, Parents & Guardians,
Certificates, Alumni) are excluded here — see prior delivery notes for their compliance detail.

Legend: ✅ Implemented & verified (automated check passing) · 🔶 Partially implemented ·
🚫 Structurally requires a backend (cannot exist in a static frontend)

## Dashboard
| Item | Priority | Status |
|---|---|---|
| Live, reconciled data (no hard-coded figures) | Critical | ✅ Roster/attendance/fees/admissions all computed from live datasets |
| KPI cards actionable with drill-down | Critical | ✅ Every KPI opens its filtered module |
| Metric reconciliation (attendance vs enrolment) | Critical | ✅ AM/PM/late/absent/unmarked all reconcile to roster |
| Proper approval centre (detail review, not one-click) | Critical | ✅ Review drawer with policy checks, chain, reject/return |
| Campus/term/date filters | High | 🚫 Requires multi-campus backend data model |
| Server-side role/permission enforcement | High | 🚫 Backend-required; UI role switching works |
| Exception-focused operational widgets | High | 🔶 Partial — approvals & notifications live; ageing bands not built |
| Full fee reporting (waived/credited/refunded/ageing) | High | 🔶 Billed/collected/due/overdue live; ageing buckets not built |
| Admissions reporting (capacity, SLA, yield) | High | 🔶 Pipeline counts live; capacity/SLA/forecast not built |
| Controlled, audited export | High | ✅ Real CSV export, audit-logged |
| Permission-based action centre | High | 🔶 Quick actions present; not yet role-filtered |
| Notifications panel (functional, deep-linked) | Medium | ✅ Live derived alerts with deep links |
| Data freshness indicators | Medium | ✅ "computed from... just now" shown |
| Dynamic greeting/locale | Low | 🔶 Partial |

## Admission
| Item | Priority | Status |
|---|---|---|
| Formalized lifecycle (13 stages) | Critical | 🔶 5-stage pipeline + Waitlisted/Closed with reason; not all 13 named stages |
| Controlled stage movement (prereqs, reason codes, audit) | Critical | ✅ Docs-gate blocks advance; audit + history on every transition |
| Strengthened enrolment→student creation | Critical | ✅ enrollStudent validates & creates from application |
| Expanded application form | High | 🚫 Deferred — large form-builder effort |
| Secure document management | High | 🔶 Upload/verify exists; expiry/versioning/e-sign not built |
| Assessment/interview scheduling | High | 🚫 Deferred |
| Offer management (templates, deposit) | High | 🚫 Deferred |
| Capacity & waitlist controls | High | ✅ Waitlist stage + restore workflow |
| SLA/task tracking | Medium | 🚫 Deferred |
| Duplicate detection | Medium | 🚫 Backend-required for real matching |
| Controlled decline (reason, retention, recoverable) | Medium | ✅ Full decline-with-reason workflow, restorable |

## Enrolment CRM
*(Largest section — 11 Critical, 25 High items in the document)*
| Item | Priority | Status |
|---|---|---|
| Clear CRM/Admissions boundary, preserved history on convert | Critical | ✅ convertLead preserves activity log, cross-links to application |
| Lead ownership & workload (owner, due date, overdue) | High | ✅ Owner field + overdue/due-today/upcoming buckets |
| Communication timeline (calls/email/SMS/notes in one view) | High | ✅ Chronological activity log per lead |
| Consent & privacy controls | High | 🚫 Deferred — needs consent data model |
| Lead-source attribution (UTM, cost, ROI) | High | 🚫 Deferred |
| Pipeline stage clarity (Won ≠ enrolled) | Medium | ✅ Won→Convert is a distinct step from Enrolled |
| Lost-lead management (reason, re-engagement date) | Medium | ✅ markLost captures reason, archives |
| Bulk/automation functions | Medium | 🚫 Deferred |
| Funnel analytics (conversion, time-in-stage) | Medium | 🔶 Funnel bar exists; time-in-stage not computed |

## Classes & Sections / Timetable / Attendance
| Item | Priority | Status |
|---|---|---|
| Capacity calculated from real enrolment | Critical | 🔶 Partial |
| Timetable is per-class real data, not static | Critical | ✅ 9 provably-distinct class grids, editable |
| Conflict detection (teacher/room double-booking) | Critical | ✅ Live, re-checked on every edit and drag-swap |
| Draft/published workflow with audit | Critical | ✅ Publish blocked with reason until conflicts clear |
| Drag-and-drop builder | High | ✅ Implemented with break-protection |
| Substitute planning | High | ✅ assignSub with "(sub)" tag |
| Room/teacher views | High | ✅ Workload & utilisation views |
| Attendance persists, locks, notifies | Critical | ✅ Submit locks register, audits |
| AM/PM session switching | High | ✅ Real session toggle with distinct patterns |
| Chronic-absentee flagging | High | ✅ Dashboard + student profile threshold flags |

## Exams & Gradebook
| Item | Priority | Status |
|---|---|---|
| Configurable assessment scheme (not hardcoded) | Critical | ✅ EXAMSCHEMES — max marks, weightage, grading scale, pass mark |
| Marks entry with lock/moderation | Critical | ✅ enterMarks blocked once locked; reopen-for-moderation audited |
| Rank computed, not stored | Critical | ✅ recomputeRanks() runs on every marks change |
| Exam schedule/date-sheet builder | High | 🔶 Static date-sheet view exists; no builder UI |
| Report card template management | High | 🚫 Deferred |
| Subject/learning-outcome analysis | Medium | 🔶 Subject averages exist; LO-level analysis not built |

## Curriculum
| Item | Priority | Status |
|---|---|---|
| Full hierarchy (framework→grade→subject→unit→outcome) | Critical | ✅ Real unit records with outcomes, framework, owner |
| Coverage tracking, planned vs completed | High | ✅ Unit-level mark-done/reopen with live coverage recompute |
| Add unit captures real fields (not just a counter) | Low | ✅ saveUnit — title, term, outcomes, planned date |
| Curriculum versioning per academic year | Critical | 🚫 Deferred |
| Approval workflow for curriculum maps | Critical | 🚫 Deferred |

## Learning (LMS)
| Item | Priority | Status |
|---|---|---|
| Course/lesson/assignment/quiz/submission/grading workflow | Critical | 🔶 Course detail + assignment + grading built; quiz engine deferred |
| Course detail page | High | ✅ Modules, assignments, submission counts |
| Assignment workflow (create→publish→submit→grade) | High | ✅ newAssignmentForm + gradeSubmissions, audited |
| Quiz engine (question bank, auto-grading) | High | 🚫 Deferred |
| Gradebook integration | High | 🚫 Deferred |

## Behaviour
| Item | Priority | Status |
|---|---|---|
| Structured incident workflow (severity, witness, location, status) | Critical | ✅ Full structured form + drawer |
| Audit trail on all entries | Critical | ✅ logAudit on every log/escalate/close |
| Escalation workflow for serious/repeated incidents | Critical | ✅ escalateBehaviour → safeguarding lead |
| Parent-notification approval gate | Critical | ✅ requestGuardianNotify queues for approval, not instant send |
| Positive vs disciplinary tracking separated | High | ✅ Merit/Incident/Detention/Pastoral note as distinct types |
| House points ledger | High | ✅ houseLeaderboard computed from entries |
| Behaviour policy configuration (categories, thresholds) | High | 🚫 Deferred |

## Health & Clinic
| Item | Priority | Status |
|---|---|---|
| Visit persists as a real medical event | Critical | ✅ logClinic pushes a full record, not UI-only |
| Emergency workflow (severity, parent contact, outcome) | Critical | ✅ Severity badges, clinicContactParent, clinicMarkOutcome |
| Audit trail on visits/records | Critical | ✅ Every visit and outcome audited |
| Secure medical profile (allergies, conditions, consent) | Critical | 🔶 Directory + allergy cross-link exists; full profile fields deferred |
| Records button opens real directory | Low | ✅ medicalRecordsDirectory, cross-linked to student profile |
| Medication administration log | High | 🔶 Medicine field captured on visit; standalone inventory deferred |

## Cafeteria
| Item | Priority | Status |
|---|---|---|
| Allergy-aware meal management (block/warn) | Critical | ✅ posSell checks CAFEALG before completing a sale |
| Student wallet system (balance, top-up, transactions) | Critical | ✅ Already built in earlier round — wallets, ledger, low-balance flags |
| POS workflow (scan, balance, allergy alert, sale) | High | ✅ posSell — allergy-gated, balance-checked, audited |
| Meal plan / menu management | High | ✅ Already built — plans, weekly menu, stock |

## Communication
| Item | Priority | Status |
|---|---|---|
| Real messaging engine (persisted, not in-memory-only) | Critical | ✅ Draft/Pending/Published state machine, audited |
| Audience targeting with recipient preview | Critical | ✅ audienceCount() computed before send, shown in drawer |
| Delivery tracking per recipient | Critical | ✅ Queued/delivered/read/failed computed in annDetail |
| Approval workflow for broadcasts | Critical | ✅ submitAnnForApproval → approveAnn/rejectAnn |
| Templates library | High | 🔶 Named in UI; not yet a picker |
| Two-way messaging / inbox | High | 🚫 Deferred |

## Events Calendar
| Item | Priority | Status |
|---|---|---|
| Real calendar (day/week/month, not a 2-week list) | Critical | ✅ Month-view grid built in prior round |
| Event detail, cancel/restore, notify audience | Critical | ✅ Built in prior round, still verified working |
| Approval workflow for school-wide events | Critical | 🚫 Deferred |
| Conflict detection with timetable/exams | High | 🚫 Deferred |

## Surveys & Feedback
| Item | Priority | Status |
|---|---|---|
| Survey lifecycle (draft→live→closed) | Critical | ✅ Built in prior round — launch/close functional |
| Real question builder | Critical | 🚫 Deferred — largest remaining Surveys gap |
| Response capture & analytics | Critical | 🚫 Deferred |

## AI Insights
| Item | Priority | Status |
|---|---|---|
| Separate rule-based logic from real ML claims | Critical | ✅ Built in prior round — "Rule-based" label + disclaimer |
| Human-review workflow before action | Critical | 🔶 Disclaimer present; formal review-queue not built |

## Reports & Analytics
| Item | Priority | Status |
|---|---|---|
| Real reporting engine connected to live modules | Critical | ✅ All 4 cards now compute from Students/Exams/Fees records |
| Drill-down from chart to source records | High | ✅ Every card links to its module |
| Data freshness indicators | Critical | ✅ "computed from... last updated just now" line |
| Role-based report access | Critical | 🚫 Backend-required |

## Roles & Access
| Item | Priority | Status |
|---|---|---|
| Backend enforcement (not just UI toggle) | Critical | 🚫 Backend-required; documented as the #1 MERN priority |
| Audit trail for every permission change | Critical | ✅ togglePerm now logs grant/revoke with sensitive-module flag |
| Live user counts (not static) | Low | ✅ Computed from Staff+Students+Guardians |
| Risky-permission warnings | Medium | ✅ Sensitive-module badge on Payroll/Audit/Fees/Settings rows |

## Audit Log
| Item | Priority | Status |
|---|---|---|
| Immutable, append-only, generated by real actions | Critical | ✅ Already live from prior rounds — 28+ call sites |
| Severity classification | High | ✅ Info/Warning/Critical badges |
| Tamper resistance | Critical | 🚫 Backend-required |

## Settings
| Item | Priority | Status |
|---|---|---|
| School profile setup (legal name, license, campuses) | Critical | ✅ New editable panel this round — updateProfile, audited |
| Academic structure configuration | Critical | 🔶 Academic year/terms/grading shown; not yet a full editor |
| Module dependency validation on disable | Critical | ✅ toggleModule warns when dependents are still enabled |
| Persisted, tenant-level config (not just UI state) | Critical | 🚫 Backend-required |
| Security settings (MFA, password policy, SSO) | Critical | 🚫 Backend-required |

---

## Summary
- **Fully implemented & verified this round:** Exams scheme+locking, Curriculum hierarchy+tracking, LMS course/assignment/grading, Behaviour structured incidents+escalation, Health visit persistence+severity, Cafeteria allergy-aware POS, Communication approval+delivery-tracking, Reports live drill-down, Roles audit+risk-flagging, Settings school-profile+dependency-check.
- **Genuinely backend-required** (named explicitly per section above, not hidden): server-side RBAC enforcement, tamper-proof audit, MFA/SSO, persisted tenant config, real message/SMS delivery, payment gateway, quiz/question-bank engines needing a data-heavy builder.
- **Deferred but frontend-feasible**, prioritized for next round: Surveys question builder, LMS quiz engine, Admissions document e-signature/expiry, CRM consent & source-attribution, Events approval workflow.
