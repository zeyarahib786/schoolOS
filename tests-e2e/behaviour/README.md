# Behaviour browser workflows

Run after building the API, sequentially with other isolated suites:

```bash
SCHOOLOS_TEST_MODULE=behaviour node tests-e2e/helpers/run.cjs
```

Uses fictional isolated MongoDB/API/Vite/Chromium fixtures. Twenty-five seeded entries cover complete pagination and family-private pastoral notes. Six actual roles check entry forms, merit defaults, escalation, office closure with resolution and a prefilled follow-up date, recorded history, witness privacy, safe literal HTML, search/reload persistence and mobile layout. Reports/screenshots stay under `/tmp/schoolos-behaviour-*`.
