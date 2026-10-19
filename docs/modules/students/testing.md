# Students module: testing status

Historical verification notes from before the Students enhancement release. For current functionality and role policy, see [module overview](README.md).

The current production UI is preserved. Student list, profile overview, search, grade/fee filters,
pagination and CSV export use the authenticated roster loaded from MongoDB. The existing Add
student action persists the complete non-file intake form, then refreshes from the server. The
student profile now exposes an edit action to authorised write roles and persists those changes.
Server APIs support
read, create, update, delete, validation, parent ownership restrictions and server-authored audit
entries. Hard delete is deliberately not exposed in the production AppShell because deleting a
student can orphan linked school records.

The existing student document controls now use authenticated MongoDB GridFS storage. Upload,
preview/download, replacement and removal are persisted; supported files are limited to 4 MB and
approved PDF/image/Word MIME types. File bytes are not embedded in the Student collection.

Student roster summaries are live-derived: attendance percentage comes from submitted attendance
registers, fee status from linked invoices, and GPA from recorded exam results. Until the first
linked record exists, imported historical summary values remain as the fallback. A student with
linked school records cannot be hard-deleted; mark the record Inactive or Alumni instead.
Student-role dashboard reads require an explicit `studentUserId` link to the account. An unlinked
Student account sees no student record. The demo seed now creates `student@alnoor.ae` with the
same demo password as the other seeded users and links it to `ANS-1042` via `studentUserId`.
The targeted `npm run seed:student` command adds only this account/link and leaves existing
credentials unchanged. Parent reads continue to use `guardianUserId`. A linked Student can now read only
their own invoices, payments, published exam results, library loans and issued certificate
records. Draft exam marks are filtered before pagination for both Parent and Student.

Not yet safe to present as a complete school deployment:

- A formal retention/backup policy and production privacy review are still required before storing
  real student IDs, photos or medical records.
  Never upload real student IDs, photos, medical records or other sensitive school data.
- Demo passwords and seeded fictional records must be removed/rotated before a real school trial.
- Other modules still permit demo-data fallback; this verification covers the Students roster,
  not an entire school deployment.

Verification: Students isolated integration plus ownership unit suites (31 tests on the targeted run);
dashboard family-access integration test and the Fees/Exams/Library/Certificates regression suites
passed (84 tests across seven suites on the targeted run). The five seeded Administrator,
Principal, Teacher, Accountant and Parent dashboards passed a read-only local UI smoke.
The Parent-scoped roster also passed a simulated Student dashboard render and absence-student
lookup check. A real Student login now passed the read-only Dashboard browser smoke against the
configured database, including its own roster and fee statement. The latest isolated Student ownership and family-access run
passed 22 tests across two suites. Server unit suite (327 tests on the earlier full run),
client unit suite (18 tests), and client/server typecheck/build. Integration tests use an isolated
temporary MongoDB replica set; no integration test is run against the configured Atlas database.
