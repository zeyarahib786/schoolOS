import { Types } from 'mongoose';
import { scopePayslipFilter, canManagePayroll } from '../../src/modules/payroll/payroll.ownership';
import { AuthenticatedUser } from '../../src/middleware/auth';

function makeUser(id: string, role: AuthenticatedUser['role']): AuthenticatedUser {
  return { id, role };
}

const ownStaffId = new Types.ObjectId();

describe('scopePayslipFilter', () => {
  it('leaves the filter unrestricted for Administrator, Principal, and Accountant', () => {
    for (const role of ['Administrator', 'Principal', 'Accountant'] as const) {
      expect(scopePayslipFilter({ status: 'Paid' }, makeUser('any', role), null)).toEqual({ status: 'Paid' });
    }
  });

  it('scopes a Teacher to only their own linked payslips', () => {
    const filter = scopePayslipFilter({}, makeUser('teacher-id', 'Teacher'), ownStaffId);
    expect(filter).toEqual({ staff: ownStaffId });
  });

  it('scopes a Teacher with NO linked staff record to match nothing', () => {
    const filter = scopePayslipFilter({}, makeUser('teacher-id', 'Teacher'), null);
    expect(filter).toEqual({ _id: { $in: [] } });
  });

  it('never lets a caller-supplied staff filter escape the self-service scope', () => {
    const someoneElsesStaffId = new Types.ObjectId();
    const filter = scopePayslipFilter({ staff: someoneElsesStaffId }, makeUser('teacher-id', 'Teacher'), ownStaffId);
    expect(filter.staff).toEqual(ownStaffId); // own id wins, not the supplied one
  });
});

describe('family role payroll privacy', () => {
  it('denies a legacy family-to-staff link', () => {
    for (const role of ['Parent', 'Student'] as const)
      expect(scopePayslipFilter({}, makeUser('family', role), ownStaffId)).toEqual({ _id: { $in: [] } });
  });
});

describe('canManagePayroll', () => {
  it('allows Administrator, Principal, and Accountant to manage payroll', () => {
    expect(canManagePayroll('Administrator')).toBe(true);
    expect(canManagePayroll('Principal')).toBe(true);
    expect(canManagePayroll('Accountant')).toBe(true);
  });

  it('denies Teacher from managing payroll - Teacher can only READ their own, never write', () => {
    expect(canManagePayroll('Teacher')).toBe(false);
  });
});
