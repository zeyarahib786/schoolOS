import { createAnnouncementSchema } from '../../src/modules/announcements/announcements.validation';

const valid = { title: 'Sports Day', body: 'Annual sports day is on Friday.' };

describe('createAnnouncementSchema', () => {
  it('accepts a valid announcement, defaulting audience to All and pinned to false', () => {
    const result = createAnnouncementSchema.safeParse({ body: valid, params: {}, query: {} });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.body.audience).toBe('All');
      expect(result.data.body.pinned).toBe(false);
    }
  });

  it('rejects an invalid audience value', () => {
    expect(
      createAnnouncementSchema.safeParse({ body: { ...valid, audience: 'Everyone' }, params: {}, query: {} }).success,
    ).toBe(false);
  });

  it('rejects an empty body', () => {
    expect(createAnnouncementSchema.safeParse({ body: { ...valid, body: '' }, params: {}, query: {} }).success).toBe(
      false,
    );
  });
});
