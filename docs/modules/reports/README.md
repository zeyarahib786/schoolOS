# Reports

Administrator and Principal read the operational school overview. Other roles receive a restricted view and cannot access the report API. The released screen independently refreshes saved report data, provides responsive source tables, a safe CSV summary, and navigation to source modules. It identifies generation time, school day, timezone and calculation basis.

Fee totals cover saved invoices in school currency; due day is inclusive in school timezone, and outstanding balances round to cents. Attendance uses actual Present/Late marks over non-Excused recorded marks for six months through the current school day; AM/PM are separate marks, and no eligible records yields null rather than a fabricated zero rate. Exam distribution counts saved result documents using the documented percentage bands, not unique students or a certification GPA. Legacy Student GPA remains labelled profile data in the API and is omitted from the report UI.

The overview reads collections independently and is not an audited accounting statement or a consistent multi-collection snapshot. Missing attendance marks are not counted as absences. Date-range/academic-year drilldowns, custom report builders, scheduled delivery, financial reconciliation and report PDF signing remain future capabilities.

Verification: 7 integration tests and 14 six-role browser cases passed with no JavaScript exceptions; both builds passed. See [browser instructions](../../../tests-e2e/reports/README.md). Production deployment remains deferred.
