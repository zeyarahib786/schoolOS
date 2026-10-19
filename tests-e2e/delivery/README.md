# External delivery and PDF browser workflows

Run after the server build, sequentially with other browser suites:

```bash
SCHOOLOS_TEST_MODULE=delivery node tests-e2e/helpers/run.cjs
```

This uses the shared isolated MongoDB/API/Vite/Chromium runner. The fixture creates an ephemeral self-signed QA-only PKCS#12 under `/tmp`; it never represents the school identity. Email credentials are fictional. The production worker is intentionally not started, so no provider requests or real messages occur. Actual forms test delivery queueing, Teacher approval, cancellation, safe message rendering and role controls. Certificate downloads use authenticated real PDF bytes; office roles create signed files and owned readers download them. Server integration tests independently mock provider responses, verify Svix webhooks and use OpenSSL to verify signatures and reject tampering.

Reports are written to `/tmp/schoolos-delivery-*`. Production configuration remains deferred by the user.
