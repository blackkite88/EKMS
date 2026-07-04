import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { rateLimiter } from './middleware/rateLimiter.js';
import { errorHandler } from './middleware/errorHandler.js';
import queryRouter from './routes/query.js';
import ingestRouter from './routes/ingest.js';
import sourcesRouter from './routes/sources.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(rateLimiter);

// Routes
app.use('/query', queryRouter);
app.use('/ingest', ingestRouter);
app.use('/sources', sourcesRouter);

// Global Error Handler
app.use(errorHandler);

app.listen(PORT, () => {
    console.log(`Nexora Knowledge Brain is running on port ${PORT}`);
});
