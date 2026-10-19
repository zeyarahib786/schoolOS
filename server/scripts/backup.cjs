// Supply secrets through a protected env file or the host secret manager, never arguments.
const { backupDatabase, restoreDatabase, backupKey } = require('../dist/utils/databaseBackup');
(async () => {
  const [command, archive] = process.argv.slice(2);
  if (!['backup', 'restore'].includes(command) || !archive) throw Error('Usage: node scripts/backup.cjs backup|restore /private/path/archive.enc');
  const uri = process.env.MONGO_URI, database = process.env.SCHOOLOS_BACKUP_DB;
  if (!uri || !database) throw Error('MONGO_URI and SCHOOLOS_BACKUP_DB are required');
  const options = { uri, database, archive, key: backupKey(process.env.SCHOOLOS_BACKUP_KEY || ''), writesPaused: process.env.SCHOOLOS_BACKUP_WRITES_PAUSED === 'yes' };
  const started = Date.now();
  const manifest = await (command === 'backup' ? backupDatabase(options) : restoreDatabase(options));
  console.log(JSON.stringify({command, status:'verified', elapsedMs:Date.now()-started, collections:Object.keys(manifest.collections).length, documents:Object.values(manifest.collections).reduce((sum,c)=>sum+c.count,0)}));
})().catch(error => { console.error(error.message); process.exitCode = 1; });
