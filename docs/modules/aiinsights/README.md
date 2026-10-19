# Recorded insights and dashboard review

Administrator/Principal read complete server-derived review signals via `/reports/insights`. The released screen provides search, pagination, evidence details, CSV and an integrated leadership dashboard panel. Other roles cannot read the API or see the panel. Startup waits for the API adapter to connect before dashboard signal loading.

Only Active students are ranked. Recorded attendance for six months through the school day contributes 40 points below 85% or 18 below 92%. Saved assessment result percentages, averaged across result documents, contribute 35 below 75% or 15 below 85%. School-currency overdue balances contribute 25; other outstanding balances contribute eight. Review threshold is 30 and cap is 99. Missing evidence contributes no points. Legacy Student GPA/attendance percentages are ignored. Inventory compares actual quantityOnHand to saved reorderLevel.

Scores are fixed review rules, not forecasts, probabilities, diagnoses or automated decisions. The engine changes no student status, marks, financial record or care plan. Staff must verify source evidence and context. Assessment percentages are not certification GPA. No external AI receives student data. Configurable rules, case follow-up workflow and any external model integration remain future capabilities.

Verification: ten combined Insights/Reports integration tests and 14 six-role browser cases passed with no JavaScript exceptions; both builds passed. See [browser checks](../../../tests-e2e/insights/README.md). Production deployment remains deferred.
