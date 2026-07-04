import express from 'express';
import { runIngestion } from '../ingestion/loader.js';

const router = express.Router();

router.post('/', async (req, res, next) => {
    try {
        // Start ingestion asynchronously so we don't block the HTTP response
        runIngestion().catch(error => {
            console.error('Background ingestion failed:', error);
        });

        res.json({ message: 'Ingestion pipeline started successfully' });
    } catch (error) {
        next(error);
    }
});

export default router;
