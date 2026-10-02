import { createSlotSchema } from '../../src/modules/timetable/timetable.validation';

const valid = {
  grade: 'Grade 10 · A',
  dayOfWeek: 'Monday' as const,
  periodNumber: 3,
  subject: 'Mathematics',
  teacherName: 'Rohan Mehta',
};

describe('createSlotSchema', () => {
  it('accepts a valid slot', () => {
    expect(createSlotSchema.safeParse({ body: valid, params: {}, query: {} }).success).toBe(true);
  });

  it('rejects a periodNumber outside 1-8', () => {
    expect(createSlotSchema.safeParse({ body: { ...valid, periodNumber: 0 }, params: {}, query: {} }).success).toBe(
      false,
    );
    expect(createSlotSchema.safeParse({ body: { ...valid, periodNumber: 9 }, params: {}, query: {} }).success).toBe(
      false,
    );
  });

  it('rejects an invalid dayOfWeek (weekend days are not schedulable)', () => {
    expect(
      createSlotSchema.safeParse({ body: { ...valid, dayOfWeek: 'Saturday' }, params: {}, query: {} }).success,
    ).toBe(false);
  });
});
