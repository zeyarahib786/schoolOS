jest.mock('mongoose', () => ({
  __esModule: true,
  default: { connection: { readyState: 1, db: { admin: jest.fn() } } },
}));
import mongoose from 'mongoose';
import { databaseReady, markDraining } from '../../src/utils/readiness';
describe('Readiness topology and shutdown', () => {
  const command = jest.fn();
  beforeEach(() => {
    (mongoose.connection.db!.admin as jest.Mock).mockReturnValue({ command });
    command.mockReset();
  });
  it('requires a writable replica member or mongos', async () => {
    for (const hello of [{ isWritablePrimary: true }, { setName: 'rs0', isWritablePrimary: false }]) {
      command.mockResolvedValue(hello);
      expect(await databaseReady()).toBe(false);
    }
    command.mockResolvedValue({ setName: 'rs0', isWritablePrimary: true });
    expect(await databaseReady()).toBe(true);
    command.mockResolvedValue({ msg: 'isdbgrid' });
    expect(await databaseReady()).toBe(true);
    expect(command).toHaveBeenCalledWith({ hello: 1 }, { timeoutMS: 1500 });
  });
  it('returns unavailable on database command failure', async () => {
    command.mockRejectedValue(Error('private database error'));
    expect(await databaseReady()).toBe(false);
  });
  it('does not accept new traffic while draining', async () => {
    markDraining();
    expect(await databaseReady()).toBe(false);
    expect(command).not.toHaveBeenCalled();
  });
});
