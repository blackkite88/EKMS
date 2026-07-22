// Seeds a few realistic notifications so the Notifications section is populated
// on first run. Idempotent: only inserts when the table is empty, so restarts
// don't create duplicates. Recipients are real login emails or department names
// so they actually reach the demo users' inboxes.
import { query } from '../config/postgres.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('seed-notifications');

const SEED = [
  {
    recipient: 'technician@bpi.com', // Ravi Kulkarni (maintenance) — owns P-101
    sender: 'reliability@bpi.com',
    title: 'Follow-up: P-101 shaft alignment verification',
    body: 'After the RCA on FAIL-2025-03, please verify shaft alignment on P-101 per the updated SOP-SEAL-REPL before returning it to service.',
    related_to: 'P-101',
  },
  {
    recipient: 'maintenance', // whole maintenance department
    sender: 'manager@bpi.com',
    title: 'SOP-SEAL-REPL update rollout',
    body: 'The post-seal-replacement alignment step is now mandatory. All maintenance staff must follow the revised procedure effective immediately.',
    related_to: 'SOP-SEAL-REPL',
  },
  {
    recipient: 'operations', // Sunil Yadav (operations)
    sender: 'safety@bpi.com',
    title: 'Tank farm gauging reminder — T-501 / T-502',
    body: 'Manual gauging cross-checks are due this shift for T-501 and T-502. Log readings against the automated level transmitters.',
    related_to: 'T-501',
  },
  {
    recipient: 'engineering', // Meera Krishnan (reliability/engineering)
    sender: 'manager@bpi.com',
    title: 'Compliance gaps flagged for review',
    body: 'The latest compliance scan surfaced overdue inspection intervals. Please review the compliance report and prioritize corrective work orders.',
    related_to: null,
  },
];

export async function seedNotifications() {
  try {
    const { rows } = await query('SELECT COUNT(*)::int AS n FROM notifications');
    if (rows[0].n > 0) {
      log.info(`Notifications already present (${rows[0].n}); skipping seed.`);
      return;
    }
    for (const s of SEED) {
      await query(
        `INSERT INTO notifications (recipient, sender, title, body, related_to) VALUES ($1,$2,$3,$4,$5)`,
        [s.recipient, s.sender, s.title, s.body, s.related_to]
      );
    }
    log.info(`Seeded ${SEED.length} notifications.`);
  } catch (err) {
    log.warn(`Failed to seed notifications: ${err.message}`);
  }
}
