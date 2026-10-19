# Roles and access

The saved matrix covers all 37 released workspaces. Administrator manages visibility; other roles can read their own grants. Missing keys are added from system/base-role defaults while preserving every saved decision. Initialization leaves existing version timestamps unchanged. Full module navigation includes owned self-service modules such as Helpdesk and Surveys; optional modules still require school enablement.

Permission reviews support expectedUpdatedAt and reason, append actor/time/module/enabled history and preserve Administrator recovery access to Roles/Settings. The released UI always supplies version/reason. CSV export escapes spreadsheet formulas; custom names are escaped in table headers. Navigation grants do not override API action roles or ownership restrictions.

Custom roles are reusable permission templates. Account roles remain the six supported roles; no user-assignment API or arbitrary custom-role authentication is claimed. Direct API authorization continues to use established server roles. Legacy saved grants are preserved even where the API now denies an action.

Combined Roles/Settings verification: 19 integration tests, six unit tests and 19 six-role browser cases passed with no JavaScript exceptions; both builds passed. See [browser checks](../../../tests-e2e/platform/README.md). Deployment remains deferred.
