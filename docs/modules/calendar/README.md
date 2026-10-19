# School calendar

The released month grid and agenda load saved audience-scoped events with search, month/status filters, pagination, details and CSV export. Administrator, Principal and Teacher create/review/cancel events. Accountant reads events. Parent reads All/Parents/Students events; Student reads All/Students. Explicit audience filters intersect that scope rather than overriding it. Internal review history is removed from read-only payloads.

Event dates are real YYYY-MM-DD calendar days. An optional venue and HH:MM interval reserves the same ledger used by Facilities. Event creation and reservation now commit in one transaction; concurrent venue reservations serialize on the facility record. Missing/unavailable venues cannot leave a partial event. A saved venue reserves only its recorded interval, not every facility on campus.

Corrections require current `expectedUpdatedAt` and reason, retaining previous title/description/date/audience. A venue-linked reserved day cannot be changed through ordinary metadata correction: cancel and create a replacement. Cancellation preserves the event and booking history while atomically marking the booking Cancelled and releasing its interval. A stale cancellation rolls back the booking change. Cancelled events remain visible through status filtering, and no silent restore/resend occurs.

The calendar does not claim automatic exam/bus planning, external invitations or reminder delivery. Recurrence, multi-day events, RSVP, editable venue intervals and calendar-provider synchronization remain future capabilities. Production deployment remains deferred.

## Verification

See [browser workflows](../../../tests-e2e/calendar/README.md). API tests cover audience privacy, shared venue overlap, versioned correction/cancellation, venue reuse and stale-cancellation rollback.

Recorded verification: 11 Calendar and eight Facilities regression integration tests, nine overlap unit tests and all 21 six-role browser cases passed. Both builds and targeted lint passed. Calendar-day display preserves the saved day across timezones.
