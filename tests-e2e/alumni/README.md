# Alumni workflow checks

Build the server, then run `SCHOOLOS_TEST_MODULE=alumni node tests-e2e/helpers/run.cjs` from the repository root. The suite uses isolated local MongoDB and fictional school accounts. It verifies six-role directory scope, clearance preview, confirmed graduation, owned contact reviews, details, pagination, search, CSV and mobile width. Artifacts remain in `/tmp/schoolos-alumni-*`.

Backend: `npm --prefix server run test:integration -- --runTestsByPath tests/alumni.test.ts tests/alumni-enhancements.test.ts`.
