export type POStatus = 'Draft' | 'Sent' | 'Received' | 'Cancelled';

/** Simpler than Helpdesk's ticket graph (no reopen path - a Received PO can never go back to
 * Sent or Draft, since stock has already been physically added and there's no meaningful "undo"
 * at this layer; a real correction would be a separate adjustment, not a status rewind). Still a
 * genuine state machine, not just a role check: whether a transition is valid depends on the
 * PO's current status. */
const ALLOWED_TRANSITIONS: Record<POStatus, POStatus[]> = {
  Draft: ['Sent', 'Cancelled'],
  Sent: ['Received', 'Cancelled'],
  Received: [],
  Cancelled: [],
};

export function canTransitionPO(from: POStatus, to: POStatus): boolean {
  if (from === to) return false;
  return ALLOWED_TRANSITIONS[from].includes(to);
}
