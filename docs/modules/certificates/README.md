# Certificates and signed PDFs

The registry stores issued, pending and rejected school documents. Administrator/Principal decides requests; family reads are scoped to linked students. The active Certificates screen downloads real authenticated PDF files rather than substituting browser printing for a PDF.

Generated PDF bytes are saved immutably by certificate and signed/unsigned variant. Report cards preserve their issued assessment snapshot. General certificates use the registry/student details at first PDF generation; later profile changes do not rewrite an already generated file. Correcting an issued record requires a new issuance rather than replacing its signed bytes.

Administrator/Principal can generate a detached CMS signature using the school's privately configured authorized RSA PKCS#12 certificate. Teacher and owned family users can download an existing signed copy but cannot initiate official signing. Missing, expired or invalid signing identity produces a clear server error, while unsigned PDFs remain available. Pending/rejected and unrelated-family records cannot be downloaded. Files carry SHA-256 response metadata and private/no-store caching.

Production identity configuration is deferred. See [configuration and signature limitations](../../setup/deployment.md#optional-external-delivery-and-signed-school-pdfs). Reader trust, TSA/LTV/revocation and public QR verification are separate remaining capabilities; an unsigned copy is never described as signed.

## Verification

`server/tests/certificates-pdf.test.ts` covers immutability, ownership, actual binary PDF response, denied signing, invalid credentials, OpenSSL CMS signature verification and tamper rejection. The test certificate is fictional and temporary. Shared [delivery browser workflows](../../../tests-e2e/delivery/README.md) cover actual role views and downloads. Prior registry verification is retained in [testing notes](testing.md).

## Family requests and released registry

The released registry now loads every API page and provides search/status filters, pagination, CSV export, escaped details and actual PDF downloads. Families submit a Pending request only for a linked student, track their own request decisions/cancellations and cancel an own current Pending version with a reason. Student serialization prevents duplicate Pending requests of one type, including staff-created requests. Office decisions optionally accept expectedUpdatedAt/reason; the released UI always supplies both. Existing legacy decisions still enforce the atomic Pending state.

The issued family list intersects an explicit student filter with ownership rather than replacing the filter. Staff-created Pending/Rejected drafts remain hidden from families; a separate own-request list exposes only their own submitted requests. Accountant receives no family/student records. Issued signed bytes remain immutable and cancellation cannot revoke or rewrite an issued PDF.

Manual forms omit ReportCard: assessment report cards are issued through Exams. Existing legacy ReportCard registry records remain supported; a label alone does not create an assessment snapshot. Electronic signing identity remains deferred. Revocation/public verification, approval notifications and bilingual certificate body templates remain future work.

Recorded verification: 16 registry/request/PDF integration tests, nine numbering/ownership unit tests and all 22 six-role browser cases passed. Both builds and targeted lint passed. Production signing identity remains deferred.
