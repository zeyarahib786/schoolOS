# Security & Compliance Checklist — for the Node/React/Express/MongoDB build

This is written against what the current application genuinely does today, not an idealized
target — so each item is marked as **already true client-side**, **needs a real backend
equivalent**, or **net-new for production**.

## 1. Authentication & Authorization

| Item | Current state | Required for production |
|---|---|---|
| Login | Demo credential gate (`admin@alnoor.ae` / `demo-access`), client-side only | Real auth: email+password with bcrypt/argon2 hashing, or SSO (Google Workspace / Microsoft Entra — schools commonly already have one) |
| Session | No token, role held in in-memory `state.role` | JWT (short-lived access + refresh token) or server-side session store |
| Role model | `WRITE_ROLES = ['Administrator','Principal','Teacher']`, checked via `canWrite()` client-side only | **Must be re-enforced server-side on every mutating route** — the client check is a UX convenience only, never a security boundary. Every `POST`/`PATCH`/`DELETE` route in API-ROUTES.md needs a middleware role check before it's called a completed migration. |
| Per-record ownership | Not modelled — any write-role user can edit any record | Add ownership/scoping checks where relevant (e.g. a Teacher editing only their own timetable slot — already partially modelled client-side in `ttTeacherView`'s `canEditRoom` logic, which is a good pattern to carry over) |
| Parent/Student portal isolation | Role-based read scoping exists client-side (e.g. `roleScopedCourses()`) | Re-implement as a query filter server-side (`WHERE guardianId = req.user.id`), never trust a client-supplied ID |

## 2. Data protection (PDPL / GDPR-equivalent, relevant for a DIFC-based product)

| Item | Current state | Required for production |
|---|---|---|
| PII fields | Phone, email, address, guardian details stored in plain fields across `students`, `staff`, `boarders`, `alumni` | Field-level encryption at rest for the most sensitive fields (medical, allergy, disciplinary) is worth evaluating; at minimum, enforce TLS in transit and disk-level encryption at the database layer |
| Medical/allergy data | `CLINIC`, `CAFEALG` collections store care-plan and medical fields as free text | Treat as a special category of data under most data-protection regimes — restrict read access by role, log every read (not just every write), and exclude from general-purpose exports/CSV dumps by default |
| Consent tracking | `ALUMNI.consent` and `newsletter` opt-in already exist as a real field, correctly checked before sending (`ALUMNI.filter(a=>a.consent!==false)`) | Extend the same pattern to parent/student communication preferences; add a consent audit trail (who consented, when, to what) |
| IP handling | Not currently logged anywhere in the frontend | If added server-side, pseudonymise or hash IPs in logs rather than storing raw — this was already the documented approach for the separate Demo Atelier investor portal per prior project notes, and should carry over here |
| Data export/portability | CSV export exists for Audit Log; no formal "export my data" flow | Add a data-subject export/delete flow if operating under GDPR/PDPL formally |

## 3. Audit & accountability — already a strong foundation

The client already calls `logAudit(action, module)` on essentially every meaningful mutation across
all 36 modules (194 handlers), which is genuinely unusual rigor for a demo build and should be
preserved, not rebuilt. Migration requirements:
- Move `AUDIT` from an in-memory array to an **append-only** MongoDB collection (no update/delete
  API exposed for it at all — enforce this at the route layer, not just by convention).
- Add `ip`, `userAgent`, and `sessionId` to each audit entry server-side (the client can't supply
  these truthfully).
- The existing Info/Warning/Critical severity classification (built this session, regex-based on
  action text) should move server-side and become an explicit `severity` field written at insert
  time, not inferred later from a string pattern.

## 4. Input validation

| Item | Current state | Required for production |
|---|---|---|
| Client-side validation | Present but permissive (required-field checks, some numeric parsing) — this is UX, not security | Every route needs server-side schema validation (Zod, Joi, or Mongoose schema validators) rejecting malformed payloads before they reach the database |
| File uploads (evidence, media, documents) | Client-side only, using `FileReader` → data URL, capped informally (e.g. 8 files for Social Reachout) | Real file upload needs: server-side MIME/size validation, a proper object store (S3-compatible) rather than embedding base64 in MongoDB documents, and virus/malware scanning before files are made available to other users |
| Free-text fields reaching a "send" action (WhatsApp links, mailto:, SMS) | Client-side only, uses `encodeURIComponent` correctly | Still needs server-side sanitization before any field value is echoed into HTML (stored-XSS prevention) if user-generated text is ever rendered elsewhere |

## 5. Browser & responsive compatibility (explicitly requested)

The current build has been tested and certified against:
- **0 axe-core accessibility violations** in light mode, dark mode, and RTL (Arabic) — re-run every release
- **W3C HTML validity** — clean on every release
- Chrome (primary target for the Puppeteer test harness used throughout this project)

For the React rebuild, carry forward the same three checks as CI gates (axe-core, html-validate
equivalent via a linter, and a real cross-browser matrix), and add:
- **Safari/WebKit and Firefox** to the automated test matrix (Playwright supports all three engines
  from one test suite — recommended over continuing with Puppeteer/Chrome-only)
- **Responsive breakpoints**: the current build's CSS already targets 3 breakpoints (confirmed via
  the `overflow-x` audits run throughout this project's QA history) — carry these forward as
  documented design tokens, not ad-hoc media queries, so the React component library inherits them
  consistently rather than each component reinventing spacing/breakpoint logic.

## 6. What "100% quality, every module tested" means concretely, going forward

The current HTML5 build's certification standard — which should become the CI gate for the
Node/React/Express/MongoDB rebuild — is:
- Every role × every module renders without error (currently: 216/216)
- Every clickable element on every page, and every button inside the first few drawers opened from
  each page, fires without a JS error (currently: 0 errors on both the surface sweep and the deep
  nested-drawer sweep)
- Zero duplicate DOM ids
- Zero accessibility violations (axe-core) in light mode, dark mode, and RTL
- W3C HTML validity
- Each new feature ships with its own dedicated test file exercising the real, specific behavior
  claimed (not just "the page renders") — this project's QA history includes ~20 such test suites,
  one per feature round, and that discipline is the actual reason bugs kept surfacing and getting
  fixed rather than accumulating silently.

None of this is automatic in a new framework — it has to be rebuilt as CI (GitHub Actions or
equivalent) running Playwright + axe-core + an HTML/accessibility linter on every PR, not run
manually before each release the way it necessarily was for this single-file prototype.
