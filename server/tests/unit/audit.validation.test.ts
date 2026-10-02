import { listAuditLogSchema } from '../../src/modules/audit/audit.validation';

describe('listAuditLogSchema', () => {
  it('accepts a module and severity filter together', () => {
    const result = listAuditLogSchema.safeParse({
      query: { module: 'Auth', severity: 'Warning' },
      body: {},
      params: {},
    });
    expect(result.success).toBe(true);
  });

  it('rejects an invalid severity value', () => {
    const result = listAuditLogSchema.safeParse({ query: { severity: 'Emergency' }, body: {}, params: {} });
    expect(result.success).toBe(false);
  });

  it('defaults page and limit when omitted', () => {
    const result = listAuditLogSchema.safeParse({ query: {}, body: {}, params: {} });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.query.page).toBe(1);
      expect(result.data.query.limit).toBe(20);
    }
  });
});
