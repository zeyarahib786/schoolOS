# Inventory browser workflows

From the repository root:

```sh
npm --prefix server run build
SCHOOLOS_TEST_MODULE=inventory node tests-e2e/helpers/run.cjs
```

Requires temporary MongoDB/local listeners and installed Chromium. Fictional items/orders exercise six roles, metadata inspection, reasoned stock issue, Draft→Sent→Received forms, movement/history persistence, safe details, pagination, search/export and mobile view. No supplier messages or actual purchasing occur. Artifacts stay in `/tmp/schoolos-inventory-*`.

Recorded verification: 14 integration tests, eight state-machine unit tests and all 28 six-role browser cases passed. Both builds and targeted lint passed.
