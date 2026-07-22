// POST /actions/:action/execute → actually perform an action. This is what an
// action TILE calls when the user clicks it (the AI only ever PROPOSES actions;
// execution happens here, on an explicit user click). Permission-gated inside
// executeTool, which returns { mode:'denied' } if the role isn't allowed.
import { Router } from 'express';
import { requireAuth } from '../auth/middleware.js';
import { executeTool, actionConfirmationText } from '../mcp/client.js';
import { ACTIONS } from '../agent/router.js';
import { writeAudit } from '../middleware/auditLogger.js';

const router = Router();

router.post('/:action/execute', requireAuth, async (req, res, next) => {
  try {
    const action = req.params.action;
    if (!ACTIONS.includes(action)) {
      return res.status(400).json({ error: `Unknown action: ${action}` });
    }
    const args = req.body || {};
    const { result, mode } = await executeTool(action, { ...args, user: req.user }, req.user);
    const message = actionConfirmationText(action, result, mode);

    await writeAudit({
      userEmail: req.user.email,
      action: 'mcp_action',
      query: null,
      metadata: { tool: action, mode },
    });

    // A permission denial is a 403; a real result is a 200.
    if (mode === 'denied') return res.status(403).json({ denied: true, message, result });
    res.json({ action, mode, result, message });
  } catch (err) {
    next(err);
  }
});

export default router;
