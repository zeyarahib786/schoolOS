import {
  createInvoiceSchema,
  listInvoicesSchema,
  listPaymentsSchema,
  recordPaymentSchema,
  studentPaymentSchema,
} from '../../src/modules/fees/fees.validation';

const validInvoice = {
  refId: 'INV-1001',
  studentId: '64b7f9c9a1b2c3d4e5f60789',
  term: 'Term 2',
  amount: 12500,
  dueDate: '2026-07-01',
};

describe('createInvoiceSchema', () => {
  it('accepts a valid invoice payload', () => {
    const result = createInvoiceSchema.safeParse({ body: validInvoice, params: {}, query: {} });
    expect(result.success).toBe(true);
  });

  it('rejects a zero or negative amount', () => {
    expect(createInvoiceSchema.safeParse({ body: { ...validInvoice, amount: 0 }, params: {}, query: {} }).success).toBe(
      false,
    );
    expect(
      createInvoiceSchema.safeParse({ body: { ...validInvoice, amount: -500 }, params: {}, query: {} }).success,
    ).toBe(false);
  });

  it('rejects a malformed studentId', () => {
    const result = createInvoiceSchema.safeParse({
      body: { ...validInvoice, studentId: 'not-an-id' },
      params: {},
      query: {},
    });
    expect(result.success).toBe(false);
  });

  it('rejects an invalid due date', () => {
    const result = createInvoiceSchema.safeParse({
      body: { ...validInvoice, dueDate: 'whenever' },
      params: {},
      query: {},
    });
    expect(result.success).toBe(false);
  });

  it('rejects a currency code that is not exactly 3 characters', () => {
    const result = createInvoiceSchema.safeParse({
      body: { ...validInvoice, currency: 'DIRHAM' },
      params: {},
      query: {},
    });
    expect(result.success).toBe(false);
  });
});

describe('recordPaymentSchema', () => {
  it('accepts a valid payment method with an optional amount/reference', () => {
    const result = recordPaymentSchema.safeParse({
      params: { id: '64b7f9c9a1b2c3d4e5f60789' },
      body: { paymentMethod: 'Card', amount: 2500, reference: 'POS-123' },
      query: {},
    });
    expect(result.success).toBe(true);
  });

  it('rejects a payment method outside the allowed enum', () => {
    const result = recordPaymentSchema.safeParse({
      params: { id: '64b7f9c9a1b2c3d4e5f60789' },
      body: { paymentMethod: 'Crypto' },
      query: {},
    });
    expect(result.success).toBe(false);
  });
});

describe('studentPaymentSchema', () => {
  it('accepts a valid student-level payment', () => {
    const result = studentPaymentSchema.safeParse({
      params: {},
      body: {
        studentId: '64b7f9c9a1b2c3d4e5f60789',
        amount: 2500,
        paymentMethod: 'Online portal',
      },
      query: {},
    });
    expect(result.success).toBe(true);
  });

  it('rejects zero amount', () => {
    const result = studentPaymentSchema.safeParse({
      params: {},
      body: {
        studentId: '64b7f9c9a1b2c3d4e5f60789',
        amount: 0,
        paymentMethod: 'Cash',
      },
      query: {},
    });
    expect(result.success).toBe(false);
  });
});

describe('listPaymentsSchema', () => {
  it('accepts invoice and student filters', () => {
    const result = listPaymentsSchema.safeParse({
      query: { studentId: '64b7f9c9a1b2c3d4e5f60789', invoiceId: '64b7f9c9a1b2c3d4e5f60780' },
      body: {},
      params: {},
    });
    expect(result.success).toBe(true);
  });
});

describe('listInvoicesSchema', () => {
  it('accepts a status filter', () => {
    const result = listInvoicesSchema.safeParse({ query: { status: 'Overdue' }, body: {}, params: {} });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid status filter value', () => {
    const result = listInvoicesSchema.safeParse({ query: { status: 'Cancelled' }, body: {}, params: {} });
    expect(result.success).toBe(false);
  });
});
