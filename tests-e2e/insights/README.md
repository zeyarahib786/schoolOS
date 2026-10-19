# Recorded insights workflows

Build the server, then run `SCHOOLOS_TEST_MODULE=insights node tests-e2e/helpers/run.cjs`. Fictional attendance fixtures verify actual priority evidence, missing-assessment handling, details, full pagination, CSV, role restrictions and responsive dashboard integration. Artifacts stay in `/tmp/schoolos-insights-*`.

Backend: `npm --prefix server run test:integration -- --runTestsByPath tests/reports-insights.test.ts tests/reports.test.ts tests/reports-enhancements.test.ts`.
