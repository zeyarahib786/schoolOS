import { Types } from 'mongoose';
import { scopeRouteFilter, canManageTransport } from '../../src/modules/transport/transport.ownership';
import { AuthenticatedUser } from '../../src/middleware/auth';

function makeUser(id: string, role: AuthenticatedUser['role']): AuthenticatedUser {
  return { id, role };
}

const childId = new Types.ObjectId();

describe('scopeRouteFilter', () => {
  it('leaves the filter unrestricted for Administrator, Principal, and Teacher', () => {
    for (const role of ['Administrator', 'Principal', 'Teacher'] as const) {
      expect(scopeRouteFilter({}, makeUser('any', role), [])).toEqual({});
    }
  });

  it('scopes a Parent to routes their linked child is assigned to', () => {
    const filter = scopeRouteFilter({}, makeUser('parent-id', 'Parent'), [childId]);
    expect(filter).toEqual({ assignedStudents: { $in: [childId] } });
  });
});

describe('canManageTransport', () => {
  it('allows Administrator, Principal, and Teacher to manage transport', () => {
    expect(canManageTransport('Administrator')).toBe(true);
    expect(canManageTransport('Principal')).toBe(true);
    expect(canManageTransport('Teacher')).toBe(true);
  });

  it('denies Accountant, Parent, and Student', () => {
    expect(canManageTransport('Accountant')).toBe(false);
    expect(canManageTransport('Parent')).toBe(false);
    expect(canManageTransport('Student')).toBe(false);
  });
});
