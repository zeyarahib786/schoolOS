# Enrollment CRM

Administrator and Principal manage the persisted prospective-family pipeline. The live adapter reads all API pages, creates enquiries, records follow-ups/activities and supports the existing archive/restore/conversion workflows. New leads accept the actual office or owner name rather than a fictional employee choice. Refresh reloads saved records; failed reads clear the cached roster instead of retaining demo data.

Social outreach prepares drafts, copies captions and opens external compose links. It does not publish to social accounts or report simulated posts as delivered. External mail clients remain separate from configured Resend delivery. Pipeline actions use saved record IDs, preserving the intended enquiry when lead names repeat. This remains an enrollment pipeline rather than a general-purpose enterprise CRM.

Local verification: 36 six-role browser cases cover role restrictions, more than 100 records, saved lead creation/follow-up, duplicate-name record identity, late-response drawer protection, escaped generated drafts and honest draft controls. Backend CRM integrations cover lifecycle endpoints. See [testing](../../../tests-e2e/crm/README.md).

Completed API responses only apply legacy UI transitions while the initiating module and drawer remain current. New enquiries open the actual returned record ID after hydration; a repeated name does not select an older enquiry.

## Saved account ownership and notification integration

Lead details provide Assign staff account, Complete follow-up and Send email via Resend. Assignees are active Administrator/Principal users; office labels on older/unassigned enquiries remain supported. Completing a follow-up records its outcome and clears the due date. New enquiries, assignment, stage changes, conversion and due reminders create recipient-scoped notifications. Follow-up dates are scanned by the notification worker; reminders are deduplicated by lead/date/recipient. Archived and Won leads are excluded. Won now requires conversion to an actual admission application, whose ID is saved on the lead; advancing the stage alone cannot create a phantom conversion.

Prospect emails use the saved guardian email, not an arbitrary destination or a required portal account. Duplicate queue requests use idempotency keys, and the worker revalidates contact details before delivery. Queued email appears in the activity timeline and provider results remain in Communication → External deliveries. The operator confirmed receipt of a live Resend email. Signed webhook setup and live delivery-status verification remain pending; AWS SNS live configuration is also pending. See [Notifications](../notifications/README.md).

CRM APIs additionally expose `GET /crm/assignees`, `POST /crm/:id/assign`, `POST /crm/:id/complete-follow-up` and `POST /crm/:id/email`, under the existing leadership-only access gate.

## Contact editing and real bulk email

Lead details → **Edit enquiry** updates student/guardian names, grade, contact email/phone, source and temperature. Edits require the version loaded into the form: a stale save returns 409 rather than overwriting newer changes. Archived and converted enquiries cannot be edited; manage converted applications in Admissions. Phone/email can be cleared deliberately. Duplicate student-name/phone identities are rejected, including blank-phone enquiries. Search includes guardian email.

**Bulk outreach** reviews actual saved guardian emails, excludes archived/Won leads, removes repeated addresses and shows missing-contact counts. Choose all active enquiries or due follow-ups, review the recipient checkboxes (maximum 100 per batch), edit the subject/body and choose **Queue emails via Resend**. There are no invented recipient addresses or bulk mail-client drafts. Each selected address receives a separate queued job; recipients are not disclosed to one another. The server rechecks every selected enquiry and reviewed email, reports skipped records and rejects arbitrary destinations. A saved batch identity protects retries/concurrent duplicate requests; after a connection failure, retry the same reviewed request. Reopening the composer creates a new intentional batch.

**Email delivery history** on each lead shows the latest 100 persisted jobs, subject, original destination, timestamps, status and failure codes. Refresh retrieves current status. Pending jobs can be cancelled; failed/uncertain jobs use the existing conservative retry endpoint, which rejects unsafe retries. Accepted is provider acceptance, not inbox delivery. Signed Resend webhooks reconcile Delivered/Bounced/Complained/Failed events. Call/WhatsApp/email-client actions remain external application links and only record initiation; social publishing remains manual.

API additions (Administrator/Principal):

- `PATCH /crm/:id`: complete editable contact fields and `updatedAt`; stage/owner/application fields cannot be changed through this route.
- `POST /crm/bulk-email`: `recipients: [{id, email}]`, `subject`, `body`, `idempotencyKey`; returns per-recipient statuses, skipped reasons and saved delivery IDs. Maximum 100 recipients.
- `GET /crm/:id/deliveries`: latest 100 delivery summaries without message bodies or idempotency secrets.

Verification: 114 frontend tests, 364 backend unit tests, 28 targeted API integration checks and 36 browser checks across six roles passed. Tests use fictional isolated records and mocked providers, including concurrency, replay safety, stale edits, recipient review, cancellation and role restrictions. Both production builds and backend lint passed. Live bulk delivery and live webhook reconciliation have not been exercised.

Individual enquiry drafts use the configured school name. Won means an application was created, so the draft explicitly avoids promising an admission offer.

The Scheduled KPI opens only upcoming follow-ups; Follow-ups due opens overdue/today groups. The Follow-ups tab resets to all groups. Bulk outreach uses the same rounded card treatment as the social composer, full-width styled fields, scrollable contact rows and selected scope controls. Browser checks verify the filtered destinations and computed field sizing.

## Social compose without a publishing provider

Social reachout supports Facebook, Instagram, LinkedIn and X. Captions are editable and escaped; changing a caption to an empty value does not silently restore sample text. Enter an optional HTTPS school profile/page URL for each platform; links are restricted to the corresponding platform domain. These URLs and captions are session drafts, not connected/authenticated accounts. Static demo-school links have been removed.

With selected media and supported file sharing, **Share via device** invokes the device share sheet with the original photo/video File objects and that platform's edited caption. Choose the intended app, confirm the school's active account and finish posting there. SchoolOS cannot select a native share target/account or guarantee that a receiving app accepts both text and media. Cancelling the share sheet does not open another site or claim a published post. See [Web Share API](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/share).

**Compose on** always opens the platform/school profile synchronously and copies the caption when clipboard permission allows it. X's default web intent prefills its caption. Facebook, Instagram and LinkedIn web pages do not receive local file attachments from these links: paste the caption and attach the selected media. **Share via device** is a separate optional action; selecting a platform never automatically invokes the operating system app picker. Each selected media item has a download button. Supported selections are images/videos, up to eight files and 50 MB per file. Media stays in the browser; no external upload or actual publishing is performed. Removing a file releases its preview URL.

No account passwords/API credentials are needed for this manual workflow; users sign in to their school account on the external platform. No Published status is inferred from opening a composer or returning from the share sheet. Frontend tests cover caption fidelity, file handoff, cancellation, invalid profile domains, escaped content and media cleanup; browser tests mock external handoffs to avoid real posts.
