import { ApiError } from '../../utils/ApiError';
import { ISurvey } from '../../models/Survey';
import { ISurveyResponse } from '../../models/SurveyResponse';
import * as repo from './surveys.repository';
import { ListSurveysQuery, CreateSurveyInput, SubmitResponseInput } from './surveys.validation';
import { AuthenticatedUser } from '../../middleware/auth';
import { Role, WRITE_ROLES } from '../../types/roles';
import { findInvalidAnswers } from './surveys.answer-check';

function canManageSurveys(role: Role): boolean {
  return WRITE_ROLES.includes(role);
}

export async function listSurveys(query: ListSurveysQuery) {
  const { items, total } = await repo.findMany(query);
  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

export async function createSurvey(input: CreateSurveyInput, requester: AuthenticatedUser): Promise<ISurvey> {
  if (!canManageSurveys(requester.role))
    throw ApiError.forbidden('Only Administrator, Principal, or Teacher may create a survey');
  return repo.create(input, requester.id);
}

async function getSurveyOrThrow(id: string): Promise<ISurvey> {
  const survey = await repo.findById(id);
  if (!survey) throw ApiError.notFound('Survey not found');
  return survey;
}

export async function activateSurvey(id: string, requester: AuthenticatedUser): Promise<ISurvey> {
  if (!canManageSurveys(requester.role))
    throw ApiError.forbidden('Only Administrator, Principal, or Teacher may activate a survey');
  await getSurveyOrThrow(id);
  const updated = await repo.activate(id);
  if (!updated) throw ApiError.notFound('Survey not found');
  return updated;
}

export async function closeSurvey(id: string, requester: AuthenticatedUser): Promise<ISurvey> {
  if (!canManageSurveys(requester.role))
    throw ApiError.forbidden('Only Administrator, Principal, or Teacher may close a survey');
  await getSurveyOrThrow(id);
  const updated = await repo.close(id);
  if (!updated) throw ApiError.notFound('Survey not found');
  return updated;
}

/** Responding is open to EVERY authenticated role (like Helpdesk ticket creation) - a survey
 * only has value if the whole community can be polled, not just staff. Guarded by three
 * independent checks: the survey must exist, must be Active (not Draft or already Closed), and
 * the requester must not have already responded. */
export async function submitResponse(
  surveyId: string,
  input: SubmitResponseInput,
  requester: AuthenticatedUser,
): Promise<ISurveyResponse> {
  const survey = await getSurveyOrThrow(surveyId);
  if (survey.status !== 'Active')
    throw ApiError.forbidden(`This survey is ${survey.status.toLowerCase()} and is not currently accepting responses`);

  const existing = await repo.hasResponded(surveyId, requester.id);
  if (existing) throw ApiError.conflict('You have already responded to this survey');

  const invalid = findInvalidAnswers(survey.questions, input.answers);
  if (invalid.length > 0) {
    throw ApiError.badRequest(
      `Invalid answer(s) - question or option does not exist on this survey: ${JSON.stringify(invalid)}`,
    );
  }

  return repo.submitResponse(surveyId, requester.id, input);
}

export async function getResults(surveyId: string) {
  const survey = await getSurveyOrThrow(surveyId);
  const { totalRespondents, tally } = await repo.computeResults(surveyId);
  const questions = survey.questions.map((q, questionIndex) => ({
    questionText: q.questionText,
    options: q.options.map((option) => ({
      option,
      count: tally.find((t) => t.questionIndex === questionIndex && t.option === option)?.count ?? 0,
    })),
  }));
  return { title: survey.title, totalRespondents, questions };
}
