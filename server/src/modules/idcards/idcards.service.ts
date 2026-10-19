import { FilterQuery } from 'mongoose';
import { IdCard } from '../../models/IdCard';
import { Student } from '../../models/Student';
import { Staff } from '../../models/Staff';
import { schoolToday } from '../attendance/attendance.dates';
import { recordPdf } from '../../utils/recordPdf';
import { getSettings } from '../settings/settings.service';
import { ApiError } from '../../utils/ApiError';
import { IIdCard } from '../../models/IdCard';
import * as repo from './idcards.repository';
import { ListCardsQuery, IssueCardInput } from './idcards.validation';
import { AuthenticatedUser } from '../../middleware/auth';
import { logAudit } from '../audit/audit.service';

export async function listCards(query: ListCardsQuery, requester: AuthenticatedUser) {
  const { items, total } = await repo.findMany(query, await cardScope(requester), await schoolToday());
  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

/**
 * Issuing checks the subject genuinely exists in the right collection (a card for a nonexistent
 * student is a 404, not a dangling reference), auto-links a replacement chain when the holder's
 * previous card is Lost/Revoked, and relies on the partial unique index for the one-Active-card
 * invariant - a concurrent double-issue surfaces as 11000 -> 409.
 */
export async function issueCard(input: IssueCardInput, requester: AuthenticatedUser): Promise<IIdCard> {
  const exists = await repo.subjectExists(input.subjectType, input.subjectId);
  if (!exists) throw ApiError.notFound(`${input.subjectType} not found`);
  if (!(await repo.subjectIsActive(input.subjectType, input.subjectId)))
    throw ApiError.conflict(`Only an active ${input.subjectType.toLowerCase()} can receive an ID card`);

  if (input.expiryDate < (await schoolToday())) {
    throw ApiError.badRequest('expiryDate cannot be before the current school day');
  }

  const previousActive = await repo.findActiveBySubject(input.subjectType, input.subjectId);
  if (previousActive)
    throw ApiError.conflict('This holder already has an active card - report it lost or revoke it first');

  // link the chain genuinely: a fresh issuance replaces the holder's most recent Lost/Revoked
  // card, so a card's lineage (lost -> reissued -> lost -> reissued) is traceable end to end
  const latestInactive = await repo.findLatestInactiveBySubject(input.subjectType, input.subjectId);
  const replaces: string | null = latestInactive ? latestInactive._id.toString() : null;

  try {
    const card = await repo.issue(input, replaces);
    await logAudit(`Issued ID card ${card.serial}`, 'ID Cards', requester.id);
    return card;
  } catch (err) {
    if (err instanceof Error && (err as Error & { code?: number }).code === 11000) {
      throw ApiError.conflict('This holder already has an active card - report it lost or revoke it first');
    }
    throw err;
  }
}

export async function reportLost(
  id: string,
  requester: AuthenticatedUser,
  input: { expectedUpdatedAt?: string; reason?: string } = {},
): Promise<IIdCard> {
  const card = await IdCard.findOne({ $and: [{ _id: id }, await cardScope(requester)] });
  if (!card) throw ApiError.notFound('Card not found');
  if (card.status !== 'Active')
    throw ApiError.conflict(`Only an Active card can be reported lost (this one is ${card.status})`);
  const updated = await repo.setActiveStatus(id, 'Lost', requester.id, input.expectedUpdatedAt, input.reason);
  if (!updated) throw ApiError.conflict('Only an Active card can be reported lost');
  await logAudit(`Reported ID card ${updated.serial} lost`, 'ID Cards', requester.id, 'Warning');
  return updated;
}

export async function revoke(
  id: string,
  requester: AuthenticatedUser,
  input: { expectedUpdatedAt?: string; reason?: string } = {},
): Promise<IIdCard> {
  const card = await IdCard.findOne({ $and: [{ _id: id }, await cardScope(requester)] });
  if (!card) throw ApiError.notFound('Card not found');
  if (card.status !== 'Active')
    throw ApiError.conflict(`Only an Active card can be revoked (this one is ${card.status})`);
  const updated = await repo.setActiveStatus(id, 'Revoked', requester.id, input.expectedUpdatedAt, input.reason);
  if (!updated) throw ApiError.conflict('Only an Active card can be revoked');
  await logAudit(`Revoked ID card ${updated.serial}`, 'ID Cards', requester.id, 'Critical');
  return updated;
}

export async function cardScope(requester: AuthenticatedUser): Promise<FilterQuery<IIdCard>> {
  if (['Administrator', 'Principal', 'Teacher'].includes(requester.role)) return {};
  if (['Parent', 'Student'].includes(requester.role)) {
    const ids = await Student.find(
      requester.role === 'Parent' ? { guardianUserId: requester.id } : { studentUserId: requester.id },
    ).distinct('_id');
    return { subjectType: 'Student', subject: { $in: ids } };
  }
  if (requester.role === 'Accountant')
    return { subjectType: 'Staff', subject: { $in: await Staff.find({ userId: requester.id }).distinct('_id') } };
  return { _id: { $in: [] } };
}
export async function cardPdf(id: string, requester: AuthenticatedUser) {
  const card = await IdCard.findOne({ $and: [{ _id: id }, await cardScope(requester)] }).populate(
    'subject',
    'name refId grade designation',
  );
  if (!card) throw ApiError.notFound('Card not found');
  const holder = card.subject as unknown as { name: string; refId: string; grade?: string; designation?: string };
  if (!holder) throw ApiError.notFound('Card holder record is unavailable');
  const effective =
    card.status === 'Active' && card.expiryDate.toISOString().slice(0, 10) < (await schoolToday())
      ? 'Expired'
      : card.status;
  const settings = await getSettings();
  return recordPdf(settings.schoolName, 'School ID card record', [
    'Holder: ' + holder.name,
    'Reference: ' + holder.refId,
    'Type: ' + card.subjectType,
    'Grade / designation: ' + (holder.grade || holder.designation || 'Not recorded'),
    'Serial: ' + card.serial,
    'Issued: ' + card.issuedDate.toISOString().slice(0, 10),
    'Expiry: ' + card.expiryDate.toISOString().slice(0, 10),
    'Status: ' + effective,
    'This is a registry record copy; it does not encode a gate-access credential.',
  ]);
}
