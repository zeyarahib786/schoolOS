# Cafeteria browser workflows

From the repository root, build the API and run:

```sh
npm --prefix server run build
SCHOOLOS_TEST_MODULE=cafeteria node tests-e2e/helpers/run.cjs
```

Requires installed Chromium and temporary local MongoDB/listener access. Fixtures use fictional users/students and recorded receipts only; no external payments or messages occur. Six roles exercise saved menu loading, wallet/care-plan privacy, finance controls, actual top-up/purchase forms, reviewed menus/care plans, search, pagination, export, details and mobile rendering. Artifacts stay in `/tmp/schoolos-cafeteria-*`.

Recorded verification: 15 integration tests, five unit tests and all 29 six-role browser cases passed. Both builds and targeted backend lint passed.
