// GET /reports → generated RCA + compliance reports the user may see (ABAC).
// GET /reports/:id → one full report.
import { Router } from 'express';
import { requireAuth } from '../auth/middleware.js';
import { query } from '../config/postgres.js';
import { canAccess } from '../auth/policy.js';

const router = Router();

function rowAccess(r) {
  return {
    department: r.access_department,
    unit: r.access_unit,
    min_clearance: r.access_min_clearance,
    sensitivity: r.access_sensitivity,
  };
}

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM action_reports ORDER BY created_at DESC LIMIT 100');
    const visible = rows.filter((r) => canAccess(req.user, rowAccess(r)));
    res.json({
      reports: visible.map((r) => ({
        id: r.id, report_type: r.report_type, title: r.title,
        equipment_id: r.equipment_id, created_by: r.created_by, created_at: r.created_at,
      })),
    });
  } catch (err) { next(err); }
});

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM action_reports WHERE id = $1', [req.params.id]);
    const r = rows[0];
    if (!r) return res.status(404).json({ error: 'Report not found' });
    if (!canAccess(req.user, rowAccess(r))) return res.status(403).json({ error: 'You are not cleared to view this report.' });
    res.json({ id: r.id, report_type: r.report_type, title: r.title, content: r.content, equipment_id: r.equipment_id, created_by: r.created_by, created_at: r.created_at });
  } catch (err) { next(err); }
});

export default router;
