# SchoolOS API

The API is Express/TypeScript with Mongoose persistence. `src/server.ts` connects MongoDB before starting the HTTP listener; `src/app.ts` assembles middleware and mounts resource routers under `API_PREFIX` (default `/api/v1`).

## Development

Create `.env` from `.env.example` and configure `MONGO_URI`, two JWT secrets of at least 32 characters, and the frontend's exact CORS origin. Use Node 20.19+ for the full project and an initialized MongoDB replica set.

From this directory:

```bash
npm ci
npm run dev
```

For the complete database/Compose setup, see [Local setup](../docs/setup/local.md). A root `.env` used by Compose does not automatically replace this native server environment file.

## Source map

| Path | Responsibility |
|---|---|
| `src/config/` | Validated environment, MongoDB connection pool/timeouts |
| `src/middleware/` | Authentication, route roles, validation, request IDs, errors |
| `src/modules/` | Resource routes/controllers/services/repositories and ownership rules |
| `src/models/` | Mongoose schema definitions and indexes |
| `src/seed/` | Fictional demo records and ownership/account links |
| `tests/unit/` | Jest unit project |
| `tests/*.test.ts`, `tests/setup.ts` | Integration project and temporary MongoDB replica-set setup |

Protected requests use `Authorization: Bearer <accessToken>`. Fixed account roles are Administrator, Principal, Teacher, Accountant, Parent, and Student. Module routes and services apply their own role/ownership restrictions; custom navigation role matrices do not change the `requireRole` middleware's fixed role checks.

The server applies request context, redacted structured logging, Helmet, CORS, compression, request parsing, MongoDB operator sanitization, and an API rate limiter. It trusts one proxy hop. `/health` reports process uptime; `/ready` returns HTTP 200 when Mongoose is connected and HTTP 503 otherwise. These endpoints are outside the versioned API prefix.

## Seed, build, and checks

```bash
npm run seed
npm run seed:student
npm run format:check
npm run lint
npm run typecheck
npm run test:unit
npm run test:integration
npm run build
npm start
```

Run seed commands only for fictional test data. The main seed creates all six demo roles; the targeted Student command refuses `NODE_ENV=production`. Existing seeded user passwords are not reset by the main seed.

`npm start` uses `.env` and `dist/server.js`. The production Docker image instead starts `node dist/server.js` using injected environment variables. `npm run seed:prod` runs compiled demo seeding and expects its environment to be supplied externally.

See the [API routes](../docs/reference/api-routes.md), [OpenAPI contract](../docs/reference/openapi.yaml), [schema reference](../docs/reference/mongodb-schema.md), and [testing guide](../docs/testing/README.md). Integration tests may download a compatible MongoDB binary; production application startup does not use `mongodb-memory-server`.

## LMS courses

Authenticated `GET /api/v1/lms/courses` lists persisted courses with page/limit pagination. Administrator, Principal and Teacher accounts can create a course through `POST /api/v1/lms/courses` with `title`, `teacher`, `grade` and optional `startDate`. Courses are stored in MongoDB and audited; the frontend loads courses before matching their assignments. Previously unsaved browser-only courses cannot be recovered.

## Payroll exports

The Payroll screen exports actual payroll records as CSV, including period, basic salary, allowances, deductions and net pay. The export is not a bank WPS SIF. A bank-ready export still requires validated employer identifiers, employee banking identifiers and the bank's accepted format; those fields are not currently implemented.

## Controlled account creation

`POST /api/v1/auth/register` requires an authenticated Administrator outside `NODE_ENV=test`. Bootstrap the first administrator with the seed command; subsequent Parent/Student/staff accounts must be provisioned by an Administrator. Clients cannot self-select privileged roles through public registration. Test mode allows isolated fixtures and must not be used for a live deployment.

## Students management

Administrator/Principal endpoints: `POST /students/import` (validated batch up to 200, MongoDB transaction), `PATCH /students/:id/enrollment` (status, reason, effectiveDate), and `PATCH /students/:id/accounts` (existing Parent/Student account emails, null to unlink). See [Students release](../docs/modules/students/README.md) for role scope, privacy, migration and verification.
