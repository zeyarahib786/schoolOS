# Facilities workflows

After building the server, run `SCHOOLOS_TEST_MODULE=facilities node tests-e2e/helpers/run.cjs`. Fictional isolated fixtures verify all six role views, full booking pagination, real booking/cancellation, availability reviews, details, CSV and mobile width. Artifacts stay in `/tmp/schoolos-facilities-*`.

Backend: `npm --prefix server run test:integration -- --runTestsByPath tests/facilities.test.ts tests/facilities-enhancements.test.ts tests/events.test.ts`.
