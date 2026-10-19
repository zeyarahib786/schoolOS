import { startNotificationWorker } from './modules/notifications/notifications.worker';
import { createApp } from './app';
import { connectDb, disconnectDb } from './config/db';
import { markDraining } from './utils/readiness';
import { requestMetrics } from './middleware/operationalMetrics';
import { env } from './config/env';
import { logger } from './utils/logger';

async function main(): Promise<void> {
  await connectDb();
  const app = createApp();
  const stopWorker = startNotificationWorker();
  const metricsTimer = setInterval(() => {
    logger.info({ metrics: requestMetrics.drain(), memory: process.memoryUsage() }, 'Operational metrics');
  }, 60000);
  metricsTimer.unref();
  const server = app.listen(env.PORT, () => {
    logger.info(`Server listening on port ${env.PORT} (${env.NODE_ENV})`);
  });

  let shuttingDown = false;
  const shutdown = (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    markDraining();
    clearInterval(metricsTimer);
    logger.info(`${signal} received - shutting down gracefully`);
    const workerStopped = stopWorker();
    server.close(() => {
      void workerStopped
        .then(disconnectDb)
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
    });
    setTimeout(() => process.exit(1), 30000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Fatal startup error:', err);
  process.exit(1);
});
