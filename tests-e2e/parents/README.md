# Parents authenticated browser regression

From the repository root, after installing client/server dependencies:

```bash
npm run build --prefix server
node tests-e2e/parents/run.cjs
```

Runs six independently authenticated Chromium sessions against local Vite/API servers and a temporary MongoDB replica set. Requires free ports 4400 and 5179 plus a cached compatible MongoDB binary. Set `SCHOOLOS_CHROME_PATH` if Chromium is installed outside the existing Playwright cache. Production records and external delivery are not used.

`helpers/run.cjs` shares the server/browser lifecycle with Students; `helpers/browser.cjs` contains reusable Chromium/CDP utilities. Parents fixtures extend the isolated Students seed with guardian records, Parent account links, teaching staff and meeting slots. Do not run this suite concurrently with the Students browser suite because they share local ports.

Coverage includes all six navigation/API boundaries, guardian search/filters and profile navigation, leadership contact edits, Parent two-way messages, date-based own-child booking, Admin multi-child creation, portal link/suspend/restore/unlink, explicit broadcast preview/confirmation, staff publish/book/reschedule/cancel, real filtered CSV download and mobile directory/profile geometry.

Reports, screenshots, downloads and logs go to `/tmp/schoolos-parents-*`. Expected denied API requests (HTTP 403) are recorded. The runner stops local servers in its `finally` block.

For a focused rerun, use `SCHOOLOS_TEST_ROLES=Principal node tests-e2e/parents/run.cjs` (comma-separated role names are supported). Omit the variable for the full six-role suite.
