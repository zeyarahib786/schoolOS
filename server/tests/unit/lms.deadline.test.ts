import { isSubmissionLate } from '../../src/modules/lms/lms.deadline';

describe('isSubmissionLate', () => {
  it('returns false for a submission before the due date', () => {
    expect(isSubmissionLate(new Date('2026-06-10T10:00:00Z'), new Date('2026-06-14T23:59:00Z'))).toBe(false);
  });

  it('returns true for a submission after the due date', () => {
    expect(isSubmissionLate(new Date('2026-06-15T00:01:00Z'), new Date('2026-06-14T23:59:00Z'))).toBe(true);
  });

  it("treats a submission at the EXACT due instant as on time, not late - matching Facilities' touching-endpoints reasoning", () => {
    const due = new Date('2026-06-14T23:59:00Z');
    expect(isSubmissionLate(new Date(due.getTime()), due)).toBe(false);
  });

  it('returns true for a submission even one millisecond after the due instant', () => {
    const due = new Date('2026-06-14T23:59:00.000Z');
    const oneMsLate = new Date(due.getTime() + 1);
    expect(isSubmissionLate(oneMsLate, due)).toBe(true);
  });
});
