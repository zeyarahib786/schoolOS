jest.mock('../../src/modules/notifications/notifications.service', () => ({ processOneDelivery: jest.fn() }));
jest.mock('../../src/utils/logger', () => ({ logger: { error: jest.fn() } }));
import { processOneDelivery } from '../../src/modules/notifications/notifications.service';
import { startNotificationWorker } from '../../src/modules/notifications/notifications.worker';
describe('Notification shutdown', () => {
  it('waits for the current delivery and does not claim another after stopping', async () => {
    let complete!: (value: boolean) => void;
    (processOneDelivery as jest.Mock).mockImplementation(
      () =>
        new Promise<boolean>((resolve) => {
          complete = resolve;
        }),
    );
    const stop = startNotificationWorker();
    let drained = false;
    const waiting = stop().then(() => {
      drained = true;
    });
    await Promise.resolve();
    expect(drained).toBe(false);
    complete(true);
    await waiting;
    expect(drained).toBe(true);
    expect(processOneDelivery).toHaveBeenCalledTimes(1);
  });
});
