# Local setup

Run all commands from the repository root unless a block explicitly changes directory. Preserve an existing `.env` when you have already configured it; copy an example only when creating a new file.

## Full Docker Compose stack

Requirements: Docker Engine/Desktop with Compose v2. Docker Desktop must have WSL integration enabled when running from WSL. Local Node/MongoDB processes are not needed for this mode.

1. Copy the root `.env.example` to `.env`.
2. Set different random `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` values, each at least 32 characters. Generate each separately with:

   ```bash
   openssl rand -hex 48
   ```

3. Build and start the stack:

   ```bash
   docker compose up -d --build
   ```

4. Populate a fictional demo database:

   ```bash
   docker compose --profile seed run --rm seed
   ```

5. Check health and database readiness:

   ```bash
   docker compose ps
   curl http://localhost:4000/health
   curl http://localhost:4000/ready
   ```

Open http://localhost:8080. Demo accounts and their initial password are listed in [README.md](../../README.md#demo-accounts). The main seed includes the Student login linked to `ANS-1042`. Seeding skips/upserts existing records; it does not reset an existing account's password.

Compose services are `mongo`, `mongo-init-replica`, `api`, `web`, and the optional `seed` profile. MongoDB data lives in the `mongo-data` named volume. `mongo-init-replica` advertises `mongo:27017` inside the Docker network.

## Native Node development

Use Node **20.19+** (to satisfy the Vite 7 dependency) and a MongoDB replica set. `client/` and `server/` have separate lockfiles and dependencies.

For a local MongoDB installation, create a database directory and run these commands in separate terminals; `mongod` and `mongosh` must already be installed:

```bash
mkdir -p "$HOME/.local/share/schoolos/mongo"
mongod --dbpath "$HOME/.local/share/schoolos/mongo" --replSet rs0 --bind_ip 127.0.0.1 --port 27017
```

```bash
mongosh --host 127.0.0.1:27017 --eval 'rs.initiate({_id:"rs0",members:[{_id:0,host:"127.0.0.1:27017"}]})'
```

Initialize a new replica set once; an existing configured set does not need reinitialization. The example stores database files outside the repository. MongoDB Atlas or another replica set is also supported via `MONGO_URI`.

Alternatively, run only the Compose database services (root JWT values must still be set for Compose configuration parsing):

```bash
docker compose up -d mongo mongo-init-replica
```

For a host-side Node server connected to this Compose database, use `mongodb://localhost:27017/schoolos?directConnection=true`. This avoids trying to resolve Docker's internal `mongo` hostname from the host. `directConnection=true` does not turn a standalone database into a replica set.

Create `server/.env` and `client/.env` from their examples. In `server/.env`, configure the database, two real local JWT secrets, and `CORS_ALLOWED_ORIGINS=http://localhost:5173`. In `client/.env`, set `VITE_API_BASE_URL=http://localhost:4000/api/v1`.

Terminal 1:

```bash
cd server
npm ci
npm run dev
```

Terminal 2:

```bash
cd client
npm ci
npm run dev
```

Once the database is ready, seed from a third terminal:

```bash
npm --prefix server run seed
```

Open http://localhost:5173. To add/link just the demo Student login in an older local seeded database:

```bash
npm --prefix server run seed:student
```

This targeted command refuses `NODE_ENV=production`; use it only against a fictional local/test database.

## Alternate ports

Vite uses strict port checking: it fails if the chosen port is occupied. Coordinate all three values when changing ports. These overrides last only for the launched processes:

```bash
cd server
PORT=4001 CORS_ALLOWED_ORIGINS=http://localhost:5175 npm run dev
```

```bash
cd client
VITE_API_BASE_URL=http://localhost:4001/api/v1 npm run dev -- --port 5175
```

Open http://localhost:5175. `localhost` and `127.0.0.1` are different CORS origins; configure the one you actually open. For access from another device, bind Vite with `--host 0.0.0.0` and use a browser-reachable API URL plus the matching API CORS origin.

## Troubleshooting

| Symptom | Check |
|---|---|
| Docker command unavailable in WSL | Enable integration for the distro in Docker Desktop |
| Port already in use | Identify the existing process or select coordinated alternate ports |
| MongoDB connection refused | Start the database and verify `MONGO_URI` and its port |
| Transactions fail | Verify the database is an initialized replica set |
| Environment validation fails | JWT values must be at least 32 characters; check required server variables |
| API works with curl but browser fails | Check browser API base, HTTPS, and exact CORS origin |
| Login fails after seeding | Existing accounts are skipped; their passwords are not reset |
| Optional screens absent | Check role grants and disabled modules in school settings |

```bash
docker compose logs -f api web mongo
docker compose restart api web
docker compose down
```

`docker compose down` keeps the named database volume. The following reset **deletes all local Compose database data**:

```bash
docker compose down -v
docker compose up -d --build
docker compose --profile seed run --rm seed
```

## Verification

```bash
npm --prefix server run typecheck
npm --prefix server run lint
npm --prefix server run build
npm --prefix client test
npm --prefix client run build
docker compose config --quiet
```

Full test prerequisites and smoke-test behavior are described in [Testing guide](../testing/README.md).

The current Compose stack binds MongoDB, API and web ports to loopback. Its optional seed profile creates fictional local data in test mode; production seeding is explicitly rejected. Production build/release/operator guidance stays in [Deployment](deployment.md).


Portal login IDs: set a stable `SCHOOL_LOGIN_CODE` in `server/.env` (e.g. `ANS`). Newly provisioned student/employee/guardian IDs derive from their permanent school reference; existing IDs are preserved. All API sign-in requests now require the selected `role` alongside `email` and `password`. Choose the actual assigned role on the sign-in screen; Accountant is included. Restart the backend after environment changes.

## Additive full-school fictional dataset

With a configured development database and the existing linked Mathematics teacher, run:

```bash
npm run seed:local-school --prefix server
```

This adds four teachers (English, Science, Arabic and Social Studies), 14 section-A classes (KG 1, KG 2, Grades 1–12), five new fictional students per class, and one linked guardian per new student. Existing sections, students and account passwords are preserved. Teaching mappings for all five subjects are created for the current academic year. Existing roll numbers and previously issued login IDs are skipped when selecting new rolls. Repeated runs reuse the dataset's `LOCAL26-` references without resetting credentials.

The script is blocked in production. It writes one-time credentials immediately into a private directory `/tmp/schoolos-local-school/` (`credentials.csv`, `credentials.json`, and usage instructions). Files are never committed. First sign-in requires password setup; temporary passwords expire after seven days. If a previously created account's credential file is lost, use Administrator → Login accounts → Reset credentials; rerunning the script never resets an existing password.

These are fictional, locally usable accounts, not real people. Contact emails use reserved `.example` domains and telephone numbers use the reserved `+1 202-555-01xx` range. No messages, documents, attendance marks, payments or assessment results are fabricated. Existing class members remain, so a class can have more than five total students. Teacher mappings across all grades are for testing workflows rather than a staffing plan.
