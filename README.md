# Solvagence SchoolOS

SchoolOS manages school people, academics, finance, operations, communication, and reporting. It has a React/TypeScript frontend, an Express/TypeScript API, and MongoDB persistence. The active frontend combines a React application shell with the established browser-script modules; the separate React feature pages remain an incremental migration surface.

## Repository map

| Location | Purpose |
|---|---|
| `client/src/app/` | React entry point, shell markup, and React bridge |
| `client/src/features/registry.ts` | Ordered registry of 54 runtime scripts, including 38 feature modules |
| `client/public/assets/` | Browser module sources, shared runtime helpers, localization, and styles |
| `client/build/runtime.ts` | Vite plugin that creates the single runtime bundle |
| `client/src/features/`, `components/`, `lib/` | Typed React feature pages, forms, API clients, validation, and stores |
| `client/scripts/` | Focused API/UI smoke checks |
| `server/src/modules/` | API routes, validation, controllers, services, and repositories |
| `server/src/models/` | Mongoose models and indexes; uploads use MongoDB GridFS where implemented |
| `server/src/seed/` | Fictional demo accounts and data |
| `server/tests/` | Jest unit and integration tests |
| `docs/` | API, schema, and feature verification references |
| `tests-e2e/` | Isolated authenticated module workflows, shared browser runner and historical prototype audits |
| `temp/` | Archived pre-consolidation material, excluded from the production build |

There is no root npm workspace or root `package.json`: install and run commands separately in `client/` and `server/`.

## Quick start

Docker Engine/Desktop with Compose v2 is the shortest full-stack setup. From the repository root:

```bash
cp .env.example .env
```

Replace both JWT placeholders in `.env` with different random values of at least 32 characters. Generate each value separately:

```bash
openssl rand -hex 48
```

Then run:

```bash
docker compose up -d --build
docker compose --profile seed run --rm seed
docker compose ps
curl http://localhost:4000/ready
```

Open **http://localhost:8080**. The API is available on **http://localhost:4000/api/v1**. Compose starts MongoDB 7, initializes its `rs0` replica set, builds the API, and serves the frontend through Nginx. The seed profile is a separate, explicit step.

For native Node development, database setup, alternate ports, logs, and resets, see [Local setup](docs/setup/local.md).

## Demo accounts

The main seed creates the following fictional accounts. Their initial demo password is `ChangeMe123`; existing accounts are skipped rather than having their passwords reset.

| Role | Email |
|---|---|
| Administrator | `admin@alnoor.ae` |
| Principal | `principal@alnoor.ae` |
| Teacher | `teacher@alnoor.ae` |
| Accountant | `accountant@alnoor.ae` |
| Parent | `parent@alnoor.ae` |
| Student | `student@alnoor.ae` |

The Parent and Student accounts are linked to Fatima Al Hashimi (`ANS-1042`); seeded staff accounts are linked to their staff records. Ownership links affect which records each role can read. Use this seed only for fictional development/test data. The full seed can run under the Compose production image; that does not make it a production-data provisioning procedure.

## Application areas

| Area | Screens |
|---|---|
| Overview | Dashboard |
| People | Admissions, Enrolment CRM, Students, Staff & HR, Parents, Certificates, ID Cards, Alumni |
| Academics | Classes & Sections, Timetable, Attendance, Exams & Gradebook, Curriculum, Learning (LMS), Behaviour |
| Wellbeing | Health & Clinic, Cafeteria |
| Finance | Fees & Invoicing, Payroll, Expenses |
| Operations | Library, Transport, Hostel, Inventory, Biometric Sync, Visitor Management, Facilities & Bookings, Helpdesk |
| Engagement and resources | Communication, Events Calendar, Surveys & Feedback, Documents |
| Insights and system | AI Insights, Reports & Analytics, Roles & Access, Audit Log, Settings |

Availability depends on the authenticated role, persisted navigation grants, and school settings. Hostel, Visitors, and Cafeteria are disabled by default in the settings model. The API independently enforces route roles and resource ownership; a navigation grant is not a replacement for those checks.

## Frontend runtime and recent changes

`main.tsx` mounts `App`, which mounts `AppShell`. The shell injects the configured API base before appending one classic runtime script. `registry.ts` defines its execution order.

The Vite plugin combines the 54 script sources into one content-hashed `schoolos-runtime-*.js` asset for production. Development serves the same ordered sources through `/schoolos-runtime.js`. The main React bundle remains a separate request. This removes the previous sequence of 54 runtime downloads while preserving global functions and lexical bindings used by inline handlers and direct `eval` lookups. Do not rename those globals or convert this runtime to isolated ES modules without migrating its consumers.

`ReactBridge.tsx` contains the React feature map, but `RELEASED_REACT_MODULES` is currently empty. The production screens therefore use the established shell renderers. See [client/src/features/README.md](client/src/features/README.md) before changing that boundary.

The Cafeteria overview now renders a no-menu message when the live menu is empty instead of dereferencing `MENU[0]` and crashing.

## Configuration and deployment

| File/value | Used by |
|---|---|
| Root `.env` | Compose JWT substitutions |
| `server/.env` | Native server development/start and seed scripts |
| `client/.env` | Vite development and frontend builds |
| `VITE_API_BASE_URL` | Public browser API URL, embedded at build time |
| `CORS_ALLOWED_ORIGINS` | Exact browser origins accepted by the API |
| `MONGO_URI` | Server-side MongoDB connection; use a replica set for transactional workflows |

Copy the corresponding `.env.example`; do not copy database credentials or JWT secrets into Vite variables. Changing the frontend API URL requires rebuilding the frontend.

Compose builds with `VITE_API_BASE_URL=/api/v1`; Nginx proxies `/api/` to `api:4000`. A standalone frontend build defaults to the example localhost API unless configured. For separate frontend/API domains, supply the public HTTPS API base during the build and allow the frontend origin on the API. See [Build and deployment guide](docs/setup/deployment.md) for build and hosting details.

The repository's GitHub Actions workflow runs validation and Docker image builds. It does **not** upload assets, deploy AWS services, or invalidate CloudFront. A Git push alone is not proof of deployment.

## Verification

```bash
npm --prefix client ci
npm --prefix client test
npm --prefix client run build
npm --prefix server ci
npm --prefix server run format:check
npm --prefix server run lint
npm --prefix server run typecheck
npm --prefix server run test:unit
npm --prefix server run test:integration
npm --prefix server run build
```

Integration tests start a temporary MongoDB replica set and may need a MongoDB binary download. Smoke checks have different prerequisites and side effects; see [Testing guide](docs/testing/README.md). Page rendering, form opening, persisted writes, external delivery, and role isolation are distinct checks. A successful module render does not certify every workflow.

## Further reading

- [Local setup and troubleshooting](docs/setup/local.md)
- [Build and deployment configuration](docs/setup/deployment.md)
- [Documentation index](docs/README.md) and [enhancement roadmap](docs/roadmap.md)
- [Fees](docs/modules/fees/README.md), [Exams & Results](docs/modules/exams/README.md), [Communication](docs/modules/communication/README.md) — maintained module capabilities, role policy and release boundaries
- [API routes](docs/reference/api-routes.md) and [OpenAPI contract](docs/reference/openapi.yaml)
- [MongoDB schema reference](docs/reference/mongodb-schema.md)
- [Testing guide](docs/testing/README.md)

Arabic/RTL display localization, shell search/help and protected-record boundaries are documented in [Localization](docs/modules/localization/README.md). The maintained release sequence and verification status live in the [roadmap](docs/roadmap.md); production provider configuration and deployment are separate steps.
