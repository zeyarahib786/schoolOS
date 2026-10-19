# Arabic workflow checks

From the repository root, build the backend then run:

```bash
npm --prefix server run build
SCHOOLOS_TEST_MODULE=arabic node tests-e2e/helpers/run.cjs
```

The runner starts an isolated MongoDB replica set, local API and frontend, then exercises six authenticated roles. It visits every registered workspace and validates Arabic/RTL, saved Helpdesk requests, preserved API enums and authored text, reversible open-drawer language switching, dates/errors and mobile layout. Screenshots and case reports are written under `/tmp/schoolos-arabic-*`.

These are local workflows, not evidence of production provider delivery or translation of user-uploaded files. The complete feature tests remain under each module's own directory.
