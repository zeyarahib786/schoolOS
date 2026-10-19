# Audit log

Administrator and Principal inspect the server-owned activity stream. The released screen uses actual server pagination, literal action search, exact module/severity filters, school-timezone date boundaries, detailed actor/time/event references and responsive tables. Other roles cannot read the API or export.

Filtered export fetches every matching page, safely quotes spreadsheet cells and records the fixed server-owned export acknowledgement. Audit actions and actors are chosen by the server; no endpoint accepts arbitrary audit creation, editing or deletion. No cryptographic tamper resistance against database administrators is claimed. The stream records implemented module events, not every read or external provider event.

Verification: 12 integration tests and 16 six-role browser cases passed with no JavaScript exceptions; both builds passed. See [browser instructions](../../../tests-e2e/audit/README.md). Production deployment remains deferred.
