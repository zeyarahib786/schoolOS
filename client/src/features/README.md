# Feature modules

This directory contains the typed, feature-oriented React pages, actions, validation, and API
clients for SchoolOS. The current production entry point remains `src/app/AppShell.tsx` so the exact
existing UI and interaction behaviour on port 8080 are preserved while these modules are migrated
into the shell incrementally.

Do not switch the root application to the alternate router wholesale: each feature must first pass
visual and interaction parity checks against the current production shell.
