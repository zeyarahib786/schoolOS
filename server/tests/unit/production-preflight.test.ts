import { productionPreflight } from '../../src/config/preflight';
const config = {
  NODE_ENV: 'production',
  JWT_ACCESS_SECRET: 'a'.repeat(48),
  JWT_REFRESH_SECRET: 'b'.repeat(48),
  MONGO_URI: 'mongodb://private-cluster/schoolos',
  CORS_ALLOWED_ORIGINS: 'https://school.example.invalid',
};
const origin = 'https://school.example.invalid';
describe('Redacted deployment preflight', () => {
  it('allows a core release with explicitly deferred integrations', () => {
    expect(productionPreflight(config, { apiBase: '/api/v1' }, origin)).toMatchObject({
      core: { status: 'configured', issues: [] },
      integrations: { email: { status: 'deferred' }, sms: { status: 'deferred' }, signing: { status: 'deferred' } },
    });
  });
  it('rejects development API URLs, unapproved origins and incomplete enabled providers', () => {
    const report = productionPreflight(
      { ...config, NOTIFICATIONS_ENABLED: 'true', SMS_PROVIDER: 'aws-sns' },
      { apiBase: 'http://localhost:4400/api/v1' },
      'https://other.example.invalid',
    );
    expect(report.core.issues).toEqual(
      expect.arrayContaining([
        'VITE_API_BASE_URL',
        'CORS_ALLOWED_ORIGINS_PUBLIC_ORIGIN',
        'RESEND_API_KEY',
        'RESEND_FROM_EMAIL',
        'RESEND_WEBHOOK_SECRET',
        'SMS_AWS_REGION',
      ]),
    );
    expect(JSON.stringify(report)).not.toContain(config.JWT_ACCESS_SECRET);
    expect(JSON.stringify(report)).not.toContain(config.MONGO_URI);
  });
  it('reports configured providers without claiming verified delivery', () => {
    const report = productionPreflight(
      {
        ...config,
        NOTIFICATIONS_ENABLED: 'true',
        RESEND_API_KEY: 'fictional-redacted-key',
        RESEND_FROM_EMAIL: 'sender@example.invalid',
        RESEND_WEBHOOK_SECRET: 'fictional-secret',
      },
      { apiBase: 'https://api.example.invalid/api/v1' },
      origin,
    );
    expect(report.core.status).toBe('configured');
    expect(report.integrations.email.status).toBe('configured-not-live-verified');
  });
});
