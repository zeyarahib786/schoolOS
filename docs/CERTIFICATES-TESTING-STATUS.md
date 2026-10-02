# Certificates testing status

The existing Certificates page retains its layout and form. Connected mode lists only
server records, resolves the selected student by roster reference, issues directly or submits
for approval through `POST /certificates`, and refreshes from the server. Pending requests
can be approved or rejected through `POST /certificates/:id/decision` by an Administrator
or Principal, with server audit events. Transfer, Bonafide, Character,
Study, ReportCard and Provisional remain distinct stored types; nonexistent students
cannot receive a certificate record.

The backend stores a numbered issuance record, not a signed document. Connected-mode
downloads are print-ready but clearly marked unsigned copies based on stored records.
Report-card and fee downloads in the student-profile detail drawer use published
assessment and invoice data, rather than demo marks or fixed fee amounts. Pending
approval is server-backed. Digital signatures and public online verification are not
implemented; a school office must sign and seal a printed copy before official release.

Verification: Certificates API integration suite passed (10 tests, isolated temporary
MongoDB), including pending approval/rejection and family privacy. Server typecheck and
client build passed. A single persistent demo Bonafide record was issued through the live API
for fictional seeded student `ANS-1042` (`BF-2026-0002`, purpose explicitly labels it a
demo/manual-signature test). Read-only Administrator and Student browser smoke then passed
with no runtime errors or Dashboard writes, including the Student's real issued-record
download. A fixture-only browser check also covers the print-copy formatter independently.
Do not treat an unsigned copy as an official signed certificate for school use.
