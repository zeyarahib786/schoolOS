# Calendar browser workflows

From the repository root:

```sh
npm --prefix server run build
SCHOOLOS_TEST_MODULE=calendar node tests-e2e/helpers/run.cjs
```

Temporary MongoDB, local listeners and installed Chromium are required. Fictional events/venues exercise all six roles, audience privacy, saved month grid, safe details, pagination, real venue-linked creation, review/cancellation, booking state, export/search and mobile rendering. No external invitations or messages occur. Artifacts stay in `/tmp/schoolos-calendar-*`.

Recorded verification: 11 Calendar and eight Facilities regression integration tests, nine overlap unit tests and all 21 six-role browser cases passed. Both builds and targeted lint passed. Calendar-day display preserves the saved day across timezones.
