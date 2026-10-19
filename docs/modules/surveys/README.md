# Surveys

The released screen reads actual survey records with full pagination, search/status filters, CSV, responsive details and saved-response state. Administrator, Principal and Teacher create multiple-question drafts, activate/close them and view aggregate results. All six roles can respond to an Active survey for their audience. Other roles see only Active/Closed All or own-audience surveys, without unpublished drafts or school-only results.

Every question must be answered exactly once with a saved option. Creation rejects duplicate options and limits questions/options. SurveyResponse retains its unique survey/respondent key. Submission transactions serialize on the survey with the same revision used by closure, preventing a stale Active read from inserting a response after closure. Duplicate concurrent submissions produce one response. Activation only transitions Draft/Scheduled to Active; Closed cannot reopen.

The school UI supports one to ten questions; API supports up to thirty. Surveys are identified account responses, not anonymous polls, though results expose aggregate counts only. Recorded scheduled dates require manual activation; no background activation/reminder delivery is claimed. Free-text/rating questions, survey editing after creation, respondent invitation lists and cross-survey analysis remain future capabilities.

Verification: 14 integration tests, 11 unit tests and 21 six-role browser cases passed with no JavaScript exceptions. Both builds and server lint passed (one existing curriculum console warning). See [browser instructions](../../../tests-e2e/surveys/README.md). Production deployment remains deferred.
