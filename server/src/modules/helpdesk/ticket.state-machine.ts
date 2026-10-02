export type TicketStatus = 'Open' | 'Assigned' | 'Resolved' | 'Closed';

/**
 * The valid transition graph for a ticket's lifecycle - a pure, unit-testable function with zero
 * DB dependency, the same pattern already proven for exam grading and ownership scoping. This is
 * the first module needing a genuine STATE MACHINE rather than a role check or an ownership
 * filter: whether a transition is valid depends on the ticket's CURRENT status, not just who's
 * asking or what they own.
 *
 * Open -> Assigned:   support staff picks it up
 * Assigned -> Resolved: support staff marks it fixed
 * Assigned -> Open:    unassign / bounce back (e.g. wrong team was assigned)
 * Resolved -> Closed:  confirmed fixed, ticket archived
 * Resolved -> Assigned: reopened - the fix didn't actually work, back to a support staff member
 * Closed -> anything:  NOTHING - closed is terminal. A recurring issue should be a new ticket,
 *                       not a reanimated old one, so history stays accurate.
 * Open -> Resolved:    NOT allowed - skipping "Assigned" would mean no one is accountable for
 *                       having actually worked the ticket before marking it fixed.
 */
const ALLOWED_TRANSITIONS: Record<TicketStatus, TicketStatus[]> = {
  Open: ['Assigned'],
  Assigned: ['Resolved', 'Open'],
  Resolved: ['Closed', 'Assigned'],
  Closed: [],
};

export function canTransition(from: TicketStatus, to: TicketStatus): boolean {
  if (from === to) return false; // a "transition" to the same status isn't a real transition
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function validTransitionsFrom(status: TicketStatus): TicketStatus[] {
  return ALLOWED_TRANSITIONS[status];
}
