# LMS browser workflows

Build the backend (`cd server && npm run build`), then run `SCHOOLOS_TEST_MODULE=lms node tests-e2e/helpers/run.cjs` from the repository root. The suite uses isolated fictional MongoDB, API port 4400, Vite port 5179 and Chromium. Logs/screenshots/results stay under `/tmp/schoolos-lms-*`.

All six roles load authorized assignments, safe details, search/export/reload and mobile layouts. Administrator/Principal/Teacher use actual course creation/correction, assignment draft/publication/closure and assessment correction forms. Student submits real fictional coursework. Parent sees owned work and feedback; Accountant receives no submissions. Drafts, unrelated grade assignments and internal reasons never enter family payloads.

Backend checks: `cd server && npm run test:integration -- --runTestsByPath tests/lms.test.ts tests/lms-enhancements.test.ts`. Ownership/deadline/validation unit suites live under `server/tests/unit/lms.*.test.ts`.

Teacher-automation regression uses actual active teacher/class/subject/year mappings (Science and QA Subject for Grade 7 sections A/B). All 54 six-role checks cover the original coursework flows plus teaching-access controls and template → multi-section Scheduled creation. Fixtures start the app without a live delivery worker and never contact external recipients. Scheduled execution, recipient deduplication, revoked access and approval-gated email behavior are verified in `server/tests/lms-automation.test.ts` using isolated MongoDB and mocked providers.

Teacher AI Studio checks additionally cover role-gated entry, editable MCQ/short-answer generation, explicit review before publication, persisted lesson plans, feedback suggestions, parent drafts and source-backed progress summaries. The Student workflow submits structured answers without receiving answer keys. `server.cjs` intercepts only the fixed OpenAI response URL inside the test process with fictional responses; all SchoolOS API calls and database changes remain real isolated workflows. No production mock-provider flag is added. Real AI quality/API-key verification remains a separate manual check after server configuration.

Current expanded six-role suite: 70 checks, including Arabic/mobile AI controls and the Teacher dashboard entry. A focused visual rerun can use `SCHOOLOS_TEST_ROLES=Teacher` with the same runner.
