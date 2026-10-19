# Health browser workflows

Build the server, then run sequentially with other suites:

```bash
SCHOOLOS_TEST_MODULE=health node tests-e2e/helpers/run.cjs
```

The shared runner starts isolated MongoDB, local API/Vite and Chromium using fictional accounts only. Twenty-two clinic fixtures verify that the screen loads the full register. All six roles exercise permitted/denied workflows, actual clinic forms, follow-up/contact corrections, family ownership, safe literal content, search/due filters, reload persistence and mobile view. No clinical care or external messaging occurs. Reports/screenshots live under `/tmp/schoolos-health-*`.
