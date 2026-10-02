import pino from 'pino';
import { env } from '../config/env';

/**
 * Structured JSON logging. In production this ships straight to CloudWatch (or any
 * log collector) as newline-delimited JSON with no manual parsing needed. Never log
 * full request bodies or secrets here - see requestLogger middleware for redaction rules.
 */
export const logger = pino({
  level: env.NODE_ENV === 'production' ? 'info' : 'debug',
  transport:
    env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
      : undefined,
});
