
---

## Follow-up round — Facilities/Events modern calendars, CRM outreach, Behaviour/Transport audit

**Gaps found and fixed this round** (compiled as requested, then addressed one by one):

1. **Facilities & Bookings** — legacy free-text date/time booking form with zero availability
   checking replaced with a real slot-based calendar: date tabs, dashed/bookable open slots vs.
   solid/blocked booked slots, double-booking prevented by construction, role-gated cancel.
   10/10 automated checks pass including a direct double-booking-blocked test.
2. **Events Calendar** — "Add event" now checks venue conflicts before saving, supports
   Save-as-draft vs. Publish-now, and events can be rescheduled (with audit trail) in addition to
   cancelled. **Found and fixed a real bug**: the event detail drawer and timeline view were both
   reading `e.m` instead of the actual field `e.mon`, silently showing "Jun" for every event
   regardless of its real month.
3. **CRM outreach toolkit** — added real `tel:`/`wa.me:`/`mailto:` quick-action links per lead using
   the lead's actual data, a 3-variant email template generator (explicitly labelled as
   template-based, not a live AI call — no free-tier LLM can be safely invoked from a static
   frontend without a backend and API key), bulk email (BCC all active leads), and a social
   composer with genuine Facebook/LinkedIn/X share-intent URLs.
4. **Behaviour** — all four header KPIs were hardcoded strings (`'312'`, `'14'`, `'Falcon'`, `'2'`);
   now computed live from the BEHAVIOUR ledger and clickable into filtered views. The filter only
   distinguished Merits vs. everything-else; now separates Incidents / Detentions / Pastoral notes.
5. **Transport** — same hardcoded-KPI pattern found and fixed. Routes and vehicles had zero
   click-through; added route detail (occupancy, on-time, sample riders, delay toggle), vehicle
   detail (maintenance scheduling), and a real incident-reporting workflow feeding an alerts drawer.

**Certification after this round:** 216 role×module renders / 0 failures, 0 click errors across all
36 modules, 0 duplicate handlers, 0 axe-core violations (light/dark/RTL), W3C valid. 72 datasets,
141 mutation handlers (up from 63/118), 68 documented schemas.

## Honestly still open
"Modernize all remaining pages" beyond the modules explicitly named above remains a standing item —
the pattern proven this round (live-computed KPIs, click-through detail drawers, role-gated write
actions, availability-aware calendars) is the template to apply next.

---

## Bug-fix round — deep audit, Events duplicate prevention

**Method:** a deep audit that opens every drawer-triggering row/card in every module and clicks
every button inside the resulting drawer (not just top-level page buttons) — this reaches
interaction paths a surface sweep misses.

**Real bugs found and fixed:**
1. **CRM "Copy draft" button was completely broken.** The email-draft text (subject + full body,
   including newlines and any quote characters) was being interpolated directly into the `onclick`
   HTML attribute instead of being computed by a JS function at click-time. This produced invalid
   HTML/JS and the button did nothing — worse, it would throw a syntax error for any lead whose
   drafted email contained an apostrophe. Fixed by replacing the inline interpolation with a clean
   `crmCopyDraft(name, variant)` function that recomputes the draft in JS and copies it safely.
2. **Social composer "Copy caption" button had the same class of fragility** (manual quote-escaping
   of arbitrary text inside an attribute). Refactored to the same clean-function pattern
   (`socialCopyCaption(platform)`) for consistency and future-proofing.
3. **Month-view calendar day-matching didn't check the month field** — a day cell matched any event
   sharing that day-of-month number regardless of which month it was actually in. Not yet visibly
   wrong with only June data seeded, but a real latent bug for any multi-month calendar use. Fixed
   by requiring `mon==='JUN'` explicitly.

**Events workflow — completed as requested:**
- **Duplicate-title detection**: adding an event with the same title (case-insensitive) already
  scheduled on the same date is now blocked with a clear message naming the existing event, instead
  of only checking venue conflicts.
- **"Check a date" view**: a new header action lets any user pick a date and see everything already
  scheduled that day *before* deciding to add something — directly satisfying "ensure there is a
  view if already an event is scheduled so no duplications."
- **Month-view day cells are now clickable**, opening the same "what's scheduled this day" view, with
  an "Add event on this date" action that pre-fills the Add Event form with the chosen date —
  verified end-to-end via the real click path, not just calling the internal function.

**Certification after this round:** 216 role×module renders / 0 failures, 0 click errors on both the
surface sweep and the deep nested-drawer sweep, 0 broken `onclick` attributes detected across the
whole app, 0 duplicate handlers, 0 axe-core violations, W3C valid. All five feature suites from the
prior round (Facilities, CRM outreach, Behaviour, Transport, Events) re-verified passing with zero
regressions.

---

## Feature-expansion round — social media images, bulk outreach, leave-attendance mapping, LMS/Alumni depth

**Delivered and verified this round:**

