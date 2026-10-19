# Communication

Released interface: `client/public/assets/js/modules/61-communication.js`. Notices use `server/src/modules/announcements/`; private conversations use `server/src/modules/messages/`.

## Workflows

- Search/filter/paginate notices. Authors save a draft, edit it with a saved version, preview the current audience and submit for approval.
- Administrator/Principal reviewers publish a pending notice or return it with a review note. Teacher notices require reviewer approval; stale versions/transitions are rejected. Published content cannot be silently edited as a draft.
- Audience choices correspond exactly to backend visibility: All, Staff, Parents and Students. Staff can oversee published notices in every audience. Preview counts active portal accounts, excluding suspended Parent accounts; it does not estimate from student counts or claim delivery/read receipts.
- Every authenticated role can compose private messages using an existing active recipient account email. Bodies/subjects are rendered as escaped text. Sending to self, inactive/nonexistent recipients or suspended Parent accounts is rejected.
- Inbox, Sent and personal Archived views load the complete paginated server records. Search, pagination, loading/error/retry and empty states are explicit.
- Opening an incoming message persists the first recipient read timestamp. Senders cannot mark the recipient's message read. Reply records retain the originating message ID and stay between the original participants.
- Archive/restore affects only the current user's view; it neither deletes the record nor archives it for the other participant. Saved messages and read/archive states survive reload.

## Role policy

| Role | Notices | Private messages |
|---|---|---|
| Administrator / Principal | All visible statuses; draft authorship/editing; review/publication | Own conversations only; no oversight of other people's bodies |
| Teacher | Published notices plus own drafts/pending notices; create/edit/submit own drafts | Own conversations |
| Accountant | Published notices with staff oversight | Own conversations |
| Parent | Published All/Parents notices | Own conversations; suspended portal access is denied |
| Student | Published All/Students notices | Own conversations |

Non-parties receive 404 for guessed message read/archive/reply IDs, including Administrator. Read status belongs to the recipient; archive state belongs to each participant separately.

## Verification and operation

Integration suites: `server/tests/communication-enhancements.test.ts`, `messages.test.ts`, `announcements.test.ts`. Browser runner: [Communication E2E](../../../tests-e2e/communication/README.md). It uses actual forms and APIs for drafts/editing/audience preview/review/publication, inbox/read/replies/archive/restore/new messages, reload persistence, literal HTML safety and mobile views across all six roles.

The added review note, reply link and archive array are additive; legacy messages without an archive array remain visible in normal inbox/sent views. No historical read state is invented.

AWS deployment is deferred. This is in-app portal communication. Configured external delivery is described below. WhatsApp, attachments, rich-text editing, automatic retries, multilingual translation and notice read acknowledgements remain future work. Audience visibility counts are not delivery guarantees.

Local release verification: 50 browser workflow cases passed across all six actual authenticated roles, with no JavaScript runtime exceptions. Shared checks passed: 69 integration tests across eight suites, 24 targeted backend unit tests, 78 client tests, both production builds and targeted backend lint. Students also passed its 54-case six-role browser regression. Expected permission denials from unrelated background hydration endpoints are recorded separately; this is not an AWS deployment result. The Vite large-chunk advisory was present at that historical run; the newer shared readiness regression resolves the initial entry-bundle warning.

## External delivery enhancement

The Communication screen now includes External deliveries for Administrator, Principal and Teacher. Queue entries retain recipient/channel, status, attempts and provider errors; teachers submit for office approval. Verified Resend events distinguish Delivered, Bounced and Complained from provider Accepted. Cancellation and conservative retries preserve idempotency and ownership. Parent, Student and Accountant cannot queue external messages. Portal announcements are not automatically sent externally.

Production Resend secrets, authorized PDF signing identity and SMS provider selection are explicitly deferred by the user. See [integration configuration](../../setup/deployment.md#optional-external-delivery-and-signed-school-pdfs). No real recipients were contacted. Integration checks live in `server/tests/notifications.test.ts`; 35 delivery/PDF browser cases passed across all six authenticated roles, with no JavaScript exceptions; nine focused integration tests, both builds and targeted lint passed. This is local fixture verification, not live provider delivery.

Private portal messages now create a saved personal-inbox event for the recipient. The event links to the private record and exposes only its subject to that recipient. Other accounts, including administrators who are not parties, cannot read the event. CRM prospect emails share the existing Resend queue/delivery history; these recipients need not have portal accounts. See [Notifications](../notifications/README.md) for provider setup and SMS limitations.
