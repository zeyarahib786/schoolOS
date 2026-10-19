# Expenses browser workflows

From the repository root:

```sh
npm --prefix server run build
SCHOOLOS_TEST_MODULE=expenses node tests-e2e/helpers/run.cjs
```

The isolated MongoDB/local API fixture links fictional staff accounts and creates fictional receipts. All six roles exercise saved register loading, role/privacy controls, submission, own cancellation, independent review, referenced reimbursement, escaped details, pagination, search/export and mobile rendering. No actual payments occur. Logs and browser artifacts stay in `/tmp/schoolos-expenses-*`.

Recorded verification: 12 integration tests, seven unit tests and all 27 six-role browser cases passed. Both builds and targeted lint passed.
