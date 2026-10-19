import { z } from 'zod';
import { productionConfigurationIssues } from './production';

/**
 * Fail fast on boot if required environment variables are missing or malformed,
 * rather than surfacing a confusing runtime error later (e.g. a silently undefined
 * JWT secret). This is the single source of truth for typed config elsewhere in the app.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).optional(),
  PORT: z.coerce.number().int().positive().default(4000),
  API_PREFIX: z.string().default('/api/v1'),
  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),
  CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:5173'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900000),
  RATE_LIMIT_MAX: z.coerce.number().int().positive().default(5000),
  DB_MAX_POOL_SIZE: z.coerce.number().int().positive().default(20),
  DB_MIN_POOL_SIZE: z.coerce.number().int().min(0).default(2),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    // eslint-disable-next-line no-console
    console.error('Invalid environment configuration:', parsed.error.flatten().fieldErrors);
    throw new Error('Environment validation failed - see errors above. Check .env against .env.example.');
  }
  const unsafe = productionConfigurationIssues({
    NODE_ENV: parsed.data.NODE_ENV,
    JWT_ACCESS_SECRET: parsed.data.JWT_ACCESS_SECRET,
    JWT_REFRESH_SECRET: parsed.data.JWT_REFRESH_SECRET,
    CORS_ALLOWED_ORIGINS: parsed.data.CORS_ALLOWED_ORIGINS,
  });
  if (unsafe.length) throw new Error('Unsafe production configuration fields: ' + unsafe.join(', '));
  return parsed.data;
}

export const env = loadEnv();

export const corsAllowedOrigins = env.CORS_ALLOWED_ORIGINS.split(',').map((o) => o.trim());
