// GET /conversations → the current user's past conversations (list).
// GET /conversations/:sessionId → the full transcript of one (scoped to the user).
import { Router } from 'express';
import { requireAuth } from '../auth/middleware.js';
import { listSessions, loadSession } from '../agent/memory.js';

const router = Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const sessions = await listSessions(req.user.email);
    res.json({ conversations: sessions });
  } catch (err) {
    next(err);
  }
});

router.get('/:sessionId', requireAuth, async (req, res, next) => {
  try {
    const turns = await loadSession(req.params.sessionId, req.user.email);
    res.json({
      session_id: req.params.sessionId,
      messages: turns.map((t) => ({ role: t.role, content: t.content, created_at: t.created_at })),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
