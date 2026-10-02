import { Types } from 'mongoose';
import { scopeRoomFilter, canManageHostel } from '../../src/modules/hostel/hostel.ownership';
import { AuthenticatedUser } from '../../src/middleware/auth';

function makeUser(id: string, role: AuthenticatedUser['role']): AuthenticatedUser {
  return { id, role };
}

const childId = new Types.ObjectId();

describe('scopeRoomFilter', () => {
  it('leaves the filter unrestricted for Administrator, Principal, and Teacher', () => {
    for (const role of ['Administrator', 'Principal', 'Teacher'] as const) {
      expect(scopeRoomFilter({}, makeUser('any', role), [])).toEqual({});
    }
  });

  it('scopes a Parent to rooms their linked child occupies', () => {
    const filter = scopeRoomFilter({}, makeUser('parent-id', 'Parent'), [childId]);
    expect(filter).toEqual({ occupants: { $in: [childId] } });
  });
});

describe('canManageHostel', () => {
  it('allows Administrator, Principal, and Teacher to manage hostel rooms', () => {
    expect(canManageHostel('Administrator')).toBe(true);
    expect(canManageHostel('Principal')).toBe(true);
    expect(canManageHostel('Teacher')).toBe(true);
  });

  it('denies Accountant, Parent, and Student', () => {
    expect(canManageHostel('Accountant')).toBe(false);
    expect(canManageHostel('Parent')).toBe(false);
    expect(canManageHostel('Student')).toBe(false);
  });
});
