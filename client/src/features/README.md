# Frontend feature modules

The active entry path is `src/main.tsx` → `src/app/App.tsx` → `src/app/AppShell.tsx`. The React shell inserts `app-shell.html`, injects `VITE_API_BASE_URL`, and loads one classic runtime script. Production screens currently use the browser renderers in `client/public/assets/js/modules/`.

## Runtime source and builds

`registry.ts` lists 54 ordered sources, including 38 feature modules, core helpers, localization/data scripts, rendering/bootstrap, and API adapters. `APP_SCRIPTS` is derived from that registry.

`client/build/runtime.ts` reads those sources in order and emits a content-hashed `schoolos-runtime-*.js` production asset. In development it serves the combined sources at `/schoolos-runtime.js` with no-store caching. Original public files remain available for static assets and source-based smoke tests, but `AppShell` no longer fetches the runtime sources individually.

These remain classic scripts. Inline HTML handlers call global functions, and adapters use direct `eval` to access global lexical arrays. The build minifies whitespace/syntax without renaming identifiers. Changing scope, identifier names, or execution order can break actions even if a page initially renders. Keep the render/bootstrap script before the API adapter chain.

## React migration boundary

This directory also contains typed React pages, feature API clients, validation, and action modals. `ReactBridge.tsx` maps module IDs to these pages and synchronizes authentication with the Zustand store. Its `RELEASED_REACT_MODULES` set is currently empty: having a React page file does not mean it is the released production renderer.

Enable a module only after checking its layout, interaction behavior, role/ownership restrictions, persisted writes, and navigation parity with the shell. Do not switch the root application wholesale to the alternate routing tree as part of an unrelated feature change.

## Data and behavior

The API adapters authenticate users, hydrate live records, install server-backed handlers, and refresh state after successful actions. Source data arrays also contain fictional/static UI context; do not infer that every displayed number is persisted or that every integration reaches an external provider. Server role and ownership checks remain authoritative.

The Cafeteria overview handles an empty live menu with a no-menu message. Regression tests cover both empty and populated menus.

## Verification

From the repository root:

```bash
npm --prefix client test
npm --prefix client run build
```

For runtime changes, also check the built application in a browser: startup, global handlers, module navigation, authentication, and representative API workflows. JSDOM smoke scripts evaluate local source files and do not prove that the deployed bundle loaded correctly. See [testing guidance](../../../docs/testing/README.md) for script-specific limitations and side effects.

## Students enhancement

The released Students screen is `public/assets/js/modules/51-students.js`, with server-backed full editing, documents, CSV preview/import, enrollment history and manager-only portal links. Its role policy and validation are recorded in [Students release](../../../docs/modules/students/README.md). The React Students page remains unreleased.
