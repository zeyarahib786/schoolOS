import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { spawn } from 'child_process';
import { createReadStream, createWriteStream } from 'fs';
import { chmod, mkdtemp, readFile, rm, stat, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { dirname, join, resolve } from 'path';
import { pipeline } from 'stream/promises';
import { mongo } from 'mongoose';

const MAGIC = Buffer.from('SCHOOLOS1');
const HEADER_SIZE = MAGIC.length + 12;
type Snapshot = Record<string, { count: number; sha256: string; indexes: unknown[] }>;
interface Manifest {
  format: 1;
  sourceDatabase: string;
  createdAt: string;
  consistency: 'writes-paused';
  sha256: string;
  collections: Snapshot;
}

export function backupKey(value: string): Buffer {
  const key = Buffer.from(value, 'base64');
  if (key.length !== 32 || key.toString('base64') !== value)
    throw Error('SCHOOLOS_BACKUP_KEY must be a canonical base64-encoded 32-byte key');
  return key;
}
function databaseName(value: string): string {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw Error('An explicit simple database name is required');
  return value;
}
function canonical(value: unknown): string {
  function ordered(input: unknown): unknown {
    if (Array.isArray(input)) return input.map(ordered);
    if (input && typeof input === 'object')
      return Object.fromEntries(
        Object.entries(input)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, item]) => [key, ordered(item)]),
      );
    return input;
  }
  return JSON.stringify(ordered(value));
}
async function hashFile(file: string): Promise<string> {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}
async function snapshot(db: mongo.Db): Promise<Snapshot> {
  const result: Snapshot = {};
  for (const collection of await db.listCollections().toArray()) {
    if (collection.name.startsWith('system.')) continue;
    if (collection.type !== 'collection') throw Error('Views require a separately reviewed backup strategy');
    const rows = db.collection(collection.name),
      hash = createHash('sha256');
    let count = 0;
    for await (const row of rows.find().sort({ _id: 1 })) {
      hash.update(canonical(mongo.BSON.EJSON.serialize(row, { relaxed: false })) + '\n');
      count++;
    }
    const indexes = (await rows.listIndexes().toArray())
      .map(({ v: _v, ns: _ns, ...index }) => index)
      .sort((a, b) => String(a.name).localeCompare(String(b.name)));
    result[collection.name] = { count, sha256: hash.digest('hex'), indexes };
  }
  return result;
}
function tool(name: string): string {
  return process.env.SCHOOLOS_DB_TOOLS_DIR ? join(process.env.SCHOOLOS_DB_TOOLS_DIR, name) : name;
}
async function connectionConfig(dir: string, uri: string): Promise<string> {
  const file = join(dir, 'mongo-config.yml');
  await writeFile(file, JSON.stringify({ uri }), { mode: 0o600, flag: 'wx' });
  return file;
}
function processTool(name: string, args: string[]) {
  const child = spawn(tool(name), args, { stdio: ['ignore', 'pipe', 'pipe'], timeout: 30 * 60 * 1000 });
  // Tool errors may contain connection details. Never forward them into operator logs.
  child.stderr.resume();
  const done = new Promise<void>((accept, reject) => {
    child.once('error', () => reject(Error(`${name} could not start`)));
    child.once('close', (code) =>
      code === 0
        ? accept()
        : reject(Error(`${name} failed; inspect permissions/tool compatibility without exposing credentials`)),
    );
  });
  return { child, done };
}

