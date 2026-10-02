import { sendMessageSchema } from '../../src/modules/messages/messages.validation';

describe('sendMessageSchema', () => {
  it('accepts a valid message', () => {
    expect(
      sendMessageSchema.safeParse({
        body: { recipientEmail: 'teacher@alnoor.ae', subject: 'Homework', body: 'Please review.' },
        params: {},
        query: {},
      }).success,
    ).toBe(true);
  });

  it('rejects an invalid email and empty subject/body', () => {
    expect(
      sendMessageSchema.safeParse({
        body: { recipientEmail: 'not-an-email', subject: 'X', body: 'x' },
        params: {},
        query: {},
      }).success,
    ).toBe(false);
    expect(
      sendMessageSchema.safeParse({ body: { recipientEmail: 'a@b.ae', subject: '', body: 'x' }, params: {}, query: {} })
        .success,
    ).toBe(false);
    expect(
      sendMessageSchema.safeParse({ body: { recipientEmail: 'a@b.ae', subject: 'X', body: '' }, params: {}, query: {} })
        .success,
    ).toBe(false);
  });
});
