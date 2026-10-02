import { createUnitSchema, listUnitsSchema } from '../../src/modules/curriculum/curriculum.validation';

const validUnit = {
  subject: 'Mathematics',
  term: 'Term 2',
  title: 'Quadratic Equations',
  outcomes: 'Students will be able to solve quadratic equations using factoring and the quadratic formula.',
};

describe('createUnitSchema', () => {
  it('accepts a valid unit', () => {
    expect(createUnitSchema.safeParse({ body: validUnit, params: {}, query: {} }).success).toBe(true);
  });

  it('rejects an outcomes field longer than 2000 characters', () => {
    const result = createUnitSchema.safeParse({
      body: { ...validUnit, outcomes: 'x'.repeat(2001) },
      params: {},
      query: {},
    });
    expect(result.success).toBe(false);
  });

  it('rejects a title shorter than 2 characters', () => {
    const result = createUnitSchema.safeParse({ body: { ...validUnit, title: 'X' }, params: {}, query: {} });
    expect(result.success).toBe(false);
  });

  it('rejects a negative sequenceOrder', () => {
    const result = createUnitSchema.safeParse({ body: { ...validUnit, sequenceOrder: -1 }, params: {}, query: {} });
    expect(result.success).toBe(false);
  });
});

describe('listUnitsSchema', () => {
  it('accepts a subject filter and search term together', () => {
    const result = listUnitsSchema.safeParse({
      query: { subject: 'Mathematics', search: 'quadratic' },
      body: {},
      params: {},
    });
    expect(result.success).toBe(true);
  });
});
