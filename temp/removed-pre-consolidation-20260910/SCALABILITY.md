# Scalability posture — honest current state, not a plan pretending to be done

Answering directly: this is a Stage 1 reference implementation covering 2 of 36 modules. What
follows is exactly what's in place today for scaling *this*, and what's explicitly not tested,
so nobody mistakes design choices made for a 2-module slice for a load-tested guarantee at
36-module, real-traffic scale.

## In place today, and why

| Concern | What's actually done | Why it matters at scale |
|---|---|---|
| **Stateless auth** | JWT access/refresh tokens, no server-side session store | Any request can be served by any app instance behind a load balancer - no sticky sessions, no shared session store to become a bottleneck |
| **Horizontal API scaling** | Stateless design + `docker-compose.yml`/`AWS_DEPLOYMENT.md` describe running 2+ ECS Fargate tasks | Adding capacity is "run more identical containers," not a code change - **the topology is designed for this, but has never actually been run with more than 1 instance in this build environment** |
| **DB connection pooling** | Just added this round: `maxPoolSize`/`minPoolSize` explicitly configured and env-tunable (`DB_MAX_POOL_SIZE`, `DB_MIN_POOL_SIZE`), instead of Mongoose's untuned defaults | With N app instances each holding up to `maxPoolSize` connections, total DB connections scale with instance count - this needs to be sized against your MongoDB tier's actual connection limit as you add instances, which is now a config change, not a code change |
| **Query indexes** | `refId` (unique), `grade`, `status`, `guardianUserId`, and a text index on `name`+`refId` on the Student collection - each backing a real filter the app actually issues (list filters, ownership scoping, search) | Indexes were added against real query patterns already in the code, not speculatively - avoids the common mistake of over-indexing (which slows writes) or indexing the wrong field |
| **Pagination** | `GET /students` requires page/limit (capped at 100), never returns an unbounded result set | Prevents a single "list everything" request from becoming a memory/bandwidth problem as the collection grows |
| **Rate limiting** | Global + auth-specific, both env-configurable | Protects against a single client or bad actor from monopolizing capacity meant for everyone |
| **Stateless, cacheable static frontend** | React SPA with route-level code splitting, designed to sit behind CloudFront/S3 per `AWS_DEPLOYMENT.md` | Frontend scaling is a CDN cache-hit-rate problem, not an application-server problem, once deployed as designed |

## Explicitly NOT done, NOT tested - stated plainly

- **No caching layer** (Redis or equivalent). Every read hits MongoDB directly. For the two
  modules that exist, this is fine at any realistic Stage 1 traffic; it becomes a real
  consideration once more read-heavy modules (Dashboard aggregates, Reports) are built.
- **No load testing has been performed against this code, at any scale.** Every claim above is a
  design choice, not a measured result - there is no k6/Artillery/JMeter run, no p95/p99 latency
  number, no measured requests-per-second ceiling. Do not treat "designed for horizontal scaling"
  as "tested under load."
- **No compound indexes tuned to combined-filter queries.** `listStudents` can filter by `grade`
  AND `status` simultaneously; MongoDB will use one single-field index and filter the rest
  in-memory for that combination today. This is a reasonable Stage 1 trade-off (premature
  compound indexing without real production query-frequency data is itself a common mistake) but
  should be revisited once real usage patterns from the other 34 modules exist to inform it.
- **No database sharding or read-replica strategy.** A single `MONGO_URI` connection is assumed.
  MongoDB Atlas (recommended in `AWS_DEPLOYMENT.md`) handles replica sets operationally, but
  nothing in this codebase routes reads to replicas or reasons about a sharded cluster - not
  needed at 2-module scale, genuinely necessary to design deliberately before this system holds
  the full 36-module dataset for a real school.
- **No CDN/edge caching has actually been configured** - `AWS_DEPLOYMENT.md` describes the
  CloudFront + S3 topology, but it's guidance, not a deployed and measured configuration (no AWS
  account access in this build environment - see `VERIFICATION_REPORT.md`).
- **No multi-tenancy consideration.** This schema and API assume one school (matching the
  prototype's own single-school scope: "Al Noor International, Dubai"). If the product goal is
  eventually multiple schools on shared infrastructure, that's an architectural decision
  (separate databases per tenant vs. a `schoolId` field on every collection) that should be made
  deliberately before more of the 34 remaining modules are built on an assumption that doesn't
  hold - flagging this now while only 2 collections exist, rather than after 54 do.

## What "production ready for scale" actually requires next, in priority order
1. Port enough of the remaining 35 modules to have realistic combined query patterns, *then*
   revisit indexing (compound indexes informed by real access patterns beat speculative ones).
2. Real load testing against a real MongoDB instance and real ECS deployment - the one thing nothing
   in this document can substitute for, and the one thing this build environment cannot provide.
3. A caching layer, once read-heavy aggregate/reporting endpoints exist (they don't yet - Stage 1
   is CRUD only).
4. An explicit multi-tenancy decision, made before it's expensive to retrofit.
