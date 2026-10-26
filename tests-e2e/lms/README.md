# LMS browser workflows

Build the backend (`cd server && npm run build`), then run `SCHOOLOS_TEST_MODULE=lms node tests-e2e/helpers/run.cjs` from the repository root. The suite uses isolated fictional MongoDB, API port 4400, Vite port 5179 and Chromium. Logs/screenshots/results stay under `/tmp/schoolos-lms-*`.

All six roles load authorized assignments, safe details, search/export/reload and mobile layouts. Administrator/Principal/Teacher use actual course creation/correction, assignment draft/publication/closure and assessment correction forms. Student submits real fictional coursework. Parent sees owned work and feedback; Accountant receives no submissions. Drafts, unrelated grade assignments and internal reasons never enter family payloads.

Backend checks: `cd server && npm run test:integration -- --runTestsByPath tests/lms.test.ts tests/lms-enhancements.test.ts`. Ownership/deadline/validation unit suites live under `server/tests/unit/lms.*.test.ts`.

Teacher-automation regression uses actual active teacher/class/subject/year mappings (Science and QA Subject for Grade 7 sections A/B). All 54 six-role checks cover the original coursework flows plus teaching-access controls and template → multi-section Scheduled creation. Fixtures start the app without a live delivery worker and never contact external recipients. Scheduled execution, recipient deduplication, revoked access and approval-gated email behavior are verified in `server/tests/lms-automation.test.ts` using isolated MongoDB and mocked providers.

Teacher AI Studio checks additionally cover role-gated entry, editable MCQ/short-answer generation, explicit review before publication, persisted lesson plans, feedback suggestions, parent drafts and source-backed progress summaries. The Student workflow submits structured answers without receiving answer keys. `server.cjs` intercepts only the fixed OpenAI response URL inside the test process with fictional responses; all SchoolOS API calls and database changes remain real isolated workflows. No production mock-provider flag is added. Real AI quality/API-key verification remains a separate manual check after server configuration.

Current expanded six-role suite: 70 checks, including Arabic/mobile AI controls and the Teacher dashboard entry. A focused visual rerun can use `SCHOOLOS_TEST_ROLES=Teacher` with the same runner.

Provider selection can be exercised without live credentials using `SCHOOLOS_TEST_AI_PROVIDER=gemini` (default: `openai`). For a focused Teacher run: `SCHOOLOS_TEST_AI_PROVIDER=gemini SCHOOLOS_TEST_ROLES=Teacher SCHOOLOS_TEST_MODULE=lms node tests-e2e/helpers/run.cjs`. Only the chosen provider protocol is simulated in the fixture; persistence, validation and review/apply use the real isolated API. Both provider origins are intercepted so no fixture can accidentally call a real AI account.

## Retained live-provider classroom review

`live-ai.cjs` is a separate, explicitly opted-in **localhost** demonstration. It uses existing demo logins, the configured live AI provider, and retains fictional classroom records for manual inspection. It never resets passwords, provisions accounts, stores tokens in report files, or sends external email/SMS. Use only an authorised development dataset. The initial lesson/report output still needs subject and factual review.

The prepared scenario uses Rohan Mehta, Fatima Al Hashimi (`ANS-1042`), her linked guardian and `Grade 10 · A / Mathematics / 2026-2027`. Run phases in order, reviewing generated output before proceeding:

```bash
SCHOOLOS_ALLOW_RETAINED_DEMO=true node tests-e2e/lms/live-ai.cjs generate
SCHOOLOS_ALLOW_RETAINED_DEMO=true node tests-e2e/lms/live-ai.cjs publish
SCHOOLOS_ALLOW_RETAINED_DEMO=true node tests-e2e/lms/live-ai.cjs submit
SCHOOLOS_ALLOW_RETAINED_DEMO=true node tests-e2e/lms/live-ai.cjs review
SCHOOLOS_ALLOW_RETAINED_DEMO=true node tests-e2e/lms/live-ai.cjs apply
node tests-e2e/lms/live-ai.cjs views
node tests-e2e/lms/live-ai.cjs inbox
```

Existing record IDs in `/tmp/schoolos-ai-live-review/records.json` are reused; published/graded/message actions are checked for idempotency. Do not remove this state file just to rerun: doing so starts a separate scenario. The demonstration dates are October 2026, with a 31 October deadline. Adjust dates deliberately for later runs rather than blindly reusing the exercise.

Default logins are the existing development seed accounts. To use valid credentials without editing source, set `SCHOOLOS_LIVE_CREDENTIALS_FILE` to a private local JSON file containing role keys and `{email,password}` values. Never commit that file or paste secrets into reports. `SCHOOLOS_LIVE_ROLES` may restrict the `views` phase to a comma-separated role list. A credential mismatch is reported as an unavailable live check, not as a successful role test; isolated role coverage remains separate.

The fixture publishes two activities, submits one correct and one incorrect response per activity, records reviewed 5/10 grades, adds five clearly labelled fictional attendance marks only where no session exists, sends one in-app parent message, and saves reviewed lesson/progress drafts with downloads. Artifact files and screenshots remain under `/tmp`. Lesson plans and progress summaries stay teacher-private drafts; Admin/Principal can inspect school coursework but not another account’s private AI drafts.