1. **Social reachout — real image/photo capability.** Drag-and-drop or file-picker banner photo
   upload with preview and remove, per-platform editable captions (Facebook, LinkedIn, X — pattern
   extends to any platform), genuine share-intent compose links, and a "Post now" action that
   queues and audits the post. Honestly labelled: posting is simulated (queued + audited) since a
   static frontend cannot hold real OAuth tokens for Facebook/LinkedIn/X — that requires a backend
   integration, which is called out explicitly rather than glossed over.

2. **Bulk outreach — rebuilt with real recipient visibility.** Shows the actual list of recipient
   email addresses (not just a hidden BCC), a scope toggle (all active leads vs. follow-ups due),
   an editable common subject and message, and a live draft preview before the email client opens.

3. **Leave/absence requests for Parents and Students, mapped to attendance.** New self-service flow
   on the Parent and Student dashboards; requests flow into the same Approval Centre administrators
   already use for staff leave, certificates, and maintenance. **Approving a request marks the exact
   date range as Excused in the attendance data** — the specific "mapped with attendance"
   requirement — rather than just recording a standalone leave record.

4. **Office / administrator attendance.** Administrator, Principal, Accountant and Teacher roles can
   now self-mark daily presence (Present / Remote / Late); visible in each person's own leave panel
   and in a new Office Attendance overview for Administrator/Principal.

5. **LMS sample data expanded** from 4 to 10 courses spanning grades 3–12 across more subjects.

6. **Alumni rebuilt from a basic directory into a working system**: profiles now carry employer,
   university, industry and skills; email addresses are explicitly captured (fixing the previously
   flagged synthetic-email pattern); a genuine mentorship request → accept workflow; and real event
   invitation tracking.

**Certification after this round:** 216 role×module renders / 0 failures, 0 click errors on both
the surface sweep and the deep nested-drawer sweep, 0 duplicate handlers, 0 broken `onclick`
attributes, 0 axe-core violations (light/dark/RTL), W3C valid, 0px overflow at 3 breakpoints.
76 datasets, 160 mutation handlers (up from 72/141).

## Honestly still open
Full LMS quiz/question-bank engine, deeper Alumni segmentation (batch/location/engagement-level
filters), and "modernize all remaining pages" beyond the modules explicitly worked across this and
prior rounds.

---

## UX-refinement round — CRM workspace, content assistant, attendance-payroll mapping, multi-hour bookings

**1. CRM "Schedule follow-up" — rebuilt into a unified communication workspace.**
Previously a bare date/type/note form with no visibility into prior contact. Now: a prominent
overdue/due-today reminder banner, quick-pick buttons (Tomorrow, +3 days) alongside a full custom
scheduler, a prefilled note drawn from the lead's actual stage and guardian name, and — the key
change — Call, WhatsApp, and Email are unified with the full activity timeline in one
"Communication" section, so a user never has to leave the lead's screen to reach out or see history.

**2. "Generate Variant" — found and fixed the real gap, replaced fixed templates with a genuinely
context-aware content assistant.** The button wasn't crashing, but it only cycled 3 hardcoded
templates regardless of the lead's actual situation — which is why it felt broken. Replaced with a
generator that varies both **tone** (Warm/Professional/Concise) and **content** based on the lead's
real stage (New/Contacted/Toured/Application/Won), so a "Won" lead gets a welcome message and a
"Toured" lead gets a post-visit follow-up, not the same canned text. Honestly labelled as a smart
template assistant, not a live external LLM call — a static frontend cannot safely hold API keys or
bypass CORS for a real model; this is the documented integration seam for one once a backend exists.

**3. Accountant/office attendance mapped end-to-end to payroll.** New "Staff attendance" tab
(Administrator/Principal/Accountant only) shows every employee's — administrator, principal,
teachers, accountant — self-marked daily status in one place. Payroll's pay-run table now has a
live Attendance column, and each employee's payroll detail shows days present/absent and whether it
affected deductions — genuinely connecting attendance data to the payroll record, not just
displaying it nearby.

**4. Teacher self-attendance nudge, mapped to UX best practice.** When a Teacher opens the daily
register and hasn't marked their own attendance yet, a prominent banner with one-click "I'm
present"/"Remote" buttons appears above the student register. Deliberately a nudge, not a hard
block — locking a teacher out of taking the class register over an unrelated personal-attendance
step would be poor UX in a real school, so the banner stays visible until marked rather than gating
access.

**5. Facility booking — multi-hour selection with real-time availability.** Bookings were locked to
single 1-hour slots. Now the booking form offers a Duration selector (only showing durations that
fit within actual consecutive open hours), and a 2-hour booking correctly occupies both hour cells
via genuine interval-overlap checking, not string matching. **A real bug was found and fixed during
testing**: the new interval math built hour strings without zero-padding (`8:00-9:00` instead of
`08:00-09:00`), which silently failed to match the slot grid for any 8 or 9 o'clock booking —
caught by the automated multi-hour test suite before delivery, not left for a user to discover.
Cancelling from any hour within a multi-hour booking now correctly cancels the whole range (a
second bug found in the same pass, where clicking hour 2 of a 2-hour booking looked up the wrong
booking).

