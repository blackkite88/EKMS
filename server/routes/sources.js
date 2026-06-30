import { Router } from 'express';
import { scanDataFiles, getSourceType } from '../utils/fileScanner.js';

const router = Router();

router.get('/', async (req, res, next) => {
  try {
    const files = await scanDataFiles();

    const counts = { emails: 0, meetings: 0, tickets: 0, docs: 0, github: 0, other: 0 };

    for (const file of files) {
      const sourceType = getSourceType(file);
      if (counts[sourceType] !== undefined) {
        counts[sourceType]++;
      } else {
        counts.other++;
      }
    }

    const total = Object.values(counts).reduce((sum, v) => sum + v, 0);

    res.json({ ...counts, total });
  } catch (err) {
    next(err);
  }
});

export default router;
