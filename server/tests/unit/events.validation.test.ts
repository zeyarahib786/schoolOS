import { createEventSchema } from '../../src/modules/events/events.validation';

const validEventNoVenue = {
  title: 'Annual Sports Day',
  description: 'Inter-house sports competition.',
  date: '2026-06-14',
};
const validEventWithVenue = {
  ...validEventNoVenue,
  venue: { facilityId: '64b7f9c9a1b2c3d4e5f60789', startTime: '09:00', endTime: '12:00' },
};

describe('createEventSchema', () => {
  it('accepts a valid event with no venue at all', () => {
    const result = createEventSchema.safeParse({ body: validEventNoVenue, params: {}, query: {} });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.body.venue).toBeUndefined();
  });

  it('accepts a valid event WITH a venue', () => {
    expect(createEventSchema.safeParse({ body: validEventWithVenue, params: {}, query: {} }).success).toBe(true);
  });

  it('rejects a venue with startTime >= endTime - the same rule Facilities enforces, applied here too', () => {
    const result = createEventSchema.safeParse({
      body: {
        ...validEventNoVenue,
        venue: { facilityId: '64b7f9c9a1b2c3d4e5f60789', startTime: '12:00', endTime: '09:00' },
      },
      params: {},
      query: {},
    });
    expect(result.success).toBe(false);
  });

  it('defaults audience to All when omitted', () => {
    const result = createEventSchema.safeParse({ body: validEventNoVenue, params: {}, query: {} });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.body.audience).toBe('All');
  });

  it('rejects an invalid audience value', () => {
    const result = createEventSchema.safeParse({
      body: { ...validEventNoVenue, audience: 'Everyone' },
      params: {},
      query: {},
    });
    expect(result.success).toBe(false);
  });
});
