import { Types } from 'mongoose';
import { scopeIncidentFilter, canLogIncident } from '../../src/modules/behaviour/behaviour.ownership';
import { AuthenticatedUser } from '../../src/middleware/auth';

function makeUser(id: string, role: AuthenticatedUser['role']): AuthenticatedUser {
  return { id, role };
}

const childId = new Types.ObjectId();

describe('scopeIncidentFilter', () => {
  it('leaves the filter unrestricted for Administrator, Principal, and Teacher', () => {
    for (const role of ['Administrator', 'Principal', 'Teacher'] as const) {
      expect(scopeIncidentFilter({ severity: 'Minor' }, makeUser('any', role), [])).toEqual({ severity: 'Minor' });
    }
  });

  it("scopes a Parent to only their linked children's incidents", () => {
    const filter = scopeIncidentFilter({}, makeUser('parent-id', 'Parent'), [childId]);
    expect(filter).toEqual({ student: { $in: [childId] } });
  });
});

describe('canLogIncident', () => {
  it('allows Administrator, Principal, and Teacher to log incidents', () => {
    expect(canLogIncident('Administrator')).toBe(true);
    expect(canLogIncident('Principal')).toBe(true);
    expect(canLogIncident('Teacher')).toBe(true);
  });

  it('denies Accountant, Parent, and Student', () => {
    expect(canLogIncident('Accountant')).toBe(false);
    expect(canLogIncident('Parent')).toBe(false);
    expect(canLogIncident('Student')).toBe(false);
  });
});
