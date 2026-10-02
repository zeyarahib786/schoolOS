# Solvagence SchoolOS — Complete Setup Walkthrough

**Stage 1 MERN build · all 36 modules · Solvagence AI Consulting Limited**

This guide takes you from the delivered ZIP to a fully running system — local development,
full test execution, and Docker — with every command taken from the codebase as actually built,
not from memory. Read it top to bottom the first time; afterwards the Quick Start alone is enough.

---

## 1. What you have

`Solvagence-SchoolOS-MERN-Stage1.zip` unpacks to a two-project monorepo:

```
mern/
├── server/                     Express + TypeScript API (Node 20)
│   ├── src/
│   │   ├── app.ts              App factory: middleware + all 36 module routers
│   │   ├── index.ts            Entrypoint: connects MongoDB, starts HTTP server
│   │   ├── config/env.ts       Zod-validated environment loading (fails fast on bad config)
│   │   ├── middleware/         auth (JWT), validate (Zod), errorHandler, rateLimit, security
│   │   ├── models/             44 Mongoose models (Student, Staff, Invoice, Message, …)
│   │   ├── modules/            36 feature modules, one folder each:
│   │   │                       admissions alumni announcements attendance audit auth
│   │   │                       behaviour biometric cafeteria certificates curriculum documents
│   │   │                       events exams expenses facilities fees health helpdesk hostel
│   │   │                       idcards inventory leave library lms meetings messages payroll
│   │   │                       reports settings staff students surveys timetable transport visitors
│   │   │                       (each: validation → ownership/pure-logic → repository → service
│   │   │                        → controller → routes)
│   │   └── utils/              ApiError, apiResponse envelope
│   ├── tests/                  271 integration tests (supertest against the real app)
│   │   └── unit/               323 unit tests (pure logic + Zod schemas), all passing
│   ├── scripts/seed.ts         Demo-data seeder
│   └── .env.example            Every env var, documented (copy to .env)
├── webapp/                     THE PRODUCT UI - React app hosting the prototype AS-IS
│                               (pixel-identical: 0/3,888,000 differing pixels, gated by test)
├── client/                     Reference React client (kept for its 35 a11y-tested pages)
│   └── src/
│       ├── app/                App.tsx (lazy routes), AppShell.tsx (nav)
│       ├── components/ui/      Kpi, Chip, DataTable (shared, a11y-clean)
│       ├── features/           36 feature folders — <name>.api.ts + <Name>Page.tsx each
│       └── lib/                api/client.ts (axios + token refresh), store/authStore.ts
├── tests-e2e/                  Puppeteer + axe-core harnesses:
│   │                           a11y-authenticated.js (35 pages), e2e-mocked.js (9 scenarios)
├── docs/
│   ├── openapi.yaml            81 documented API paths (validated YAML)
│   ├── MONGODB-SCHEMA.md · API-ROUTES.md · MIGRATION-ROADMAP.md
├── docker-compose.yml          mongo (replica set) + mongo-init-replica + api + web
├── README.md · VERIFICATION_REPORT.md · READINESS_REPORT.md
├── SCALABILITY.md · AWS_DEPLOYMENT.md · LOCAL_SETUP.md
```

**Verified state at delivery**: 323/323 backend unit tests, 15/15 frontend tests, 35 pages with
0 accessibility violations, 9/9 mocked E2E scenarios, 0 npm vulnerabilities in both projects,
strict TypeScript clean throughout. The 271 integration tests are written and type-checked but
require a running MongoDB (see §5) — they were not executable in the build environment, and no
report claims they were.

---

## 2. Prerequisites

| Tool | Version | Why |
|---|---|---|
| Node.js | 20.x | Both projects target Node 20 |
| npm | 10+ (ships with Node 20) | Package management |
| MongoDB | 7.x, **as a replica set** | Five modules use multi-document transactions (Facilities, Events, Inventory, Alumni, Admissions), which MongoDB only allows on replica sets. `docker-compose.yml` handles this for you |
| Docker + Compose | any recent | Easiest way to get the replica-set MongoDB, or to run everything |

