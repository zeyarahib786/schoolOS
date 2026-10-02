# Migration & Growth Roadmap

## Stage 1 — COMPLETE (this repository)
All 36 modules as full vertical slices (model → validation → repository → service →
controller → routes → React page), six-role RBAC, transactions, guarded concurrency,
state machines, aggregation reporting, the original functional prototype UI integrated
AS-IS via a non-invasive API adapter, corrected containerised seeding, Docker Compose
for the whole stack. Verified state: see `READINESS_REPORT.md`.

## Stage 2 — proposed activities (owner decision pending; recommended order)

### A. Verify what Stage 1's build environment could not (do this first)
1. Run the 271 written integration tests against the compose replica-set MongoDB
   (`cd server && npm run test:integration`).
2. Execute the full Docker build and boot (`docker compose up -d --build`), seed
   (`docker compose --profile seed run --rm seed`), and click-test the prototype at
   :8090 in connected mode.
3. Load test and security-hardening pass (secrets rotation, rate limits, headers).

### B. Infrastructure capabilities (each unlocks many modules)
4. File storage (S3-compatible): real document files, ID-card photos, LMS attachments.
5. Background scheduler: auto flip/revert Staff "On Leave", ID-card expiry sweeps,
   fee-overdue transitions, announcement expiry.
6. Notifications (email + in-app): fee reminders, meeting confirmations, message alerts.

### C. Product deepening
7. Online fee payment gateway. 8. PDF/Excel exports (report cards, payroll, statements).
9. Charts on Reports; cross-module search.

### D. Localisation & compliance
10. Arabic + full RTL (the prototype already ships multilingual fonts and an i18n layer —
    the backend needs locale-aware content). 11. PDPL data-protection layer.

### E. Enterprise
12. SSO (Google/Microsoft). 13. Multi-school tenancy. 14. Role-management UI.

## Migration principles carried from Stage 1
Verify before building on; read source before writing tests; every module a complete
vertical slice; honest proven-vs-asserted reporting; root-cause fixes only.
