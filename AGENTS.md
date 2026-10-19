# Repository conventions

Follow the existing structure when adding or enhancing features. Keep related implementation, tests and documentation together; do not create a new top-level folder or report file for each work session.

## Placement

- `client/src/features/<module>/`: React feature implementation and its `__tests__/`. The feature registry stays at `client/src/features/registry.ts`; registry-wide tests can remain alongside it.
- `client/public/assets/js/modules/`: released classic-script screens. Preserve their established numeric ordering and names. Shared runtime helpers/adapters belong in `client/public/assets/js/core/`. Do not edit an unreleased React page as a substitute for changing the active screen.
- `server/src/modules/<module>/`: module routes, controllers, validation, services and repositories. Reuse the module's existing filename prefix. Shared models belong in `server/src/models/`; shared middleware/utilities in their existing folders.
- `server/tests/`: integration suites following the existing flat naming convention. `server/tests/unit/`: pure/unit suites. Do not introduce a competing backend test hierarchy during an unrelated enhancement.
- `tests-e2e/<module>/`: repeatable browser workflow checks and their local execution instructions. Historical comparison fixtures stay in `tests-e2e/fixtures/`.
- `docs/setup/`: local development and deployment instructions.
- `docs/reference/`: API contract, route and database references.
- `docs/testing/README.md`: shared test commands, prerequisites and coverage guidance.
- `docs/modules/<module>/README.md`: one maintained feature/release document. Use `testing.md` only when separate historical testing detail is useful. Update existing files instead of adding dated release/status Markdown files after each session.
- `docs/roadmap.md`: the single shared enhancement roadmap and user-approved module sequence.
- `docs/README.md`: the documentation index. Add or update a link when a durable document is introduced or moved.

Root `README.md` is the project entry point. Root `AGENTS.md` records contributor/agent conventions. Avoid duplicating setup, module or release documentation at the repository root. Use lowercase kebab-case for new documentation filenames, with `README.md` and `AGENTS.md` as conventional exceptions.

## Changes and artifacts

Keep temporary logs, downloads, screenshots and one-off investigation reports in `/tmp` or an ignored output directory, not among source files. Never commit environment secrets, local databases, build outputs or test credentials for a live site. Durable tests should use isolated fictional fixtures.

When moving a file, repair relative links and affected script/import/config references. Run the checks appropriate to the move. Preserve historical snapshots as historical material rather than making them look current.

The agreed roadmap starts with Students and proceeds one module at a time; see `docs/roadmap.md`. Deployment remains deferred unless the user instructs otherwise.
