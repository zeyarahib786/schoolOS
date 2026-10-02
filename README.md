# Solvagence SchoolOS

SchoolOS is a MERN application for school operations. The repository contains one production frontend, one API server, MongoDB-backed persistence, and Docker Compose for local development.

## Structure

```text
client/       React 18 + TypeScript + Vite frontend
server/       Node.js + Express + TypeScript API
docs/         API routes, OpenAPI contract, and MongoDB schema notes
tests-e2e/    Product interaction and visual-regression checks
docker-compose.yml
```

## Quick start with Docker

```bash
cp .env.example .env
docker compose up -d --build
docker compose --profile seed run --rm seed
```

Open:

- Application: http://localhost:8080
- API health: http://localhost:4000/health

The seed command is idempotent and can be run again. See [LOCAL_SETUP.md](LOCAL_SETUP.md) for verification, logs, reset, and non-Docker commands.

## Main commands

```bash
docker compose ps
docker compose logs -f api web
docker compose down
```

For API documentation, see [docs/openapi.yaml](docs/openapi.yaml) and [docs/API-ROUTES.md](docs/API-ROUTES.md).
