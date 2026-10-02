# Local setup

## Recommended: complete Docker Compose setup

Requirements: Docker Engine/Desktop with Compose v2. No local MongoDB or Node.js process is required.

1. Create local environment configuration:

   ```bash
   cp .env.example .env
   ```

2. Set different values of at least 32 characters for `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` in `.env`.

3. Build and start MongoDB, API, and frontend:

   ```bash
   docker compose up -d --build
   ```

4. Load the local demo accounts and application data:

   ```bash
   docker compose --profile seed run --rm seed
   ```

5. Verify the stack:

   ```bash
   docker compose ps
   curl http://localhost:4000/health
   ```

6. Open http://localhost:8080 and sign in with an account printed by the seed command.

   The demo Student login is `student@alnoor.ae` with the same seed password,
   `ChangeMe123`. It is linked to Fatima Al Hashimi (`ANS-1042`). For an
   existing seeded database, run `cd server && npm run seed:student` once to
   add only this login and link. These credentials are for fictional local/test
   data only; rotate or remove demo accounts before using real school data.

## Useful troubleshooting commands

```bash
docker compose logs -f api web mongo
docker compose restart api web
docker compose down
```

To remove all local database data and start clean (destructive):

```bash
docker compose down -v
docker compose up -d --build
docker compose --profile seed run --rm seed
```

## Run without Docker

Use Node.js 20+ and a MongoDB replica set.

Terminal 1:

```bash
cd server
cp .env.example .env
npm ci
npm run dev
```

Terminal 2:

```bash
cd client
npm ci
npm run dev
```

The Vite development URL is normally http://localhost:5173 and the API is http://localhost:4000.

## Build verification

```bash
cd server && npm run typecheck && npm run lint && npm run build
cd ../client && npm run typecheck && npm run build
docker compose config
```
