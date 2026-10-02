import mongoose from 'mongoose';
import { env } from './env';
import { logger } from '../utils/logger';

/**
 * Connection pool and timeout settings tuned for a multi-instance production deployment
 * (e.g. 2+ ECS Fargate tasks per AWS_DEPLOYMENT.md) rather than Mongoose's single-instance-app
 * defaults. Each app instance maintains its own pool up to maxPoolSize - with N tasks running,
 * total concurrent connections to MongoDB is roughly N * maxPoolSize, which is the number that
 * actually needs to stay under the database tier's connection limit (Atlas M10 = 1500, M20 =
 * 3000, etc.) - size maxPoolSize with that ceiling in mind as task count grows, not just this file.
 */
const CONNECTION_OPTIONS: mongoose.ConnectOptions = {
  maxPoolSize: env.DB_MAX_POOL_SIZE, // per app instance - see note above for how this multiplies across replicas
  minPoolSize: env.DB_MIN_POOL_SIZE, // keep a small warm pool instead of paying full connection-setup latency on every burst
  serverSelectionTimeoutMS: 10000, // fail fast on a genuinely unreachable cluster rather than hanging requests
  socketTimeoutMS: 45000,
  retryWrites: true, // safe to enable broadly; MongoDB automatically ensures at-most-once semantics for retried writes
};

export async function connectDb(): Promise<typeof mongoose> {
  mongoose.set('strictQuery', true);
  const conn = await mongoose.connect(env.MONGO_URI, CONNECTION_OPTIONS);

  conn.connection.on('error', (err) => logger.error({ err }, 'MongoDB connection error'));
  conn.connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
  conn.connection.on('reconnected', () => logger.info('MongoDB reconnected'));

  logger.info(
    { host: conn.connection.host, db: conn.connection.name, maxPoolSize: CONNECTION_OPTIONS.maxPoolSize },
    'MongoDB connected',
  );
  return conn;
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
}
