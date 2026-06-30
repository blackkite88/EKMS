import { Router } from 'express';
import { queryStream } from '../agent/agent.js';

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    const { query } = req.body;
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return res.status(400).json({ error: 'query field is required and must be a non-empty string' });
    }
    if (query.trim().length > 2000) {
      return res.status(400).json({ error: 'query must be under 2000 characters' });
    }
    await queryStream(query.trim(), res);
  } catch (err) {
    next(err);
  }
});

export default router;
