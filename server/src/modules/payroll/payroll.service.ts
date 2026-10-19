import { getSettings } from '../settings/settings.repository';
import { ApiError } from '../../utils/ApiError';
import { Payslip, IPayslip } from '../../models/Payslip';
import * as repo from './payroll.repository';
import { ListPayslipsQuery, GeneratePayslipInput, PayPayslipInput } from './payroll.validation';
import { AuthenticatedUser } from '../../middleware/auth';
import { scopePayslipFilter, canManagePayroll } from './payroll.ownership';
import { schoolToday } from '../attendance/attendance.dates';
import { logAudit } from '../audit/audit.service';

export async function listPayslips(query: ListPayslipsQuery, requester: AuthenticatedUser) {
  const ownStaffId =
    requester.role === 'Administrator' || requester.role === 'Principal' || requester.role === 'Accountant'
      ? null
      : requester.role === 'Teacher'
        ? await repo.findOwnStaffId(requester.id)
        : null;

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
  const cents = (value: number) => Math.round(value * 100),
    earnings = cents(input.basicSalary) + cents(input.allowances),
    netPay = (earnings - cents(input.deductions)) / 100;
  if (cents(input.deductions) > earnings) throw ApiError.badRequest('Deductions cannot exceed total earnings');
  const existing = await repo.findByStaffAndMonth(input.staffId, input.month);
  if (input.expectedUpdatedAt && !existing)
    throw ApiError.conflict('Payslip period changed; open the correct saved record');
  if (existing?.status === 'Paid')
    throw ApiError.conflict(
      'A paid payslip cannot be regenerated; create an audited adjustment in a later payroll period',
    );
  if (existing && (!input.expectedUpdatedAt || existing.updatedAt.toISOString() !== input.expectedUpdatedAt))
    throw ApiError.conflict('Payslip changed; refresh and supply the current version');
  if (existing && !input.correctionReason) throw ApiError.badRequest('A correction reason is required');
  const values = {
    basicSalary: input.basicSalary,
    allowances: input.allowances,
    deductions: input.deductions,
    netPay,
    currency: existing?.currency || (await getSettings()).currency,
    status: 'Processed',
  };
  const payslip = existing
    ? await Payslip.findOneAndUpdate(
        { _id: existing._id, status: { $ne: 'Paid' }, updatedAt: new Date(input.expectedUpdatedAt!) },
        {
          $set: values,
          $push: {
            corrections: {
              at: new Date(),
              actor: requester.id,
              reason: input.correctionReason,
              previousNet: existing.netPay,
              net: netPay,
            },
          },
        },
        { new: true, runValidators: true },
      )
    : await Payslip.create({
        ...values,
        staff: input.staffId,
        month: input.month,
        employeeSnapshot: { name: staff.name, refId: staff.refId, designation: staff.designation },
      });
  if (!payslip) throw ApiError.conflict('Payslip changed or was paid; refresh before correcting');
  await logAudit(
    `${existing ? 'Recalculated' : 'Generated'} payslip for ${staff.name} (${input.month})`,
    'Payroll',
    requester.id,
  );
  return payslip;
}

export async function markPayslipPaid(
  id: string,
  input: PayPayslipInput,
  requester: AuthenticatedUser,
): Promise<IPayslip> {
  if (!canManagePayroll(requester.role))
    throw ApiError.forbidden('Only Administrator, Principal, or Accountant may mark a payslip as paid');
  const payslip = await repo.findById(id);
  if (!payslip) throw ApiError.notFound('Payslip not found');
  if (payslip.status === 'Paid') throw ApiError.conflict('This payslip has already been paid');
  if (input.paidDate > (await schoolToday())) throw ApiError.badRequest('Payment date cannot be in the future');
  if (payslip.updatedAt.toISOString() !== input.expectedUpdatedAt)
    throw ApiError.conflict('Payslip changed; refresh before recording payment');
  const updated = await Payslip.findOneAndUpdate(
    { _id: id, status: 'Processed', updatedAt: new Date(input.expectedUpdatedAt) },
    {
      $set: {
        status: 'Paid',
        paidDate: new Date(input.paidDate),
        paymentReference: input.paymentReference,
        paymentMethod: input.paymentMethod,
        paidBy: requester.id,
      },
    },
    { new: true, runValidators: true },
  );
  if (!updated) throw ApiError.conflict('This payslip is no longer available for payment');
  await logAudit(`Marked payslip ${updated._id.toString()} as paid`, 'Payroll', requester.id);
  return updated;
}
