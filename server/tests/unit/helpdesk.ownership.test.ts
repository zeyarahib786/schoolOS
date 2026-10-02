import { scopeTicketFilter, canResolveTickets } from '../../src/modules/helpdesk/helpdesk.ownership';
import { AuthenticatedUser } from '../../src/middleware/auth';

function makeUser(id: string, role: AuthenticatedUser['role']): AuthenticatedUser {
  return { id, role };
}

describe('scopeTicketFilter', () => {
  it('leaves the filter unrestricted for Administrator, Principal, and Teacher (support roles)', () => {
    for (const role of ['Administrator', 'Principal', 'Teacher'] as const) {
      expect(scopeTicketFilter({ status: 'Open' }, makeUser('any', role))).toEqual({ status: 'Open' });
    }
  });

  it('scopes a Parent to only tickets they personally raised, via a direct raisedBy match - no indirection needed', () => {
    const filter = scopeTicketFilter({}, makeUser('parent-id', 'Parent'));
    expect(filter).toEqual({ raisedBy: 'parent-id' });
  });

  it('scopes an Accountant (a staff role, but not a support role here) to only their own raised tickets', () => {
    const filter = scopeTicketFilter({}, makeUser('accountant-id', 'Accountant'));
    expect(filter).toEqual({ raisedBy: 'accountant-id' });
  });
});

describe('canResolveTickets', () => {
  it('allows Administrator, Principal, and Teacher to resolve tickets', () => {
    expect(canResolveTickets('Administrator')).toBe(true);
    expect(canResolveTickets('Principal')).toBe(true);
    expect(canResolveTickets('Teacher')).toBe(true);
  });

  it('denies Accountant, Parent, and Student from resolving tickets - they can only raise and view their own', () => {
    expect(canResolveTickets('Accountant')).toBe(false);
    expect(canResolveTickets('Parent')).toBe(false);
    expect(canResolveTickets('Student')).toBe(false);
  });
});
