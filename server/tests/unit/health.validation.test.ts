import { createVisitSchema } from '../../src/modules/health/health.validation';

const valid = {
  studentId: '64b7f9c9a1b2c3d4e5f60789',
  reason: 'Headache',
  treatment: 'Rest and water',
  outcome: 'Returned to class' as const,
};

describe('createVisitSchema', () => {
  it('accepts a valid visit', () => {
    expect(createVisitSchema.safeParse({ body: valid, params: {}, query: {} }).success).toBe(true);
  });

  it('rejects an invalid outcome value', () => {
    expect(createVisitSchema.safeParse({ body: { ...valid, outcome: 'Unknown' }, params: {}, query: {} }).success).toBe(
      false,
    );
  });

  it('rejects a missing treatment', () => {
    const { treatment, ...rest } = valid;
    void treatment;
    expect(createVisitSchema.safeParse({ body: rest, params: {}, query: {} }).success).toBe(false);
  });
});
