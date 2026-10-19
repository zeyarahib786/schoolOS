import { ApiError } from '../../utils/ApiError';
import mongoose from 'mongoose';
import { User } from '../../models/User';
import { Staff, IStaff } from '../../models/Staff';
import * as repo from './staff.repository';
import { ListStaffQuery, CreateStaffInput, UpdateStaffInput, StaffAccountInput } from './staff.validation';
import { AuthenticatedUser } from '../../middleware/auth';
import { scopeStaffFilter, assertCanReadStaff } from './staff.ownership';
import { logAudit } from '../audit/audit.service';

export async function listStaff(query: ListStaffQuery, requester: AuthenticatedUser) {
  const { items, total } = await repo.findMany(query, (base) => scopeStaffFilter(base, requester));
  return {
    items: items.map((s) => staffView(s, requester)),
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

export async function getStaff(id: string, requester: AuthenticatedUser) {
  const staff = await repo.findById(id);
  if (!staff) throw ApiError.notFound('Staff record not found');
  assertCanReadStaff(staff, requester);
  return staffView(staff, requester);
}

export async function createStaff(input: CreateStaffInput, requester: AuthenticatedUser): Promise<IStaff> {
  const [existingRef, existingEmail] = await Promise.all([
    repo.findByRefId(input.refId),
    repo.findByEmail(input.email),
  ]);
  if (existingRef) throw ApiError.conflict(`A staff record with reference ${input.refId} already exists`);
  if (existingEmail) throw ApiError.conflict(`A staff record with email ${input.email} already exists`);
  const created = await repo.create(input);
  await logAudit(`Created staff record ${created.refId} (${created.name})`, 'Staff & HR', requester.id);
  return created;
}

export async function updateStaff(id: string, input: UpdateStaffInput, requester: AuthenticatedUser): Promise<IStaff> {
  const current = await repo.findById(id);
  if (!current) throw ApiError.notFound('Staff record not found');
  if (input.email) {
    const existing = await repo.findByEmail(input.email);
    if (existing && existing._id.toString() !== id)
      throw ApiError.conflict(`A staff record with email ${input.email} already exists`);
  }
  if (input.status === 'Active' && current.status === 'Onboarding') {
    const required = ['id', 'degree', 'photo'];
    if (!required.every((key) => current.documents.some((document) => document.key === key)))
      throw ApiError.badRequest('Required onboarding documents must be uploaded before activation');
    if (!current.onboarding.every((task) => task.done))
      throw ApiError.badRequest('Complete all onboarding tasks before activation');
  }
  if (current.updatedAt.toISOString() !== input.expectedUpdatedAt)
    throw ApiError.conflict('Staff profile changed; refresh before saving');
  if (input.refId && input.refId !== current.refId && (await repo.findByRefId(input.refId)))
    throw ApiError.conflict('Staff reference already exists');
  const { expectedUpdatedAt, changeReason, ...changes } = input;
  const updated = await Staff.findOneAndUpdate(
    { _id: id, updatedAt: new Date(expectedUpdatedAt) },
    {
      $set: changes,
      $push: {
        profileHistory: {
          changedAt: new Date(),
          changedBy: requester.id,
          reason: changeReason,
          fromStatus: current.status,
          toStatus: input.status || current.status,
          previousLeaveBalance: current.annualLeaveRemaining,
          leaveBalance: input.annualLeaveRemaining ?? current.annualLeaveRemaining,
        },
      },
    },
    { new: true, runValidators: true },
  );
  if (!updated) throw ApiError.conflict('Staff profile changed; refresh before saving');
  await logAudit(
    `Updated staff record ${updated.refId}`,
    'Staff & HR',
    requester.id,
    input.status === 'Inactive' ? 'Warning' : 'Info',
  );
  return updated;
}

export async function deleteStaff(id: string, requester: AuthenticatedUser): Promise<void> {
  const dependencyCount = await repo.countDependencies(id);
  if (dependencyCount > 0)
    throw ApiError.conflict(
      'This staff record has operational history and cannot be deleted; set it to Inactive instead',
    );
  const deleted = await repo.deleteById(id);
  if (!deleted) throw ApiError.notFound('Staff record not found');
  await logAudit(`Deleted staff record ${deleted.refId}`, 'Staff & HR', requester.id, 'Warning');
}

function staffView(staff: IStaff, user: AuthenticatedUser) {
  const row = staff.toObject();
  if (user.role === 'Accountant' && String(staff.userId) !== user.id) {
    row.documents = [];
    row.onboarding = [];
    row.profileHistory = [];
  }
  return row;
}
export async function linkStaffAccount(id: string, input: StaffAccountInput, user: AuthenticatedUser) {
  const session = await mongoose.startSession();
  let result: IStaff | null = null;
  try {
    await session.withTransaction(async () => {
      const current = await Staff.findById(id).session(session);
      if (!current) throw ApiError.notFound('Staff record not found');
      if (current.updatedAt.toISOString() !== input.expectedUpdatedAt)
        throw ApiError.conflict('Staff profile changed; refresh before saving');
      const account = input.email
        ? await User.findOne({
            email: input.email.toLowerCase(),
            isActive: true,
            role: { $in: ['Administrator', 'Principal', 'Teacher', 'Accountant'] },
          }).session(session)
        : null;
      if (input.email && !account) throw ApiError.badRequest('Choose an existing active staff-role account');
      if (account) await User.updateOne({ _id: account._id }, { $inc: { __v: 1 } }, { session });
      if (account && (await Staff.exists({ _id: { $ne: id }, userId: account._id }).session(session)))
        throw ApiError.conflict('This account is already linked to another staff profile');
      result = await Staff.findOneAndUpdate(
        { _id: id, updatedAt: new Date(input.expectedUpdatedAt) },
        {
          ...(account ? { $set: { userId: account._id } } : { $unset: { userId: 1 } }),
          $push: {
            profileHistory: {
              changedAt: new Date(),
              changedBy: user.id,
              reason: input.reason,
              fromStatus: current.status,
              toStatus: current.status,
            },
          },
        },
        { new: true, session },
      );
      if (!result) throw ApiError.conflict('Staff profile changed; refresh before saving');
    });
  } finally {
    await session.endSession();
  }
  await logAudit('Updated staff account link ' + id, 'Staff & HR', user.id);
  return result;
}
