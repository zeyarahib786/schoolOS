# Fees browser workflows

Run from the project root after `npm run build --prefix server`:

```bash
SCHOOLOS_TEST_MODULE=fees node tests-e2e/helpers/run.cjs
```

Uses an isolated temporary MongoDB replica set, local API port 4400, Vite port 5179 and installed Chromium. No production credentials or live records are used. Run module suites sequentially because ports are shared. Set `SCHOOLOS_CHROME_PATH` if the default cached browser is unavailable. Optional `SCHOOLOS_TEST_ROLES=Principal,Parent` limits a diagnostic run.

All six roles log in through the actual application. Tests perform saved workflows and verify reload persistence, role controls and responsive views. Backend integration tests separately prove rejected writes, ownership, concurrency and transaction behavior; a hidden button alone is not evidence of authorization.

Reports/screenshots/logs are written under `/tmp/schoolos-fees-*`. The runner shuts down its temporary database and local services after completion. See [module details](../../docs/modules/fees/README.md) for supported behavior and boundaries.
