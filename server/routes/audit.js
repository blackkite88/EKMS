// GET /audit → the access audit trail (the enterprise-compliance story).
// Restricted to executive clearance. GET /audit/policies → the declarative ABAC
// policy set (nice for the demo: "here are our access policies").
import { Router } from 'express';
import { requireAuth } from '../auth/middleware.js';
import { query } from '../config/postgres.js';
import { describePolicies } from '../auth/policy.js';

const router = Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    if (req.user.clearance < 5) {
      return res.status(403).json({ error: 'Audit log requires executive clearance.' });
    }
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const { rows } = await query(
      `SELECT user_email, action, query, granted_ids, denied_count, metadata, created_at
       FROM audit_log ORDER BY created_at DESC LIMIT $1`,
      [limit]
    );
    res.json({ entries: rows });
  } catch (err) {
    next(err);
  }
});

router.get('/policies', requireAuth, (_req, res) => {
  res.json({ policies: describePolicies() });
});

export default router;
