import { Router } from 'express';
import { runIngestionPipeline } from '../ingestion/loader.js';

const router = Router();

router.post('/', async (req, res, next) => {
  try {
    const reset = req.body?.reset === true;
    const result = await runIngestionPipeline(reset);
    res.json({
      success: true,
      message: 'Ingestion pipeline completed successfully',
      ...result,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
