import { runAssignmentReminders } from '../lms/lms.reminders.service';
import { runAttendanceAlerts } from '../attendance/attendance.alerts.service';
import { runLmsAutomation } from '../lms/lms.automation.service';
import { notifyDueFollowUps } from './notifications.inbox.service';
import { processOneDelivery } from './notifications.service';
import { logger } from '../../utils/logger';
export function startNotificationWorker() {
  let stopped = false;
  let lastDueScan = 0;
  let timer: NodeJS.Timeout | undefined;
  const tick = async () => {
    if (stopped) return;
    try {
      for (let n = 0; n < 10 && !stopped; n++) if (!(await processOneDelivery())) break;
      if (!stopped && Date.now() - lastDueScan >= 60000) {
        await notifyDueFollowUps();
        if (!stopped) await runLmsAutomation();
        if (!stopped) await runAssignmentReminders();
        if (!stopped) await runAttendanceAlerts();
        lastDueScan = Date.now();
      }
    } catch {
      logger.error('Notification worker failed; next polling cycle will inspect pending deliveries');
    }
    if (!stopped) {
      timer = setTimeout(() => {
        inFlight = tick();
      }, 3000);
      timer.unref();
    }
  };
  let inFlight = tick();
  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    return inFlight;
  };
}
