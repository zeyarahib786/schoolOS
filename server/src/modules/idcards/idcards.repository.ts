import { FilterQuery } from 'mongoose';
import { IdCard, IIdCard } from '../../models/IdCard';
import { Counter } from '../../models/Counter';
import { Student } from '../../models/Student';
import { Staff } from '../../models/Staff';
import { ListCardsQuery, IssueCardInput } from './idcards.validation';

/** Certificates' atomic serial technique with its own counter key space: CARD-2026-000001. */
async function nextCardSerial(year: number): Promise<string> {
  const counter = await Counter.findOneAndUpdate(
    { _id: `idcard-${year}` },
    { $inc: { seq: 1 } },
    { new: true, upsert: true },
  );
  return `CARD-${year}-${String(counter.seq).padStart(6, '0')}`;
}

export async function findMany(query: ListCardsQuery): Promise<{ items: IIdCard[]; total: number }> {
  const filter: FilterQuery<IIdCard> = {};
  if (query.status) filter.status = query.status;
  if (query.subjectType) filter.subjectType = query.subjectType;

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    // populate resolves through refPath per record: Student fields for student cards, Staff
    // fields for staff cards, in the same list.
    IdCard.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit).populate('subject', 'name refId'),
    IdCard.countDocuments(filter),
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

export async function issue(input: IssueCardInput, replaces: string | null): Promise<IIdCard> {
  const serial = await nextCardSerial(new Date().getFullYear());
  return IdCard.create({
    serial,
    subjectType: input.subjectType,
    subject: input.subjectId,
    expiryDate: new Date(input.expiryDate),
    replaces,
  });
}

export function findById(id: string): Promise<IIdCard | null> {
  return IdCard.findById(id);
}

export function setActiveStatus(id: string, status: 'Lost' | 'Revoked'): Promise<IIdCard | null> {
  return IdCard.findOneAndUpdate({ _id: id, status: 'Active' }, { status }, { new: true });
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
