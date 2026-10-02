import { createApp } from './app';
import { connectDb } from './config/db';
import { env } from './config/env';
import { logger } from './utils/logger';

async function main(): Promise<void> {
  await connectDb();
  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`Server listening on port ${env.PORT} (${env.NODE_ENV})`);
  });

  const shutdown = (signal: string) => {
    logger.info(`${signal} received - shutting down gracefully`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 10000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal startup error:', err);
  process.exit(1);
});
