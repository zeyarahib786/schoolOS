import { FilterQuery } from 'mongoose';
import { Staff, IStaff } from '../../models/Staff';
import { User } from '../../models/User';
import { LeaveRequest } from '../../models/LeaveRequest';
import { Payslip } from '../../models/Payslip';
import { ExpenseClaim } from '../../models/ExpenseClaim';
import { MeetingSlot } from '../../models/MeetingSlot';
import { Ticket } from '../../models/Ticket';
import { ListStaffQuery, CreateStaffInput, UpdateStaffInput } from './staff.validation';

export async function findMany(
  query: ListStaffQuery,
  applyOwnershipScope: (base: FilterQuery<IStaff>) => FilterQuery<IStaff>,
): Promise<{ items: IStaff[]; total: number }> {
  let filter: FilterQuery<IStaff> = {};
  if (query.department) filter.department = query.department;
  if (query.type) filter.type = query.type;
  if (query.status) filter.status = query.status;
  if (query.search) filter.$text = { $search: query.search };
  filter = applyOwnershipScope(filter);

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    Staff.find(filter).sort({ createdAt: -1 }).skip(skip).limit(query.limit),
    Staff.countDocuments(filter),
  ]);
  return { items, total };
}

export function findById(id: string): Promise<IStaff | null> {
  return Staff.findById(id);
}

export function findByRefId(refId: string): Promise<IStaff | null> {
  return Staff.findOne({ refId });
}

export function findByEmail(email: string): Promise<IStaff | null> {
  return Staff.findOne({ email: email.toLowerCase() });
}

export function create(input: CreateStaffInput): Promise<IStaff> {
  return User.findOne({ email: input.email.toLowerCase() }).select('_id').then((user) =>
    Staff.create({ ...input, userId: user?._id }),
  );
}

export function updateById(id: string, input: UpdateStaffInput): Promise<IStaff | null> {
  return Staff.findByIdAndUpdate(id, input, { new: true, runValidators: true });
}

export function deleteById(id: string): Promise<IStaff | null> {
  return Staff.findByIdAndDelete(id);
}

/** A real HR record cannot be removed while it is part of payroll, leave, claims, meeting or
 * support history. Those records must remain referentially meaningful for an audit. */
export async function countDependencies(id: string): Promise<number> {
  const [leave, payslips, expenses, meetings, tickets] = await Promise.all([
    LeaveRequest.countDocuments({ staff: id }), Payslip.countDocuments({ staff: id }),
    ExpenseClaim.countDocuments({ staff: id }), MeetingSlot.countDocuments({ teacher: id }),
    Ticket.countDocuments({ assignedTo: id }),
  ]);
  return leave + payslips + expenses + meetings + tickets;
}

export function linkAccountByEmail(userId: string, email: string) {
  return Staff.findOneAndUpdate({ email: email.toLowerCase(), userId: { $exists: false } }, { userId }, { new: true });
}
