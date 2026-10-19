import {
  archiveCrmLeadSchema,
  createCrmLeadSchema,
  logCrmActivitySchema,
  scheduleFollowUpSchema,
} from '../../src/modules/crm/crm.validation';

describe('CRM validation', () => {
  const base = { query: {}, params: {}, body: { name: 'Prospective Child', grade: 'Grade 4' } };
  it('accepts the existing CRM form defaults', () => expect(createCrmLeadSchema.safeParse(base).success).toBe(true));
  it('rejects unsupported grades and temperatures', () => {
    expect(createCrmLeadSchema.safeParse({ ...base, body: { ...base.body, grade: 'College' } }).success).toBe(false);
    expect(createCrmLeadSchema.safeParse({ ...base, body: { ...base.body, temperature: 'Boiling' } }).success).toBe(
      false,
    );
  });
  it('validates follow-up dates, activity types, and archive reasons', () => {
    const params = { id: '507f1f77bcf86cd799439011' };
    expect(scheduleFollowUpSchema.safeParse({ query: {}, params, body: { date: '2026-10-01' } }).success).toBe(true);
    expect(scheduleFollowUpSchema.safeParse({ query: {}, params, body: { date: 'invalid' } }).success).toBe(false);
    expect(logCrmActivitySchema.safeParse({ query: {}, params, body: { type: 'Carrier pigeon' } }).success).toBe(false);
    expect(archiveCrmLeadSchema.safeParse({ query: {}, params, body: { reason: '' } }).success).toBe(false);
  });
});
