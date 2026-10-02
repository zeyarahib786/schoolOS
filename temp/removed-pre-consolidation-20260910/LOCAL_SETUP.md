# Local Setup

## Prerequisites
- Node.js 20 LTS
- npm 10+
- MongoDB 7 running as a **replica set**, not a standalone instance (see note below) - or use
  Docker Compose, which provisions this correctly for you
- Docker + Docker Compose (optional, for the containerized path)

> **Why a replica set specifically**: the Facilities & Bookings module uses a real MongoDB
> multi-document transaction to prevent double-booking a room for an overlapping time range (a
> unique index can't express "no overlapping range" the way it can express "no duplicate key").
> MongoDB transactions require a replica set - a plain standalone `mongod` will reject them
> outright. A single-node replica set is sufficient for local development; MongoDB Atlas (the
> production recommendation in `AWS_DEPLOYMENT.md`) provisions a proper replica set by default,
> so this is a local-dev-only consideration.

## Option A — run natively (fastest for development)

### 1. Start MongoDB (as a single-node replica set)
If you don't already have MongoDB running locally:
```bash
docker run -d --name schoolos-mongo -p 27017:27017 mongo:7 --replSet rs0
docker exec schoolos-mongo mongosh --eval "rs.initiate()"
```

### 2. Backend
```bash
cd server
cp .env.example .env
# Edit .env: set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET to two different random 32+ char
# strings. Generate one with:
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"

npm install
npm run dev
# API now listening on http://localhost:4000
# Health check: curl http://localhost:4000/health
```

### 3. Frontend
```bash
cd client
cp .env.example .env   # defaults to http://localhost:4000/api/v1, adjust if needed
npm install
npm run dev
# App now at http://localhost:5173
```

### 4. Create your first user and log in
```bash
curl -X POST http://localhost:4000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"name":"Rashid Al Maktoum","email":"admin@alnoor.ae","password":"StrongPass123","role":"Administrator"}'
```
Then sign in at `http://localhost:5173/login` with that email/password.

## Option B — Docker Compose (closest to production topology)
```bash
cp .env.example .env
# set JWT_ACCESS_SECRET and JWT_REFRESH_SECRET as above

docker compose up --build
# web:  http://localhost:8080
# api:  http://localhost:4000
# mongo: localhost:27017 (exposed for local inspection only - do not expose in production)
```

**Note on this environment's own verification:** Docker Compose itself was not executable inside
the sandbox used to build this codebase (no `docker` binary available), so the compose file was
validated for YAML syntax correctness only, not run end-to-end. Run `docker compose up --build`
yourself as the first real test of this path — see `VERIFICATION_REPORT.md` for the complete,
honest list of what was and wasn't executed during development.

## Running tests
```bash
cd server
npm run test:unit          # runs with zero external dependencies - works everywhere
npm run test:integration   # requires MongoDB - see limitation below
```
**Known limitation, stated plainly:** the test suite uses `mongodb-memory-server`, which downloads
a real MongoDB binary on first run. In network-restricted environments (like the sandbox this was
built in) that download fails and tests cannot execute. In a normal developer machine or CI runner
with open internet access, this works without any changes - `npm test` will download the binary
once (cached afterward) and run all 22 tests against it. If you're behind a corporate proxy/firewall,
set `MONGOMS_DOWNLOAD_MIRROR` to an internal mirror, or run tests against a real local MongoDB
instance instead by adapting `tests/setup.ts` to connect to `mongodb://localhost:27017/schoolos-test`.

## Seeding demo data
```bash
# From the host (the ?directConnection=true default in .env.example makes this work
# against the compose replica set):
cd server
npm run seed

# Or fully containerised - no host Node needed (runs the compiled dist/seed/seed.js
# inside the production image, so it does not depend on devDependencies):
docker compose --profile seed run --rm seed
```
Creates 5 demo accounts (one per role, all sharing the password `ChangeMe123` - **rotate this
before any shared or staging use**) and 3 sample students, one of which is linked to the seeded
Parent account to demonstrate ownership-scoped access. Safe to run more than once - it skips
records that already exist rather than duplicating them.

## Linting, formatting, type-checking, and builds
```bash
# Backend
cd server
npm run format:check   # or `npm run format` to auto-fix
npm run lint
npm run typecheck
npm run build           # outputs to server/dist

# Frontend
cd client
npm run format:check   # or `npm run format` to auto-fix
npm run lint
npm run typecheck
npm run build           # outputs to client/dist
```
Every command above was executed against this exact codebase during development and passed with
zero errors — see `VERIFICATION_REPORT.md` for the actual command output and the real defects
found and fixed along the way.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `Environment validation failed` on boot | Missing/invalid `.env` values | Compare against `.env.example`; JWT secrets must be ≥32 characters |
| `MongoServerError: connect ECONNREFUSED` | MongoDB not running or wrong `MONGO_URI` | Confirm `docker ps` shows mongo running, or that your local mongod is up on 27017 |
| CORS error in browser console | Frontend origin not in `CORS_ALLOWED_ORIGINS` | Add it (comma-separated) to the backend `.env` and restart |
| 401 on every request after working fine | Access token expired and refresh also expired/revoked | Log out and back in - this is expected session-expiry behavior, not a bug |
| `npm test` hangs then times out | `mongodb-memory-server` binary download blocked by network policy | See "Running tests" note above |
