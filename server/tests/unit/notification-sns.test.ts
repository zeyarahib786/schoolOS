const mockSend = jest.fn();
jest.mock('@aws-sdk/client-sns', () => ({
  SNSClient: jest.fn().mockImplementation(() => ({ send: mockSend })),
  PublishCommand: jest.fn().mockImplementation((input) => input),
}));
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
import { sendExternal } from '../../src/modules/notifications/notifications.provider';
import { INotificationDelivery } from '../../src/models/NotificationDelivery';
const job = {
  channel: 'SMS',
  destination: '+971501234567',
  body: 'Fictional school reminder',
  fromIdentity: 'SchoolOS',
} as INotificationDelivery;
beforeEach(() => {
  jest.clearAllMocks();
  process.env.NOTIFICATIONS_ENABLED = 'true';
  process.env.SMS_PROVIDER = 'aws-sns';
  process.env.SMS_AWS_REGION = 'us-east-1';
});
afterEach(() => {
  delete process.env.NOTIFICATIONS_ENABLED;
  delete process.env.SMS_PROVIDER;
  delete process.env.SMS_AWS_REGION;
});
describe('AWS SNS SMS provider', () => {
  it('publishes a transactional SMS with conservative SDK retry settings', async () => {
    mockSend.mockResolvedValue({ MessageId: 'fictional-sns-id' });
    await expect(sendExternal(job)).resolves.toBe('fictional-sns-id');
    expect(SNSClient).toHaveBeenCalledWith(expect.objectContaining({ region: 'us-east-1', maxAttempts: 1 }));
    expect(PublishCommand).toHaveBeenCalledWith(
      expect.objectContaining({
        PhoneNumber: job.destination,
        Message: job.body,
        MessageAttributes: expect.objectContaining({
          'AWS.SNS.SMS.SMSType': { DataType: 'String', StringValue: 'Transactional' },
        }),
      }),
    );
  });
  it('does not claim missing AWS credentials were sent or accepted', async () => {
    mockSend.mockRejectedValue(
      Object.assign(new Error('Fictional missing credentials'), { name: 'CredentialsProviderError' }),
    );
    await expect(sendExternal(job)).rejects.toMatchObject({ code: 'CredentialsProviderError', ambiguous: false });
  });
  it('treats a timeout as unknown instead of silently duplicating a chargeable SMS', async () => {
    mockSend.mockRejectedValue(new Error('Fictional timeout'));
    await expect(sendExternal(job)).rejects.toMatchObject({ code: 'SMS_RESPONSE_UNKNOWN', ambiguous: true });
  });
});
