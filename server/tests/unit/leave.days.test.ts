import { inclusiveLeaveDays } from '../../src/modules/leave/leave.days';

describe('inclusiveLeaveDays', () => {
  it('THE BOUNDARY: a single-day leave (same from and to date) counts as 1 day, not 0', () => {
    expect(inclusiveLeaveDays(new Date('2026-07-06'), new Date('2026-07-06'))).toBe(1);
  });

  it('counts inclusively: Monday to Wednesday is 3 days', () => {
    expect(inclusiveLeaveDays(new Date('2026-07-06'), new Date('2026-07-08'))).toBe(3);
  });

  it('ignores time-of-day: 23:59 on the from-day to 00:01 on the next day is still 2 calendar days', () => {
    expect(inclusiveLeaveDays(new Date('2026-07-06T23:59:00Z'), new Date('2026-07-07T00:01:00Z'))).toBe(2);
  });

  it('returns 0 for an inverted range - rejected upstream by validation, never stored', () => {
    expect(inclusiveLeaveDays(new Date('2026-07-08'), new Date('2026-07-06'))).toBe(0);
  });

  it('spans a month boundary correctly (Jan 30 to Feb 2 is 4 days)', () => {
    expect(inclusiveLeaveDays(new Date('2026-01-30'), new Date('2026-02-02'))).toBe(4);
  });
});
