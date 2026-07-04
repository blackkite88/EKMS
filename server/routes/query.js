import express from 'express';
import { queryStream } from '../agent/agent.js';

const router = express.Router();

router.post('/', async (req, res, next) => {
    try {
        const { query } = req.body;
        
        if (!query || typeof query !== 'string') {
            return res.status(400).json({ error: 'Valid query string is required' });
        }

        await queryStream(query, res);
    } catch (error) {
        next(error);
    }
});

export default router;
