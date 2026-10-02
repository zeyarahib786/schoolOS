import { issueCardSchema } from '../../src/modules/idcards/idcards.validation';

const valid = { subjectType: 'Student' as const, subjectId: '64b7f9c9a1b2c3d4e5f60789', expiryDate: '2028-06-30' };

describe('issueCardSchema', () => {
  it('accepts a valid Student card issuance', () => {
    expect(issueCardSchema.safeParse({ body: valid, params: {}, query: {} }).success).toBe(true);
  });

  it('accepts a valid Staff card issuance - the same schema serves both holder kinds', () => {
    expect(issueCardSchema.safeParse({ body: { ...valid, subjectType: 'Staff' }, params: {}, query: {} }).success).toBe(
      true,
    );
  });

  it('rejects an unknown subjectType - only the two registered model names are valid refPath targets', () => {
    expect(
      issueCardSchema.safeParse({ body: { ...valid, subjectType: 'Parent' }, params: {}, query: {} }).success,
    ).toBe(false);
  });

  it('rejects a malformed subjectId and a malformed date', () => {
    expect(issueCardSchema.safeParse({ body: { ...valid, subjectId: 'nope' }, params: {}, query: {} }).success).toBe(
      false,
    );
    expect(
      issueCardSchema.safeParse({ body: { ...valid, expiryDate: 'someday' }, params: {}, query: {} }).success,
    ).toBe(false);
  });
});
