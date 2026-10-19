# Students authenticated browser regression

Runs six separate Chromium sessions against an isolated temporary MongoDB replica set and local Vite server. Production data and external delivery are not used. The fixture accounts and passwords are local test data only.

From the repository root:

```bash
npm run build --prefix server
node tests-e2e/students/run.cjs
```

Install both client and server dependencies first. Chromium is discovered at the existing Playwright cache path; set `SCHOOLOS_CHROME_PATH` when using a different executable. Ports 4400 and 5179 must be free. The runner requires permission to open local ports. Each invocation resets the temporary database; do not run two copies concurrently.

Coverage: six authenticated role views, owned family records, available/hidden controls, search/empty states, Principal/Teacher UI edits, Admin full edit/clear, enrollment history, portal links, document upload/download/reload, previewed CSV import, filtered export, authenticated photo rendering, uploaded-image View controls across authorized roles, PDF preview/close, recommended checklist navigation, authorized emergency information, duplicate-person create/edit/import cancel/confirm flows, and mobile directory/profile geometry. Desktop and mobile screenshots plus JSON reports are saved under `/tmp/schoolos-students-*`. Role-restricted optional API reads from other modules may return expected HTTP 403 during shell hydration; these are recorded and distinguished from runtime errors.

Fixture database and Vite server are stopped in the runner's `finally` block. The script assumes it can register local fixture accounts with `NODE_ENV=test`.
