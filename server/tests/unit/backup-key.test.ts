import { randomBytes } from 'crypto';
import { backupKey } from '../../src/utils/databaseBackup';
describe('Backup encryption key validation', () => {
  it('requires exactly 256 bits in canonical base64 and never echoes a rejected key', () => {
    const key = randomBytes(32);
    expect(backupKey(key.toString('base64'))).toEqual(key);
    for (const invalid of ['short-secret', randomBytes(16).toString('base64'), key.toString('base64') + ' ']) {
      expect(() => backupKey(invalid)).toThrow('32-byte key');
      try {
        backupKey(invalid);
      } catch (error) {
        expect(String(error)).not.toContain(invalid);
      }
    }
  });
});