A plain `mongod` (no replica set) runs 31 of 36 modules; the five transaction-using modules
return errors on their transactional endpoints. Use the compose file and this is a non-issue.

---

## 3. Quick start (local development)

```bash
unzip Solvagence-SchoolOS-MERN-Stage1.zip -d schoolos && cd schoolos

# 1. Database — replica-set MongoDB via compose (starts mongo + runs rs.initiate once)
docker compose up -d mongo mongo-init-replica

# 2. API
cd server
cp .env.example .env          # defaults work for local dev; see §4 before staging/production
npm install
npm run dev                   # http://localhost:4000/api/v1  (health: GET /health)

# 3. Web app — in a second terminal
cd ../client
npm install
npm run dev                   # http://localhost:5173

# 4. (optional) demo data - from the host (works because of directConnection in .env):
cd ../server && npm run seed
#    ...or fully containerised, no host Node needed:
docker compose --profile seed run --rm seed
```

Open http://localhost:5173, register an account (pick the **Administrator** role to see
everything), and log in. The nav lists all 36 modules.

---

## 4. Environment variables (server/.env)

Copied from `.env.example`, which is the source of truth:

| Variable | Default | Notes |
|---|---|---|
| `NODE_ENV` | `development` | |
| `PORT` | `4000` | |
| `API_PREFIX` | `/api/v1` | Every route mounts under this |
| `MONGO_URI` | `mongodb://localhost:27017/schoolos?directConnection=true` | `directConnection=true` is REQUIRED when connecting from the host to the compose replica set (its members are registered under the in-network name `mongo:27017`, which the host cannot resolve); it is harmless for a plain standalone mongod |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | placeholders | **Must** be two different random 32+ char strings outside local dev (`openssl rand -base64 48`) |
| `JWT_ACCESS_TTL` / `JWT_REFRESH_TTL` | `15m` / `7d` | |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173` | Comma-separated list for multiple origins |
| `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX` | `900000` / `300` | 300 requests / 15 min / IP |
| `DB_MAX_POOL_SIZE` / `DB_MIN_POOL_SIZE` | `20` / `2` | Production tuning; defaults fine locally |

Config is Zod-validated at boot (`src/config/env.ts`): a missing or malformed variable stops the
server with a precise message instead of failing later at runtime.

The client needs no `.env` for local dev — it targets `http://localhost:4000/api/v1` by default.

---

## 5. Running the test suites

```bash
# ---- Backend (server/) ----
npm run typecheck             # tsc --noEmit, strict
npm run lint                  # eslint src + tests
npm run format:check          # prettier
npm run test:unit             # 323 tests — no database needed; ~8s
npm run test:integration      # 271 tests — REQUIRES the replica-set MongoDB from §3 step 1
npm run build                 # compiles to dist/

# ---- Frontend (client/) ----
npm run typecheck && npm run lint
npm run test                  # 15 vitest tests
npm run build                 # type-checks then vite-builds to dist/

# ---- Cross-cutting (repo root; needs Chrome/Chromium + built client) ----
node tests-e2e/a11y-authenticated.js    # axe-core scan of all 35 authenticated pages
node tests-e2e/e2e-mocked.js            # 9 user-flow scenarios against a mocked backend
```

The integration suite is the one thing the delivery environment could not execute. Running
`npm run test:integration` against the compose MongoDB is therefore **your first verification
step** — everything it needs is in place.

---

## 6. Running everything with Docker

```bash
docker compose up -d --build
# mongo               replica-set MongoDB (persisted in the mongo-data volume)
# mongo-init-replica  one-shot rs.initiate
# api                 server built + started on :4000
# web                 client built + served by nginx on :8080
```

Then open http://localhost:8080 (the product UI - the prototype AS-IS as a React app, pixel-identical, see §7) or http://localhost:8090 (the standalone prototype). Secrets for the `api` service are set in `docker-compose.yml` —
change the JWT secrets there (or move them to an env file) before any shared deployment. For
AWS specifically, `AWS_DEPLOYMENT.md` covers ECR/ECS, DocumentDB caveats, and TLS; `SCALABILITY.md`
covers pool sizing, indexes, and horizontal scaling.

