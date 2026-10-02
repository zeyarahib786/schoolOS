import { createBookSchema, issueLoanSchema } from '../../src/modules/library/library.validation';

const validBook = {
  isbn: '978-0-13-468599-1',
  title: 'Clean Code',
  author: 'Robert Martin',
  category: 'Non-fiction',
  totalCopies: 3,
};

describe('createBookSchema', () => {
  it('accepts a valid book', () => {
    expect(createBookSchema.safeParse({ body: validBook, params: {}, query: {} }).success).toBe(true);
  });

  it('rejects a non-positive totalCopies', () => {
    expect(createBookSchema.safeParse({ body: { ...validBook, totalCopies: 0 }, params: {}, query: {} }).success).toBe(
      false,
    );
  });

  it('rejects a missing ISBN', () => {
    const { isbn, ...rest } = validBook;
    void isbn;
    expect(createBookSchema.safeParse({ body: rest, params: {}, query: {} }).success).toBe(false);
  });
});

describe('issueLoanSchema', () => {
  it('accepts a valid issue request', () => {
    const result = issueLoanSchema.safeParse({
      body: { bookId: '64b7f9c9a1b2c3d4e5f60789', studentId: '64b7f9c9a1b2c3d4e5f60790', dueDate: '2026-07-01' },
      params: {},
      query: {},
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid dueDate', () => {
    const result = issueLoanSchema.safeParse({
      body: { bookId: '64b7f9c9a1b2c3d4e5f60789', studentId: '64b7f9c9a1b2c3d4e5f60790', dueDate: 'whenever' },
      params: {},
      query: {},
    });
    expect(result.success).toBe(false);
  });
});
