import {
  computeAveragePercent,
  computeGrade,
  isPassing,
  DEFAULT_GRADE_SCALE,
} from '../../src/modules/exams/exams.grading';

describe('computeAveragePercent', () => {
  it('computes the correct percentage across multiple subjects', () => {
    const scores = [
      { subject: 'Mathematics', marks: 90 },
      { subject: 'Science', marks: 80 },
      { subject: 'English', marks: 70 },
    ];
    // (90+80+70) / (3*100) = 240/300 = 80%
    expect(computeAveragePercent(scores, 100)).toBe(80);
  });

  it('rounds to one decimal place, not more', () => {
    const scores = [
      { subject: 'Mathematics', marks: 91 },
      { subject: 'Science', marks: 88 },
      { subject: 'English', marks: 79 },
    ];
    // (91+88+79)/(300) = 258/300 = 86.0%
    expect(computeAveragePercent(scores, 100)).toBe(86);
  });

  it('returns 0 for an empty scores array, never NaN or a divide-by-zero crash', () => {
    expect(computeAveragePercent([], 100)).toBe(0);
  });

  it('returns 0 for a zero or negative maxMarks rather than dividing by zero', () => {
    expect(computeAveragePercent([{ subject: 'X', marks: 50 }], 0)).toBe(0);
    expect(computeAveragePercent([{ subject: 'X', marks: 50 }], -10)).toBe(0);
  });

  it('handles a maxMarks other than 100 correctly (not hardcoded to assume 100)', () => {
    const scores = [{ subject: 'Mathematics', marks: 40 }];
    expect(computeAveragePercent(scores, 50)).toBe(80); // 40/50 = 80%
  });
});

describe('computeGrade', () => {
  it('assigns the correct grade at each boundary of the default scale', () => {
    expect(computeGrade(100)).toBe('A+');
    expect(computeGrade(85)).toBe('A+'); // inclusive boundary
    expect(computeGrade(84.9)).toBe('A');
    expect(computeGrade(70)).toBe('A');
    expect(computeGrade(69.9)).toBe('B');
    expect(computeGrade(60)).toBe('B');
    expect(computeGrade(59.9)).toBe('C');
    expect(computeGrade(50)).toBe('C');
    expect(computeGrade(49.9)).toBe('D');
    expect(computeGrade(0)).toBe('D');
  });

  it('accepts a custom grade scale rather than only ever using the default', () => {
    const strictScale = [
      { minPercent: 90, grade: 'Distinction' },
      { minPercent: 0, grade: 'Fail' },
    ];
    expect(computeGrade(95, strictScale)).toBe('Distinction');
    expect(computeGrade(89, strictScale)).toBe('Fail');
  });

  it('DEFAULT_GRADE_SCALE is exported and usable directly, not just an internal detail', () => {
    expect(DEFAULT_GRADE_SCALE.length).toBeGreaterThan(0);
  });
});

describe('isPassing', () => {
  it('passes at exactly the pass mark (inclusive)', () => {
    expect(isPassing(50, 50)).toBe(true);
  });

  it('fails just below the pass mark', () => {
    expect(isPassing(49.9, 50)).toBe(false);
  });
});
