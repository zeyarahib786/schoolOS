# Audit workflows

Build the server, then run `SCHOOLOS_TEST_MODULE=audit node tests-e2e/helpers/run.cjs`. Fictional fixtures verify all six role views, actual server pagination, literal action/date filtering, details, filtered CSV and recorded export acknowledgement, and mobile width. Artifacts remain in `/tmp/schoolos-audit-*`.

Backend: `npm --prefix server run test:integration -- --runTestsByPath tests/audit.test.ts tests/audit-enhancements.test.ts`.
