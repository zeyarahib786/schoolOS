# Biometric device registry

Administrator, Principal and Teacher manage the saved device registry. Accountant, Parent and Student cannot access infrastructure APIs or records. The released screen supports actual registration, manufacturer/serial/mode/location, saved inspection records, enabled/disabled state, search/status filters, pagination, CSV export and responsive details.

New devices begin Unknown. A manual Online/Offline inspection requires the actual past/current observedAt, saved expectedUpdatedAt and reason; history preserves previous registry/observed state. Manual inspection never creates a hardware sync timestamp or attendance punch. Duplicate names return 409 and stale edits cannot overwrite a later inspection.

No hardware connector is currently configured. The legacy sync endpoint explicitly returns 409 without changing device status, lastSyncAt or Attendance records. The screen no longer shows invented online counts, punch counts or successful sync notifications. Historical lastSyncAt is not treated as proof of current device connectivity.

Vendor hardware/protocol selection, credentials, secure device networking, enrollment, template storage, duplicate-punch handling and reviewed punch-to-attendance mapping remain unconfigured capabilities. This is a tested registry release, not a claim that physical biometric ingestion works. Use the actual Attendance register until a real connector is configured and verified.

## Verification

Seven integration tests verify infrastructure access, honest unconfigured sync, versioned/manual inspection times and duplicate-name conflicts. See [browser workflows](../../../tests-e2e/biometric/README.md). Deployment remains deferred.

Recorded verification: seven integration tests and all 21 six-role browser cases passed. Both builds and targeted lint passed. Physical hardware ingestion remains unconfigured.