---

## 7. The product UI: `webapp/` — the prototype AS-IS, as a React application

**`webapp/` is the production frontend** (compose service `web`, port 8080). It is a React 18 +
Vite + TypeScript application that hosts the original prototype's exact sources: its markup is
imported verbatim, its 9 CSS files and 48 scripts load in original order from `webapp/public/`.
React contributes the production layer - build pipeline, typechecking, and environment-driven
API configuration (`VITE_API_BASE_URL` flows into the adapter before it runs, so one artefact
deploys against any backend).

**Fidelity is proven, not promised**: `tests-e2e/pixel-fidelity.js` renders the standalone
prototype and the built webapp through the same journey (landing → dashboard → students) and
compares screenshots pixel-by-pixel. Current result: **0 differing pixels out of 3,888,000**.
This gate also caught and fixed a latent prototype defect - a missing `<!DOCTYPE html>` had it
rendering in browser quirks mode; the doctype was added (the single normalization applied), and
both now render in standards mode, pixel-identical.

Any future porting of individual modules to React components (strangler-fig migration) must keep
this gate green.

**Interactivity is proven the same way**: `tests-e2e/interaction-audit.js` walks all 36 modules
and (1) verifies every `onclick` in every view resolves to a real function - all 144 handlers do;
(2) clicks every distinct interactive element watching for errors - zero across the app;
(3) flags dead buttons - none; (4) executes 32 complete create/action workflows end-to-end,
filling 278 form fields and submitting (Add student, Check in visitor, Run payroll, Enter marks,
Submit register, Allocate room, Send to parents, New health visit, ...) - zero errors. The four
modules without a create workflow (Reports, Settings, AI Insights, Audit Log) are analytics,
preferences, and read-only logs by design; their interactions are covered by pass (2). Run it
against any build with `node tests-e2e/interaction-audit.js <path-to-dist>`.

