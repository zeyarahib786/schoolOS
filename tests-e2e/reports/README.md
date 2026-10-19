# Reports workflows

Build the server, then run `SCHOOLOS_TEST_MODULE=reports node tests-e2e/helpers/run.cjs`. Fictional fixtures verify leadership ledger/student totals, fresh authenticated report reads, CSV export, source navigation, denied-role views and mobile width. Artifacts remain in `/tmp/schoolos-reports-*`.

Backend: `npm --prefix server run test:integration -- --runTestsByPath tests/reports.test.ts tests/reports-enhancements.test.ts`.
