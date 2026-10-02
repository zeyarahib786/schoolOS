import { graduateSchema } from '../../src/modules/alumni/alumni.validation';

const valid = { studentId: '64b7f9c9a1b2c3d4e5f60789', graduationYear: 2026 };

describe('graduateSchema', () => {
  it('accepts a valid graduation request', () => {
    expect(graduateSchema.safeParse({ body: valid, params: {}, query: {} }).success).toBe(true);
  });

  it('rejects a graduationYear outside the reasonable range', () => {
    expect(graduateSchema.safeParse({ body: { ...valid, graduationYear: 1800 }, params: {}, query: {} }).success).toBe(
      false,
    );
    expect(graduateSchema.safeParse({ body: { ...valid, graduationYear: 3000 }, params: {}, query: {} }).success).toBe(
      false,
    );
  });

  it('rejects an invalid contactEmail', () => {
    expect(
      graduateSchema.safeParse({ body: { ...valid, contactEmail: 'not-an-email' }, params: {}, query: {} }).success,
    ).toBe(false);
  });

  it('accepts a valid request with all optional fields present', () => {
    const full = {
      ...valid,
      currentEmployer: 'Emirates',
      contactEmail: 'fatima@example.com',
      notes: 'Studying medicine',
    };
    expect(graduateSchema.safeParse({ body: full, params: {}, query: {} }).success).toBe(true);
  });
});
