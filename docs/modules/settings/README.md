# School settings

Authenticated users read school context and local appearance preferences. Only Administrator edits the shared profile, academic year, school timezone, currency, leave default or optional module enablement. Region/grading previews remain display preferences and do not certify compliance or modify assessment rules.

The saved singleton carries revision zero before initialization and increments on each save. The released UI supplies expectedRevision to prevent stale overwrites; legacy API callers can omit it. Refresh school settings reloads the saved profile and module enablement. Changed fields are audited by the server. Existing financial records block changing school currency; this is not currency conversion or a migration tool.

Timezone changes affect subsequent school-day interpretation and should be deliberately reviewed by the school. Historical records are not rewritten. Production delivery credentials and signing keys remain secure environment/server configuration, never exposed in the school settings screen.

Combined Roles/Settings verification: 19 integration tests, six unit tests and 19 six-role browser cases passed with no JavaScript exceptions; both builds passed. See [browser checks](../../../tests-e2e/platform/README.md). Deployment remains deferred.

Shared detail/form navigation uses the full available workspace rather than a narrow side panel. On desktop the sidebar remains visible and usable; the underlying main workspace is inert until the detail page closes. The shared scrim is hidden, so navigation is not dimmed. RTL preserves the sidebar on the opposite side; at the existing 860px mobile breakpoint details use the full viewport. This applies to every screen using the shared `openDrawer` / `detailDrawer` / form helpers, including Login accounts. Close/Escape returns to the underlying workspace; sidebar navigation closes the detail view normally. Independent document previews and other dedicated modal dialogs retain their own behavior.


The shared header includes Back on every details/form page. Back restores the previous step's live DOM, wizard values, event listeners and scroll; root Back returns to the workspace. Close/Escape and sidebar navigation clear history. Refreshing the same read-only page replaces its entry. History is bounded to 20 steps, scoped to the signed-in user/module, and never persisted. Password forms and one-time credentials are not retained; successful form-to-detail transitions skip the completed form. Account directories refresh safely when restored so newly provisioned records show their current link state.

Shared pages use themed section cards, stronger headers, responsive spacing, accessible focus indicators and consistent footers. Login accounts uses responsive account cards and a search/class filter toolbar with matching-record counts. The API filters all matching students and explicit guardian links by exact class before applying each group's 50-row limit; employee search stays school-wide. Class choices come from saved student grades and active class sections, independently of the search query. Filter state survives entering a form and returning with Back.