**Write-through (UI form → API → MongoDB) — status, stated exactly.** The adapter wraps the
prototype's create handlers: the original runs unchanged (AS-IS behaviour), then the same form
values are mapped onto the backend's Zod contract and POSTed; success re-hydrates from the server,
rejection tells the user the record is local-only and why. Wired and proven so far
(`tests-e2e/writethrough-proof.js` drives the real handlers, captures the HTTP payloads, and
validates each against the server's own compiled schemas - 6/6 accepted): **Add student, Create
staff, Raise helpdesk ticket, Check in visitor, Log behaviour incident, Log clinic visit.**
The remaining create workflows currently persist to the in-browser demo data only; wiring them
follows the same pattern, one `WRITE_MAP` entry each in `assets/js/core/95-api-adapter.js`.

## 7b. The standalone prototype (prototype/), integrated AS-IS

The `prototype/` folder is the original single-page functional UI - all of its CSS and JS
ship untouched. Exactly one file was ADDED for backend integration:
`assets/js/core/95-api-adapter.js` (plus its one `<script>` tag in `index.html`).

How it behaves:
- **No API running** -> the adapter detects this within ~1.2s and does nothing; the UI runs
  on its complete built-in demo dataset, identical to the standalone prototype. Verified by
  an automated headless-Chrome test: landing renders, the shell opens, nine module screens
  render, the demo data appears, zero UI errors.
- **API running** -> it logs in with the seeded demo administrator (`admin@alnoor.ae` /
  `ChangeMe123`), maps live Students, Staff and Fee invoices into the exact structures the
  UI already renders, and refreshes. Modules without live data keep their demo rows - the
  screen is never emptier than the AS-IS prototype.
- Force pure demo mode any time with `?api=off` in the URL. Point at a different API with
  `window.SCHOOLOS_API = { base: 'https://your-host/api/v1' }` before the adapter script tag.

Serving it locally: `docker compose up -d prototype` (-> http://localhost:8090), or any
static server (`npx serve prototype`, `python3 -m http.server -d prototype 8090`). Serve over
http, not file:// (the adapter auto-disables on file:// and browsers block fonts there).

## 8. The architecture in five minutes

**Request path**: `routes` (auth + role gate + Zod `validate`) → `controller` (thin) → `service`
(business rules, ownership resolution) → `repository` (all Mongoose access) → model. Every
response uses one envelope: `{ success, data, meta? }`; errors are `ApiError`s with proper HTTP
codes, caught by a single error handler.

**Roles**: Administrator · Principal · Teacher · Accountant · Parent · Student. Gates get
narrower where blast radius grows: most writes are Administrator/Principal/Teacher; Leave
decisions and Reports are Administrator/Principal; Settings writes are Administrator **only**;
Messages give **no one** an override — even an Administrator sees only their own correspondence.

**Ownership patterns you'll meet in the code**:
- Parent → child via `Student.guardianUserId` (Attendance, Fees, Exams, LMS, Meetings, …)
- Student → own record via `Student.studentUserId` (LMS submissions)
- Staff self-service via `Staff.userId` (Payroll, Expenses, Leave)
- Content-declared audience (Announcements), whole-module staff gates (Visitors, Biometric,
  Admissions, ID Cards), bidirectional `$or` (Messages)

**Integrity mechanisms, each proven in tests**: atomic guarded updates (Library borrow, Cafeteria
balance, Leave balance at approval, Meetings slot claim), compound unique indexes (Attendance,
LMS, Timetable, Meetings), **partial** unique indexes (Documents' one-current-version,
ID Cards' one-active-card), Counter-based serials (Certificates, ID Cards), multi-document
transactions (Facilities, Events, Inventory, Alumni graduation, Admissions enrollment — the last
with an explicit rollback proof), state machines as pure functions (Helpdesk, Inventory PO,
Admissions' branching pipeline), and cross-collection `$group`/`$avg` aggregation (Reports).

---

## 9. Troubleshooting

| Symptom | Cause → fix |
|---|---|
| `Transaction numbers are only allowed on a replica set member` | Plain mongod. Use §3 step 1, and the `?replicaSet=rs0&directConnection=true` URI |
| Server exits at boot naming an env var | That's the Zod config guard working — fix the named variable in `.env` |
| 401 on every request from the client | Access token expired and refresh failed — log in again; check both JWT secrets are set and unchanged since login |
| 429 responses during heavy testing | Rate limiter — raise `RATE_LIMIT_MAX` in `.env` for load tests |
| CORS errors in the browser console | Add the exact origin (scheme + host + port) to `CORS_ALLOWED_ORIGINS` |
| a11y/E2E scripts can't find Chrome | Install Chrome/Chromium and ensure it's on PATH (scripts use puppeteer-core: they need a system browser) |
| Integration tests hang at startup | MongoDB not reachable at `MONGO_URI` — confirm `docker compose ps` shows mongo healthy |
| `npm run seed` hangs then times out against the compose MongoDB | Missing `?directConnection=true` on the URI (the fix is already in `.env.example` - copy it to `.env`) |
| `tsx: not found` when seeding inside a container | Use the compose seeder: `docker compose --profile seed run --rm seed` (runs compiled `dist/seed/seed.js` - the production image has no devDependencies) |

---

## 10. Where to read next

- `STATUS_REPORT.md` — layer-by-layer status with the full prototype→API→DB mapping table
- `README.md` — orientation and per-module one-liners
- `docs/openapi.yaml` — all 81 API paths with the behavioural notes written per endpoint
- `VERIFICATION_REPORT.md` — the round-by-round build log: what was proven, what broke, what was fixed
- `READINESS_REPORT.md` — the honest ledger of what is executed-and-proven vs written-but-blocked
- `docs/MIGRATION-ROADMAP.md` — Stage 2+ candidates (file uploads, schedulers, notifications, SSO)

*Prepared as the closing deliverable of the Stage 1 build — Solvagence AI Consulting Limited, Dubai · India · USA.*
