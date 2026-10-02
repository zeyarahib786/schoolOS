import { connectDb, disconnectDb } from '../config/db';
import { logger } from '../utils/logger';
import { DEMO_STUDENT_EMAIL, ensureDemoStudentAccount } from './studentAccountSeed';

// Same fictional-data password used by seed.ts. Never run this against a production school database.
const DEMO_PASSWORD = 'ChangeMe123';

async function run(): Promise<void> {
  if (process.env.NODE_ENV === 'production') throw new Error('Demo Student account seeding is disabled in production');
  await connectDb();
  try {
    const outcome = await ensureDemoStudentAccount(DEMO_PASSWORD);
    logger.info({ email: DEMO_STUDENT_EMAIL, outcome }, 'Demo Student login ready');
  } finally {
    await disconnectDb();
  }
}

run().catch((error) => {
  logger.error({ err: error }, 'Demo Student account seed failed');
  process.exitCode = 1;
});
