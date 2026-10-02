import { createApplicationSchema, transitionSchema } from '../../src/modules/admissions/admissions.validation';

const valid = {
  applicantName: 'Omar Al Farsi',
  gradeAppliedFor: 'Grade 7 · A',
  gender: 'Male' as const,
  guardianName: 'Yusuf Al Farsi',
  phone: '+971501234567',
};

describe('createApplicationSchema', () => {
  it('accepts a valid application', () => {
    expect(createApplicationSchema.safeParse({ body: valid, params: {}, query: {} }).success).toBe(true);
  });

  it('rejects an invalid phone', () => {
    expect(
      createApplicationSchema.safeParse({ body: { ...valid, phone: 'call me' }, params: {}, query: {} }).success,
    ).toBe(false);
  });
});

describe('transitionSchema', () => {
  it('does not allow requesting a direct transition to Enrolled - enrollment goes through the dedicated endpoint with refId/roll', () => {
    const result = transitionSchema.safeParse({
      params: { id: '64b7f9c9a1b2c3d4e5f60789' },
      body: { status: 'Enrolled' },
      query: {},
    });
    expect(result.success).toBe(false);
  });

  it('accepts a valid transition target', () => {
    const result = transitionSchema.safeParse({
      params: { id: '64b7f9c9a1b2c3d4e5f60789' },
      body: { status: 'Shortlisted' },
      query: {},
    });
    expect(result.success).toBe(true);
  });
});
