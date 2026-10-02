import { MongoMemoryReplSet } from 'mongodb-memory-server';
import mongoose from 'mongoose';

jest.setTimeout(30000);

process.env.NODE_ENV = 'test';
process.env.JWT_ACCESS_SECRET = 'test-access-secret-at-least-32-characters-long';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-at-least-32-characters-long';
process.env.MONGO_URI = 'mongodb://placeholder'; // overwritten below before any import touches env

let mongod: MongoMemoryReplSet | undefined;

beforeAll(async () => {
  // Production uses a replica set and four modules rely on real transactions. Running the
  // integration suite against a standalone mongod made those tests fail with misleading 500s.
  mongod = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  process.env.MONGO_URI = mongod.getUri();
  await mongoose.connect(process.env.MONGO_URI);
});

afterEach(async () => {
  const collections = mongoose.connection.collections;
  for (const key of Object.keys(collections)) {
    await collections[key].deleteMany({});
  }
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongod?.stop();
});
