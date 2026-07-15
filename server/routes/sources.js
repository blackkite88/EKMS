// GET /sources → document counts per source type. Public-ish (optional auth):
// counts don't reveal content, so this is safe for any authenticated user.
import { Router } from 'express';
import { optionalAuth } from '../auth/middleware.js';
import { scanDataFiles, getSourceType } from '../ingestion/scanner.js';

const router = Router();

router.get('/', optionalAuth, async (_req, res, next) => {
  try {
    const files = await scanDataFiles();
    const counts = { emails: 0, meetings: 0, tickets: 0, docs: 0, github: 0, other: 0 };
    for (const file of files) {
      const type = getSourceType(file);
      if (counts[type] !== undefined) counts[type]++;
      else counts.other++;
    }
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    res.json({ ...counts, total });
  } catch (err) {
    next(err);
  }
});

export default router;
