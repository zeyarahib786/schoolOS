import { Types } from 'mongoose';
import { scopeCertificateFilter, canIssueCertificates } from '../../src/modules/certificates/certificates.ownership';
import { AuthenticatedUser } from '../../src/middleware/auth';

function makeUser(id: string, role: AuthenticatedUser['role']): AuthenticatedUser {
  return { id, role };
}

const childId = new Types.ObjectId();

describe('scopeCertificateFilter', () => {
  it('leaves the filter unrestricted for Administrator, Principal, and Teacher', () => {
    for (const role of ['Administrator', 'Principal', 'Teacher'] as const) {
      expect(scopeCertificateFilter({ type: 'Transfer' }, makeUser('any', role), [])).toEqual({ type: 'Transfer' });
    }
  });

  it("scopes a Parent to only issued certificates for their linked children", () => {
    const filter = scopeCertificateFilter({}, makeUser('parent-id', 'Parent'), [childId]);
    expect(filter).toEqual({
      student: { $in: [childId] },
      $or: [{ status: 'Issued' }, { status: { $exists: false } }],
    });
  });
});

describe('canIssueCertificates', () => {
  it('allows Administrator, Principal, and Teacher to issue certificates', () => {
    expect(canIssueCertificates('Administrator')).toBe(true);
    expect(canIssueCertificates('Principal')).toBe(true);
    expect(canIssueCertificates('Teacher')).toBe(true);
  });

  it('denies Accountant, Parent, and Student', () => {
    expect(canIssueCertificates('Accountant')).toBe(false);
    expect(canIssueCertificates('Parent')).toBe(false);
    expect(canIssueCertificates('Student')).toBe(false);
  });
});
