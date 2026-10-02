import { sendBroadcastSchema, sendGuardianMessageSchema } from '../../src/modules/guardians/guardians.validation';

describe('Guardians validation', () => {
  it('requires a guardian for an individual broadcast', () => {
    const result = sendBroadcastSchema.safeParse({ query: {}, params: {}, body: {
      audience: 'Individual guardian', channel: 'In-app only', subject: 'Notice', message: 'Message',
    } });
    expect(result.success).toBe(false);
  });

  it('rejects empty thread messages', () => {
    const result = sendGuardianMessageSchema.safeParse({ query: {}, params: { id: '64b7f9c9a1b2c3d4e5f60789' }, body: { text: '  ' } });
    expect(result.success).toBe(false);
  });
});

