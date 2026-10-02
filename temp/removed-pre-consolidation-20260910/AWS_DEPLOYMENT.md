# AWS Deployment Guide

This describes a recommended, reasonably minimal-ops AWS topology for this stack. **None of the
steps below were executed against a real AWS account during development** (no AWS credentials or
account access is available in the build environment) - this is deployment guidance grounded in
the actual application's requirements (its health-check endpoints, env vars, and Docker images),
not a verified deployment. Treat it as a well-reasoned starting runbook to validate in a real
AWS sandbox account before production use.

## Recommended architecture

```
                         ┌─────────────────────┐
  Users ──── HTTPS ─────▶│ CloudFront (CDN)     │──── static assets ───▶ S3 (React build)
                         └─────────────────────┘
                                    │
                                    │ /api/* origin
                                    ▼
                         ┌─────────────────────┐
                         │ Application Load     │
                         │ Balancer (HTTPS)      │
                         └─────────────────────┘
                                    │
                         ┌─────────────────────┐
                         │ ECS Fargate service   │  ← runs server/Dockerfile
                         │ (2+ tasks, autoscale) │
                         └─────────────────────┘
                                    │
                         ┌─────────────────────┐
                         │ MongoDB Atlas          │  (recommended over self-hosting on EC2 -
                         │ (VPC-peered, private)  │   managed backups, patching, encryption at rest)
                         └─────────────────────┘
```

## 1. Frontend hosting — S3 + CloudFront
1. `npm run build` in `client/` produces static files in `client/dist/`.
2. Upload to a private S3 bucket (block all public access; CloudFront accesses it via Origin
   Access Control, not a public bucket policy).
3. CloudFront distribution in front of the bucket, with a second origin behavior for `/api/*`
   pointed at the ALB (avoids a separate CORS hop for same-origin API calls from the browser).
4. Cache static assets aggressively (the app's Vite build already emits content-hashed
   filenames — see `nginx.conf`'s cache headers for the equivalent if you self-host instead of
   using S3+CloudFront).

## 2. API deployment — ECS Fargate
1. Push `server/Dockerfile`'s production image to ECR:
   ```bash
   aws ecr create-repository --repository-name schoolos-api
   docker build -t schoolos-api ./server
   docker tag schoolos-api:latest <account>.dkr.ecr.<region>.amazonaws.com/schoolos-api:latest
   docker push <account>.dkr.ecr.<region>.amazonaws.com/schoolos-api:latest
   ```
2. ECS Fargate task definition: point the container's health check at `/health` (liveness) and
   the ALB target group's health check at `/ready` (readiness — fails until the MongoDB
   connection is actually established, so the ALB won't route traffic to a task that isn't
   really ready).
3. Run at least 2 tasks across 2 AZs for availability; enable ECS service autoscaling on CPU
   (target ~60%).
4. Task role: least-privilege IAM — permissions to read the specific Secrets Manager secrets
   below and write to the specific CloudWatch log group, nothing broader.

## 3. Database — MongoDB Atlas (recommended) or DocumentDB
- **Atlas** is the simpler path: managed, VPC-peered into your AWS VPC, automatic backups,
  encryption at rest by default. Use a dedicated (not shared/free-tier) cluster for production.
- **Transactions are required, not optional, for this application**: the Facilities & Bookings
  module uses a real MongoDB multi-document transaction to prevent double-booking a room for an
  overlapping time range (a unique index can't express "no overlapping range" the way it
  expresses "no duplicate key"). Transactions require a replica set - Atlas provisions one by
  default on every tier, so this is typically a non-issue on Atlas specifically, but worth
  confirming explicitly if evaluating any other MongoDB-compatible hosting option.
- If organizational policy requires staying entirely within AWS: Amazon DocumentDB is
  MongoDB-API-compatible; verify the specific Mongoose/driver version compatibility **and
  multi-document transaction support** before committing, as DocumentDB's transaction semantics
  and limits differ from native MongoDB and this application depends on them being present.
- Either way: enable encryption at rest, restrict network access to the VPC/security group the
  ECS tasks run in (never `0.0.0.0/0`), and enable automated daily backups with a tested restore
  procedure — untested backups are not a real recovery plan.

