# Migration Roadmap — Solvagence SchoolOS: HTML5 prototype → Node/React/Express/MongoDB

## Why this order

This document set was built by **reverse-engineering the actual tested codebase**, not by
designing a fresh architecture from a blank page. Every collection in `MONGODB-SCHEMA.md`, every
route in `API-ROUTES.md`, and every component boundary in `REACT-COMPONENTS.md` was extracted
programmatically from the real, currently-working `Solvagence-SchoolOS.html` source — so this
roadmap describes *completing* a well-tested prototype into a production stack, not replacing it
with something untested.

## Current state (the baseline this roadmap starts from)

- **36 functional modules**, all role-scoped (Administrator / Principal / Teacher / Accountant /
  Parent / Student), verified via 216 role×module render checks with 0 failures
- **194 distinct write actions** (`window.*` handlers), each already following a consistent
  add/update/remove naming convention that maps cleanly onto REST verbs
- **54 business-data collections**, each with a real, exercised field shape (not speculative)
- **194 handlers → API-ROUTES.md**, **54 collections → MONGODB-SCHEMA.md**, **36 pages →
  REACT-COMPONENTS.md**
- 0 accessibility violations (light/dark/RTL), W3C-valid HTML, 0 duplicate DOM ids, 0 JS errors
  across a full surface + deep nested-drawer interaction sweep

## Phase 1 — Backend foundation (Node.js + Express + MongoDB)
1. Stand up Express with the route groups in `API-ROUTES.md` as the initial skeleton — one router
   file per module group (26 groups), each importing shared middleware for auth + role-check.
2. Define Mongoose schemas from `MONGODB-SCHEMA.md`, including the field-level notes on enums,
   dates, and PII flags.
3. Implement real authentication (see `SECURITY-COMPLIANCE.md` §1) before any other backend work —
   every other phase depends on `req.user.role` being trustworthy.
4. Re-implement `logAudit()` server-side as middleware that fires automatically on every mutating
   route, rather than a manual call each handler has to remember (the client-side version required
   every one of 194 handlers to call it explicitly — automate this in the migration so it can't be
   forgotten on a new route).
5. Seed the database from the existing `data/fixtures/*.json` (61 files already exported from the
   live prototype in earlier project rounds) so local development starts from realistic data.

## Phase 2 — Frontend foundation (React)
1. Scaffold per `REACT-COMPONENTS.md`: shared `ui/` components first (`Kpi`, `DetailDrawer`,
   `FormDrawer` + the `showIf` conditional-field pattern, `DataTable`), since every feature module
   depends on them.
2. Port one full vertical slice end-to-end (suggest: Attendance, since it's self-contained and has
   the clearest "list → drill-down → mutate → re-render" pattern) to validate the API↔React↔Mongo
   round trip before parallelizing across the remaining 35 modules.
3. Parallelize the remaining feature folders once the pattern is proven.

## Phase 3 — Cross-cutting concerns that don't show up in a single module
- **Facilities ↔ Events shared booking ledger**: built and tested this session as a client-side
  invariant (a room can't be double-booked between the two features). In Mongo this becomes a
  unique compound index on `(facilityId, date, time)` in the `facilityBookings` collection —
  enforce it at the database level, not just in application logic, so it holds even under
  concurrent requests.
- **Guardian↔student message threads**: currently looked up by name-matching across `STUDENTS` and
  a synthesized guardian list. Needs a real `guardians` collection with a proper `children: [ObjectId]`
  relationship before the thread-lookup logic can be trusted at scale.
- **AI content-assist**: currently rule-based (default text + basic rewrite transforms), applied to
  ~15 fields across the app. Decide explicitly whether the production version stays rule-based or
  calls a real LLM API — don't let the UI silently imply more capability than the backend has.

## Phase 4 — CI/CD and the quality bar
Re-establish the manual QA discipline used throughout this project's build (a dedicated Puppeteer
test file per feature, full regression before every release, accessibility + W3C checks) as
**automated CI gates**, per `SECURITY-COMPLIANCE.md` §6 — this is the single most important thing
to carry over, since it's the actual reason this prototype reached its current state of polish
across so many rounds of fixes.

## What this roadmap deliberately does not do
It does not attempt to design new features. Every collection, route, and component listed in the
companion documents reflects functionality that already exists and has been tested in the current
HTML5 build. Net-new production concerns (real auth, encryption, file storage, CI) are called out
explicitly as additions, not folded silently into the "migration" as if they already existed.
