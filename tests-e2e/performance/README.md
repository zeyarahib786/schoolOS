# Production loading checks

Run from the repository root after building the API:

```bash
VITE_API_BASE_URL=http://127.0.0.1:4400/api/v1 npm --prefix client run build
SCHOOLOS_TEST_BUILD=true SCHOOLOS_TEST_BLOCK_FONTS=true SCHOOLOS_TEST_MODULE=performance node tests-e2e/helpers/run.cjs
```

The fixture starts an isolated replica set and serves the actual built frontend through Vite preview. Six real roles verify initial JavaScript size budgets, absence of unreleased React page downloads, all registered classic workspaces, UTF-8 Arabic and server-side logout revocation. Reports include measured local load/authentication times; these are not AWS latency measurements. Logs and browser reports stay in `/tmp`.

Nginx/CloudFront compression and cache policy require deployment-level verification in addition to these preview checks. Login still hydrates the legacy module datasets; large-school pagination and bootstrap changes require further measured work before claiming constant-time startup.

The final suite also blocks the font provider from a cold first navigation and delays a real prior-account API response across logout/login. Optional font availability and old responses must not prevent the new session's workspace from rendering or enter its data.
