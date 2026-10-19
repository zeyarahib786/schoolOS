# Attendance browser workflows

Run from the repository root:

```bash
node tests-e2e/attendance/run.cjs
```

Requires installed client/server dependencies, a current `npm run build --prefix server`, the cached MongoDB test executable and Chromium. Override the Chromium path with `SCHOOLOS_CHROME_PATH` if needed. Optional `SCHOOLOS_TEST_ROLES=Principal,Parent` selects a focused rerun; the default exercises all six roles.

The maintained shared runner starts a temporary MongoDB replica set/API on 127.0.0.1:4400 and Vite on 127.0.0.1:5179, logs in actual fictional accounts and performs persisted actions through Chromium. It never reads production `.env` or targets AWS. Run suites sequentially because they share ports. Processes/databases are stopped after the run; JSON reports, downloads, logs and screenshots remain in `/tmp/schoolos-attendance-*`.

See the [module contract and coverage](../../docs/modules/attendance/README.md). Classes seeds complete school rosters/teacher assignments; Attendance reuses that isolated fixture and exercises register/absence/staff workflows. Expected permission/validation/conflict responses are deliberately tested and appear in network evidence. Runtime exceptions and failed workflow assertions fail the runner.
