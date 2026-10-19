# Certificate workflows

From the repository root:

```sh
npm --prefix server run build
SCHOOLOS_TEST_MODULE=certificates node tests-e2e/helpers/run.cjs
```

Fictional local fixtures exercise all six roles, full-page registry reads, owned family requests/cancellation, office decisions, safe details, actual authenticated unsigned PDFs, pagination/search/export and mobile rendering. Backend PDF tests additionally verify fictional self-signed PKCS#12 signatures and tamper rejection through OpenSSL. No production certificate identity or external delivery is used. Artifacts stay in `/tmp/schoolos-certificates-*`.

Recorded verification: 16 registry/request/PDF integration tests, nine numbering/ownership unit tests and all 22 six-role browser cases passed. Both builds and targeted lint passed. Production signing identity remains deferred.
