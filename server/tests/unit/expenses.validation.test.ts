import { submitClaimSchema, reviewClaimSchema } from '../../src/modules/expenses/expenses.validation';

const validClaim = {
  category: 'Travel',
  amount: 250.5,
  description: 'Taxi fare for the inter-school sports meet',
  expenseDate: '2026-06-14',
};

describe('submitClaimSchema', () => {
  it('accepts a valid claim', () => {
    expect(submitClaimSchema.safeParse({ body: validClaim, params: {}, query: {} }).success).toBe(true);
  });

  it('rejects a non-positive amount', () => {
    expect(submitClaimSchema.safeParse({ body: { ...validClaim, amount: 0 }, params: {}, query: {} }).success).toBe(
      false,
    );
  });

  it('rejects a missing description', () => {
    const { description, ...rest } = validClaim;
    void description;
    expect(submitClaimSchema.safeParse({ body: rest, params: {}, query: {} }).success).toBe(false);
  });

  it('rejects an invalid expenseDate', () => {
    expect(
      submitClaimSchema.safeParse({ body: { ...validClaim, expenseDate: 'sometime' }, params: {}, query: {} }).success,
    ).toBe(false);
  });
});

describe('reviewClaimSchema', () => {
  it('accepts an Approved status with notes', () => {
    const result = reviewClaimSchema.safeParse({
      params: { id: '64b7f9c9a1b2c3d4e5f60789' },
      body: { status: 'Approved', reviewNotes: 'Receipts verified' },
      query: {},
    });
    expect(result.success).toBe(true);
  });

  it('rejects a status value outside Approved/Rejected (e.g. cannot set back to Pending via review)', () => {
    const result = reviewClaimSchema.safeParse({
      params: { id: '64b7f9c9a1b2c3d4e5f60789' },
      body: { status: 'Pending' },
      query: {},
    });
    expect(result.success).toBe(false);
  });
});
