import mongoose, { FilterQuery, Types } from 'mongoose';
import { ApiError } from '../../utils/ApiError';
import { Survey, ISurvey } from '../../models/Survey';
import { SurveyResponse, ISurveyResponse } from '../../models/SurveyResponse';
import { ListSurveysQuery, CreateSurveyInput, SubmitResponseInput } from './surveys.validation';

export async function findMany(
  query: ListSurveysQuery,
  scope: FilterQuery<ISurvey> = {},
): Promise<{ items: ISurvey[]; total: number }> {
  const filter: FilterQuery<ISurvey> = {};
  if (query.status) filter.status = query.status;

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    Survey.find({ $and: [filter, scope] })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.limit),
    Survey.countDocuments({ $and: [filter, scope] }),
  ]);
  return { items, total };
}

export function findById(id: string): Promise<ISurvey | null> {
  return Survey.findById(id);
}

export function create(input: CreateSurveyInput, createdBy: string): Promise<ISurvey> {
  return Survey.create({ ...input, status: input.scheduledAt ? 'Scheduled' : 'Draft', createdBy });
}

export function activate(id: string): Promise<ISurvey | null> {
  return Survey.findOneAndUpdate(
    { _id: id, status: { $in: ['Draft', 'Scheduled'] } },
    { $set: { status: 'Active' }, $inc: { responseRevision: 1 } },
    { new: true },
  );
}

export function close(id: string): Promise<ISurvey | null> {
  return Survey.findOneAndUpdate(
    { _id: id, status: 'Active' },
    { $set: { status: 'Closed' }, $inc: { responseRevision: 1 } },
    { new: true },
  );
}

export function hasResponded(surveyId: string, respondentId: string): Promise<ISurveyResponse | null> {
  return SurveyResponse.findOne({ survey: surveyId, respondent: respondentId });
}

export async function submitResponse(
  surveyId: string,
  respondentId: string,
  input: SubmitResponseInput,
): Promise<ISurveyResponse> {
  const session = await mongoose.startSession();
  let saved: ISurveyResponse | null = null;
  try {
    await session.withTransaction(async () => {
      const active = await Survey.findOneAndUpdate(
        { _id: surveyId, status: 'Active' },
        { $inc: { responseRevision: 1 } },
        { session, new: true },
      );
      if (!active) throw ApiError.conflict('Survey closed before the response was saved');
      saved = (
        await SurveyResponse.create([{ survey: surveyId, respondent: respondentId, answers: input.answers }], {
          session,
        })
      )[0];
    });
    if (!saved) throw new Error('Response transaction produced no record');
    return saved;
  } finally {
    await session.endSession();
  }
}

/**
 * A second real MongoDB aggregation pipeline, structurally different from Exams' - that one
 * averaged a numeric field across a student's own scores; this one counts occurrences of each
 * distinct (questionIndex, selectedOption) pair across every OTHER document (every respondent's
 * submission) via $unwind + $group, then reshapes the flat counts back into a per-question
 * results structure in application code (a small, deliberate amount of post-processing that's
 * far simpler to do in JS than to force into the aggregation pipeline itself).
 */
export async function computeResults(surveyId: string) {
  const raw = await SurveyResponse.aggregate([
    { $match: { survey: new Types.ObjectId(surveyId) } },
    { $unwind: '$answers' },
    {
      $group: {
        _id: { questionIndex: '$answers.questionIndex', option: '$answers.selectedOption' },
        count: { $sum: 1 },
      },
    },
  ]);
  const totalRespondents = await SurveyResponse.countDocuments({ survey: surveyId });
  return {
    totalRespondents,
    tally: raw.map((r) => ({ questionIndex: r._id.questionIndex, option: r._id.option, count: r.count })),
  };
}
