import { FilterQuery } from 'mongoose';
import { Payslip, IPayslip } from '../../models/Payslip';
import { Staff } from '../../models/Staff';
import { ListPayslipsQuery } from './payroll.validation';

export async function findMany(
  query: ListPayslipsQuery,
  applyOwnershipScope: (base: FilterQuery<IPayslip>) => FilterQuery<IPayslip>,
): Promise<{ items: IPayslip[]; total: number }> {
  let filter: FilterQuery<IPayslip> = {};
  if (query.staffId) filter.staff = query.staffId;
  if (query.month) filter.month = query.month;
  if (query.status) filter.status = query.status;
  filter = applyOwnershipScope(filter);

  const skip = (query.page - 1) * query.limit;
  const [items, total] = await Promise.all([
    Payslip.find(filter).sort({ month: -1 }).skip(skip).limit(query.limit).populate('staff', 'name refId designation'),
    Payslip.countDocuments(filter),
  ]);
  return { items, total };
}

export function upsertPayslip(
  staffId: string,
  month: string,
  basicSalary: number,
  allowances: number,
  deductions: number,
): Promise<IPayslip> {
  const netPay = basicSalary + allowances - deductions;
  return Payslip.findOneAndUpdate(
    // The condition makes the paid-period lock database-enforced as well as service-enforced:
    // a concurrent payment can never be silently reverted to Processed by a late payroll rerun.
    { staff: staffId, month, status: { $ne: 'Paid' } },
    { basicSalary, allowances, deductions, netPay, status: 'Processed' },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true },
  ) as Promise<IPayslip>;
}

export function markPaid(id: string): Promise<IPayslip | null> {
  return Payslip.findOneAndUpdate({ _id: id, status: 'Processed' }, { status: 'Paid', paidDate: new Date() }, { new: true });
}

export function findById(id: string): Promise<IPayslip | null> {
  return Payslip.findById(id);
}

export function findByStaffAndMonth(staffId: string, month: string): Promise<IPayslip | null> {
  return Payslip.findOne({ staff: staffId, month });
}

export function findOwnStaffId(userId: string) {
  return Staff.findOne({ userId })
    .select('_id')
    .then((staff) => staff?._id ?? null);
}

export function findStaffById(id: string) {
  return Staff.findById(id).select('_id refId name status');
}
