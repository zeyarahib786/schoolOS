# Hostel browser workflows

Build the backend first (`cd server && npm run build`). From the repository root, run `SCHOOLOS_TEST_MODULE=hostel node tests-e2e/helpers/run.cjs`. Tests use fictional local records, isolated MongoDB, API port 4400, Vite port 5179 and Chromium. Artifacts stay under `/tmp/schoolos-hostel-*`.

All six roles verify complete room loading, correct controls, private family rosters, escaped room names, real warden contacts, rapid date changes, export/reload and mobile fit. Staff use real room creation/review, bed allocation, roll-call/correction/bulk confirmation, pickup-consent approval, physical departure/return, maintenance, discharge and archive/restore forms. Parent/Student requests and cancels own boarder gate passes without approval authority. Accountant receives no boarding records.

Backend: `cd server && npm run test:integration -- --runTestsByPath tests/hostel.test.ts tests/hostel-enhancements.test.ts`. Units: `tests/unit/hostel.ownership.test.ts` and `tests/unit/hostel.validation.test.ts`.
