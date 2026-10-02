import { checkInSchema, listVisitorsSchema } from '../../src/modules/visitors/visitors.validation';

describe('checkInSchema', () => {
  it('accepts a valid check-in', () => {
    const result = checkInSchema.safeParse({
      body: { visitorName: 'John Smith', purpose: 'Parent-teacher meeting', hostName: 'Rohan Mehta' },
      params: {},
      query: {},
    });
    expect(result.success).toBe(true);
  });

  it('rejects a visitor name shorter than 2 characters', () => {
    expect(
      checkInSchema.safeParse({ body: { visitorName: 'J', purpose: 'x', hostName: 'x' }, params: {}, query: {} })
        .success,
    ).toBe(false);
  });

  it('rejects a missing purpose', () => {
    expect(
      checkInSchema.safeParse({ body: { visitorName: 'John Smith', hostName: 'x' }, params: {}, query: {} }).success,
    ).toBe(false);
  });
});

describe('listVisitorsSchema', () => {
  it('accepts a status filter', () => {
    expect(listVisitorsSchema.safeParse({ query: { status: 'CheckedIn' }, body: {}, params: {} }).success).toBe(true);
  });

  it('rejects an invalid status value', () => {
    expect(listVisitorsSchema.safeParse({ query: { status: 'Departed' }, body: {}, params: {} }).success).toBe(false);
  });
});
