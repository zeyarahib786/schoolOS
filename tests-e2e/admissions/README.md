# Admissions workflows

Run `SCHOOLOS_TEST_MODULE=admissions node tests-e2e/helpers/run.cjs` from the repository root after building the backend. The isolated fixture includes duplicate applicant names and a hostile display string. Staff create applications, mark required documents received, advance the pipeline and enroll into real Student records. Reports live under `/tmp/schoolos-admissions-*`.
