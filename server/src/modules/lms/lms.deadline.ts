/** Pure deadline comparison, no DB dependency - separated from the write path the same way
 * every other piece of business logic in this codebase is. A submission is late if it happens
 * strictly after the due date/time; a submission at the exact due instant is on time (matching
 * Facilities' "touching endpoints don't overlap" reasoning - the boundary itself belongs to the
 * earlier side, not the later one). */
export function isSubmissionLate(submittedAt: Date, dueDate: Date): boolean {
  return submittedAt.getTime() > dueDate.getTime();
}
