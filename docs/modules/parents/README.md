# Parents enhancement release

The released renderer is `client/public/assets/js/modules/55-parents.js`, backed by the Guardians and Meetings APIs. The shared runtime adapter is `client/public/assets/js/core/97-parents-api-adapter.js`. Deployment remains deferred.

## Recorded guardian contacts and family access

- Responsive, paginated guardian directory with persistent search by guardian/child/admission/contact, class, portal and pickup filters, accurate counts and filtered contact CSV export. Spreadsheet formula cells are protected by the shared export helper.
- Leadership can create/edit guardian contacts, link multiple existing students by admission number, clear optional contact email/office notes, record custody instructions, pickup/financial responsibility, and save media/trips/medical consent as Granted, Declined or Not recorded. References remain unique; contact emails can be missing or shared.
- Existing active Parent login accounts are explicitly linked by school leadership. Contact email alone never grants access or creates an account. A Parent login has one guardian record with multiple children. Linking/editing/unlinking the family atomically updates the existing single-primary-parent `Student.guardianUserId` model, rejects competing ownership, and preserves the existing linked school records.
- Updates and account links require `expectedUpdatedAt`; stale writes are rejected. Guardian changes and recorded permissions are audited. There is no hard-delete UI for linked guardian/history records.
- Suspension blocks existing Parent JWT requests, password login and refresh. Restoring access does not fabricate a last-login timestamp; successful Parent login records it. Legacy Parent accounts linked only through Students remain supported; create/link their guardian contact explicitly to use this module.
- Guardian profile includes contact, recorded permissions, consent, linked children, conversation and manager-only edit/account/suspension controls. Parent sees their own guardian profile and children only; internal office notes are omitted from Parent API responses and UI. If primary Student ownership changes through another module, former ownership cannot expose the child's details in the guardian response.

## Conversations and meetings

Conversations load on demand rather than fetching one thread per guardian during startup. School leadership and Parent users can exchange persisted in-app messages; direction and sender are recorded, and stored messages/contact data render as escaped text. Broadcasts provide an explicit recipient preview and confirmation before atomically adding messages to targeted guardian conversations. Email/SMS delivery and read receipts are not claimed or exposed as working integrations.

Meeting views use a selected calendar date instead of a fixed sample date. Leadership publishes slots for existing teaching staff, books on behalf of a matching guardian/child, and reschedules/cancels bookings. Parent can browse available slots and book for their own linked child. Bookings atomically claim availability; same-teacher rescheduling is transactional. Teachers can publish only their own linked staff slots through the existing API. Other families' booked participants are excluded server-side. Placeholder video links have been removed, and the legacy reminder endpoint reports the unconfigured provider rather than falsely confirming delivery.

## Role policy

| Role | Parents module | Guardian writes | Conversations | Meeting API |
|---|---|---|---|---|
| Administrator / Principal | School directory | Create/edit/link/suspend | School threads and broadcasts | Full scheduling workflow |
| Parent | Own family profile | No | Own guardian thread, including replies | Open slots and own bookings; book own child |
| Teacher | Hidden; directory API denied | No | Guardian API denied | Open slots plus own teacher bookings; publish own linked staff slots |
| Accountant / Student | Hidden; directory API denied | No | Guardian API denied | Open slots only; cannot book/publish/manage |

Parent ownership is enforced by queries and individual record/thread checks, not just hidden buttons. Existing Student medical/document permissions remain unchanged. Custody text and consent fields record school instructions; automated per-guardian legal document or collection-policy enforcement is outside this release.

## Verification

Use the isolated [Parents browser runner](../../../tests-e2e/parents/README.md) and the [shared testing guide](../../testing/README.md). Current checks cover all six role boundaries, contact create/edit/clear, multiple-child account link/unlink and conflicts, denied family access, suspension/login/refresh, persisted replies, explicit broadcasts, booking/reschedule/cancel, filtered export and mobile layout. Students, Meetings and Auth regression suites are run together because this module affects their ownership/session behavior.

Temporary JSON, screenshots and logs are under `/tmp/schoolos-parents-*`; no environment secrets or production records are used by the isolated fixtures.

Validated locally: 70 client tests; 69 combined Parents/Guardians/Meetings/Auth/Students integration checks passed, followed by 19 guardian/privacy checks after the final note-redaction change. Authenticated Chromium passed 27 Parents checks and 54 Students regression checks across six roles in each suite. Desktop/mobile layouts were visually reviewed; both production builds and targeted backend lint passed. No captured runtime exceptions or unexpected HTTP failures occurred (deliberate permission/suspension 403 checks are recorded).

## Rollout and boundaries

Deploy the backend before the frontend. Guardian account/child transactions require a MongoDB replica set. Before applying this model to an existing database, inspect legacy indexes: the old unique `email_1` Guardian index must be removed during an approved deployment migration to allow shared or absent contact email; contact email no longer identifies portal ownership. Check existing non-null `userId` duplicates before adding the new partial unique `guardian_portal_unique` index. This development task does not modify production indexes or records.

Existing stored contact/consent values are retained; historical changes cannot be reconstructed. Additional guardian contacts are supported, but simultaneous separate Parent logins for the same child require a broader Student ownership model. Parent self-service contact corrections, guardian legal-document verification, appointment durations/timezone/overlap policies and configured external messaging/video providers remain later enhancements.

## Arabic directory, conversations and meetings

Guardian and linked-student display names use the shared locale display helpers; canonical names and exports stay unchanged. Arabic pickup authorization is explicit, and localized phone digits remain left-to-right in directory and profile views. Guardian references and emails retain their original order. Filters reapply localization after updating rows. Conversation headings, delivery-configuration guidance, known seeded broadcast subjects/audiences, meeting instructions and empty states switch to Arabic and back to English. Arbitrary authored message content is not automatically machine-translated.

Regression coverage includes actual markup for leadership and Parent meeting variants, localized names, phone direction, canonical record preservation and the six-role Parents browser suite.
