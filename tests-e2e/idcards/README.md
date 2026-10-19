# ID card browser workflows

From the repository root:

```sh
npm --prefix server run build
SCHOOLOS_TEST_MODULE=idcards node tests-e2e/helpers/run.cjs
```

Isolated fictional students/staff and Chromium exercise all six roles, full registry pages, owned family/Accountant reads, actual issuance, lost reporting, replacement lineage, current expiry display, authenticated record PDFs, search/export and mobile rendering. No physical cards, gate encoding or production credentials are used. Artifacts stay in `/tmp/schoolos-idcards-*`.

Recorded verification: all 15 integration tests and 21 six-role browser cases passed, with zero JavaScript exceptions. Both builds and targeted lint passed.
