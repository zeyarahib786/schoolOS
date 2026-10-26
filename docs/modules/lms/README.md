# Learning (LMS)

The released workspace reads persisted courses, assignments and authorized submissions, with search, grade/subject filters, pagination, CSV exports and safe responsive details. Counts reflect actual records and grading states; demo engagement percentages, invented rosters and simulated bulk grading have been removed.

Administrator and Principal manage school teaching plans. Teachers manage coursework only for their explicitly mapped class/subject/academic-year combinations. Courses record subject, grade, coordinator and academic year. Assignments may link to a matching course or stand alone. Drafts and Scheduled assignments are hidden from read-only roles; Published accepts submissions and Closed preserves work while stopping intake. Date-only deadlines end at 23:59:59.999 in the school's configured timezone; explicit ISO timestamps must include an offset. Late intake is explicitly accepted-and-flagged or rejected.

Student reads only their linked grade's published/closed assignments and own submissions. Parent reads linked children's grade assignments, submissions and feedback, without internal review reasons. Accountant reads published plans but receives no submissions. Family filters cannot override the server's authorized-grade scope. Teacher reads, course changes, assignment writes, submission lists and grading enforce actual Teacher-account mappings. Coordinator text remains a display label, not authorization.

Student submits one text response per assignment; no staff impersonation or silent resubmission. Intake uses a transaction and assignment version barrier, preserving availability decisions during concurrent publication changes. Duplicate submissions conflict. After submission, grade/subject/year/course/maximum score and draft visibility are protected. Staff corrections require current versions and reasons. Grading retains previous/current scores, assessor and time; family sees current score and useful feedback.

This release does not claim video hosting, interactive lesson content, file attachments, question-bank delivery, multi-attempt assessment or LMS-standard imports. Archiving a course is a directory action; assignments have their own publication state and are closed explicitly. Historical records keep explicit Legacy scope until corrected.

## Verification

17 integration cases cover original workflows plus grade ownership, draft privacy, calendar validation, timezone/DST boundaries, concurrent submissions, publication/scope locks, grading corrections and history privacy. [Browser workflows](../../../tests-e2e/lms/README.md) exercise actual role views and forms. All 48 six-role browser cases, 17 unit cases, both builds and targeted lint passed. Deployment remains deferred.

## Teacher automation: first delivery

Administrator/Principal opens **Learning (LMS) → Teaching assignments → Assign teacher**, chooses an active Teacher account and an active class section, and enters the exact subject and consecutive academic year. Reassigning the same combination reactivates it; revocation uses the last observed timestamp. Teachers cannot assign themselves. Archived classes and revoked mappings do not grant access. Existing coordinator names are not silently converted into permissions: leadership must configure mappings before teachers can create or access coursework. Legacy/unmapped work remains available to leadership for reviewed correction. This mapping currently protects LMS; it does not claim to redesign permissions for attendance or every other school module.

Teachers see their own teaching mappings and a workspace summary. **Assignment templates** retain reusable title/instructions/subject/maximum score. Teachers create private templates; leadership may share templates with teachers. Templates contain no deadlines or recipients and never publish content. Using a template opens a new assignment form; choose the class and dates explicitly. The template directory shows the latest 100 records.

New assignments can include additional authorized class sections. Standalone coursework creates one independent assignment per selected section (maximum 20), transactionally, with a persisted batch identity preventing duplicate retries. Linked courses remain scoped to one section. The server checks every target class/subject/year; a single unauthorized target rejects the entire batch. Submitted-work scope locks and versioned grading remain in force.

Choose **Scheduled**, enter a future ISO publish timestamp with timezone offset (for example `2026-11-01T08:00:00+04:00`) and a later deadline. Publication times are stored as instants; date-only deadlines still use the configured school timezone. Editing a schedule to Draft cancels scheduled publication. The worker scans at approximately one-minute intervals while the backend is running. It rechecks the active publisher account and Teacher mapping before transitioning Scheduled → Published. Revoked access or a missed deadline returns the assignment to Draft with a review message. The worker does not backfill publication alerts for historical records lacking a publication event.

