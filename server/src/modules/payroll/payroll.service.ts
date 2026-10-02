import { ApiError } from '../../utils/ApiError';
import { IPayslip } from '../../models/Payslip';
import * as repo from './payroll.repository';
import { ListPayslipsQuery, GeneratePayslipInput } from './payroll.validation';
import { AuthenticatedUser } from '../../middleware/auth';
import { scopePayslipFilter, canManagePayroll } from './payroll.ownership';
import { logAudit } from '../audit/audit.service';

export async function listPayslips(query: ListPayslipsQuery, requester: AuthenticatedUser) {
  const ownStaffId =
    requester.role === 'Administrator' || requester.role === 'Principal' || requester.role === 'Accountant'
      ? null
      : await repo.findOwnStaffId(requester.id);

  const { items, total } = await repo.findMany(query, (base) => scopePayslipFilter(base, requester, ownStaffId));
  return {
    items,
    pagination: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) },
  };
}

/** Generating payroll for a staff member is an upsert per (staff, month) - re-running it for the
 * same month recalculates rather than creating a duplicate record, matching Exams' correction
 * pattern. Net pay is computed once here and stored (see Payslip.ts's comment on why this
 * module, unlike Exams, deliberately does store a derived value). */
export async function generatePayslip(input: GeneratePayslipInput, requester: AuthenticatedUser): Promise<IPayslip> {
  if (!canManagePayroll(requester.role))
    throw ApiError.forbidden('Only Administrator, Principal, or Accountant may generate payroll');
  const staff = await repo.findStaffById(input.staffId);
  if (!staff) throw ApiError.notFound('Staff record not found');
  if (staff.status === 'Inactive' || staff.status === 'Onboarding')
    throw ApiError.badRequest('Payroll can be generated only for an active or on-leave staff member');
  const earnings = input.basicSalary + input.allowances;
  if (input.deductions > earnings) throw ApiError.badRequest('Deductions cannot exceed total earnings');
  const existing = await repo.findByStaffAndMonth(input.staffId, input.month);
  if (existing?.status === 'Paid') throw ApiError.conflict('A paid payslip cannot be regenerated; create an audited adjustment in a later payroll period');
  const payslip = await repo.upsertPayslip(input.staffId, input.month, input.basicSalary, input.allowances, input.deductions);
  await logAudit(`${existing ? 'Recalculated' : 'Generated'} payslip for ${staff.name} (${input.month})`, 'Payroll', requester.id);
  return payslip;
}

export async function markPayslipPaid(id: string, requester: AuthenticatedUser): Promise<IPayslip> {
  if (!canManagePayroll(requester.role))
    throw ApiError.forbidden('Only Administrator, Principal, or Accountant may mark a payslip as paid');
  const payslip = await repo.findById(id);
  if (!payslip) throw ApiError.notFound('Payslip not found');
  if (payslip.status === 'Paid') throw ApiError.conflict('This payslip has already been paid');
  const updated = await repo.markPaid(id);
  if (!updated) throw ApiError.conflict('This payslip is no longer available for payment');
  await logAudit(`Marked payslip ${updated._id.toString()} as paid`, 'Payroll', requester.id);
  return updated;
}
