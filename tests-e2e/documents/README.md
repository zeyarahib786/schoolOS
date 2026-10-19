# Documents browser workflows

From the repository root:

```sh
npm --prefix server run build
SCHOOLOS_TEST_MODULE=documents node tests-e2e/helpers/run.cjs
```

All six fictional roles use an isolated MongoDB/API and Chromium. Tests exercise shared read access, office/teacher publishing controls, actual local PDF upload, authenticated preview/download, version-aware republication, earlier-version file preservation, full-register search/history/export and mobile rendering. No school database or external messages are used. Artifacts and the fictional PDF stay in `/tmp/schoolos-documents-*`.

Recorded verification: all 12 integration tests and 21 six-role browser cases passed, including actual PDF upload/preview/download and preserved old versions. Both builds and targeted lint passed.
