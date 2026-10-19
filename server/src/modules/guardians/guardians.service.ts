import mongoose from 'mongoose';
import { Guardian, IGuardian } from '../../models/Guardian';
import { Student } from '../../models/Student';
import { User } from '../../models/User';
import { AuthenticatedUser } from '../../middleware/auth';
import { ApiError } from '../../utils/ApiError';
import { logAudit } from '../audit/audit.service';
import * as repo from './guardians.repository';
import { ListBroadcastsQuery, ListGuardiansQuery, SendBroadcastInput } from './guardians.validation';

function guardianView(guardian: IGuardian, user: AuthenticatedUser) {
  const data = guardian.toObject();
  if (user.role === 'Parent') delete data.note;
  return data;
}

export async function listGuardians(query: ListGuardiansQuery, user: AuthenticatedUser) {
  const { items, total } = await repo.findMany(query, user.role === 'Parent' ? user.id : undefined);
  return {
    items: items.map((guardian) => guardianView(guardian, user)),
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

export async function setPortalStatus(id: string, status: 'Active' | 'Suspended', user: AuthenticatedUser) {
  const current = await Guardian.findById(id);
  if (!current) throw ApiError.notFound('Guardian not found');
  if (status === 'Active' && !current.userId)
    throw ApiError.badRequest('Link an existing Parent account before activating the portal');
  const guardian = await repo.updatePortal(id, status);
  if (!guardian) throw ApiError.notFound('Guardian not found');
  await logAudit(
    `${status === 'Active' ? 'Activated' : 'Suspended'} guardian portal ${guardian.refId}`,
    'Parents',
    user.id,
    status === 'Suspended' ? 'Warning' : 'Info',
  );
  return guardian;
}

export async function sendBroadcast(input: SendBroadcastInput, user: AuthenticatedUser) {
  if (input.channel !== 'In-app only')
    throw ApiError.badRequest('Email and SMS delivery are not configured; choose In-app only');
  const targets = await repo.findBroadcastTargets(input);
  if (!targets.length) throw ApiError.badRequest('No guardians match that audience');
  const target = input.audience === 'Individual guardian' ? targets[0] : undefined;
  const audienceLabel =
    input.audience +
    (input.grade ? ` - ${input.grade}` : '') +
    (input.className ? ` - ${input.className}` : '') +
    (target ? ` - ${target.name}` : '');
  const broadcast = await repo.createBroadcast(
    input,
    audienceLabel,
    targets.map((guardian) => guardian._id),
    user.id,
  );
  await logAudit(
    `Sent parent broadcast "${input.subject}" to ${targets.length} guardian${targets.length === 1 ? '' : 's'}`,
    'Communication',
    user.id,
  );
  return broadcast;
}

export async function listBroadcasts(query: ListBroadcastsQuery) {
  const { items, total } = await repo.listBroadcasts(query);
  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

export async function listMessages(id: string, user: AuthenticatedUser) {
  await readableGuardian(id, user);
  return repo.listMessages(id);
}

export async function sendMessage(id: string, text: string, user: AuthenticatedUser) {
  const guardian = await readableGuardian(id, user);
  const message = await repo.createMessage(
    id,
    text,
    user.id,
    user.role === 'Parent' ? guardian.name : `School - ${user.role}`,
    user.role === 'Parent' ? 'in' : 'out',
  );
  await logAudit(`Replied to guardian thread - ${guardian.refId}`, 'Communication', user.id);
  return message;
}

async function readableGuardian(id: string, user: AuthenticatedUser) {
  const guardian = await Guardian.findById(id);
  if (!guardian) throw ApiError.notFound('Guardian not found');
  if (user.role === 'Parent' && String(guardian.userId) !== user.id)
    throw ApiError.forbidden('Only your own guardian record is available');
  return guardian;
}
export async function getGuardian(id: string, user: AuthenticatedUser) {
  await readableGuardian(id, user);
  const guardian = await repo.findById(id, user.role === 'Parent' ? user.id : undefined);
  if (!guardian) throw ApiError.notFound('Guardian not found');
  return guardianView(guardian, user);
}

/** Keep the contact record and the existing single-primary-parent Student portal model
 * consistent in one transaction. Never overwrite another family's portal ownership. */
export async function saveGuardian(
  id: string | null,
  input: import('./guardians.validation').GuardianInput,
  user: AuthenticatedUser,
  expectedUpdatedAt?: string,
) {
  const session = await mongoose.startSession();
  let savedId = '';
  try {
    await session.withTransaction(async () => {
      const guardian = id ? await Guardian.findById(id).session(session) : new Guardian({ refId: input.refId });
      if (!guardian) throw ApiError.notFound('Guardian not found');
      if (id && guardian.updatedAt.toISOString() !== expectedUpdatedAt)
        throw ApiError.conflict('Guardian changed; refresh before saving');
      const ids = input.studentIds;
      if ((await Student.countDocuments({ _id: { $in: ids } }).session(session)) !== ids.length)
        throw ApiError.badRequest('One or more linked students no longer exist');
      if (guardian.userId) {
        if (
          await Student.exists({
            _id: { $in: ids },
            guardianUserId: { $exists: true, $nin: [null, guardian.userId] },
          }).session(session)
        )
          throw ApiError.conflict(
            'A selected child already has another Parent portal account. Resolve its existing link first',
          );
        await Student.updateMany(
          { _id: { $in: guardian.studentIds, $nin: ids }, guardianUserId: guardian.userId },
          { $unset: { guardianUserId: 1 } },
          { session },
        );
        await Student.updateMany({ _id: { $in: ids } }, { $set: { guardianUserId: guardian.userId } }, { session });
      }
      guardian.set({ ...input, email: input.email || undefined, note: input.note || undefined });
      await guardian.save({ session });
      savedId = guardian._id.toString();
    });
  } finally {
    await session.endSession();
  }
  await logAudit(
    `${id ? 'Updated' : 'Created'} guardian ${input.name}; linked children and recorded consents saved`,
    'Parents',
    user.id,
  );
  return repo.findById(savedId);
}

export async function linkGuardianAccount(
  id: string,
  parentEmail: string | null,
  expectedUpdatedAt: string,
  user: AuthenticatedUser,
) {
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const guardian = await Guardian.findById(id).session(session);
      if (!guardian) throw ApiError.notFound('Guardian not found');
      if (guardian.updatedAt.toISOString() !== expectedUpdatedAt)
        throw ApiError.conflict('Guardian changed; refresh before linking');
      const account = parentEmail
        ? await User.findOne({ email: parentEmail, role: 'Parent', isActive: true }).session(session)
        : null;
      if (parentEmail && !account) throw ApiError.badRequest('No active Parent account matches that email');
      if (account && (await Guardian.exists({ userId: account._id, _id: { $ne: id } }).session(session)))
        throw ApiError.conflict('This Parent account already has a guardian record');
      if (
        account &&
        (await Student.exists({
          _id: { $in: guardian.studentIds },
          guardianUserId: { $exists: true, $nin: [null, account._id, guardian.userId] },
        }).session(session))
      )
        throw ApiError.conflict(
          'A linked child already belongs to another Parent portal account. Resolve its existing link first',
        );
      if (guardian.userId)
        await Student.updateMany(
          { _id: { $in: guardian.studentIds }, guardianUserId: guardian.userId },
          { $unset: { guardianUserId: 1 } },
          { session },
        );
      if (account)
        await Student.updateMany(
          { _id: { $in: guardian.studentIds } },
          { $set: { guardianUserId: account._id } },
          { session },
        );
      guardian.userId = account?._id || null;
      guardian.portalStatus = account ? 'Active' : 'Invited';
      await guardian.save({ session });
    });
  } finally {
    await session.endSession();
  }
  await logAudit(`${parentEmail ? 'Linked' : 'Unlinked'} Parent portal account for guardian ${id}`, 'Parents', user.id);
  return repo.findById(id);
}
