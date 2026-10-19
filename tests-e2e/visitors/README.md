# Visitor desk browser workflows

From the repository root:

```sh
npm --prefix server run build
SCHOOLOS_TEST_MODULE=visitors node tests-e2e/helpers/run.cjs
```

Temporary MongoDB/local listeners and installed Chromium are required. Fictional guests/badges exercise all six roles, staff-only desk controls, actual host-confirmed admission, contact/identity-check records, versioned corrections, physical departure history, escaped details, filters/pagination/export and mobile rendering. No real admission, badge printing or external delivery occurs. Artifacts stay in `/tmp/schoolos-visitors-*`.

Recorded verification: 10 integration tests and all 21 six-role browser cases passed. Both builds and targeted lint passed.
