# School settings

Authenticated users read school context and local appearance preferences. Only Administrator edits the shared profile, academic year, school timezone, currency, leave default or optional module enablement. Region/grading previews remain display preferences and do not certify compliance or modify assessment rules.

The saved singleton carries revision zero before initialization and increments on each save. The released UI supplies expectedRevision to prevent stale overwrites; legacy API callers can omit it. Refresh school settings reloads the saved profile and module enablement. Changed fields are audited by the server. Existing financial records block changing school currency; this is not currency conversion or a migration tool.

Timezone changes affect subsequent school-day interpretation and should be deliberately reviewed by the school. Historical records are not rewritten. Production delivery credentials and signing keys remain secure environment/server configuration, never exposed in the school settings screen.

Combined Roles/Settings verification: 19 integration tests, six unit tests and 19 six-role browser cases passed with no JavaScript exceptions; both builds passed. See [browser checks](../../../tests-e2e/platform/README.md). Deployment remains deferred.
