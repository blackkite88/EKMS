// GET /sources → document counts per source type. Public-ish (optional auth):
// counts don't reveal content, so this is safe for any authenticated user.
import { Router } from 'express';
import { optionalAuth } from '../auth/middleware.js';
import { scanDataFiles, getSourceType } from '../ingestion/scanner.js';

const router = Router();

router.get('/', optionalAuth, async (_req, res, next) => {
  try {
    const files = await scanDataFiles();
    // Count by the ACTUAL industrial source type (the data/ subfolder), so the
    // response reflects the real corpus — equipment, workorders, inspections,
    // failures, manuals, procedures, regulations, logs, people — rather than a
    // fixed category whitelist.
    const counts = {};
    for (const file of files) {
      const type = getSourceType(file);
      counts[type] = (counts[type] || 0) + 1;
    }
    const total = files.length;
    res.json({ ...counts, total });
  } catch (err) {
    next(err);
  }
});

export default router;
