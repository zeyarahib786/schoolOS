import { createSlotSchema, bookSlotSchema } from '../../src/modules/meetings/meetings.validation';

const validSlot = { teacherStaffId: '64b7f9c9a1b2c3d4e5f60789', date: '2026-07-10', startTime: '14:30' };

describe('createSlotSchema', () => {
  it('accepts a valid slot', () => {
    expect(createSlotSchema.safeParse({ body: validSlot, params: {}, query: {} }).success).toBe(true);
  });

  it('rejects a malformed startTime (25:00, 9:5, missing colon)', () => {
    for (const bad of ['25:00', '9:5', '1430']) {
      expect(
        createSlotSchema.safeParse({ body: { ...validSlot, startTime: bad }, params: {}, query: {} }).success,
      ).toBe(false);
    }
  });

  it('accepts boundary times 00:00 and 23:59', () => {
    expect(
      createSlotSchema.safeParse({ body: { ...validSlot, startTime: '00:00' }, params: {}, query: {} }).success,
    ).toBe(true);
    expect(
      createSlotSchema.safeParse({ body: { ...validSlot, startTime: '23:59' }, params: {}, query: {} }).success,
    ).toBe(true);
  });
});

describe('bookSlotSchema', () => {
  it('requires a valid studentId', () => {
    expect(
      bookSlotSchema.safeParse({ params: { id: '64b7f9c9a1b2c3d4e5f60789' }, body: { studentId: 'nope' }, query: {} })
        .success,
    ).toBe(false);
    expect(
      bookSlotSchema.safeParse({
        params: { id: '64b7f9c9a1b2c3d4e5f60789' },
        body: { studentId: '64b7f9c9a1b2c3d4e5f60788' },
        query: {},
      }).success,
    ).toBe(true);
  });
});
