# Library browser workflows

Build the server first (`cd server && npm run build`). From the repository root run `SCHOOLOS_TEST_MODULE=library node tests-e2e/helpers/run.cjs`. This uses a fictional isolated MongoDB, API port 4400, Vite port 5179 and Chromium. Temporary artifacts remain under `/tmp/schoolos-library-*`.

All six roles verify catalogue pagination, safe details, authorized loans/requests, filters/export/reload and mobile layouts. Staff exercise real arrival/restock, metadata correction, issue, renewal, physical-return confirmation, actual request fulfilment and overdue portal reminders. Parent/Student chooses their own child and cancels a real request with a reason. Accountant sees no borrower records or writes. The dashboard arrival shortcut uses the same real form.

Integration: `cd server && npm run test:integration -- --runTestsByPath tests/library.test.ts tests/library-enhancements.test.ts`. Concurrency cases verify availability, borrower allowance and reminder repeat guards; they are not rendered-count-only checks.
