# Roles and access

The saved matrix covers all 37 released workspaces. Administrator manages visibility; other roles can read their own grants. Missing keys are added from system/base-role defaults while preserving every saved decision. Initialization leaves existing version timestamps unchanged. Full module navigation includes owned self-service modules such as Helpdesk and Surveys; optional modules still require school enablement.

Permission reviews support expectedUpdatedAt and reason, append actor/time/module/enabled history and preserve Administrator recovery access to Roles/Settings. The released UI always supplies version/reason. CSV export escapes spreadsheet formulas; custom names are escaped in table headers. Navigation grants do not override API action roles or ownership restrictions.

Custom roles are reusable permission templates. Account roles remain the six supported roles; no user-assignment API or arbitrary custom-role authentication is claimed. Direct API authorization continues to use established server roles. Legacy saved grants are preserved even where the API now denies an action.

Combined Roles/Settings verification: 19 integration tests, six unit tests and 19 six-role browser cases passed with no JavaScript exceptions; both builds passed. See [browser checks](../../../tests-e2e/platform/README.md). Deployment remains deferred.

## Managed login accounts and My profile

Administrator opens **Settings → Login accounts** (also available from **My profile**) and searches existing Student, Staff or Guardian records. Generate login creates a unique role-prefixed login ID, cryptographically random temporary password and the corresponding school-record link in one transaction. Teacher/Principal/Accountant accounts require a Staff record; Student and Parent roles derive from their record type. Administrator credentials cannot be generated/reset through this tool. The six established base roles remain authoritative.

Credentials appear once for private handover and may be copied; no plaintext password is persisted, emailed automatically or included in an audit entry. Temporary passwords expire after seven days. First sign-in requires setting a personal password before school data APIs can be accessed. Users may sign in using either their generated ID or account email. When no login email is explicitly supplied, a storage-only `accounts.schoolos.invalid` address is generated; it is neither an accepted email login nor an email delivery destination. Contact email is not silently copied into a new account. Existing email accounts are never overwritten: use existing Students/Staff/Parents portal-link workflows to associate them.

Reset credentials issues a new temporary password and immediately revokes old sessions. Changing one's own password checks the current password and revokes every session, requiring a fresh login. Suspended/inactive records cannot be provisioned; a guardian cannot silently overwrite a child's existing parent link. Account provisioning is single-record only; bulk credentials and email invitations are not implemented.

Every signed-in role opens **My profile** using the sidebar avatar button. It displays the current account, linked staff identity, own teaching assignments, or owned student/child records. School-managed information is read-only; request corrections from administration. Personal records never appear on the public login page. Existing accounts continue to work without a forced migration.

Verification: `server/tests/auth-accounts.test.ts` covers administrator-only provisioning, transactions, duplicates/concurrency, link ownership, expiry, forced password setup, revocation and six-role profile privacy. The existing [platform browser suite](../../../tests-e2e/platform/README.md) exercises sidebar profiles for all six roles and admin creation → first password setup → student sign-in. Tests use isolated fictional records, not live accounts.

Login accounts also supports a combined text/class filter. Students and guardians linked through `Guardian.studentIds` are class-scoped; employees remain explicitly labelled school-wide. No matching class returns an empty student/guardian result instead of falling back to all records. Back returns to the selected filters; a returned directory refreshes current account-link state without retaining passwords.

### Administrator corrections

Administrator My profile shows management guidance rather than telling the administrator to contact themselves. **Edit account details** is available on the administrator's own profile and on linked account cards in Login accounts. It corrects login name/email with an explicit reason and optimistic timestamp, preserves login ID/role/password, rejects duplicate emails and revokes all sessions if the login email changes. Self email correction requires signing in again. These account actions are Administrator-only; profile records remain private and ordinary users retain the read-only/contact-administration note.

School data uses its existing module editors: Students → record → Edit record, Staff & HR → employee → Edit employee, Parents → guardian → Edit guardian. Contact/academic records are distinct from login identity; correcting an email in a school contact record does not silently change credentials. Integration tests explicitly verify administrator edits to student identity/address, employee phone/designation and guardian phone/name appear in their linked users' My profile. No live user records are modified by these tests.

### Permanent role-specific login IDs

New student accounts use school code + `STU` + issuance academic-year start + class/section + roll number: `Grade 7 · F`, roll `19`, academic year `2026-2027` → `ANS-STU-2026-7F-019`. Class and intake year distinguish repeated rolls. Duplicate issued IDs are rejected without random suffixes. Existing IDs remain unchanged, including after promotion. Employees and guardians continue using permanent references: `EMP-209` → `ANS-EMP-209`, `GRD-1001` → `ANS-GRD-1001`. Configure the stable `SCHOOL_LOGIN_CODE` (2–12 ASCII letters/digits, starting with a letter; fallback `SCH`).

In Login ID + real email mode, saved own emails appear in a dropdown with an option to enter another email. Students use the separate `studentEmail` field, editable in Students → Edit student; guardian contact email is never suggested as student email. Staff and guardians use their own record email. Login ID only remains the default; shared/duplicate login emails are rejected.

Login IDs are stored canonically in lowercase and displayed uppercase in credential handovers; either case works. Once issued, the ID does not change when class, name, contact information or record reference changes. `PortalLoginId` retains a unique issuance reservation, so deleting/recreating a person/account cannot recycle a previously issued ID. Existing random IDs and email logins are retained; no live account renaming or password reset occurs as part of this change. The structured pattern applies to new provisioning.

All six roles appear on the sign-in screen. `/auth/login` requires `{email,password,role}`; the selected role must match the saved account role after password verification. The selector cannot grant or change permissions. Missing/unknown roles fail validation, a wrong selected role receives no tokens, and all existing role/ownership checks remain in force. Registered email remains an alternative to login ID. The login subtitle no longer describes the screen as a role-switching demo. First-party smoke/fixture clients supply the required role; historical prototype snapshots remain historical.


### Optional email during provisioning

Generate login first previews the server-derived permanent school login ID. **Login ID only (recommended)** is the default for every record type; no email is needed. **Login ID + real email** reveals an optional alternate login email with role-specific guidance: the student's own mailbox, an existing official employee mailbox, or the guardian's personal mailbox. Recorded employee/guardian email can prefill this field only when the administrator explicitly chooses the email method. Hidden email values are never submitted.

A real email must be unique across login accounts. Students cannot use the guardian contact email recorded on their Student or linked Guardian record. Student/guardian/employee contact fields remain unchanged when provisioning. Duplicate email errors remain visible in the form. No mailbox or recovery flow is created by this screen, and no message is sent automatically. Do not invent patterned addresses on a real domain: creating those mailboxes requires the school's email provider. Use the permanent role-specific login ID pattern for consistency; personal emails retain the holder's real address. Handovers include the assigned role and whether a real login email was provided.
