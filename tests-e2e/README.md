# E2E and historical comparison tools

The current frontend is `client/`; `fixtures/prototype/` is the historical static application used for comparison. These utilities are not part of the client npm test command or the checked-in CI workflow.

| Utility | Current assumptions and limits |
|---|---|
| `interaction-audit.js` | Serves the prototype by default on port 8093; accepts a root-directory argument; audits global handlers/clicks/forms |
| `pixel-fidelity.js` | Compares prototype and built client on ports 8090/8091; captures screenshots and pixel differences |
| `writethrough-proof.js` | Serves `client/dist`; substitutes mocked API responses and records requested writes, not real database persistence |

The scripts require `puppeteer-core`; pixel comparisons additionally require `pngjs` and `pixelmatch`. Those packages are not declared in the active client/server manifests. The scripts hard-code Chromium at `/opt/google/chrome/chrome`; screenshot/output utilities also assume environment-specific paths such as `/mnt/user-data/outputs/screenshots`. Review and adapt these prerequisites before running them.

Historical journeys use `enterApp('Administrator')`; the current production shell authenticates against the API. A prototype journey is not a substitute for testing real login, role scope, and persisted workflows on a current build.

For maintained focused checks and browser prerequisites, see [Testing guide](../docs/testing/README.md) and the `test:smoke:*` scripts in [client/package.json](../client/package.json). Read the [prototype README](fixtures/prototype/README.md) as historical release documentation.

Current isolated authenticated browser suites: [Students](students/README.md), [Parents](parents/README.md), [Classes](classes/README.md) and [Attendance](attendance/README.md). Shared lifecycle/CDP utilities live in `helpers/`; execute one suite at a time.

Maintained module runners also include [Fees](fees/README.md), [Exams](exams/README.md) and [Communication](communication/README.md); use the shared runner sequentially.

Maintained integration additions: [Delivery/PDF](delivery/README.md), [Health](health/README.md), [Behaviour](behaviour/README.md) and [Staff operations](staff/README.md), each using isolated fictional fixtures and the shared six-role runner.

## Production readiness

- [Performance](performance/README.md): actual production assets, six roles, cold font failure and stale-account responses.
- [School pilot](pilot/README.md): a fictional 3,031-student school, saved workflows and Arabic/mobile views.
- [Operations](operations/README.md): encrypted backups/restores, rollback, Nginx, package integrity and redacted preflight.

Full backend regression uses `npm --prefix server run test:integration:all` in bounded processes. Deployments and provider secrets remain deferred; local fixtures never represent live delivery or school-staff acceptance.
