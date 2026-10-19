# Library

The released workspace loads the full saved catalogue, loans and requests with search, status filters, pagination, CSV exports, safe details and mobile layouts. Catalogue counts are actual stock; family circulation is scoped to linked children. Accountant can read the catalogue but has no loans/requests or operational controls. Administrator, Principal and Teacher manage circulation.

Add/restock requires an ISBN/catalogue reference, title, author and quantity. Existing references add copies only when title/author match. Metadata and shelf corrections require a current version and reason. Stock is changed by arrivals, issue and return, not arbitrary catalogue editing.

Issue uses an active borrower, availability and borrowing allowance checked in one transaction. Per-student serialization prevents concurrent loans bypassing duplicates or allowance. KG/Grade 1 allowance is 3; other grades 5. Return and stock restoration commit together and cannot repeat. Renewals require a future extension, current version and reason, with up to 3 renewals and dated history. Date-only due dates end in the configured school timezone. These explicit allowance/renewal defaults are not yet school-configurable policy.

Parent/Student chooses a linked active child when requesting; multi-child requests are never silently attributed to the first child. Pending requests serialize to prevent duplicates. Staff fulfilment actually issues a linked loan and consumes stock in the same transaction. No-stock/allowance failures leave the request pending. Families may cancel pending requests with a reason; staff may reject/cancel. Requests do not reserve a copy ahead of issue.

Overdue reminders create actual private portal messages for active, unsuspended linked recipients. Reminder recording and message creation commit together, with a 24-hour repeat guard. No SMS/email delivery is implied. Fine policy, book-copy barcodes, lost/damaged stock dispositions and queue-position reservations remain future capabilities.

## Verification

20 integration cases passed, including concurrent duplicate issue/return, allowance across different titles, real request fulfilment, child authorization, stale reviews/renewals and reminder deduplication. All 44 six-role browser cases passed with zero JavaScript exceptions; workflows cover real arrival/restock/review/issue/renew/return/request/fulfil forms and persisted reloads. Both builds and targeted lint passed. [Repeatable browser checks](../../../tests-e2e/library/README.md) use fictional local records. Production deployment remains deferred.
