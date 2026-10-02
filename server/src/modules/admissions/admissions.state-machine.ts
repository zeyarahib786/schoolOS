export type ApplicationStatus = 'Applied' | 'Shortlisted' | 'Interviewed' | 'Accepted' | 'Enrolled' | 'Rejected' | 'Waitlisted';

/** The first BRANCHING state machine in this codebase - Helpdesk's is linear-with-reopen and
 * Inventory's is strictly linear, but here `Rejected` is reachable from THREE different states
 * (an application can be turned down at any pre-acceptance stage), while `Accepted` is reachable
 * only by walking the full pipeline, and `Enrolled` only from `Accepted`. Both `Enrolled` and
 * `Rejected` are terminal - an enrolled child is a Student now (their record lives in the
 * Students module), and a rejection is final at this layer (a re-application would be a NEW
 * application document, preserving the history of the first). */
const ALLOWED_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  Applied: ['Shortlisted', 'Rejected', 'Waitlisted'],
  Shortlisted: ['Interviewed', 'Rejected', 'Waitlisted'],
  Interviewed: ['Accepted', 'Rejected', 'Waitlisted'],
  Accepted: ['Enrolled'],
  Enrolled: [],
  Rejected: [],
  Waitlisted: ['Applied', 'Shortlisted', 'Interviewed', 'Accepted', 'Rejected'],
};

export function canTransitionApplication(from: ApplicationStatus, to: ApplicationStatus): boolean {
  if (from === to) return false;
  return ALLOWED_TRANSITIONS[from].includes(to);
}
