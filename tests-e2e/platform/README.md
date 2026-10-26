# Roles and school settings workflows

Build the server, then run `SCHOOLOS_TEST_MODULE=platform node tests-e2e/helpers/run.cjs`. Isolated fictional fixtures verify all six roles reading school context, Administrator-only editing, full released-module visibility, module enablement and real permission persistence, safe export and mobile settings views. Temporary artifacts remain in `/tmp/schoolos-platform-*`.

Backend: `npm --prefix server run test:integration -- --runTestsByPath tests/roles.test.ts tests/settings.test.ts tests/platform-settings-enhancements.test.ts`.

Account coverage: every role opens My profile from its sidebar avatar. Administrator searches a fictional unlinked student, generates a one-time login, closes and clears the receipt, signs in with the generated ID, completes mandatory first-password setup, signs in again and sees the linked student profile. These checks run as part of the existing platform suite; no live users or credentials are changed.

Shared details layout checks cover desktop LTR/RTL bounds relative to the sidebar, usable sidebar navigation, underlying-main inert state, and full-width mobile rendering. Run with `SCHOOLOS_TEST_ROLES=Administrator,Teacher,Student` for focused layout coverage; the Administrator workflow also verifies Login accounts forms and credential handover using the same shared layout.

Account filter checks verify exact class selection combined with text search and returning from Generate login via the shared Back button. Desktop/mobile fictional-directory screenshots go to `/tmp`. `client/src/features/settings/__tests__/navigation.test.js` additionally verifies nested wizard values, live listeners, scroll, module/user boundaries and exclusion of passwords/credential receipts from history.
