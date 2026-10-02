import { rangesOverlap, isValidTimeRange } from '../../src/modules/facilities/facilities.overlap';

describe('rangesOverlap', () => {
  it('detects a clear overlap', () => {
    expect(rangesOverlap('09:00', '10:00', '09:30', '10:30')).toBe(true);
  });

  it('detects one range fully containing another', () => {
    expect(rangesOverlap('09:00', '12:00', '10:00', '11:00')).toBe(true);
    expect(rangesOverlap('10:00', '11:00', '09:00', '12:00')).toBe(true); // symmetric
  });

  it('detects identical ranges as overlapping', () => {
    expect(rangesOverlap('09:00', '10:00', '09:00', '10:00')).toBe(true);
  });

  it('does NOT count touching endpoints as overlapping - one ending exactly when the other starts is fine', () => {
    expect(rangesOverlap('09:00', '10:00', '10:00', '11:00')).toBe(false);
    expect(rangesOverlap('10:00', '11:00', '09:00', '10:00')).toBe(false); // symmetric
  });

  it('does not overlap when ranges are genuinely separate', () => {
    expect(rangesOverlap('09:00', '10:00', '14:00', '15:00')).toBe(false);
  });

  it('handles adjacent-but-not-touching ranges correctly (a gap between them)', () => {
    expect(rangesOverlap('09:00', '10:00', '10:01', '11:00')).toBe(false);
  });
});

describe('isValidTimeRange', () => {
  it('accepts a range where start is before end', () => {
    expect(isValidTimeRange('09:00', '10:00')).toBe(true);
  });

  it('rejects a range where start equals end', () => {
    expect(isValidTimeRange('09:00', '09:00')).toBe(false);
  });

  it('rejects a range where start is after end', () => {
    expect(isValidTimeRange('10:00', '09:00')).toBe(false);
  });
});
