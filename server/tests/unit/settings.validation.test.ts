import { updateSettingsSchema } from '../../src/modules/settings/settings.validation';

const valid = {
  schoolName: 'Al Noor International School',
  academicYear: '2026-2027',
  timezone: 'Asia/Dubai',
  currency: 'AED',
  defaultAnnualLeave: 30,
};

describe('updateSettingsSchema', () => {
  it('accepts valid settings', () => {
    expect(updateSettingsSchema.safeParse({ body: valid, params: {}, query: {} }).success).toBe(true);
  });

  it('rejects a malformed academicYear (single year, slash form, words)', () => {
    for (const bad of ['2026', '2026/2027', 'this year']) {
      expect(
        updateSettingsSchema.safeParse({ body: { ...valid, academicYear: bad }, params: {}, query: {} }).success,
      ).toBe(false);
    }
  });

  it('rejects a currency that is not exactly 3 characters', () => {
    expect(
      updateSettingsSchema.safeParse({ body: { ...valid, currency: 'DIRHAMS' }, params: {}, query: {} }).success,
    ).toBe(false);
    expect(updateSettingsSchema.safeParse({ body: { ...valid, currency: 'D' }, params: {}, query: {} }).success).toBe(
      false,
    );
  });

  it('rejects defaultAnnualLeave outside 0-365', () => {
    expect(
      updateSettingsSchema.safeParse({ body: { ...valid, defaultAnnualLeave: -1 }, params: {}, query: {} }).success,
    ).toBe(false);
    expect(
      updateSettingsSchema.safeParse({ body: { ...valid, defaultAnnualLeave: 400 }, params: {}, query: {} }).success,
    ).toBe(false);
  });
});
