# Curriculum

The released Curriculum workspace reads all saved units with grade, academic year, term and subject filters, search, pagination, CSV export and responsive details. Coverage is completed units divided by the selected plan's units. Overdue means an unfinished unit's planned date has passed in the school's timezone; unscheduled units are explicit. Demo resources, inferred grades and arbitrary pacing targets have been removed.

Administrator, Principal and Teacher may create or revise teaching plans and record actual completion/reopening. Each correction requires `expectedUpdatedAt` and a reason, preserving before/after review history. Future completion and impossible calendar dates are rejected. Leadership can archive/restore with a version and reason. Reviewed or completed units cannot be deleted. Archived units are excluded from the active plan.

All authenticated roles may read the shared school curriculum, including archived plans. Accountant, Parent and Student receive no internal review history and have no edit controls. This is a shared curriculum publication policy; it is not a draft approval system. Scope does not imply private cohort access. Automatic lesson-resource linking, timetable-driven pacing and configurable curriculum approvals remain future capabilities.

## Existing database rollout

Unit uniqueness is case-insensitive within subject, term, title, grade and academic year. New units default to the school's configured academic year. Historical records are explicitly `All grades` / `Legacy` until an authorized coordinator corrects them.

Before deploying this change against an existing database, back up the database and pause Curriculum writes. From `server/`, run `npm run migrate:curriculum` for a dry-run count and obsolete index names; inspect them, then run `npm run migrate:curriculum -- --apply`. It backfills only missing scope, creates the new unique index before removing the old subject/term/title constraint, and deletes no curriculum records. The command uses the existing secure server environment; it prints no connection URI. Resume writes after successful migration/deployment. No production migration was executed during local development.

## Verification

Integration coverage includes scoped duplicates, real dates, stale corrections, family history privacy, archive/restore, protected deletion and an actual old-index migration. Browser workflows cover all six roles, actual forms, completion/reopening, archive/restore, safe rendering, reload, filtering, export and mobile layouts. See [repeatable browser checks](../../../tests-e2e/curriculum/README.md). Deployment remains deferred.

Arabic unit forms localize the create/edit title and known defaults for grade, term, framework and coordinator. Language switches update unchanged defaults while preserving manually edited text. Saves normalize translated defaults back to their canonical values; custom grades, terms, frameworks and coordinator values remain editable. Regression coverage includes language reversal and canonical-value preservation.
