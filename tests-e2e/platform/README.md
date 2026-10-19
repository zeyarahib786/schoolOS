# Roles and school settings workflows

Build the server, then run `SCHOOLOS_TEST_MODULE=platform node tests-e2e/helpers/run.cjs`. Isolated fictional fixtures verify all six roles reading school context, Administrator-only editing, full released-module visibility, module enablement and real permission persistence, safe export and mobile settings views. Temporary artifacts remain in `/tmp/schoolos-platform-*`.

Backend: `npm --prefix server run test:integration -- --runTestsByPath tests/roles.test.ts tests/settings.test.ts tests/platform-settings-enhancements.test.ts`.
