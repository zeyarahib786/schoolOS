# Internationalization and Localization (EN / AR / UR / HI)

The released runtime loads `i18n/10-localization.js` followed by the unified multilingual catalog and locale engine in `i18n/11-arabic.js`. These scripts provide instant, 1-click switching across all four supported languages:
- **English (`en`)**: LTR, `en-GB` locale
- **Arabic (`ar`)**: RTL, `ar-AE` locale, Eastern Arabic numerals (٠-٩)
- **Urdu (`ur`)**: RTL, `ur-PK` locale, Extended Arabic-Indic numerals (۰-۹)
- **Hindi (`hi`)**: LTR, `hi-IN` locale, Devanagari numerals (०-९)

## Coverage and Architectural Boundaries

1. **Static UI copy (Zero-Latency Catalog)**: 3,433 dictionary keys with a nonempty Arabic entry for every defined key, covering the registered module and shell surfaces (navigation, workspace headers, tables, cards, stat badges, buttons, drawers, modals, validation toasts, attendance markers, dates, months, days, count words, and command search).
2. **Dynamic Compounds and Recursive Localization**: Compounds separated by ` · `, ` — `, ` → `, and ` -> ` are split and localized recursively. Date patterns (`12 Jun 2026`), grade badges (`Grade 5 · A`), and pagination indicators (`Page 2 of 10`) dynamically format according to the active language's numerals and vocabulary.
3. **Multilingual Entity Persistence (Database Storage)**:
   - When a student is created, or its name/guardian name is updated without explicit translations, `generateStudentTranslations(name, guardianName)` generates suggested transliterations for authored names into `ar`, `ur`, `hi`, and `en`.
   - The server stores these translations in MongoDB (`student.translations`).
   - When student records load into the client, `mapStudent` registers them into `I18N` so student names translate in real-time across rosters and detail drawers upon toggling languages.
4. **Preserved Boundaries**: Form select options maintain technical enum values (`<option value="...">`) while labels translate. ISO currency codes (`AED`, `USD`), identifiers, document files, and items marked with `data-i18n-skip` remain untouched.


## Continuing acceptance review

On 13 October 2026 the merged catalog was checked: 3,433 keys, no missing Arabic entries. This is catalog completeness, not proof that every possible rendered sentence or school term is correct. Six-role Arabic workflow checks cover all 38 workspace titles per role, shell/help/search, preserved form values, saved Arabic tickets, token-refresh downloads and mobile RTL. The class roll-number label is now explicit (`الرقم في قائمة الصف`); Hostel discharge action/history now describe ending accommodation rather than generic sign-out or an unrelated medical meaning. Visual mobile review also found an English `Page 1` fragment in the Helpdesk footer; standalone/compound pagination now localizes, and Arabic ticket counters use singular/dual/plural forms.

School staff acceptance and native-language sign-off remain pending. Continue review on the running local application with fictional data, then repeat representative checks on approved staging before launch:

| Reviewer | Acceptance task | Evidence to record |
|---|---|---|
| Admissions/administrator | Create/edit a student, check class roll and official names, preview documents, reload the record | Record reference, expected behavior and any issue |
| Teacher | Mark/correct attendance, enter assessment results and verify published family visibility | Class/date and correction/publication outcome |
| Accountant | Review an invoice, record a fictional partial collection and verify its receipt | Invoice/receipt reference and balance |
| Parent/Student | Confirm own-family scope, published results, documents and private conversations | Role, linked fictional student and denied unrelated access |
| Arabic-speaking school reviewer | Check terminology, gender/grammar, confirmation/error text, drawers, mobile RTL and printable outputs | Exact English/Arabic phrase, module/context and approved replacement |

Generated name transliterations are suggestions; verify official spellings against school records. Arbitrary authored notes, uploaded files and identifiers retain their original content. Certificate body localization is a separate documented template boundary. A staff member's approval or a certified translation must not be inferred from automated tests. Maintain findings here or in the relevant module README rather than a new session report.

Latest local verification (14 October 2026): client tests pass 87 cases, including eight localization cases; six-role Arabic browser verification passes 36 cases with a mobile footer assertion and screenshots. Both builds pass. These checks verify implementation and preliminary terminology refinements, not human institutional sign-off.

Startup regression repaired on 14 October 2026: a pasted diff-preview marker inside the `Search vehicles` entry made the classic runtime invalid JavaScript. Removing only that fragment restored the existing Arabic/Urdu/Hindi values. The full client tests and production build pass after the repair; source changes were kept intact.

Authored-title regression repaired in the same check: `detailDrawer` again honors `recordTitle` by marking that heading `data-i18n-skip`. Saved ticket/student record titles remain their authored text while normal drawer headings localize. A focused unit case checks both behaviors; browser failures now include stack traces for actionable diagnostics.

Class-card room assignment, available-place labels and section-edit actions are localized. Timetable instructions split the current weekday and edit/swap/view-only copy into independently translated nodes. Regression checks cover every weekday, both edit permissions, English reversal and the six-role Classes browser workflow.


## Central personal-name display

Authenticated API responses register student, guardian, staff, user and related person names in a shared display registry. Registered full names in ordinary cells, labels and compound dropdown text localize automatically; shared `cellUser` cells and semantic person columns also support single-word names. Saved locale spelling takes precedence over the display transliteration fallback. The registry clears on logout; canonical API objects, form values and exports remain unchanged.

New person drawers use `personTitle: true` with `detailDrawer`; this distinguishes a person's name from an authored ticket, document or course title. Explicit `data-school-name` slots support saved translations, prefixes and open-view language reversal. Person data returned under recognized API routes/relations registers automatically. A new API shape must identify its person relation in `schoolRegisterResponseNames`; arbitrary `name` properties on products, rooms or fee heads are not person names. Authored text marked `data-i18n-skip`, textarea content and freeform input values stay protected.

Automatic transliteration is a fallback, not an official spelling guarantee. Store the person's preferred Arabic spelling in their translations when available. Frontend/backend transliteration avoids duplicate Arabic surname articles such as “Al Hashimi”. Regression coverage checks future records, previously unmodified views, stored-name preference, role workspaces, canonical values and authored-title boundaries.