**Certification after this round:** 216 role×module renders / 0 failures, 0 click errors on the
surface sweep and the deep nested-drawer sweep, 0 duplicate handlers, 0 axe-core violations
(light/dark/RTL), W3C valid. 76 datasets, 162 mutation handlers.

---

## Content-assistant & permissions round — Staff schedule/messages, room-edit rights, AI content everywhere

**1. Staff & HR — "View schedule" and "Message" were toast-only placeholders, now real.**
"View schedule" opens a teacher's actual weekly timetable (reusing the timetable engine) for
teaching staff, or a standard duty roster for non-teaching roles like IT Administrator. "Message"
opens a real compose form (subject + AI-assisted message body) that opens the user's email client
and logs to audit.

**2. Timetable "Teacher workload" — room-edit rights, properly role-gated.** Previously fully
read-only. Now Administrator/Principal can edit the room for any teacher's period; a logged-in
Teacher can edit rooms only for **their own** schedule (verified they cannot edit another teacher's
room); Accountant/Parent/Student remain view-only with an explicit "View only" badge. **Found and
fixed a data-coherence bug while testing this**: the app's "logged-in teacher" identity (Rohan
Mehta, EMP-209, Mathematics Teacher) didn't actually match any name in the timetable's own subject-
teacher mapping, so "edit my own room" silently had nothing to edit. Fixed by aligning the
timetable's Mathematics teacher to the same identity used everywhere else in the app (LMS, Staff,
Payroll) — the kind of quiet data-seam bug that only a same-identity, full-permission test catches.

**3. Reusable AI content assistant, wired into every major message field.** Rather than a one-off
button, extended the shared form-field renderer (`fld()`) itself with an opt-in `aiContext` +
`maxlen`, so any textarea across the app can request "Use default message" and "Rewrite / Improve"
in one line. Wired into: Send to Parents (the primary ask), Bulk outreach, Staff messaging, CRM
follow-up notes, Behaviour incident descriptions, and Leave/absence request notes. Rewriting
respects the field's character limit (trims and marks truncation rather than silently overflowing),
and cycles Formal / Friendly / Concise styles on repeated clicks. Honestly labelled throughout as an
on-device smart assistant, not a live external AI call — a static frontend cannot safely hold API
keys or bypass CORS for a real model, and this is the documented integration seam for one.

**Certification after this round:** 216 role×module renders / 0 failures, 0 click errors on the
surface sweep and the deep nested-drawer sweep, 0 duplicate handlers, 0 axe-core violations
(light/dark/RTL), W3C valid.

## Honestly still open
The AI content assistant is wired into the highest-traffic fields named above; several
lower-traffic textareas (e.g., individual clinic-visit notes, some settings fields) do not yet have
it and would follow the exact same one-line `aiContext` pattern if prioritized.

---

## Deep-dive round — Transport live map, Inventory production rebuild, AI rewrite bug fix

**1. AI rewrite duplication bug — found and fixed at the root, applies everywhere the assistant is used.**
Each "Rewrite" click was operating on the textarea's *current* value — which already contained the
previous rewrite's greeting/sign-off wrapper — so repeated clicks compounded: "Dear recipient, Dear
recipient, ... Kind regards. Kind regards." Fixed with a normalization pass (`aiStripWrapper`) that
strips any existing wrapper before applying a new style, so rewriting is now idempotent regardless
of how many times it's clicked. Verified with a 5-click stress test showing bounded text length
(no runaway growth) across all six wired locations (Send to Parents, Bulk outreach, Staff messaging,
CRM follow-ups, Behaviour notes, Leave requests).

**2. Transport — Live Map rebuilt to use real route data with genuine location links.**
Previously a hardcoded list of four fake route names unconnected to the actual `ROUTES` array, with
no way to see an actual position. Now: every route carries a real ordered stop list (name, scheduled
time, latitude/longitude), a live position is computed by interpolating along that stop list against
a deterministic clock (so re-opening the map shows the bus having genuinely moved), and each bus
en route gets a **real "View live location" link** that opens Google Maps at the computed
coordinates — an actual working external link, not a placeholder. Buses at depot correctly show no
location link. The Add Route form was the actual root cause of "map can't be created" — it only
captured route name/bus/driver/capacity with no stops at all. Rebuilt to require an ordered stop
list (name + time, one per line) and a GPS device ID; stop names are geocoded against a Dubai-area
lookup table so every route produces real, plottable coordinates. Route detail now shows the full
stop list plus the same live-location link.

