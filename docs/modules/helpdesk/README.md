# Helpdesk

The released screen provides saved support tickets, scoped search/status filters, full pagination, CSV, responsive details and conversations. Every authenticated role can raise a ticket and reply to tickets they own. Administrator, Principal and Teacher manage the school support queue. Other roles see only their own requests. A minimal active-staff assignee directory supports Teacher assignment without exposing unrelated HR records.

Ticket transitions enforce Open → Assigned → Resolved → Closed, with unassignment Assigned → Open and reopened resolution Resolved → Assigned. Closed is terminal. Assignment requires active staff; Resolved requires resolution notes. Atomic status checks remain for legacy API calls, and the UI always supplies expectedUpdatedAt. Every transition appends actor/time/from/to/notes/assignee history. Unassignment clears the current staff link without erasing history.

Replies require an expected version and message, retain actor/time/role/message, and reject stale, unrelated or closed tickets. No external notification is sent by saving a conversation. Attachments, SLA/escalation scheduling, specialized confidential safeguarding queues and external support integrations remain future capabilities; operational support tickets should not contain safeguarding case files.

Verification: 15 integration tests and 21 six-role browser cases passed with no JavaScript exceptions; both builds passed. See [browser instructions](../../../tests-e2e/helpdesk/README.md). Production deployment remains deferred.

Readiness refinement: a save now waits for an in-progress list load and performs a fresh reload afterwards. A deliberately delayed real list response in the six-role pilot verifies that a newly saved ticket remains visible. Authored Arabic ticket subjects/descriptions remain unchanged.