/** Scoped backups require every API, worker and other writer to be stopped first. */
export async function backupDatabase(options: {
  uri: string;
  database: string;
  key: Buffer;
  archive: string;
  writesPaused: boolean;
}): Promise<Manifest> {
  if (!options.writesPaused)
    throw Error('Stop all writers and set SCHOOLOS_BACKUP_WRITES_PAUSED=yes before a scoped backup');
  const database = databaseName(options.database),
    archive = resolve(options.archive);
  const directory = await stat(dirname(archive));
  if (!directory.isDirectory()) throw Error('Backup output directory must already exist');
  const dir = await mkdtemp(join(tmpdir(), 'schoolos-backup-'));
  const client = new mongo.MongoClient(options.uri, { serverSelectionTimeoutMS: 5000 });
  let created = false,
    completed = false;
  try {
    await client.connect();
    const before = await snapshot(client.db(database));
    const header = Buffer.concat([MAGIC, randomBytes(12)]),
      cipher = createCipheriv('aes-256-gcm', options.key, header.subarray(MAGIC.length));
    cipher.setAAD(header);
    await writeFile(archive, header, { mode: 0o600, flag: 'wx' });
    created = true;
    const config = await connectionConfig(dir, options.uri);
    const { child, done } = processTool('mongodump', ['--config=' + config, '--db=' + database, '--archive', '--gzip']);
    try {
      await Promise.all([
        pipeline(child.stdout, cipher, createWriteStream(archive, { flags: 'a', mode: 0o600 })),
        done,
      ]);
    } finally {
      if (child.exitCode === null) child.kill();
    }
    await writeFile(archive, cipher.getAuthTag(), { flag: 'a' });
    const after = await snapshot(client.db(database));
    if (canonical(before) !== canonical(after)) throw Error('Database changed during backup; archive rejected');
    const manifest: Manifest = {
      format: 1,
      sourceDatabase: database,
      createdAt: new Date().toISOString(),
      consistency: 'writes-paused',
      sha256: await hashFile(archive),
      collections: before,
    };
    await writeFile(archive + '.json', JSON.stringify(manifest, null, 2), { mode: 0o600, flag: 'wx' });
    completed = true;
    return manifest;
  } finally {
    await client.close();
    await rm(dir, { recursive: true, force: true });
    if (created && !completed) await rm(archive, { force: true });
  }
}

/** Never restores over a populated or production-named database. Authentication precedes writes. */
export async function restoreDatabase(options: {
  uri: string;
  database: string;
  key: Buffer;
  archive: string;
}): Promise<Manifest> {
  const database = databaseName(options.database),
    archive = resolve(options.archive);
  if (!/^schoolos_restore_[A-Za-z0-9_-]+$/.test(database))
    throw Error('Restore target must start with schoolos_restore_');
  const manifest: Manifest = JSON.parse(await readFile(archive + '.json', 'utf8'));
  if (
    manifest.format !== 1 ||
    manifest.consistency !== 'writes-paused' ||
    !manifest.collections ||
    !/^[a-f0-9]{64}$/.test(manifest.sha256)
  )
    throw Error('Unsupported backup manifest');
  databaseName(manifest.sourceDatabase);
  if (database === manifest.sourceDatabase) throw Error('Restore target must differ from source');
  if ((await hashFile(archive)) !== manifest.sha256) throw Error('Backup checksum mismatch');
  const dir = await mkdtemp(join(tmpdir(), 'schoolos-restore-'));
  const client = new mongo.MongoClient(options.uri, { serverSelectionTimeoutMS: 5000 });
  try {
    await client.connect();
    if ((await client.db(database).listCollections().toArray()).length)
      throw Error('Restore target must be completely empty');
    const size = (await stat(archive)).size;
    if (size <= HEADER_SIZE + 16) throw Error('Truncated backup');
    const handle = await import('fs/promises').then((fs) => fs.open(archive, 'r'));
    let header: Buffer, tag: Buffer;
    try {
      header = Buffer.alloc(HEADER_SIZE);
      tag = Buffer.alloc(16);
      await handle.read(header, 0, HEADER_SIZE, 0);
      await handle.read(tag, 0, 16, size - 16);
    } finally {
      await handle.close();
    }
    if (!header.subarray(0, MAGIC.length).equals(MAGIC)) throw Error('Unsupported backup format');
    const decipher = createDecipheriv('aes-256-gcm', options.key, header.subarray(MAGIC.length));
    decipher.setAAD(header);
    decipher.setAuthTag(tag);
    const plaintext = join(dir, 'verified.archive.gz');
    await pipeline(
      createReadStream(archive, { start: HEADER_SIZE, end: size - 17 }),
      decipher,
      createWriteStream(plaintext, { flags: 'wx', mode: 0o600 }),
    );
    await chmod(plaintext, 0o600);
    // The complete GCM tag has now been verified; only then may mongorestore write.
    const config = await connectionConfig(dir, options.uri);
    const { child, done } = processTool('mongorestore', [
      '--config=' + config,
      '--archive=' + plaintext,
      '--gzip',
      '--stopOnError',
      '--nsInclude=' + manifest.sourceDatabase + '.*',
      '--nsFrom=' + manifest.sourceDatabase + '.*',
      '--nsTo=' + database + '.*',
    ]);
    child.stdout.resume();
    await done;
    const restored = await snapshot(client.db(database));
    if (canonical(restored) !== canonical(manifest.collections))
      throw Error('Restore data/index verification failed; keep the isolated target for investigation');
    return manifest;
  } finally {
    await client.close();
    await rm(dir, { recursive: true, force: true });
  }
}
