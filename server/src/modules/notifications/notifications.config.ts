import { z } from 'zod';
const flag = z
  .enum(['true', 'false'])
  .default('false')
  .transform((v) => v === 'true');
const optional = z.preprocess((v) => (v === '' ? undefined : v), z.string().optional());
const schema = z.object({
  NOTIFICATIONS_ENABLED: flag,
  RESEND_API_KEY: optional,
  RESEND_FROM_EMAIL: z.preprocess((v) => (v === '' ? undefined : v), z.string().email().optional()),
  RESEND_WEBHOOK_SECRET: optional,
  SMS_PROVIDER: z.enum(['disabled', 'aws-sns']).default('disabled'),
  SMS_AWS_REGION: optional,
  SMS_SENDER_ID: z.preprocess(
    (v) => (v === '' ? undefined : v),
    z
      .string()
      .regex(/^[A-Za-z0-9]{1,11}$/)
      .optional(),
  ),
  SMS_MAX_PRICE: z.coerce.number().min(0.01).max(10).default(0.5),
});
export function notificationConfig() {
  const result = schema.safeParse(process.env);
  if (!result.success) throw new Error('Invalid notification configuration');
  return result.data;
}
export function notificationStatus() {
  const c = notificationConfig();
  return {
    enabled: c.NOTIFICATIONS_ENABLED,
    email: {
      provider: 'Resend',
      configured: Boolean(c.NOTIFICATIONS_ENABLED && c.RESEND_API_KEY && c.RESEND_FROM_EMAIL),
      from: c.RESEND_FROM_EMAIL || null,
      verifiedDeliveryEvents: Boolean(c.RESEND_WEBHOOK_SECRET),
    },
    sms: {
      provider: c.SMS_PROVIDER,
      configured: Boolean(c.NOTIFICATIONS_ENABLED && c.SMS_PROVIDER === 'aws-sns' && c.SMS_AWS_REGION),
      deliveryTracking: false,
    },
  };
}