Published assignments create deduplicated personal-inbox events for active linked Student accounts and primary guardian Parent accounts in the exact section. Suspended guardian accounts are excluded. Links open the authorized LMS assignment. Scheduled/Draft coursework is never exposed to families. Publication/notification progress appears in assignment details; in-app read state is separate from email delivery.

The default is **In-app only**. Selecting **In-app and email request** queues Resend emails when the channel is configured. Teacher-originated requests remain **Awaiting approval** until school leadership approves them in Communication → External deliveries. Leadership-originated requests enter the normal queue. Sending rechecks current assignment visibility and the recipient's current linked membership; moving/removing a child or closing coursework can stop pending delivery. Provider acceptance does not imply delivery. External live bulk verification was not performed. AWS SNS is not required for this phase; opt-in attendance alert requests and pending-homework reminders are described below.

## Automation verification

117 frontend tests and 364 backend unit checks passed. Targeted LMS/notifications integration regression passed 35 checks; the final 9-case automation suite additionally verified cross-teacher grading and concurrent publication-event deduplication (37 distinct targeted checks in total). All 54 six-role LMS browser checks passed, including private role views, teaching-access controls, template reuse, two-section schedules and existing coursework corrections. Backend/frontend builds and backend lint passed. All workflow fixtures are isolated and fictional; provider calls are mocked or not executed.

## Pending-homework reminders

The assignment form provides **Pending homework reminders → Before deadline and after missed deadline**. This is off by default; templates do not silently enable it. For Published assignments, the worker creates one reminder within the 24-hour window before the deadline and one after a missed deadline (up to 48 hours after it). Downtime beyond those windows is not backfilled. Each stage is deduplicated per assignment, deadline and recipient. Editing the deadline establishes a new reminder window. Course closure, disabling reminders and existing submissions suppress future or pending external requests; submitted children are excluded before resolving their linked student/primary-parent accounts. A parent with a pending sibling may still receive the assignment reminder.

Reminders always use the saved personal inbox. If **In-app and email request** is selected and Resend is configured, the existing queue is used; Teacher requests still await office approval. Sending revalidates the exact deadline, stage, current publication state, reminder setting and pending-student membership. Acceptance is not delivery. Already delivered messages cannot be recalled. Assignment details show the latest **Reminder result**; background reminder markers do not alter coursework edit timestamps. These rules do not automatically grade work or treat non-submission as misconduct.

Current continuation verification: 120 frontend checks, 364 backend unit checks, 34 distinct targeted API checks (including the final 10-case reminders/alerts suite), and 54 LMS plus 62 Attendance browser checks across six roles passed. Backend/frontend builds, backend lint and whitespace checks passed. The browser fixture verifies the reminder setting persists through assignment create/review. All data was fictional and isolated; live email/SMS delivery was not exercised.

## Teacher AI Studio

Open **Learning (LMS) → Teacher AI Studio**. The studio is available to Teacher, Principal and Administrator accounts. First configure actual teaching assignments; a teacher can only select an active mapped class/subject/year. Student, Parent and Accountant cannot access studio APIs. Drafts belong to their author, including when the author is a school administrator. Revoking a teacher mapping blocks the related saved drafts as well as new generation.

The five teaching priorities are implemented as reviewed workflows:

