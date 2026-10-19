# Transport

The released workspace loads all saved routes, permitted vehicles and staff incidents with search, pagination, CSV export, responsive details and dated operational history. There are no simulated GPS positions, boarding counts or invented on-time percentages. GPS device references may be stored; telemetry remains unconfigured. The legacy map entry explicitly reports that no GPS feed is connected.

Administrator, Principal and Teacher manage transport. Student uses `studentUserId`; Parent uses `guardianUserId`. Family route payloads contain only linked riders and their pickup-stop assignments, without other students' names or internal history. Vehicle reads are restricted to assigned routes. Accountant receives no transport routes/vehicles/incidents. Families can see shared route stops and their own driver's contact details.

Vehicle records include real registration, driver contact, capacity, optional insurance/licence expiry dates and maintenance/release review history. Versioned edits cannot reduce capacity below assigned riders. Maintenance and all associated route depot updates commit together. Departures reject configured expired documents and maintenance vehicles; missing expiry dates are explicitly displayed as unconfigured rather than treated as a compliance certification.

Route creation serializes vehicle assignment. Rider assignment serializes the student and vehicle, enforcing one route per student and actual capacity during concurrent requests. Saved pickup stops are explicit. Rider removal requires a current version and reason. Plans are edited at depot; stops used by riders cannot be silently removed. Routes with riders cannot be archived, and restore protects against the vehicle being reused by another active route.

Operational Depot/On road/Delayed updates require a current version and staff note. They are manual dispatch records, not measured vehicle movement. Incidents preserve occurred/reported times, severity, description, actual resolution and versioned review history. Future occurrence times are rejected. GPS-provider integration, trip-specific boarding, parent pickup authorization, emergency delivery and measured punctuality remain future capabilities.

## Verification

14 isolated integration tests cover original operations plus concurrent cross-route/student and vehicle allocation, private family rosters, maintenance, versioned reviews, capacity/expiry guards, archive/reuse and incident resolutions. All 53 six-role browser cases passed with zero JavaScript exceptions; workflows exercise actual vehicle/route/rider/operation/incident/maintenance/archive forms and persisted reloads. Shared Library/Transport ownership and validation suites passed 17 unit tests. Both builds and targeted lint passed. See [Transport E2E](../../../tests-e2e/transport/README.md). Deployment remains deferred.
