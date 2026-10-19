import { Payslip } from '../../models/Payslip';
import { AuthenticatedUser } from '../../middleware/auth';
import { ApiError } from '../../utils/ApiError';
import { recordPdf } from '../../utils/recordPdf';
import { getSettings } from '../settings/settings.repository';
import { scopePayslipFilter } from './payroll.ownership';
import { findOwnStaffId } from './payroll.repository';
export async function payslipPdf(id: string, user: AuthenticatedUser) {
  const own = user.role === 'Teacher' ? await findOwnStaffId(user.id) : null;
  const record = await Payslip.findOne(scopePayslipFilter({ _id: id }, user, own)).populate<{
    staff: { name: string; refId: string; designation: string };
  }>('staff', 'name refId designation');
  if (!record) throw ApiError.notFound('Payslip not found');
  const settings = await getSettings(),
    staff = record.employeeSnapshot || record.staff,
    amount = (n: number) => n.toFixed(2) + ' ' + (record.currency || 'AED');
  return recordPdf(settings.schoolName, 'Payslip — ' + record.month, [
    'Employee: ' + staff.name,
    'Employee reference: ' + staff.refId,
    'Designation: ' + staff.designation,
    'Period: ' + record.month,
    'Status: ' + record.status,
    'Basic salary: ' + amount(record.basicSalary),
    'Allowances: ' + amount(record.allowances),
    'Deductions: ' + amount(record.deductions),
    'Net pay: ' + amount(record.netPay),
    ...(record.status === 'Paid'
      ? [
          'Payment date: ' + record.paidDate?.toISOString().slice(0, 10),
          'Payment method: ' + record.paymentMethod,
          'Payment reference: ' + record.paymentReference,
        ]
      : ['Payment has not been recorded.']),
    'This document records payroll accounting; it does not initiate a bank transfer.',
  ]);
}
