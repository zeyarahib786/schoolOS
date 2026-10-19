# Isolated school pilot

```bash
npm --prefix server run build
VITE_API_BASE_URL=http://127.0.0.1:4400/api/v1 npm --prefix client run build
SCHOOLOS_TEST_BUILD=true SCHOOLOS_TEST_MODULE=pilot node tests-e2e/helpers/run.cjs
npm --prefix server run test:integration:all
```

The disposable school has 3,031 students (including the linked-family base fixture), 60 configured sections, 6,000 attendance records and 3,000 invoices. Fictional details use `example.invalid`; no real mail, SMS, salaries or banking are involved. Six genuine roles verify pagination/search, owned family records, denied financial writes, idempotent partial collection, persisted Arabic tickets, all registered Arabic workspaces, mobile layout and session reload. Use the actual built frontend with the stated API origin.

Measured timings are local fixture observations, not an AWS capacity guarantee. Module-specific E2E suites provide deeper individual workflows; the full bounded backend integration run exercises their shared authorization/concurrency rules.

School staff acceptance still needs an approved staging deployment and real feedback from admissions, teachers, accounts and families. Ask an Arabic-speaking school reviewer to check terminology, forms, error messages, printouts and RTL navigation. Authored text/files retain their language; fixture transliterations do not certify every school name's linguistic correctness. Record issues in the existing module document/roadmap rather than a new dated report.
