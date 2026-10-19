# Staff operations browser workflows

Run after building the API, sequentially with other suites:

```bash
SCHOOLOS_TEST_MODULE=staff node tests-e2e/helpers/run.cjs
```

The shared runner creates fictional employees, HR documents and payslips in isolated MongoDB, API/Vite and Chromium. Six roles check the full directory, actual create/edit/account forms, HR file uploads/downloads, complete onboarding and activation, self-attendance, leave approval/cancellation/balance restoration, own salary privacy, decimal payroll corrections and referenced paid records. PDFs are actual binary downloads. Fictional payment references never transfer money. Temporary fixture files and reports stay under `/tmp/schoolos-staff-*`.
