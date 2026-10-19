import { productionConfigurationIssues } from './production';
/** A redacted report: only field names/statuses are returned, never values or credentials. */
export function productionPreflight(
  config: Record<string, string | undefined>,
  build: { apiBase: string },
  origin: string,
) {
  const issues = productionConfigurationIssues({ ...config, NODE_ENV: 'production' });
  if (config.NODE_ENV !== 'production') issues.push('NODE_ENV');
  if (!/^mongodb(?:\+srv)?:\/\//.test(config.MONGO_URI || '')) issues.push('MONGO_URI');
  try {
    const publicOrigin = new URL(origin);
    if (
      publicOrigin.protocol !== 'https:' ||
      publicOrigin.origin !== origin ||
      publicOrigin.username ||
      publicOrigin.password
    )
      throw Error();
    if (
      !(config.CORS_ALLOWED_ORIGINS || '')
        .split(',')
        .map((value) => value.trim())
        .includes(origin)
    )
      issues.push('CORS_ALLOWED_ORIGINS_PUBLIC_ORIGIN');
  } catch {
    issues.push('PUBLIC_ORIGIN');
  }
  if (build.apiBase !== '/api/v1') {
    try {
      const api = new URL(build.apiBase);
      if (
        api.protocol !== 'https:' ||
        api.username ||
        api.password ||
        api.search ||
        api.hash ||
        ['localhost', '127.0.0.1', '[::1]'].includes(api.hostname)
      )
        throw Error();
    } catch {
      issues.push('VITE_API_BASE_URL');
    }
  }
  const enabled = config.NOTIFICATIONS_ENABLED === 'true';
  if (config.NOTIFICATIONS_ENABLED && !['true', 'false'].includes(config.NOTIFICATIONS_ENABLED))
    issues.push('NOTIFICATIONS_ENABLED');
  const emailMissing = enabled
    ? ['RESEND_API_KEY', 'RESEND_FROM_EMAIL', 'RESEND_WEBHOOK_SECRET'].filter((field) => !config[field])
    : [];
  if (enabled && config.RESEND_FROM_EMAIL && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.RESEND_FROM_EMAIL))
    emailMissing.push('RESEND_FROM_EMAIL');
  const sms = config.SMS_PROVIDER || 'disabled';
  if (!['disabled', 'aws-sns'].includes(sms)) issues.push('SMS_PROVIDER');
  const smsMissing = enabled && sms === 'aws-sns' && !config.SMS_AWS_REGION ? ['SMS_AWS_REGION'] : [];
  issues.push(...emailMissing, ...smsMissing);
  return {
    mode: 'offline-configuration-check',
    core: { status: issues.length ? 'blocked' : 'configured', issues: [...new Set(issues)] },
    integrations: {
      email: { status: !enabled ? 'deferred' : emailMissing.length ? 'incomplete' : 'configured-not-live-verified' },
      sms: {
        status:
          !enabled || sms === 'disabled'
            ? 'deferred'
            : smsMissing.length
              ? 'incomplete'
              : 'configured-not-live-verified',
      },
      signing: { status: config.PDF_SIGNING_P12_PATH ? 'requires-certificate-validation' : 'deferred' },
    },
  };
}
