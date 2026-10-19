import mongoose from 'mongoose';
import { ApiError } from '../../utils/ApiError';
import { LeaveRequest, ILeaveRequest } from '../../models/LeaveRequest';
import { Staff } from '../../models/Staff';
import * as repo from './leave.repository';
import { ListLeaveQuery, RequestLeaveInput, DecideLeaveInput } from './leave.validation';
import { AuthenticatedUser } from '../../middleware/auth';
import { scopeLeaveFilter, canDecideLeave } from './leave.ownership';
import { inclusiveLeaveDays } from './leave.days';
import { logAudit } from '../audit/audit.service';
const staffRole = (user: AuthenticatedUser) =>
  ['Administrator', 'Principal', 'Teacher', 'Accountant'].includes(user.role);
export async function listLeave(query: ListLeaveQuery, user: AuthenticatedUser) {
  const own = staffRole(user) ? await repo.findStaffByUserId(user.id) : null;
  const { items, total } = await repo.findMany(query, (base) => scopeLeaveFilter(base, user, own?._id ?? null));
  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}
export async function requestLeave(input: RequestLeaveInput, user: AuthenticatedUser): Promise<ILeaveRequest> {
  if (!staffRole(user)) throw ApiError.forbidden('Only staff-role accounts may request leave');
  const session = await mongoose.startSession();
  let created: ILeaveRequest | undefined;
  try {
    await session.withTransaction(async () => {
      const own = await Staff.findOne({ userId: user.id }).session(session);
      const staff = input.staffId ? await Staff.findById(input.staffId).session(session) : own;
      if (input.staffId && !canDecideLeave(user.role) && String(own?._id) !== input.staffId)
        throw ApiError.forbidden('You may request leave only for your own staff record');
      if (!staff) throw ApiError.badRequest('No staff record is linked to this request');
      if (staff.status === 'Inactive') throw ApiError.badRequest('Inactive staff cannot have leave requests');
      const fromDate = new Date(input.fromDate),
        toDate = new Date(input.toDate),
        days = inclusiveLeaveDays(fromDate, toDate);
      if (days < 1 || days > 366) throw ApiError.badRequest('Leave must cover 1–366 calendar days');
      // Serialize requests for this employee so overlap checks cannot race.
      await Staff.updateOne({ _id: staff._id }, { $inc: { __v: 1 } }, { session });
      if (
        await LeaveRequest.exists({
          staff: staff._id,
          status: { $in: ['Pending', 'Approved'] },
          fromDate: { $lte: toDate },
          toDate: { $gte: fromDate },
        }).session(session)
      )
        throw ApiError.conflict('This leave overlaps an existing pending or approved request');
      [created] = await LeaveRequest.create(
        [{ staff: staff._id, fromDate, toDate, days, reason: input.reason, type: input.type }],
        { session },
      );
    });
  } finally {
    await session.endSession();
  }
  if (!created) throw ApiError.internal('Leave request could not be saved');
  await logAudit('Requested leave ' + created._id, 'Staff & HR', user.id);
  return created;
}
export async function decideLeave(
  id: string,
  input: DecideLeaveInput,
  user: AuthenticatedUser,
): Promise<ILeaveRequest> {
  if (!canDecideLeave(user.role)) throw ApiError.forbidden('Only Administrator or Principal may decide leave');
  const session = await mongoose.startSession();
  let result: ILeaveRequest | null = null;
  try {
    await session.withTransaction(async () => {
      const current = await LeaveRequest.findById(id).session(session);
      if (!current) throw ApiError.notFound('Leave request not found');
      if (current.status !== 'Pending') throw ApiError.conflict('This request is no longer pending');
      const staff = await Staff.findById(current.staff).session(session);
      if (!staff) throw ApiError.notFound('Staff record not found');
      if (String(staff.userId) === user.id) throw ApiError.forbidden('You cannot decide your own leave request');
      if (input.decision === 'Approved') {
        if (staff.status === 'Inactive') throw ApiError.conflict('Inactive staff leave cannot be approved');
        if (!current.type || current.type === 'Annual leave') {
          const deducted = await Staff.updateOne(
            { _id: staff._id, annualLeaveRemaining: { $gte: current.days } },
            { $inc: { annualLeaveRemaining: -current.days } },
            { session },
          );
          if (deducted.modifiedCount !== 1) throw ApiError.badRequest('Insufficient annual leave balance');
        }
      }
      result = await LeaveRequest.findOneAndUpdate(
        { _id: id, status: 'Pending' },
        {
          $set: { status: input.decision, decidedBy: user.id, decidedAt: new Date(), decisionNote: input.note || '' },
          $push: {
            history: {
              at: new Date(),
              actor: user.id,
              from: 'Pending',
              to: input.decision,
              reason: input.note || 'Office decision recorded',
            },
          },
        },
        { new: true, session },
      );
      if (!result) throw ApiError.conflict('Leave decision changed');
    });
  } finally {
    await session.endSession();
  }
  if (!result) throw ApiError.internal('Leave decision could not be saved');
  await logAudit(input.decision + ' leave ' + id, 'Staff & HR', user.id);
  return result;
}
export async function cancelLeave(id: string, reason: string, user: AuthenticatedUser) {
  if (!staffRole(user)) throw ApiError.forbidden('Only staff may cancel leave');
  const session = await mongoose.startSession();
  let result: ILeaveRequest | null = null;
  try {
    await session.withTransaction(async () => {
      const current = await LeaveRequest.findById(id).session(session);
      if (!current) throw ApiError.notFound('Leave request not found');
      const staff = await Staff.findById(current.staff).session(session);
      if (!staff) throw ApiError.notFound('Staff record not found');
      if (!canDecideLeave(user.role) && String(staff.userId) !== user.id)
        throw ApiError.notFound('Leave request not found');
      if (!['Pending', 'Approved'].includes(current.status))
        throw ApiError.conflict('Only pending or approved leave can be cancelled');
      if (current.status === 'Approved' && !canDecideLeave(user.role))
        throw ApiError.forbidden('Approved leave cancellation requires school office review');
      if (current.status === 'Approved' && (!current.type || current.type === 'Annual leave'))
        await Staff.updateOne({ _id: staff._id }, { $inc: { annualLeaveRemaining: current.days } }, { session });
      result = await LeaveRequest.findOneAndUpdate(
        { _id: id, status: current.status },
        {
          $set: { status: 'Cancelled', decisionNote: reason, decidedAt: new Date(), decidedBy: user.id },
          $push: { history: { at: new Date(), actor: user.id, from: current.status, to: 'Cancelled', reason } },
        },
        { new: true, session },
      );
      if (!result) throw ApiError.conflict('Leave request changed');
    });
  } finally {
    await session.endSession();
  }
  await logAudit('Cancelled leave ' + id, 'Staff & HR', user.id);
  return result;
}