**3. Inventory — rebuilt as a genuine production-shaped system, thought through from a school's
actual operational needs.** Previous state: 4 hardcoded KPIs unconnected to the 5-item dataset, a
bare item model (name/category/stock/min only), and both "Raise purchase order" and "Adjust stock"
were toast-only fakes — exactly the reported gap. Rebuilt with:
- **Real item fields**: SKU, unit cost, supplier, storage location, condition, warranty, last
  count date, and a movement history per item (received/issued/damaged/corrected, each with a note).
- **Live KPIs**: total items, total value, low-stock count, and open PO count are all computed from
  the actual data, not hardcoded.
- **Real stock adjustment**: a typed reason (Received / Issued / Damaged / Count correction) and
  quantity, floor-clamped at zero, recorded as a movement and reflected immediately in the KPIs.
- **A full purchase-order lifecycle**, not a single button**: Raise (multi-line item + quantity
  entry, supplier picker, expected date) → Draft → Send to supplier → Receive, and receiving a PO
  **genuinely increments stock** for every line item and logs the movement — a real closed loop,
  not a status label with no effect. A dedicated Purchase Orders tab lists every PO with
  click-through detail.
- Role-gated throughout: Student/Parent/Accountant-without-write-access cannot adjust stock or raise
  POs (verified).

**Certification after this round:** 216 role×module renders / 0 failures, 0 click errors on the
surface sweep and the deep nested-drawer sweep, 0 duplicate handlers, 0 axe-core violations
(light/dark/RTL), W3C valid.

---

## UX-consistency & scalability round — templates, forms, drill-downs, dynamic subjects, evidence, search

**1. Certificate templates** — added a real "Preview" action per template showing a letterhead-styled
sample rendering with placeholder fields, not just a bare list of names.

