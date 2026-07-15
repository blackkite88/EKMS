// Writes entries to the Postgres audit_log — the enterprise-compliance trail of
// who asked what, and what access was granted vs denied. Exposed both as a
// direct helper (used by the orchestrator) and an Express middleware that logs
// simple request access.
import { query } from '../config/postgres.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('audit');

export async function writeAudit({ userEmail, action, query: q = null, grantedIds = [], deniedCount = 0, metadata = {} }) {
  try {
    await query(
      `INSERT INTO audit_log (user_email, action, query, granted_ids, denied_count, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userEmail, action, q, grantedIds, deniedCount, JSON.stringify(metadata)]
    );
  } catch (err) {
    log.warn(`Audit write failed: ${err.message}`);
  }
}

// Lightweight middleware to log access to protected endpoints (non-query).
export function auditRequest(action) {
  return async (req, _res, next) => {
    writeAudit({
      userEmail: req.user?.email || 'anonymous',
      action,
      metadata: { path: req.path, method: req.method },
    }).catch(() => {});
    next();
  };
}
