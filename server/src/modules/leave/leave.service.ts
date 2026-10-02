import { Types } from 'mongoose';
import { ApiError } from '../../utils/ApiError';
import { ILeaveRequest } from '../../models/LeaveRequest';
import * as repo from './leave.repository';
import { ListLeaveQuery, RequestLeaveInput, DecideLeaveInput } from './leave.validation';
import { AuthenticatedUser } from '../../middleware/auth';
import { scopeLeaveFilter, canDecideLeave } from './leave.ownership';
import { inclusiveLeaveDays } from './leave.days';
import { logAudit } from '../audit/audit.service';

export async function listLeave(query: ListLeaveQuery, requester: AuthenticatedUser) {
  const ownStaff = await repo.findStaffByUserId(requester.id);
  const { items, total } = await repo.findMany(query, (base) =>
    scopeLeaveFilter(base, requester, ownStaff?._id ?? null),
  );
  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

export async function requestLeave(input: RequestLeaveInput, requester: AuthenticatedUser): Promise<ILeaveRequest> {
  const ownStaff = await repo.findStaffByUserId(requester.id);
  const canRequestForAnotherStaffMember = requester.role === 'Administrator' || requester.role === 'Principal';
  let staff = ownStaff;
  if (input.staffId) {
    if (!canRequestForAnotherStaffMember && (!ownStaff || ownStaff._id.toString() !== input.staffId))
      throw ApiError.forbidden('You may request leave only for your own staff record');
    staff = await repo.findStaffById(input.staffId);
  }
  if (!staff) throw ApiError.badRequest('No staff record is linked to this request');
  if (staff.status === 'Inactive') throw ApiError.badRequest('Inactive staff cannot have leave requests');

  const fromDate = new Date(input.fromDate);
  const toDate = new Date(input.toDate);
  const days = inclusiveLeaveDays(fromDate, toDate);
  if (days < 1) throw ApiError.badRequest('The leave range must cover at least one day');

  const overlap = await repo.findOverlappingRequest(staff._id as Types.ObjectId, fromDate, toDate);
  if (overlap) throw ApiError.conflict('This leave request overlaps an existing pending or approved request');
  const created = await repo.create(staff._id as Types.ObjectId, fromDate, toDate, days, input.reason);
  await logAudit(`Requested ${days}-day leave for ${staff.name}`, 'Staff & HR', requester.id);
  return created;
}

export async function decideLeave(
  id: string,
  input: DecideLeaveInput,
  requester: AuthenticatedUser,
): Promise<ILeaveRequest> {
  if (!canDecideLeave(requester.role))
    throw ApiError.forbidden('Only Administrator or Principal may decide a leave request');

  const request = await repo.findById(id);
  if (!request) throw ApiError.notFound('Leave request not found');
  if (request.status !== 'Pending')
    throw ApiError.conflict(`This request has already been ${request.status.toLowerCase()}`);

  // Self-approval prevention, same principle as Expenses: an approver who is also staff cannot
  // decide their OWN leave - not even to deny it (a denial is still a decision about oneself).
  const ownStaff = await repo.findStaffByUserId(requester.id);
  if (ownStaff && (ownStaff._id as Types.ObjectId).equals(request.staff)) {
    throw ApiError.forbidden('You cannot decide your own leave request');
  }

  if (input.decision === 'Approved') {
    const deducted = await repo.deductLeaveBalanceIfSufficient(request.staff as Types.ObjectId, request.days);
    if (!deducted) throw ApiError.badRequest(`Insufficient leave balance for a ${request.days}-day leave`);
  }

  const updated = await repo.setDecision(id, input.decision, requester.id);
  if (!updated) throw ApiError.notFound('Leave request not found');
  await logAudit(`${input.decision} ${request.days}-day leave request`, 'Staff & HR', requester.id, input.decision === 'Denied' ? 'Warning' : 'Info');
  return updated;
}
