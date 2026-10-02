import { topUpSchema, purchaseSchema } from '../../src/modules/cafeteria/cafeteria.validation';

describe('topUpSchema', () => {
  it('accepts a valid top-up and defaults description', () => {
    const result = topUpSchema.safeParse({
      body: { studentId: '64b7f9c9a1b2c3d4e5f60789', amount: 50 },
      params: {},
      query: {},
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.body.description).toBe('Wallet top-up');
  });

  it('rejects a non-positive amount', () => {
    expect(
      topUpSchema.safeParse({ body: { studentId: '64b7f9c9a1b2c3d4e5f60789', amount: 0 }, params: {}, query: {} })
        .success,
    ).toBe(false);
  });
});

describe('purchaseSchema', () => {
  it('accepts a valid purchase', () => {
    const result = purchaseSchema.safeParse({
      body: { studentId: '64b7f9c9a1b2c3d4e5f60789', amount: 12, description: 'Lunch' },
      params: {},
      query: {},
    });
    expect(result.success).toBe(true);
  });

  it('rejects a missing description (unlike top-up, purchase requires one)', () => {
    const result = purchaseSchema.safeParse({
      body: { studentId: '64b7f9c9a1b2c3d4e5f60789', amount: 12 },
      params: {},
      query: {},
    });
    expect(result.success).toBe(false);
  });
});
