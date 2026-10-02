import { FilterQuery, Types } from 'mongoose';
import { LeaveRequest, ILeaveRequest } from '../../models/LeaveRequest';
import { Staff } from '../../models/Staff';
import { ListLeaveQuery } from './leave.validation';

export async function findMany(
  query: ListLeaveQuery,
  applyOwnershipScope: (base: FilterQuery<ILeaveRequest>) => FilterQuery<ILeaveRequest>,
): Promise<{ items: ILeaveRequest[]; total: number }> {
  let filter: FilterQuery<ILeaveRequest> = {};
  if (query.status) filter.status = query.status;
  filter = applyOwnershipScope(filter);

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    LeaveRequest.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.limit)
      .populate('staff', 'name refId department annualLeaveRemaining'),
    LeaveRequest.countDocuments(filter),
  ]);
  return { items, total };
}

export function findById(id: string): Promise<ILeaveRequest | null> {
  return LeaveRequest.findById(id);
}

export function create(
  staffId: Types.ObjectId,
  fromDate: Date,
  toDate: Date,
  days: number,
  reason: string,
): Promise<ILeaveRequest> {
  return LeaveRequest.create({ staff: staffId, fromDate, toDate, days, reason });
}

export function findStaffByUserId(userId: string) {
  return Staff.findOne({ userId });
}

export function findStaffById(id: string) {
  return Staff.findById(id);
}

export function findOverlappingRequest(staffId: Types.ObjectId, fromDate: Date, toDate: Date) {
  return LeaveRequest.findOne({
    staff: staffId,
    status: { $in: ['Pending', 'Approved'] },
    fromDate: { $lte: toDate },
    toDate: { $gte: fromDate },
  });
}

/**
 * Cafeteria's guarded-decrement technique applied at APPROVAL time: the balance check and the
 * deduction are one atomic findOneAndUpdate ($gte guard + $inc), so two approvers processing
 * two requests for the same staff member concurrently cannot jointly overdraw the leave balance -
 * whichever lands second finds the guard no longer satisfied and returns null. Returns the
 * updated Staff document, or null when the balance is insufficient at the moment of approval.
 */
export function deductLeaveBalanceIfSufficient(staffId: Types.ObjectId, days: number) {
  return Staff.findOneAndUpdate(
    { _id: staffId, annualLeaveRemaining: { $gte: days } },
    { $inc: { annualLeaveRemaining: -days } },
    { new: true },
  );
}

export function setDecision(
  id: string,
  decision: 'Approved' | 'Denied',
  decidedBy: string,
): Promise<ILeaveRequest | null> {
  return LeaveRequest.findByIdAndUpdate(id, { status: decision, decidedBy }, { new: true });
}
