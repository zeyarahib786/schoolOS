# Notifications

The bell opens a persisted personal inbox for all six authenticated roles. `/api/v1/inbox` provides 25-row history pages, an unread filter and recipient-scoped unread counts. Individual/all-read actions persist across reloads. Neither administrators nor other users can read or mark another account's notifications. The separate Approvals control and Module alerts retain the existing live module summaries.

The client refreshes the inbox/badge every 10 seconds while the page is visible. Updates do not replace unrelated open forms; late account/page responses are discarded. This is polling, not WebSocket push. The worker checks due CRM follow-ups once per minute in batches of 500; database event keys prevent duplicate reminders, and processed markers prevent older batches starving later tasks. Private message recipients receive an inbox notification without exposing the message body to other accounts. Read notifications and message read receipts are separate actions.

CRM events cover new enquiries, staff-account assignment, stage changes, conversion and due follow-ups. Assigned leads notify their active owner; unassigned leads or unavailable owners fall back to active school leadership. CRM notifications open their exact saved lead. Only existing Administrator/Principal accounts can be CRM assignees, consistent with CRM access policy. Notification history is retained if the source record is later removed.

## External delivery

Resend is the email provider. Existing provider acceptance, signed webhook reconciliation, conservative retries and cancellation are maintained. CRM prospect email can be queued without a Parent portal account. The worker rechecks the saved guardian email and lead availability before sending. Idempotency keys prevent double queuing; email activity stores the queue reference. Queueing/acceptance is not a delivered receipt. The Communication External deliveries screen tracks provider results.

Resend's documented product is an email API, not an SMS API: [official introduction](https://resend.com/docs/introduction). The user selected AWS SNS for SMS. Local `SMS_PROVIDER=aws-sns` records that selection, while sending stays disabled until notifications are enabled and the AWS region/access and sender are configured. Selecting Resend alone never activates SMS. Never substitute fake SMS success or silently choose a paid provider.

The operator configured Resend and confirmed receipt of a live email. `RESEND_WEBHOOK_SECRET` is still needed for authenticated delivery events; it is not required to send email. AWS SNS live configuration remains pending. Do not put real credentials in source or documentation. See [deployment configuration](../../setup/deployment.md#optional-external-delivery-and-signed-school-pdfs). No real external recipient is contacted by the test suites; actual delivery requires a configured account, verified domain and controlled recipient.

## Verification

- `npm --prefix client test` covers account/page response races and preserved drafts.
- `npm --prefix server run test:integration -- --runTestsByPath tests/crm-inbox.test.ts tests/crm.test.ts tests/notifications.test.ts tests/communication-enhancements.test.ts` covers privacy, persistence, assignment, due-event deduplication and mocked Resend sending/contact changes.
- `SCHOOLOS_TEST_MODULE=crm node tests-e2e/helpers/run.cjs` covers six-role inbox access, CRM assignment/completion, exact-record links and Arabic UI, plus existing CRM workflows. Uses isolated fictional data.

API routes: `GET /inbox?page=1&unread=true`, `POST /inbox/:id/read`, `POST /inbox/read-all`. All require authentication. Durable models: `InboxNotification`, `CrmLead`, `NotificationDelivery`, `CrmEmailBatch`. CRM also provides reviewed bulk email and per-enquiry delivery history; see [CRM](../crm/README.md).

Latest local verification: 106 frontend tests, 364 backend unit tests, 28 targeted integration checks and 34 six-role CRM/inbox browser cases passed. Both production builds, backend lint and whitespace checks passed. No unexpected browser JavaScript exceptions or HTTP 500 responses were recorded. Email and SMS provider calls were mocked; this does not constitute live delivery verification.

LMS now adds assignment-publication and scheduling-review inbox events. The same backend worker runs LMS scheduling/publication fan-out approximately once per minute, independently of whether external delivery is enabled. Teacher email requests still require office approval. See [Learning automation](../lms/README.md#teacher-automation-first-delivery).

The minute worker also runs opt-in pending-homework reminders and confirmed same-day attendance alerts. These reuse recipient-scoped inbox events and the existing external request approval/dispatch rules. Trusted server automation identities deduplicate repeated events independently of which staff member last saved the source record. Delivery rows may retain `lmsReminder`, `lmsReminderDue`, `lmsReminderStage`, `attendanceRecord` and `attendanceStatus` for last-moment eligibility checks; public notification inputs cannot supply those trusted contexts. See [Learning reminders](../lms/README.md#pending-homework-reminders) and [Attendance alerts](../attendance/README.md#opt-in-confirmed-guardian-alerts).
