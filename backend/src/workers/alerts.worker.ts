import cron from 'node-cron';
import { runAlertDetection } from '../services/alert.service';

export function startAlertsWorker() {
  // Run every hour
  cron.schedule('0 * * * *', async () => {
    console.log('[alerts-worker] Running alert detection...');
    try {
      await runAlertDetection();
    } catch (err) {
      console.error('[alerts-worker] Error:', err);
    }
  });

  // Also run once on startup after 10s
  setTimeout(async () => {
    console.log('[alerts-worker] Initial run on startup...');
    try {
      await runAlertDetection();
    } catch (err) {
      console.error('[alerts-worker] Startup error:', err);
    }
  }, 10_000);

  console.log('[alerts-worker] Scheduled (every hour)');
}
