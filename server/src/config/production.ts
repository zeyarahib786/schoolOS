/** Return field names only: configuration diagnostics must never expose secret values. */
export function productionConfigurationIssues(config: Record<string, string | undefined>): string[] {
  if (config.NODE_ENV !== 'production') return [];
  const issues: string[] = [];
  const access = config.JWT_ACCESS_SECRET || '',
    refresh = config.JWT_REFRESH_SECRET || '';
  for (const [field, value] of [
    ['JWT_ACCESS_SECRET', access],
    ['JWT_REFRESH_SECRET', refresh],
  ])
    if (value.length < 32 || /^(replace|change.?me|your[-_ ]|seed-only|local-fix|test[-_ ]|fixture)/i.test(value))
      issues.push(field);
  if (access && access === refresh) issues.push('JWT_REFRESH_SECRET');
  const origins = (config.CORS_ALLOWED_ORIGINS || '').split(',').map((s) => s.trim());
  if (
    origins.some((origin) => {
      try {
        const url = new URL(origin);
        return (
          url.origin !== origin ||
          !['https:', 'http:'].includes(url.protocol) ||
          (url.protocol === 'http:' && !['localhost', '127.0.0.1', '[::1]'].includes(url.hostname))
        );
      } catch {
        return true;
      }
    })
  )
    issues.push('CORS_ALLOWED_ORIGINS');
  return [...new Set(issues)];
}
