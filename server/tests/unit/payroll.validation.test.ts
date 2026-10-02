import { generatePayslipSchema, listPayslipsSchema } from '../../src/modules/payroll/payroll.validation';

const validPayslip = {
  staffId: '64b7f9c9a1b2c3d4e5f60789',
  month: '2026-06',
  basicSalary: 15000,
  allowances: 2000,
  deductions: 500,
};

describe('generatePayslipSchema', () => {
  it('accepts a valid payslip payload', () => {
    expect(generatePayslipSchema.safeParse({ body: validPayslip, params: {}, query: {} }).success).toBe(true);
  });

  it('rejects an invalid month format', () => {
    expect(
      generatePayslipSchema.safeParse({ body: { ...validPayslip, month: '06-2026' }, params: {}, query: {} }).success,
    ).toBe(false);
  });

  it('rejects a non-positive basicSalary', () => {
    expect(
      generatePayslipSchema.safeParse({ body: { ...validPayslip, basicSalary: 0 }, params: {}, query: {} }).success,
    ).toBe(false);
  });

  it('defaults allowances/deductions to 0 when omitted', () => {
    const { allowances, deductions, ...rest } = validPayslip;
    void allowances;
    void deductions;
    const result = generatePayslipSchema.safeParse({ body: rest, params: {}, query: {} });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.body.allowances).toBe(0);
      expect(result.data.body.deductions).toBe(0);
    }
  });
});

describe('listPayslipsSchema', () => {
  it('accepts a month filter', () => {
    expect(listPayslipsSchema.safeParse({ query: { month: '2026-06' }, body: {}, params: {} }).success).toBe(true);
  });

  it('rejects a malformed month filter', () => {
    expect(listPayslipsSchema.safeParse({ query: { month: 'June 2026' }, body: {}, params: {} }).success).toBe(false);
  });
});
