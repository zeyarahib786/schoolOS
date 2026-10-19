import mongoose, { FilterQuery } from 'mongoose';
import { IdCard, IIdCard } from '../../models/IdCard';
import { Counter } from '../../models/Counter';
import { Student } from '../../models/Student';
import { Staff } from '../../models/Staff';
import { ListCardsQuery, IssueCardInput } from './idcards.validation';

/** Certificates' atomic serial technique with its own counter key space: CARD-2026-000001. */
async function nextCardSerial(year: number, session: mongoose.ClientSession): Promise<string> {
  const counter = await Counter.findOneAndUpdate(
    { _id: `idcard-${year}` },
    { $inc: { seq: 1 } },
    { new: true, upsert: true, session },
  );
  return `CARD-${year}-${String(counter.seq).padStart(6, '0')}`;
}

export async function findMany(
  query: ListCardsQuery,
  scope: FilterQuery<IIdCard>,
  today: string,
): Promise<{ items: IIdCard[]; total: number }> {
  const filter: FilterQuery<IIdCard> = {};
  if (query.status === 'Expired') {
    filter.status = 'Active';
    filter.expiryDate = { $lt: new Date(today) };
  } else if (query.status) {
    filter.status = query.status;
    if (query.status === 'Active') filter.expiryDate = { $gte: new Date(today) };
  }
  if (query.subjectType) filter.subjectType = query.subjectType;

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    // populate resolves through refPath per record: Student fields for student cards, Staff
    // fields for staff cards, in the same list.
    IdCard.find({ $and: [filter, scope] })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.limit)
      .populate('subject', 'name refId grade designation'),
    IdCard.countDocuments({ $and: [filter, scope] }),
  ]);
  return { items, total };
}

export function subjectExists(subjectType: 'Student' | 'Staff', subjectId: string) {
  return subjectType === 'Student' ? Student.exists({ _id: subjectId }) : Staff.exists({ _id: subjectId });
}

export function subjectIsActive(subjectType: 'Student' | 'Staff', subjectId: string) {
  return subjectType === 'Student'
    ? Student.exists({ _id: subjectId, status: 'Active' })
    : Staff.exists({ _id: subjectId, status: 'Active' });
}

export async function issue(input: IssueCardInput, _replaces: string | null): Promise<IIdCard> {
  const session = await mongoose.startSession();
  let saved: IIdCard | null = null;
  try {
    await session.withTransaction(async () => {
      const active =
        input.subjectType === 'Student'
          ? await Student.findOneAndUpdate(
              { _id: input.subjectId, status: 'Active' },
              { $inc: { __v: 1 } },
              { session },
            )
          : await Staff.findOneAndUpdate({ _id: input.subjectId, status: 'Active' }, { $inc: { __v: 1 } }, { session });
      if (!active) {
        const { ApiError } = await import('../../utils/ApiError');
        throw ApiError.conflict('Card holder is no longer active');
      }
      const previous = await IdCard.findOne({
        subjectType: input.subjectType,
        subject: input.subjectId,
        status: { $in: ['Lost', 'Revoked'] },
      })
        .sort({ createdAt: -1 })
        .session(session);
      const serial = await nextCardSerial(new Date().getFullYear(), session);
      saved = (
        await IdCard.create(
          [
            {
              serial,
              subjectType: input.subjectType,
              subject: input.subjectId,
              expiryDate: new Date(input.expiryDate),
              replaces: previous?._id || null,
            },
          ],
          { session },
        )
      )[0];
    });
    if (!saved) throw new Error('ID card transaction produced no record');
    return saved;
  } finally {
    await session.endSession();
  }
}

export function findById(id: string): Promise<IIdCard | null> {
  return IdCard.findById(id);
}

export function setActiveStatus(
  id: string,
  status: 'Lost' | 'Revoked',
  actor: string,
  expectedUpdatedAt?: string,
  reason?: string,
): Promise<IIdCard | null> {
  return IdCard.findOneAndUpdate(
    { _id: id, status: 'Active', ...(expectedUpdatedAt ? { updatedAt: new Date(expectedUpdatedAt) } : {}) },
    {
      $set: { status },
      $push: { history: { at: new Date(), by: actor, action: status, reason: reason || 'Status change recorded' } },
    },
    { new: true },
  );
}

export function findActiveBySubject(subjectType: 'Student' | 'Staff', subjectId: string): Promise<IIdCard | null> {
  return IdCard.findOne({ subjectType, subject: subjectId, status: 'Active' });
}

/** The holder's most recently issued non-active card, if any - what a fresh issuance replaces. */
export function findLatestInactiveBySubject(
  subjectType: 'Student' | 'Staff',
  subjectId: string,
): Promise<IIdCard | null> {
  return IdCard.findOne({ subjectType, subject: subjectId, status: { $in: ['Lost', 'Revoked'] } }).sort({
    createdAt: -1,
  });
}
