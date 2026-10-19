import { productionConfigurationIssues } from '../../src/config/production';
const valid = {
  NODE_ENV: 'production',
  JWT_ACCESS_SECRET: 'a'.repeat(48),
  JWT_REFRESH_SECRET: 'b'.repeat(48),
  CORS_ALLOWED_ORIGINS: 'https://school.example.invalid',
};
it('rejects placeholders, identical keys and public plaintext origins without returning secrets', () => {
  expect(
    productionConfigurationIssues({ ...valid, JWT_ACCESS_SECRET: 'replace-with-a-long-random-string-min-32-chars' }),
  ).toContain('JWT_ACCESS_SECRET');
  expect(productionConfigurationIssues({ ...valid, JWT_REFRESH_SECRET: valid.JWT_ACCESS_SECRET })).toContain(
    'JWT_REFRESH_SECRET',
  );
  expect(productionConfigurationIssues({ ...valid, CORS_ALLOWED_ORIGINS: 'http://school.example.invalid' })).toContain(
    'CORS_ALLOWED_ORIGINS',
  );
});
it('permits HTTPS deployments and loopback-only local containers', () => {
  expect(productionConfigurationIssues(valid)).toEqual([]);
  expect(productionConfigurationIssues({ ...valid, CORS_ALLOWED_ORIGINS: 'http://localhost:8080' })).toEqual([]);
});