1. **Assignment / Quiz builder:** choose context, topic, English/Arabic, difficulty, question count (1–20) and marks (1–100). Describe the desired MCQ/short-answer mix in additional instructions. Generated instructions, questions, choices, marks, answer keys and rubrics are editable. Save reviewed changes, then **Review and apply**, choose a deadline and Draft/Published/Scheduled. Draft is the default. A scheduled publish time must be in the future and before the deadline. Applying once creates one normal LMS assignment; retries cannot create a second assignment.
2. **Lesson plan:** choose topic, duration (10–180 minutes), language and teaching requirements. The model is instructed to include objectives, a timed sequence, materials, differentiation, checks and an exit ticket. The editable plan remains a private persisted draft; download it as text for teaching. This is a planning assistant, not an automatic timetable/curriculum rewrite. The teacher must check the timed sequence and educational accuracy.
3. **Grading assistant:** select teaching context and an existing matching submission. The provider receives assignment instructions, the rubric/keys and that submission text, without a student name/contact record. It returns suggested marks and feedback. Objective MCQs are scored deterministically on submission; AI suggestions cannot reduce earned objective marks and must match a fully objective assessment's score. Final marks only change after explicit teacher review. A stale submission or changed assessment invalidates the suggestion. Existing manual assessment/correction remains available.
4. **Parent message:** select a student in the authorised class, purpose and language. Drafts receive numeric coursework/attendance context, not the child's name/contact details. Check content, then choose InApp/Email/SMS and confirm review. The current linked active parent account is resolved server-side. InApp creates a private message/inbox entry. Teacher external requests use the existing approval queue; Resend/SNS must be configured. Pending delivery rechecks the current child/guardian relationship and teacher scope. AI never sends a draft automatically.
5. **Progress summary:** select the student and attendance reporting window (7–90 days). Coursework facts cover the selected subject/academic year; attendance facts cover recorded class-wide sessions in the explicit rolling window. Present and Late count as present; Excused is excluded from the percentage. Missing registers are not absence. The source panel shows denominators, graded sample size, outstanding submitted/published counts and missing-data warnings. The editable narrative remains private and downloadable; it does not change report cards or invent a score when no graded work exists.

### AI setup

