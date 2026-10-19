# CRM workflows

Run `SCHOOLOS_TEST_MODULE=crm node tests-e2e/helpers/run.cjs` after building the backend. The isolated fixture contains 105 prospective enquiries to verify pagination and actual write workflows. Reports live under `/tmp/schoolos-crm-*`.

The six-role suite contains 36 checks, including persisted contact editing, actual email-client recipients, reviewed bulk queue/replay, delivery history and pending cancellation. Fictional Resend settings are configured only inside this fixture; it runs the app without the delivery worker and never contacts Resend. Backend mocked-provider integration tests separately exercise sending and webhook reconciliation.

KPI regression coverage checks upcoming/due destinations. Bulk composer checks include rounded card containers and computed subject field dimensions. The administrator run saves a layout screenshot under `/tmp/schoolos-crm-Administrator-bulk-outreach.png`.

External social handoff tests mock `window.open`, clipboard and native sharing. They assert edited captions and original selected-file names without contacting or posting to social platforms. Real target-app behavior/account selection needs a controlled device check.
