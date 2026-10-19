# Visitors

The released front-desk workspace shows saved visits, a current CheckedIn count, contact/host/badge details, status/search filters, pagination, CSV export and responsive details. Administrator, Principal and Teacher manage it. Accountant, Parent and Student cannot access security/front-desk APIs or records.

Admission requires explicitly recorded host approval. Staff records name, purpose, confirmed host, optional contact/organization, actual issued badge, identity-check confirmation and desk notes. No identity document number or scanned ID is required. A partial unique index prevents two active visits from sharing an issued badge; departure releases it for reuse. Legacy badges remain unknown rather than invented.

Correcting visitor metadata requires saved expectedUpdatedAt and reason, preserves previous details/history and leaves physical timestamps unchanged. Changing the host requires explicitly confirmed approval from the new host. Checkout records actual server departure time, staff identity and confirmation history; current status/version conditions prevent duplicate or stale checkout. The UI requires a reason/version; the legacy checkout API still permits omitted version/reason with atomic status protection.

The current list reflects staff desk confirmations, not live tracking or a guaranteed emergency headcount. Host-contact delivery, appointment pre-registration, printed badge generation, external access control, photo capture and a retention/deletion policy remain future capabilities. No badge printing or SMS is claimed by the screen. Deployment remains deferred.

## Verification

See [browser workflows](../../../tests-e2e/visitors/README.md). API tests verify whole-module privacy, host confirmation, active badge collisions/reuse, corrections and concurrent/stale checkout.

Recorded verification: 10 integration tests and all 21 six-role browser cases passed. Both builds and targeted lint passed.
