# Biometric registry browser workflows

From the repository root:

```sh
npm --prefix server run build
SCHOOLOS_TEST_MODULE=biometric node tests-e2e/helpers/run.cjs
```

Fictional devices and isolated local services verify all six roles, staff-only registry, honest connector state, Unknown registrations, actual manual inspections, disabled state/history, escaped details, pagination/status/search/export and mobile layout. No physical device, biometric templates or real attendance punches are used. Artifacts stay in `/tmp/schoolos-biometric-*`.

Recorded verification: seven integration tests and all 21 six-role browser cases passed. Both builds and targeted lint passed. Physical hardware ingestion remains unconfigured.
