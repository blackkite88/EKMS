// GET /work-orders → work orders the user is allowed to see (ABAC-filtered,
// same pattern as /graph). POST /work-orders → create one (permission-gated).
import { Router } from 'express';
import { requireAuth } from '../auth/middleware.js';
import { query } from '../config/postgres.js';
import { canAccess } from '../auth/policy.js';
import { canPerform } from '../auth/action-policy.js';
import { createWorkOrder } from '../mcp/actions.js';
import { writeAudit } from '../middleware/auditLogger.js';

const router = Router();

function rowAccess(r) {
  return {
    department: r.access_department,
    unit: r.access_unit,
    min_clearance: r.access_min_clearance,
    sensitivity: 'internal',
  };
}

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { rows } = await query('SELECT * FROM work_orders ORDER BY created_at DESC LIMIT 200');
    const visible = rows.filter((r) => canAccess(req.user, rowAccess(r)));
    res.json({
      workOrders: visible.map((r) => ({
        wo_number: r.wo_number, title: r.title, description: r.description,
        equipment_id: r.equipment_id, priority: r.priority, status: r.status,
        created_by: r.created_by, assigned_to: r.assigned_to, created_at: r.created_at,
      })),
      stats: { visible: visible.length, hidden: rows.length - visible.length, total: rows.length },
    });
  } catch (err) { next(err); }
});

router.post('/', requireAuth, async (req, res, next) => {
  try {
    const perm = canPerform(req.user, 'create_work_order');
    if (!perm.allowed) return res.status(403).json({ error: perm.reason });
    const { result, mode } = await (async () => ({ result: (await createWorkOrder(req.body || {}, req.user)).result, mode: 'live' }))();
    await writeAudit({ userEmail: req.user.email, action: 'create_work_order', metadata: result });
    res.status(201).json({ ...result, mode });
  } catch (err) { next(err); }
});

export default router;
