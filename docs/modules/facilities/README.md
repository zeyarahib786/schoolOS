# Facilities

The released screen uses the saved venue registry and reservation ledger, with full booking pagination, search, CSV, details and responsive tables. Administrator, Principal and Teacher add/review facilities and reserve/cancel venues. Accountant has read-only staff access. Parent/Student cannot read private reservation purposes or staff contact details; published events remain available through Calendar.

Facility reviews require expectedUpdatedAt and reason, preserve previous name/type/capacity/availability in history, and increment the same venue revision used by reservation transactions. Maintenance blocks new reservations, including event reservations; existing reservations remain visible for explicit review. Review does not silently cancel or move an existing event.

Real calendar dates and HH:MM intervals are validated. Transactions serialize on the venue before testing overlap. Back-to-back reservations remain valid. Standalone cancellations require version and reason, retain history and release the slot once. Active calendar-linked reservations must be cancelled through their event so both records remain consistent. External booking invitations, recurring reservations, attendee capacity enforcement and facility maintenance work orders are future capabilities.

Verification: 24 combined Facilities/Calendar integration tests and 15 six-role browser cases passed with no JavaScript exceptions. Both builds passed. See [browser instructions](../../../tests-e2e/facilities/README.md). Production deployment remains deferred.
