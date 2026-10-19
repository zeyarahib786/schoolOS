# Helpdesk workflows

Build the server, then run `SCHOOLOS_TEST_MODULE=helpdesk node tests-e2e/helpers/run.cjs`. Isolated fictional fixtures test all six roles raising/replying to owned tickets, support-role assignment/resolution/closure, full queue pagination, search/export, details and mobile layout. Logs and screenshots stay in `/tmp/schoolos-helpdesk-*`.

Backend: `npm --prefix server run test:integration -- --runTestsByPath tests/helpdesk.test.ts tests/helpdesk-enhancements.test.ts`.
