# Behaviour & Pastoral Care

The active register loads all server pages, supports search/type/status/due-follow-up filters, records merits and incidents, and shows real entry details and dated case decisions. Leadership can export the filtered register. Counts come from stored rows; no house leaderboard is inferred without actual house assignments.

Administrator/Principal/Teacher can create entries for active students. Merits default to +2 points and closed status, incidents/detentions to −2, pastoral notes to zero. Points must match the entry type. Valid school-calendar dates cannot be future dates; only the office may backdate.

Pastoral notes default to Staff only. Parent/Student receives only their explicitly linked student's entries shared with family. Private witnesses, staff assignment and internal decision history are excluded from family payloads. Legacy notes without a visibility field remain family-visible only if they are not pastoral notes. Staff still has the existing school-wide read policy; class-specific teacher/safeguarding roles remain separate future work.

Teacher may review only their own Logged entries. Escalated/Closed cases require Administrator/Principal review; leadership may reopen with a recorded reason. Every update requires `expectedUpdatedAt` and a reason. Closure additionally requires a recorded resolution and clears the follow-up date. Leadership can assign follow-up to an existing active staff account by email. Stale updates return 409; previous decisions remain in history. Legacy quick-close controls direct staff to the register to record the actual decision.

No silent disciplinary decisions, external messages or invented house points are generated. Detention scheduling/parent acknowledgements, dedicated safeguarding permissions, formal appeals and school-defined point policies need additional implementation before claiming those capabilities.

## Verification

Integration suites: `server/tests/behaviour.test.ts`, `behaviour-enhancements.test.ts`; ownership units in `server/tests/unit/behaviour.ownership.test.ts`. Tests verify family privacy, points/date validation, active students, reporter ownership, office escalation review, required resolution, stale writes, follow-up assignment and reopening history. Browser checks use actual six-role forms and persisted records: [Behaviour E2E](../../../tests-e2e/behaviour/README.md). Local verification: 10 Behaviour integration tests passed, including prefilled follow-up closure; the combined Behaviour/Health enhancement run passed 14 tests. Nine ownership unit tests and 33 six-role browser cases passed, with zero JavaScript exceptions. Both builds and targeted lint passed. Deployment is deferred.
