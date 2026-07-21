// GET /documents/:id → the raw source document behind a citation, ABAC-checked.
// Powers the "click a citation → view the actual work order/manual" drawer.
import { Router } from 'express';
import fs from 'fs/promises';
import { requireAuth } from '../auth/middleware.js';
import { scanDataFiles, getSourceId, getSourceType } from '../ingestion/scanner.js';
import { readFileAsDocument } from '../ingestion/readers.js';
import { canAccess } from '../auth/policy.js';

const router = Router();

router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const id = req.params.id;
    const files = await scanDataFiles();
    const match = files.find((f) => getSourceId(f) === id);
    if (!match) return res.status(404).json({ error: `Document not found: ${id}` });

    const doc = await readFileAsDocument(match);
    if (!canAccess(req.user, doc.metadata.access)) {
      return res.status(403).json({ error: 'You are not cleared to view this document.' });
    }
    const raw = await fs.readFile(match, 'utf-8');
    res.json({
      id,
      source_type: getSourceType(match),
      filename: doc.metadata.filename,
      content: raw,
      structured: doc.structured || null,
    });
  } catch (err) { next(err); }
});

export default router;
