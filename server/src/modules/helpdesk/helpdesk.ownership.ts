import { FilterQuery } from 'mongoose';
import { ITicket } from '../../models/Ticket';
import { AuthenticatedUser } from '../../middleware/auth';
import { Role } from '../../types/roles';

/** Support-staff roles see every ticket, needed to triage and assign work. Anyone else - Parent,
 * Student, or any staff member for a ticket they didn't raise - sees only tickets THEY raised, via
 * a direct `raisedBy` match (no indirection through Staff/Student the way Payroll/Attendance
 * needed - `raisedBy` is a User id, and every requester already has their own User id from the
 * JWT, so no extra DB lookup is needed to resolve "which records are mine" the way it was for
 * self-service Staff/Payroll scoping). */
const SUPPORT_ROLES: Role[] = ['Administrator', 'Principal', 'Teacher'];

export function scopeTicketFilter(base: FilterQuery<ITicket>, requester: AuthenticatedUser): FilterQuery<ITicket> {
  if (SUPPORT_ROLES.includes(requester.role)) {
    return base;
  }
  return { ...base, raisedBy: requester.id };
}

export function canResolveTickets(role: Role): boolean {
  return SUPPORT_ROLES.includes(role);
}
