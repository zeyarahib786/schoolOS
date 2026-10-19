# Transport browser workflows

Build the backend first (`cd server && npm run build`); from the repository root run `SCHOOLOS_TEST_MODULE=transport node tests-e2e/helpers/run.cjs`. It uses fictional local records, isolated MongoDB, API port 4400, Vite port 5179 and Chromium. Artifacts stay under `/tmp/schoolos-transport-*`.

All six roles verify complete route loading, role controls, private family roster/vehicle payloads, escaped titles, search/export/reload and mobile fit. Staff create vehicles/routes, assign a saved pickup stop, record operations/incidents, resolve cases, enter/release maintenance, remove riders and archive/restore empty routes. Old map entry does not display invented GPS positions; the route shortcut opens the same persisted form.

Backend regressions: `cd server && npm run test:integration -- --runTestsByPath tests/transport.test.ts tests/transport-enhancements.test.ts`. Unit ownership/validation cases live under `server/tests/unit/transport.*.test.ts`.
