import { Types } from 'mongoose';
import { scopeInvoiceFilter, canManageFees } from '../../src/modules/fees/fees.ownership';
import { AuthenticatedUser } from '../../src/middleware/auth';

function makeUser(id: string, role: AuthenticatedUser['role']): AuthenticatedUser {
  return { id, role };
}

const childId = new Types.ObjectId();

describe('scopeInvoiceFilter', () => {
  it('leaves the filter unrestricted for Administrator, Principal, and Accountant', () => {
    for (const role of ['Administrator', 'Principal', 'Accountant'] as const) {
      const filter = scopeInvoiceFilter({ status: 'Overdue' }, makeUser('any', role), []);
      expect(filter).toEqual({ status: 'Overdue' });
    }
  });

  it('scopes Teacher to their (empty, since Teachers have no linked children) authorized student list - Teacher has NO business reason to see fee data, unlike Attendance/Students where Teacher is unrestricted', () => {
    const filter = scopeInvoiceFilter({}, makeUser('teacher-id', 'Teacher'), []);
    expect(filter).toEqual({ $and: [{}, { student: { $in: [] } }] });
  });

  it("scopes a Parent to only their linked children's invoices", () => {
    const filter = scopeInvoiceFilter({}, makeUser('parent-id', 'Parent'), [childId]);
    expect(filter).toEqual({ $and: [{}, { student: { $in: [childId] } }] });
  });
});

describe('canManageFees', () => {
  it("allows Administrator, Principal, AND Accountant to manage fees - deliberately different from every other module's write-role set", () => {
    expect(canManageFees('Administrator')).toBe(true);
    expect(canManageFees('Principal')).toBe(true);
    expect(canManageFees('Accountant')).toBe(true);
  });

  it('denies Teacher from managing fees - the opposite of Students/Staff/Attendance, where Teacher IS a write role', () => {
    expect(canManageFees('Teacher')).toBe(false);
  });

  it('denies Parent and Student from managing fees', () => {
    expect(canManageFees('Parent')).toBe(false);
    expect(canManageFees('Student')).toBe(false);
  });
});
