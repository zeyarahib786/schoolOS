import mongoose from 'mongoose';
let draining = false;
export function markDraining(): void {
  draining = true;
}
export async function databaseReady(): Promise<boolean> {
  if (draining || mongoose.connection.readyState !== 1 || !mongoose.connection.db) return false;
  try {
    const hello = await mongoose.connection.db.admin().command({ hello: 1 }, { timeoutMS: 1500 });
    // Transactional modules require a writable replica set or mongos, not standalone MongoDB.
    return Boolean((hello.setName && hello.isWritablePrimary) || hello.msg === 'isdbgrid');
  } catch {
    return false;
  }
}
