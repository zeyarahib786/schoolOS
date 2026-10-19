# Documents module status

The live client shell exposes Documents in Resources. Administrator, Principal,
and Teacher may publish a metadata-only record or attach a PDF (up to 8 MB).
All signed-in roles may read records and download an attached PDF. Publishing an
existing code creates a new version and supersedes the old current record;
the PDF for an older version remains downloadable via that version's record.
Publishing creates a server audit entry. A metadata-only/paper record explicitly
shows that no PDF is attached. Digital signing and QR verification remain deferred.

Verification on 2026-09-30:

- Documents integration tests use isolated MongoDB and cover role access,
  version chain, explicit `includeSuperseded=false`, concurrent publish,
  audit entry, PDF upload/download, parent download access, unauthenticated
  download rejection, paper-only records, and invalid-file rejection (11/11).
- Client unit suite, production build, and server typecheck passed.
- Authenticated jsdom UI smoke passed against local 5173/4000: navigation,
  live list/history reads, publish form, and PDF write routing.
- Real headless Chromium smoke passed: login, Documents navigation, live
  list/history reads, PDF publish UI, and PDF download UI. Browser write and
  download requests used fixtures/interception, so **no test document was
  written to the configured school DB**.
- Full backend regression passed: 108/108 suites and 748/748 tests. A stale
  Certificates unit-test expectation was updated to match its existing
  issued-only family privacy rule.

Operational boundary: this module stores PDFs but does not scan files for
malware or digitally sign them. Before broad production rollout, the school
must establish backup/restore, document approval/content review, and PDF
malware-scanning procedures. For a controlled school pilot, use approved
school PDFs and authorized accounts only.
