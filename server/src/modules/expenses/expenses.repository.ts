import { FilterQuery } from 'mongoose';
import { ExpenseClaim, IExpenseClaim } from '../../models/ExpenseClaim';
import { Staff } from '../../models/Staff';
import { ListClaimsQuery, SubmitClaimInput } from './expenses.validation';

export async function findMany(
  query: ListClaimsQuery,
  applyOwnershipScope: (base: FilterQuery<IExpenseClaim>) => FilterQuery<IExpenseClaim>,
): Promise<{ items: IExpenseClaim[]; total: number }> {
  let filter: FilterQuery<IExpenseClaim> = {};
  if (query.status) filter.status = query.status;
  if (query.category) filter.category = query.category;
  filter = applyOwnershipScope(filter);

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    ExpenseClaim.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(query.limit)
      .populate('staff', 'name refId designation'),
    ExpenseClaim.countDocuments(filter),
  ]);
  return { items, total };
}

export function findById(id: string): Promise<IExpenseClaim | null> {
  return ExpenseClaim.findById(id);
}

export function create(staffId: string, input: SubmitClaimInput): Promise<IExpenseClaim> {
  return ExpenseClaim.create({
    staff: staffId,
    category: input.category,
    amount: input.amount,
    description: input.description,
    expenseDate: new Date(input.expenseDate),
  });
}

export function review(
  id: string,
  status: 'Approved' | 'Rejected',
  reviewedBy: string,
  reviewNotes?: string,
): Promise<IExpenseClaim | null> {
  return ExpenseClaim.findByIdAndUpdate(id, { status, reviewedBy, reviewNotes }, { new: true, runValidators: true });
}

export function findOwnStaffId(userId: string) {
  return Staff.findOne({ userId })
    .select('_id')
    .then((staff) => staff?._id ?? null);
}
