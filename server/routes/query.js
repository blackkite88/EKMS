// POST /query → authenticated SSE stream. Validates input, opens an SSE stream,
// and hands off to the orchestrator which drives the whole pipeline.
import { Router } from 'express';
import { requireAuth } from '../auth/middleware.js';
import { SSEStream } from '../agent/stream.js';
import { runQuery } from '../agent/orchestrator.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('route-query');
const router = Router();

router.post('/', requireAuth, async (req, res) => {
  const { query, sessionId } = req.body || {};
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return res.status(400).json({ error: 'query is required and must be a non-empty string' });
  }
  if (query.length > 2000) {
    return res.status(400).json({ error: 'query must be under 2000 characters' });
  }

  const stream = new SSEStream(res);
  try {
    await runQuery({
      query: query.trim(),
      user: req.user,
      sessionId: sessionId || `sess_${req.user.email}`,
      stream,
    });
  } catch (err) {
    log.error(`Query pipeline error: ${err.message}`);
    stream.error(err.message);
    stream.done();
  }
});

export default router;