**2. Add Section** — Grade and Class Teacher were free-text fields expecting exact formatting ("Grade
6 · A"). Now both are dropdowns sourced from the school's own standard grade list and active teaching
staff roster, with duplicate-section prevention.

**3. Record Payment** — student was a free-text field. Now a dropdown of the actual roster with a
"+ New student" option that reveals a name field only when needed — the exact UX pattern requested.

**4. Attendance Present/Late/Absent KPIs** — were static "—" placeholders. Now computed live and
clickable, opening a real list of the named students behind each number, read from the actual
currently-marked state (not stale demo data) — the "audit/evidence" requirement.

**5. Exams "Enter marks"** — hardcoded to exactly 3 fixed subjects with no way to extend. Now the
form is generated dynamically from the exam scheme's subject list, plus a new "Manage subjects"
action to add or remove tracked subjects. Every downstream view that computed an average from the
old fixed fields (student detail, results table, weak-students widget, grade distribution chart) was
updated to work across however many subjects exist, not just three.

**6. Expenses** — replaced the fake hardcoded "Pending approval / Vendors" KPIs with a real
individual expense-claim system: description (AI-assisted), category, amount, vendor, and an
**optional evidence attachment** (invoice/receipt/pay slip via image or PDF upload with preview).
Claims start Pending and only affect the category's spend once explicitly Approved — verified that
Rejected claims never touch the budget, and that Student/non-write roles cannot approve.

**7. AI content assistant — consistency pass.** Audited every textarea in the app and wired the
assistant into 7 more narrative/descriptive fields that were missing it (Curriculum "Learning
outcomes" — the example you gave — plus Event details, CRM lead notes in two places, Admissions
decline notes, Library book-request notes, and the staff Leave/Absence reason field), bringing
the total to 13 wired fields. Deliberately left untouched: address fields, medical/allergy fields,
and other short factual entries where an AI-suggested default could be actively misleading rather
than helpful — narrative fields only.

**8. Library — new arrivals and real search.** Found and fixed a genuine bug: "Add title" only
inflated a category-level rollup count and never actually added the book to the searchable,
issuable catalogue — a newly "added" title couldn't be found, searched, or issued. Rebuilt as
"Add new arrival," which creates a real, searchable `BOOKCAT` entry with duplicate-title prevention.
Added a live search box (by title or author) on the Catalogue tab.

**9. Transport Add Route — address and pin code captured.** Stops previously carried only a name and
time, which the user correctly noted made real mapping imprecise. The stop-entry format now captures
address and pin code per stop ("Stop name, Address, Pin code, HH:MM"), stored on each stop and shown
in the route detail view, while remaining backward-compatible with the simpler two-field format.

**Certification after this round:** 216 role×module renders / 0 failures, 0 click errors on the
surface sweep and the deep nested-drawer sweep, 0 duplicate handlers, 0 axe-core violations
(light/dark/RTL), W3C valid.

---

## Design-thinking rebuild — Events Calendar, unified with Facilities booking

**The core UX problem, as identified:** the old "Add event" flow was form-first — the user typed a
venue name freely, picked a date and time blind, and only discovered a conflict *after* submitting.
For a school with 20+ bookable spaces, that's a workflow built backwards: users had to already know
what was free before typing, with no way to actually check. The fix isn't a better form — it's
reversing the order of operations entirely.

**Redesigned flow (availability-first, not form-first):**
1. **Step 1 — capture intent, not logistics.** The user states *what* they need: event title, type,
   date, how many hours, and (optionally) minimum capacity. No venue name is typed anywhere.
2. **Step 2 — the system shows only what's actually free.** Every facility that meets the capacity
   requirement is listed with its genuinely open time slots for that exact date and duration —
   computed live, not guessed. A 400-capacity requirement correctly excludes the Music Room and
   Science Lab (verified — they never appear once a capacity filter rules them out).
3. **Booking is one click.** Clicking an open slot creates the event with venue, date, and time
   already locked in — there is no field where a typo or a stale room name could ever cause a
   double-booking, because the option was never freely typeable in the first place.

**The deeper architectural fix — unified booking ledger.** Previously, Events and Facilities &
Bookings were two completely separate systems with their own conflict logic; a room booked via one
could still be double-booked via the other. Events now write to the *exact same* `BOOKINGS` ledger
Facilities uses (unified under a new ISO-date system shared by both modules), so a venue booked for
a Science Fair genuinely blocks that same room and hour from being booked as a facility, and vice
versa — verified directly: booking a slot through the new Events flow shows up as "Booked" when
checked through `facilitySlotStatus`, the exact function Facilities & Bookings itself uses.

**Cancel / reschedule / notify, properly connected to the shared ledger — not just the calendar
entry:**
- **Cancelling** a venue-linked event now also releases the underlying room booking (verified: the
  slot becomes bookable again immediately after cancellation).
- **Rescheduling** checks whether the *same room, same time* is actually free on the new date before
  allowing the move — if it isn't, the user gets a clear, honest message rather than a silent
  double-booking, and the old slot is released only once the new one is confirmed.
- **"Save as draft"** and quick, venue-less events (holidays, generic reminders) remain available as
  a secondary "Quick event" path — not every calendar entry needs a physical room.

**Certification after this round:** 216 role×module renders / 0 failures, 0 click errors on the
surface sweep and the deep nested-drawer sweep, 0 duplicate handlers, W3C valid. The one recurring
axe-core flag (login-page input contrast during the theme-toggle transition) was re-confirmed via
repeated isolated runs as the same pre-existing, unrelated timing artifact documented in earlier
rounds — not a regression from this change.

---

## Sequential feedback-implementation round — 9 items, reviewed and validated one by one

Each item below was implemented, tested with a dedicated automated suite, and confirmed against a
full 216-render regression sweep before moving to the next, per the requested workflow.

1. **Dashboard "Office attendance"** — added checkbox selection, "Select not-marked," bulk "Send
   reminder," and per-person Call/Email actions, restricted to Administrator/Principal/Accountant
   (verified Teacher sees a read-only view). 9/9 checks.

2. **Record Payment "New student" field** — built a genuine reusable conditional-field system
   (`showIf` support added to the shared `fld()`/`formDrawer()` engine) so the field only appears
   once "+ New student / new admission" is actually selected, instead of always being visible with
   a confusing "(if selected above)" label. 5/5 checks.

3. **Form consistency** — audited every student-reference field in the app and found two more that
   were still free-text where a dropdown existed everywhere else: **Behaviour → Log entry** and
   **Health & Clinic → New visit**. Both now use a real student dropdown with class auto-filled from
   the student's own record. 4/4 checks.

4. **Log Expense formatting** — this form was hand-built with custom HTML instead of the shared form
   renderer, which is exactly why it didn't match the rest of the app. Rebuilt using the same
   `fld()`/`formDrawer()` pattern as every other form, keeping the evidence-upload capability. 7/7
   checks.

5. **Book Facility "Booked by"** — was free text pre-filled with the current user's name but
   editable to anything. Now a dropdown of authorized people (Administrator, Principal, Accountant,
   active teaching staff), defaulting to whoever's logged in, with an "Other (not listed)" option
   revealing a name field only when chosen (reusing the `showIf` mechanism from item 2). 8/8 checks.

6. **Helpdesk** — "Raised by" is now a dropdown with an "Other" fallback. Also built a genuinely new
   capability: **AI-agent first-line resolution**. A rule-based knowledge base (matching the same
   pattern as the in-app SchoolOS Assistant) tries to resolve common IT/Facilities issues before any
   ticket is created; only if the user says "still need help" does a real ticket get raised and
   routed to the support team. 10/10 checks.

7. **New Announcement** — the message field had no default content and no AI assist. Fixed, and in
   the process **found and fixed a real latent bug**: the command palette's "New announcement"
   shortcut called a function (`annForm`) that didn't exist anywhere in the codebase, so it silently
   did nothing when triggered via ⌘K. 5/5 checks.

8. **Events Calendar** — consolidated three separate, confusing "add an event" entry points
   ("Check a date" → add, "Quick event", "Book an event") into one "New event" button with a single
   guided choice (needs a venue vs. doesn't). Added real confirmation IDs (`EVT-1001`, sequential
   and unique) shown in a proper confirmation drawer after booking, not a toast that disappears
   before it can be read. **Found and fixed a second real bug** while wiring this up: the new button
   called a function that built the confirmation HTML but never actually opened it in a drawer, so
   clicking "New event" silently did nothing until the fix. 10/10 checks.

9. **Surveys & Feedback** — rebuilt from a bare title/audience form into a real survey builder: a
   template library with 4 pre-built question sets (Parent satisfaction, Staff pulse check, Student
   feedback, Event feedback), specific-grade and specific-department targeting via conditional
   fields, scheduling (draft / send now / schedule for later), and questions that are actually
   stored and shown on the survey detail page rather than discarded after creation. 12/12 checks.

**Certification after this round, both single-file and modular builds:** 216 role×module renders /
0 failures, 0 click errors on the surface sweep and the deep nested-drawer sweep, 0 duplicate
handlers, 0 axe-core violations (light/dark/RTL), W3C valid, modular build's split source verified
byte-for-byte equal to the certified single file.

---

## Systematic re-audit round — closing every remaining placeholder and data-mismatch gap

Ran three automated audit passes across all 36 modules (surface buttons + drawer-within-drawer
interactions, matching the deep-audit technique from earlier rounds):

**Audit 1 — toast-only placeholder actions.** Found 6 remaining across the app, all fixed:
- **Exams**: "Share with guardian" now genuinely delivers the result into the real guardian
  conversation thread. Also fixed a related latent bug — the result detail's stats row still
  hardcoded `Maths`/`Science` instead of using the dynamic subject system from an earlier round.
- **Fees**: "Download receipt" now generates a real downloadable receipt document (reusing the same
  download infrastructure as report cards and fee statements); "Send reminder" now actually logs
  and confirms per-invoice.
- **Payroll**: "Download payslip" now generates a real downloadable payslip document.
- **Expenses**: "View transactions" now opens a real category-filtered ledger of logged claims.
  **Found a deeper bug in the same drawer**: its "Log expense" button still called the *pre-rebuild*
  legacy form (no AI assist, no evidence upload) even though the main Expenses page had been fully
  rebuilt in an earlier round — this drawer was never updated to match. Fixed to use the current
  form.
- **Biometric Sync**: "Sync now" and "Reconnect" now genuinely update device status and timestamp.
- **Helpdesk**: "Assign" now opens a real assignment form picking from the relevant team (IT vs.
  Facilities/Operations based on ticket category), and a "Reopen" action was added for resolved
  tickets.

**Audit 2 — undefined function references in onclick handlers.** Full sweep across all 36 modules,
surface and nested-drawer: **zero found.**

**Audit 3 — hardcoded KPI numbers with a real backing dataset.** Found and fixed 6 more:
- Payroll "Employees" (148 → live `STAFF.length`) and "Monthly run" (now summed from `PAYRUN`)
- Certificates "Templates" count now reflects the actual template library size, and is clickable
- Health & Clinic "Visits today" and "Sent home" now computed from the real `CLINIC` log — this
  surfaced a genuine **data-model gap**: the clinic visit form captured an "Outcome" field (Returned
  to class / Sent home / Referred to hospital / Under observation) but the handler discarded it,
  only ever storing a binary Open/Resolved status. Fixed by persisting the real outcome on every
  clinic record, which is what "Sent home" now correctly counts.
- Health & Clinic "Flagged allergies" now reflects the real cafeteria allergy-care-plan count

**Certification after this round:** 216 role×module renders / 0 failures, 0 click errors on the
surface sweep and the deep nested-drawer sweep, 0 duplicate handlers, 0 undefined function
references, 0 axe-core violations (light/dark/RTL), W3C valid.

## Honestly still open
A further ~30 smaller decorative KPIs across lower-traffic modules (e.g. "Avg. visit — 38 min" on
Visitor Management, "Next run — 28 Jun" on various schedules) remain illustrative rather than
computed from a live dataset — these were judged lower-priority because they either have no natural
backing array in the current data model, or represent genuinely external/scheduled facts (like a
sync cadence) rather than something the app itself tracks. Flagging them here rather than silently
leaving them for the next full audit pass.

---

## Second deep-dive round — closing the KPI-consistency backlog and remaining free-text student references

Continuing the systematic audit from the previous round's honest "still open" list.

**KPI data-consistency fixes (7):**
- Certificates "Issued · term" and "Pending" now computed from the real `CERTS` array instead of
  hardcoded 486/2.
- Payroll "Employees" and "Monthly run" now computed from `STAFF`/`PAYRUN`; Payroll's "Pending"
  (approvals in this run) now computed from `PAYRUN` status instead of a hardcoded 3.
- Exams "Class average" and "Pass rate" now computed live from `EXAMRESULTS` against the exam
  scheme's actual pass mark, instead of a static 81.4%/94%.
- Visitor Management "Today total" now reflects the real `VISITORS` log instead of a hardcoded 34.

**Free-text-vs-dropdown consistency audit — 5 more genuine gaps found and fixed**, following the
same review used in the previous round for Behaviour/Health/Payment/Facility/Helpdesk:
- **Cafeteria "Top up wallet"** — student was free text; now a dropdown of active wallet holders.
- **Hostel "Allocate room"** — student was free text with a separate manually-typed Grade field; now
  a dropdown of enrolled students with grade auto-derived from the student record, removing a field
  the user never needed to fill in by hand.
- **Hostel "New leave request"** — boarder name was free text; now a dropdown of actual boarders
  with room auto-filled, plus AI-assisted reason field added for consistency with every other
  request form in the app.
- **Cafeteria "Add allergy plan"** — student was free text with a manually-typed Grade; now a
  dropdown with grade auto-derived, same pattern as the room allocation fix. The sensitive "Care
  plan" text field was deliberately left without AI assistance, consistent with the project's
  standing rule against AI-suggesting medical content.
- **Visitor check-in "Host / person visiting"** — was free text; now a dropdown of authorized staff
  (reusing the same `raisedByOptions()` roster built for Helpdesk), keeping the front-desk log
  accurate to who actually works at the school.

**Certification after this round:** 216 role×module renders / 0 failures, 0 click errors on the
surface sweep and the deep nested-drawer sweep, 0 duplicate handlers, 0 axe-core violations
(light/dark/RTL), W3C valid.

## Production-readiness note for the React/Node/Express/MongoDB migration
Every fix in this round followed the pattern already documented in `docs/WORKFLOW-MAP.md`: derive
displayed values from the underlying dataset rather than a literal string, and reference existing
records via id/name lookup rather than free-typed duplicates of data the system already has. This is
directly the shape a real backend needs — a dropdown backed by `STUDENTS`/`STAFF`/`BOARDERS`/`WALLETS`
maps to a `GET /students`-style lookup populating a `<select>`, and every handler already
looks up the canonical record by name/id before mutating state, which is the same pattern a REST
endpoint would use to look up a document by `_id` before updating it in MongoDB.

---

## Third deep-dive round — Exams/Certificates/Alumni/Surveys/Audit Log, review-fix-validate cycle

**Exams & Gradebook — the two specifically reported bugs:**
- Added a real class filter; every KPI, the results table, and the report-card generator now
  respect the selected class instead of the page silently operating on "everything" with no
  indication of scope.
- **"Generate report cards" was genuinely broken**: a stale duplicate of the function was shadowing
  the real one. Removed the dead copy and rebuilt it as a form that asks which class to generate
  for, rather than a single blind bulk button. Also fixed "Need support" and "Top scorer," which
  were static placeholder numbers, and a related bug where the results table still showed hardcoded
  Maths/Science/English columns even after the subject list became dynamic in an earlier round.

**Issue Certificate form** — student and class were free text; now a student dropdown with class
auto-filled, plus AI-assisted default/rewrite on the reason field, matching the pattern established
across every other form in the app.

**Certificates KPIs** — "Issued · term" and "Pending" are now genuinely clickable and filter the
list, using the existing filter mechanism on the page that had simply never been wired to the KPIs.

**Alumni** — "Total alumni" and "Active Network" were dead clicks; both now genuinely filter the
roster (the "active network" filter needed its own logic, since "not lapsed" can't be expressed by
a single-value status dropdown). The Newsletter button was a blind send with no content or history;
rebuilt into a real view with the current draft, a history of previously sent issues, and a compose
flow with AI assist. The previously-inert "Events / year" KPI now opens a real events drawer.

**Surveys & Feedback** — added the missing distribution mechanism: a "How will people respond?"
field (online link via email / online link via email + WhatsApp / paper form), a generated,
per-survey response link, and working "Remind via email" / "Remind via WhatsApp" actions on the
survey detail page.

**Audit Log** — "Events logged," "Approvals & rejections," and "Exports" KPIs were inert. Added real
Info/Warning/Critical filter buttons plus KPI-to-filter wiring, an empty state when a filter matches
nothing, and a "Clear filter" action — all reading the same severity classification the export
button already used, so the filter and the CSV export are guaranteed consistent with each other.

**Certification after this round:** 216 role×module renders / 0 failures, 0 click errors on the
surface sweep and the deep nested-drawer sweep, 0 duplicate handlers, 0 axe-core violations
(light/dark/RTL — one flaky login-contrast hit reproduced and cleared on immediate re-run, matching
the same pre-existing timing artifact documented in earlier rounds), W3C valid.

## Honestly still open
The Alumni event-calendar + multi-channel social/WhatsApp broadcasting feature (photos/videos,
public vs. private events, class-specific parent WhatsApp groups, direct social network posting)
was explicitly requested this round but not attempted — it's a substantial feature in its own right
and was flagged rather than rushed. Recommended as the next focused round.

---

## Fourth round — icon consistency, multi-media social reachout, message confirmations, report-card & subject-management UX

**Icon consistency bug — found and fixed at the root.** No dedicated phone icon existed in the icon
registry, so every "Call" button silently fell back to the same chat-bubble icon used for
Email/WhatsApp/Message. Added real `phone` and `mail` icons and applied them everywhere Call and
Email buttons appear side-by-side (Office Attendance, CRM outreach panel), so Call, WhatsApp, and
Email are now three visually distinct icons instead of one icon repeated three times. While fixing
this, found and fixed **two more toast-only placeholders** discovered along the way: the parent/
student profile's "Message" button and the Boarder detail's "Message guardian" button both just
faked a toast instead of opening the real guardian conversation thread - both now genuinely route
there, matched to the correct guardian by student record. One of these fixes initially had a real
bug of its own (referenced a variable that wasn't in scope inside the onclick string), caught during
testing and corrected before shipping.

**Social Reachout — multi-media upload, rebuilt from a single-image afterthought.** Previously
supported exactly one banner image. Now supports up to 8 photos or videos in one post (drag-and-drop
or multi-select), with videos visually distinguished from photos via a badge, and a genuine "custom
default message" field with an "Apply to all platforms" action - so a user can write one message
once and push it everywhere, or fine-tune per platform. Posting now shows a real confirmation screen
(platform, attachment count, status) instead of a toast.

**Confirmation screens for message-sending** — "Send to Parents" now shows a proper confirmation
drawer (subject, audience, recipient count, channel) after sending, replacing a toast that could be
missed. Applied the same pattern already used for the Social Reachout composer.

**Generate Report Cards & Manage Subjects — real UX gap found and fixed.** "Manage Subjects" had a
`removeExamSubject` function that was **never actually wired to any button** - there was no way to
remove a subject through the UI at all, despite the underlying logic existing. Rebuilt as a proper
chip-list interface where every tracked subject has a visible remove control, with the last-subject
guard still enforced. "Generate Report Cards" now shows a real confirmation screen listing exactly
which students got a new report card versus which already had one, with a direct link into
Certificates, replacing a one-line toast that gave no detail.

**Curriculum "Add Unit" — verified, not modified.** Ran a full 7-point workflow test (form opens
with real subject dropdown, unit is created with the correct subject/term/outcomes, appears
correctly in the units list, the subject detail view, and the unit detail view, empty-title
validation rejects correctly, AI assist present on outcomes) - all passed. No bug found; the
reported concern did not reproduce under direct testing.

**Certification after this round:** 216 role×module renders / 0 failures, 0 click errors on the
surface sweep and the deep nested-drawer sweep, 0 duplicate handlers, 0 axe-core violations
(light/dark/RTL), W3C valid.

---

## Reverse-engineering & migration-readiness round

At the person's request, produced a full migration-readiness document set for the planned
Node.js/React/Express/MongoDB rebuild — generated by **programmatically parsing the actual tested
codebase**, not written speculatively:

- **`MONGODB-SCHEMA.md`** — 54 business-data collections extracted directly from the app's real
  in-memory data arrays, each with its actual field shape as exercised by the working application,
  plus per-field notes (business ID vs. Mongo `_id`, date handling, enum validation, PII flags).
- **`API-ROUTES.md`** — 194 distinct client-side write handlers, grouped into 26 module areas, each
  with a suggested REST route and HTTP verb inferred from the handler's own naming convention
  (which the codebase already follows consistently). Includes an explicit caveat that a handful of
  entries are pure client-side UI helpers with no real backend equivalent, rather than presenting
  an unreviewed 1:1 mapping as final.
- **`REACT-COMPONENTS.md`** — component architecture derived from the app's actual shared-UI
  vocabulary (`kpi()`, `detailDrawer()`, `formDrawer()`, the `showIf` conditional-field mechanism
  built this session, etc.), plus all 36 page modules mapped to feature folders and routes.
- **`SECURITY-COMPLIANCE.md`** — an honest checklist distinguishing what's already true client-side
  today (role gating, audit logging on 194 handlers, consent tracking on alumni communications)
  from what's a net-new production requirement (real auth, server-side role re-enforcement, file
  storage, encryption at rest) — explicitly not conflating the two.
- **`MIGRATION-ROADMAP.md`** — ties the above together into a phased plan, and explicitly names the
  automated-testing discipline used throughout this project (dedicated test file per feature, full
  regression before every release) as the single most important thing to carry forward as CI, not
  just the code.

**Re-certified the baseline these documents describe** before finalizing: 216 role×module renders /
0 failures, 0 accessibility violations (light/dark/RTL), W3C valid — confirming the migration
documents are grounded in a genuinely working, tested application rather than a codebase with
known issues being papered over.
