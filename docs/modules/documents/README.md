# Documents

All signed-in roles consult the shared school policy/form/circular/guideline registry and download attached PDFs. Administrator, Principal and Teacher publish. The released workspace supports current/history views, full-register search/category filters, server pagination, CSV export, escaped details and actual PDF preview/download.

Publishing uses a replica-set transaction: a shared code counter serializes publishers, the prior current flag is superseded and the new immutable metadata/PDF-reference version commits together. A failed/stale publication leaves the previous current version intact. The partial unique current-code and code/version indexes remain. Optional expectedVersion protects reviewed republication; the UI supplies zero for a new code or the displayed current version for a reviewed replacement, plus publicationReason. An already existing code must be opened from its current record for republication.

PDF upload remains limited to 8 MB and header/EOF validation. GridFS files upload before the metadata transaction and are removed if publication fails without a saved reference. Earlier version PDFs remain downloadable. Republishing metadata without uploading a PDF creates a paper-only version; it does not silently copy or replace the prior file. Authenticated downloads are private/no-store. Browser previews use authenticated Blob URLs rather than public file links.

Document approval schedules, targeted audience visibility, malware scanning, signing uploaded PDFs, acknowledgement tracking and retention rules remain separate capabilities. This shared library intentionally has no private per-student document records; use Students for those. See [historical verification](testing.md) and [current browser workflows](../../../tests-e2e/documents/README.md). Production deployment remains deferred.

Recorded verification: all 12 integration tests and 21 six-role browser cases passed, including actual PDF upload/preview/download and preserved old versions. Both builds and targeted lint passed.