## 4. Secrets management
Never bake `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, or `MONGO_URI` into the Docker image or a
committed `.env` file. Use **AWS Secrets Manager**:
```bash
aws secretsmanager create-secret --name schoolos/jwt-access-secret --secret-string "$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")"
aws secretsmanager create-secret --name schoolos/jwt-refresh-secret --secret-string "$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")"
aws secretsmanager create-secret --name schoolos/mongo-uri --secret-string "mongodb+srv://..."
```
Reference these in the ECS task definition's `secrets` block (injected as environment variables
at container start, never visible in the task definition JSON itself or in logs).

## 5. TLS
- ACM certificate on both the CloudFront distribution and the ALB listener (HTTPS only — the API
  should not have a plain-HTTP listener at all in production, matching the `helmet()` HSTS header
  already set server-side).
- Force HTTPS redirect at the ALB listener level, not just relying on the app's own headers.

## 6. CloudWatch logs & monitoring
- The API already emits structured JSON logs via `pino`/`pino-http` (see `src/utils/logger.ts`
  and `src/app.ts`) — point the ECS task definition's `awslogs` log driver at a dedicated log
  group (`/ecs/schoolos-api`), and these JSON lines become natively queryable in CloudWatch
  Logs Insights without any additional parsing.
- Recommended alarms: 5xx rate on the ALB target group, ECS task health-check failure count,
  Atlas/DocumentDB connection count approaching the plan limit.
- The `/health` and `/ready` endpoints already built into the app (see `src/app.ts`) are the
  correct targets for ALB and ECS container health checks respectively — no additional code
  needed for basic infra monitoring.

## 7. CI/CD
The `.github/workflows/ci.yml` in this repo already runs lint/typecheck/test/build/audit on every
PR. Extend it with a deploy job on merge to `main`:
1. Build and push both Docker images to ECR (tagged with the git SHA, not `latest`, so a rollback
   is just redeploying a known-good tag).
2. `aws ecs update-service --force-new-deployment` to roll the new image out with ECS's built-in
   rolling deployment (zero-downtime by default when running 2+ tasks).
3. Sync `client/dist` to the S3 bucket, then CloudFront invalidation for `/index.html` (content-
   hashed JS/CSS assets never need invalidating).

## 8. Rollback
Because every deployed image is tagged by git SHA, rollback is:
```bash
aws ecs update-service --cluster schoolos --service schoolos-api \
  --task-definition schoolos-api:<previous-revision-number> --force-new-deployment
```
Keep the previous S3/CloudFront frontend version similarly addressable (versioned S3 objects or a
parallel `previous/` prefix) so a frontend rollback doesn't depend on rebuilding from source.

## 8b. Production seeding & the prototype UI

**Seeding** in any containerised environment must use the compiled entrypoint - the
production image contains neither devDependencies nor `src/`:
```bash
node dist/seed/seed.js        # e.g. as a one-off ECS task using the api image,
                              # with MONGO_URI + two 32+ char JWT_* secrets set
```
Never bake `tsx src/seed/seed.ts` into production tooling; it only exists in dev installs.

**The prototype UI** (`prototype/`) deploys exactly like the React client: static files on
S3 + CloudFront (or any static host). Two requirements: (1) add its public origin to the
API's `CORS_ALLOWED_ORIGINS`; (2) point the adapter at the deployed API by adding, before
the adapter's script tag in `prototype/index.html`:
```html
<script>window.SCHOOLOS_API = { base: 'https://api.your-domain.com/api/v1' };</script>
```
Serve over https - the adapter self-disables on file:// and mixed content is blocked.

## 9. Post-deployment checks
- [ ] `curl https://api.<domain>/health` returns 200
- [ ] `curl https://api.<domain>/ready` returns 200 (confirms DB connectivity from inside the VPC)
- [ ] Register + login flow works end-to-end against the deployed environment
- [ ] CloudWatch Logs Insights shows structured JSON log lines with `requestId` present
- [ ] ALB access logs (if enabled) show only HTTPS traffic, no plain-HTTP requests succeeding
- [ ] Confirm `npm audit --audit-level=high` was clean on the exact commit that was deployed

## What's explicitly NOT covered here
This guide does not include a Terraform/CloudFormation IaC template — writing and testing one
against a real AWS account was out of scope for this build environment. Treat the steps above as
the runbook to translate into IaC, not as a substitute for it.
