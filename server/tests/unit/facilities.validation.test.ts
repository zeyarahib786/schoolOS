import { createBookingSchema, createFacilitySchema } from '../../src/modules/facilities/facilities.validation';

const validBooking = {
  facilityId: '64b7f9c9a1b2c3d4e5f60789',
  date: '2026-06-14',
  startTime: '09:00',
  endTime: '10:00',
  purpose: 'Staff meeting',
};

describe('createBookingSchema', () => {
  it('accepts a valid booking', () => {
    expect(createBookingSchema.safeParse({ body: validBooking, params: {}, query: {} }).success).toBe(true);
  });

  it('rejects startTime >= endTime at the schema level, before it ever reaches the overlap check', () => {
    expect(
      createBookingSchema.safeParse({
        body: { ...validBooking, startTime: '10:00', endTime: '09:00' },
        params: {},
        query: {},
      }).success,
    ).toBe(false);
    expect(
      createBookingSchema.safeParse({
        body: { ...validBooking, startTime: '10:00', endTime: '10:00' },
        params: {},
        query: {},
      }).success,
    ).toBe(false);
  });

  it('rejects a malformed time string', () => {
    expect(
      createBookingSchema.safeParse({ body: { ...validBooking, startTime: '9:00' }, params: {}, query: {} }).success,
    ).toBe(false); // must be zero-padded
    expect(
      createBookingSchema.safeParse({ body: { ...validBooking, startTime: '25:00' }, params: {}, query: {} }).success,
    ).toBe(false); // not a real hour
  });

  it('rejects a missing purpose', () => {
    const { purpose, ...rest } = validBooking;
    void purpose;
    expect(createBookingSchema.safeParse({ body: rest, params: {}, query: {} }).success).toBe(false);
  });
});

describe('createFacilitySchema', () => {
  it('accepts a valid facility', () => {
    expect(
      createFacilitySchema.safeParse({
        body: { name: 'Main Hall', type: 'Auditorium', capacity: 200 },
        params: {},
        query: {},
      }).success,
    ).toBe(true);
  });

  it('rejects a non-positive capacity', () => {
    expect(
      createFacilitySchema.safeParse({
        body: { name: 'Main Hall', type: 'Auditorium', capacity: 0 },
        params: {},
        query: {},
      }).success,
    ).toBe(false);
  });
});
