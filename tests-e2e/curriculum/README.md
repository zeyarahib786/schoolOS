# Curriculum browser workflows

Build the server first (`cd server && npm run build`). From the repository root, run `SCHOOLOS_TEST_MODULE=curriculum node tests-e2e/helpers/run.cjs` with MongoDB-memory-server and Chromium available. The runner uses only a fictional local database, API port 4400 and Vite port 5179. No production environment or school records are used.

The six-role suite verifies full paginated loading, safe detail rendering, grade filters, CSV export, reload and mobile fit. Administrator/Principal/Teacher use real plan creation/correction/completion/reopening forms. Leadership also archives and restores with recorded reasons. Read-only roles receive no internal history or write controls. Temporary screenshots/logs/results stay under `/tmp/schoolos-curriculum-*`.

Backend regression: `cd server && npm run test:integration -- --runTestsByPath tests/curriculum.test.ts tests/curriculum-enhancements.test.ts`.
