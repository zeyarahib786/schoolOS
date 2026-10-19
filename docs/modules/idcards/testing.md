# ID Cards module status

The live client exposes **ID Cards** to Administrator, Principal, and Teacher
only. It uses the existing server-backed card registry for both Students and
Staff. Parent and Student accounts cannot see this internal registry.

Supported school workflow:

- Issue one Active card for an Active student or staff member.
- Report an Active card Lost or Revoke it.
- Issue a replacement after Lost/Revoked; the new record links to the prior
  card through `replaces`.
- Filter the registry by holder type and status.
- View serial, holder, issued/expiry dates, status, and replacement lineage.

Safeguards:

- The server validates that a holder exists in the requested collection and is
  Active; inactive students/staff cannot receive a card.
- One Active card per holder is database-enforced with a partial unique index.
- Lost/Revoke updates are atomic: competing actions permit exactly one success.
- Expiry dates must be real YYYY-MM-DD calendar dates in the future.
- Issue, Lost, and Revoke actions create server audit-log entries.

Verification on 2026-10-01:

- ID Cards isolated integration suite: **12/12 tests passed**. It covers role
  gate, student/staff polymorphic holders, serials, holder validation, expiry
  checks, duplicate-active protection, replacement chain, filtering, inactive
  holder rejection, audit events, and concurrent lifecycle transitions.
- Full backend regression: **108/108 suites, 751/751 tests passed**.
- Client unit suite: **18/18 tests passed**; client production build and
  server typecheck passed.
- Real headless Chromium smoke passed for Administrator: authenticated login,
  live navigation, live list/filter read, and issue-card UI routing. The issue
  request was intercepted, so no school-database card was created.
- Real Chromium smoke passed for Parent: ID Cards navigation was absent as
  required, with zero database writes.

Operational boundary: the module maintains the authoritative card registry and
replacement history. It does not print a physical card or integrate a card
printer; printing remains the school’s approved physical card-production step.
