import { calendarDate } from '../../src/modules/attendance/attendance.dates';
describe('School calendar dates', () => {
  it('uses the configured school day across UTC midnight', () => {
    const date = new Date('2026-09-01T22:30:00Z');
    expect(calendarDate(date, 'Asia/Dubai')).toBe('2026-09-02');
    expect(calendarDate(date, 'America/Los_Angeles')).toBe('2026-09-01');
  });
  it('handles year boundaries and timezones with daylight saving', () => {
    expect(calendarDate(new Date('2026-12-31T23:30:00Z'), 'Asia/Kolkata')).toBe('2027-01-01');
    expect(calendarDate(new Date('2026-07-01T02:00:00Z'), 'America/New_York')).toBe('2026-06-30');
  });
});
