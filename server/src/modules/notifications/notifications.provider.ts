import { PublishCommand, SNSClient } from '@aws-sdk/client-sns';
import { INotificationDelivery } from '../../models/NotificationDelivery';
import { notificationConfig } from './notifications.config';
export class ProviderError extends Error {
  constructor(
    public readonly code: string,
    public readonly ambiguous: boolean,
  ) {
    super(code);
  }
}
export async function sendExternal(job: INotificationDelivery): Promise<string> {
  const c = notificationConfig();
  if (job.channel === 'Email') {
    if (!c.NOTIFICATIONS_ENABLED || !c.RESEND_API_KEY || !c.RESEND_FROM_EMAIL)
      throw new ProviderError('EMAIL_UNCONFIGURED', false);
    let res: Response;
    try {
      res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: 'Bearer ' + c.RESEND_API_KEY,
          'Content-Type': 'application/json',
          'Idempotency-Key': 'schoolos-' + job._id,
        },
        body: JSON.stringify({
          from: job.fromIdentity,
          to: [job.destination],
          subject: job.subject,
          text: job.body,
          tags: [{ name: 'schoolos_job', value: job._id.toString() }],
        }),
        signal: AbortSignal.timeout(20000),
      });
    } catch {
      throw new ProviderError('EMAIL_RESPONSE_UNKNOWN', true);
    }
    if (!res.ok) throw new ProviderError('RESEND_HTTP_' + res.status, res.status >= 500 || res.status === 409);
    let body: { id?: string };
    try {
      body = (await res.json()) as { id?: string };
    } catch {
      throw new ProviderError('EMAIL_RESPONSE_UNKNOWN', true);
    }
    if (!body.id) throw new ProviderError('EMAIL_RESPONSE_UNKNOWN', true);
    return body.id;
  }
  if (!c.NOTIFICATIONS_ENABLED || c.SMS_PROVIDER !== 'aws-sns' || !c.SMS_AWS_REGION)
    throw new ProviderError('SMS_UNCONFIGURED', false);
  try {
    const client = new SNSClient({
      region: c.SMS_AWS_REGION,
      maxAttempts: 1,
      requestHandler: { requestTimeout: 20000, connectionTimeout: 5000 },
    });
    const result = await client.send(
      new PublishCommand({
        PhoneNumber: job.destination,
        Message: job.body,
        MessageAttributes: {
          'AWS.SNS.SMS.SMSType': { DataType: 'String', StringValue: 'Transactional' },
          'AWS.SNS.SMS.MaxPrice': { DataType: 'Number', StringValue: String(c.SMS_MAX_PRICE) },
          ...(job.fromIdentity !== 'SchoolOS'
            ? { 'AWS.SNS.SMS.SenderID': { DataType: 'String', StringValue: job.fromIdentity } }
            : {}),
        },
      }),
    );
    if (!result.MessageId) throw new ProviderError('SMS_RESPONSE_UNKNOWN', true);
    return result.MessageId;
  } catch (e) {
    if (e instanceof ProviderError) throw e;
    const code = (e as { name?: string }).name;
    throw new ProviderError(
      code &&
        [
          'AuthorizationErrorException',
          'InvalidParameterException',
          'CredentialsProviderError',
          'OptedOutException',
        ].includes(code)
        ? code
        : 'SMS_RESPONSE_UNKNOWN',
      !code ||
        ![
          'AuthorizationErrorException',
          'InvalidParameterException',
          'CredentialsProviderError',
          'OptedOutException',
        ].includes(code),
    );
  }
}