For Gemini free-tier development, create a key in [Google AI Studio](https://aistudio.google.com/apikey). In the ignored `server/.env`:

```dotenv
TEACHER_AI_ENABLED=true
TEACHER_AI_PROVIDER=gemini
GEMINI_API_KEY=<your-server-side-gemini-key>
TEACHER_AI_MODEL=gemini-3.8-flash
```

Model availability and free quotas are account-dependent and may change; verify [current pricing](https://ai.google.dev/gemini-api/docs/pricing) and your AI Studio quota. Free-tier testing must use fictional records and fictional submission text: unpaid Gemini inputs/outputs may be used for product improvement under the [provider terms](https://ai.google.dev/gemini-api/terms). `store:false` disables stored interaction state; it does not override those data-use terms.

To use the existing OpenAI provider instead:

```dotenv
TEACHER_AI_ENABLED=true
TEACHER_AI_PROVIDER=openai
OPENAI_API_KEY=<your-server-side-project-key>
TEACHER_AI_MODEL=<a-model-enabled-in-your-project-with-Responses-structured-outputs>
```

An omitted provider defaults to OpenAI for existing installations. Invalid provider names fail closed. Credentials are provider-specific: an OpenAI key cannot configure Gemini and vice versa. There is no cross-provider fallback on errors/quota exhaustion. Switching provider does not migrate or regenerate existing private drafts; new drafts store their provider/model, while older drafts default to OpenAI.

Restart the backend after changing environment variables. Keys never enter the browser or provider URL. The studio identifies the selected provider. With missing configuration, generation returns `503 AI_NOT_CONFIGURED`; it never substitutes static text and labels it AI. Calls use fixed HTTPS origins, refuse redirects, enforce bounded timeouts (120 seconds for Gemini; 60 seconds for OpenAI) and output, and set `store:false`. Gemini uses its [Interactions API](https://ai.google.dev/api/interactions-api), `system_instruction` and JSON `response_format`; OpenAI retains its Responses JSON-schema integration. Both paths feed the same server-side content/assessment validation and reviewed school actions. Partial, blocked, malformed and schema-invalid responses cannot become usable drafts.

A generation reservation is saved before the provider call. The same request identity reopens the saved result; changed inputs get a new identity. Failed generations require a new request, and abandoned Generating records become Failed when the draft directory is reopened after three minutes. The per-author database quota is 30 draft reservations per rolling hour (failed requests count); simultaneous requests across processes are not a billing-grade hard limit, so also configure provider project budgets. The directory shows the latest 50 drafts. Drafts are retained in `teacheraidrafts`; no automatic retention purge is enabled.

Matching saved curriculum units (up to 20) supply context; absence of matching curriculum is disclosed. Generated content is editable school material, not a claim of verified pedagogical accuracy. School record/source text is untrusted input and the provider has no execution tools or database access. Free-text teacher instructions and submitted student work may themselves contain personal information; teachers should avoid unnecessary personal details. This implementation does not claim anonymisation of arbitrary free text or that `store:false` removes all provider-side retention obligations. Live model quality, account access/quota and real provider delivery verification are deferred by the user.

### Structured assessments

Assignments now support `questions` with `id`, `type` (MCQ/ShortAnswer), `prompt`, `options`, `marks`, staff-only `answer` and staff-only `rubric`. Question identifiers must be unique, MCQ options distinct and include the exact key, and marks must sum to `maxScore`. Student/Parent/Accountant assignment payloads omit keys/rubrics and internal history. These records use the existing publication/section scopes.

Student submission forms render each question; structured `answers` are validated against the saved questions. One attempt per student/assignment remains enforced transactionally. Short answers require teacher grading. Deterministic `objectiveScore` is internal to teaching roles until final reviewed grading; the student's submit response and submission list omit it. Questions are locked after a submission exists. Legacy text-response coursework continues to work. Generated answer keys included in a staff download must be handled as staff material.

### AI verification

Repeatable checks: `server/tests/teacher-ai.test.ts`, `server/tests/unit/teacher-ai.test.ts`, `client/src/features/lms/__tests__/ai.test.js` and the existing six-role `tests-e2e/lms/` workflow. Integration/browser fixtures use temporary databases and deterministic intercepted provider responses, never the configured Atlas database or live AI/email/SMS accounts. These tests verify workflows and boundary behaviour, not live educational output quality.

Final fixture verification for Teacher AI Studio: **131 frontend checks**, **367 backend unit checks**, **40 distinct targeted API checks** across Teacher AI/LMS/notifications/reminders, and **70 six-role LMS browser checks** passed. The final queue regression includes the current-guardian recheck before provider dispatch. Browser coverage includes Arabic controls, mobile editors, the Teacher dashboard shortcut and interactive student quiz submission. Both application builds, backend lint and OpenAPI YAML parsing passed. Live AI generation/quality and deployment remain deferred.

Gemini provider verification: 375 backend unit checks, 12 Teacher AI API checks covering both protocols, 132 frontend checks, and 17 focused Teacher browser checks using a Gemini fixture passed. Both builds, backend lint and OpenAPI YAML parsing passed. Keys were never sent to a live provider during verification; account access, free quota and actual generated content remain unverified until configuration and an explicit live test.


Live-demo findings: Gemini 3 classroom drafting now requests low thinking, and Gemini's bounded request window is 120 seconds because a real minimal request exceeded 60 seconds. OpenAI retains its 60-second limit. Abandoned reservation cleanup waits three minutes so it cannot prematurely fail an in-flight Gemini request. This improves tolerance for free-tier latency; it does not promise a response-time SLA. Parent-message review uses a separate help-note field so the InApp/Email/SMS selector is rendered by the shared form system.

Live verification completed with explicitly authorised, retained fictional demo data: all six tools (the five priorities, with separate assignment/quiz actions) generated actual Gemini output. The final run passed 23 live browser checks across Teacher, Student, Parent, Principal, Accountant, Administrator and an unassigned Teacher account. A reviewed quiz grade, Arabic lesson plan, parent in-app message and numerically grounded progress summary were verified in the UI and by MongoDB read-back. A separate written-answer suggestion remains a draft for human review. Failed generation history was retained rather than reported as success. No real student data was sent to Gemini, and no external delivery request was queued. SMS remains unconfigured.

Regression after the live fixes: 133 frontend tests, 376 backend unit checks, 12 isolated Teacher AI API checks and 17 focused isolated Teacher browser checks passed, along with builds and backend lint. The in-app parent-message browser fixture now exercises the real review form and send action; it no longer stops at draft generation. Demo passwords, tokens, live-run scripts and screenshots remain outside the repository under `/tmp`.

### Checking a live AI quiz

1. Sign in as a Teacher with an active class/subject/year teaching assignment. Open Learning (LMS) → Teacher AI Studio → Quiz.
2. Select your assigned teaching context. Try topic `Photosynthesis`, English, Standard, 2 questions, 10 marks, with instructions `Two MCQ questions, four options each, five marks each`.
3. Click Generate draft once and wait for completion. Review prompts, answer keys, rubrics and total marks. Generation creates a private AI draft; it does not yet create a student assignment.
4. Choose Review and apply, confirm review, and save the assignment as Draft first. Open the coursework record, review the class and due date, then publish when ready.
5. Sign in as a student in that class, submit the quiz, then return as the teacher to review the submission and grade. Verify the parent view using the student's linked parent account.

Failed attempts retain a safe reason when available. Open the failed draft and choose **Edit and retry** to reuse its inputs with a new generation identity; click Generate explicitly. Quota failures require waiting/checking provider quota. Access/model errors require server configuration changes. Older failures cannot reveal a reason that was never stored. No automatic paid retries occur; uncertain network retries retain their original idempotency key.

### Switching Teacher AI providers

Supported adapters: `openai`, `gemini`, `groq`. Set the provider, its own key, and an available structured-output model in `server/.env`, then restart the backend. Keys stay on the server and are never interchangeable. No automatic provider fallback occurs. Different vendors need different API adapters; an arbitrary API key alone cannot add a new provider.

Groq example:

```dotenv
TEACHER_AI_ENABLED=true
TEACHER_AI_PROVIDER=groq
GROQ_API_KEY=your-groq-key
TEACHER_AI_MODEL=openai/gpt-oss-20b
```

Create the key at https://console.groq.com/keys. `openai/gpt-oss-20b` is a model hosted by Groq here; it uses the Groq key. Use a model supporting strict JSON schema: https://console.groq.com/docs/structured-outputs. Free access has account/model rate limits; check https://console.groq.com/settings/limits. A timeout does not establish that credits ran out. Teacher AI Studio shows the selected provider and safe configuration errors. Existing saved drafts remain accessible after switching.

For Gemini set `TEACHER_AI_PROVIDER=gemini`, `GEMINI_API_KEY` and a Gemini model; for OpenAI use `TEACHER_AI_PROVIDER=openai`, `OPENAI_API_KEY` and an OpenAI structured-output model. Preserve unused keys if you want to switch back; only the selected provider's key is sent to its fixed endpoint.

Teacher AI provider schemas mirror the application's question ID (`q1`, `q2`, …), field length, marks and array limits. MCQ answers must exactly match full option text. The server still validates returned content independently, including semantic checks that JSON schemas cannot enforce. Truncated provider responses show a response-limit message; field validation failures show safe field paths without exposing source/student content. There are no automatic regeneration calls or fabricated replacement answers.

Teaching assignments use a responsive compact grid with 12 cards per page, combined teacher/class/subject search, class and subject filters, and Active/Archived status filtering. The assign-teacher form displays readable names and naturally ordered class labels while keeping MongoDB IDs exclusively as option values in API requests.

## Retained Groq classroom review (24 October 2026)

A new local walkthrough uses Rohan Mehta (Teacher), Fatima Al Hashimi (Student, `ANS-1042`), and her linked Parent in Grade 10 · A Mathematics. All six tools generated live Groq drafts. The reviewed practice and exit quiz were published and submitted through the UI; both have a retained 5/10 reviewed grade. A parent in-app message and notification are retained, with no external delivery request. The 40-minute lesson and progress report remain private teacher drafts and can be downloaded. The report’s checked evidence is two graded activities averaging 50%, and five recorded attendance sessions across subjects with 80% present-or-late attendance. Attendance and coursework use separate reporting periods.

The walkthrough exposed and fixed missing explicit per-question answer context in AI grading, unreadable structured response presentation, task-inappropriate AI question output, failed-request retry selections, and the parent notification’s communication route. The provider now receives task-specific JSON constraints and explicit reporting-scope definitions. Human review remains mandatory: the initial lesson misused CPCTC as a similarity criterion and generated ungrounded alignment wording; the initial narrative also mislabelled cross-subject attendance. The retained lesson, parent message and progress narrative were corrected before final verification. This is evidence of working reviewed workflows, not a claim that model-generated educational content is automatically correct.

Current private verification artifacts, record IDs, downloads and manual checking instructions are in `/tmp/schoolos-ai-live-review/`. Existing passwords were not changed. Live Teacher/Student/Parent/Admin/Principal visibility was checked; the existing local Accountant password did not match, so its role coverage is isolated unless valid credentials are supplied. See [repeatable LMS workflow instructions](../../../tests-e2e/lms/README.md).
