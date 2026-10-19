# Admissions

The pipeline uses the school's saved academic year. Staff create actual applications, manage captured documents, advance through assessed/interviewed/accepted states and enroll accepted applicants into Students. Required document checks and transactional enrollment remain enforced server-side. New application data and uploaded files remain protected by the existing staff role gate.

Administrator, Principal and Teacher have access. Applicant cards, table actions and drawers use stored record IDs so identical applicant names select the intended record. Applicant names and contact/history text are escaped. Waitlisted applications can return to their preserved pipeline stage; rejected applications are terminal and the UI no longer advertises a restore action. Accepted applications expose enrollment rather than an unsupported rejection action. Enrolled records link to Students; there is no pretend enrolment-pack download.

Local verification: 12 six-role browser cases cover access, configured year, hostile name display, duplicate-name identity and actual document-gated enrollment. Existing backend integrations separately verify branching transitions and enrollment rollback. See [testing](../../../tests-e2e/admissions/README.md).
