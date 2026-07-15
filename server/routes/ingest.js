// POST /ingest → runs the full ingestion pipeline (vectors + graph). Protected;
// intended for admin/setup use. Long-running, so it returns a summary when done.
import { Router } from 'express';
import { requireAuth } from '../auth/middleware.js';
import { runIngestionPipeline } from '../ingestion/loader.js';
import { invalidateKeywordIndex } from '../retrieval/keyword.js';

const router = Router();

router.post('/', requireAuth, async (req, res, next) => {
  try {
    // Only executives may trigger a re-index in this demo.
    if (req.user.clearance < 5) {
      return res.status(403).json({ error: 'Ingestion requires executive clearance.' });
    }
    const reset = req.body?.reset === true;
    const buildGraphToo = req.body?.graph !== false;
    const result = await runIngestionPipeline({ reset, buildGraphToo });
    invalidateKeywordIndex();
    res.json({ success: true, ...result });
  } catch (err) {
    next(err);
  }
});

export default router;
