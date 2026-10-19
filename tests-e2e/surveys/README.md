# Survey workflows

After building the server, run `SCHOOLOS_TEST_MODULE=surveys node tests-e2e/helpers/run.cjs`. Fictional local fixtures exercise all six roles, audience-correct register reads, actual complete responses, school draft creation/activation/results/closure, pagination, CSV, details and mobile layout. Artifacts remain in `/tmp/schoolos-surveys-*`.

Backend: `npm --prefix server run test:integration -- --runTestsByPath tests/surveys.test.ts tests/surveys-enhancements.test.ts`.
