import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import queryRouter from './routes/query.js';
import ingestRouter from './routes/ingest.js';
import sourcesRouter from './routes/sources.js';
import { errorHandler } from './middleware/errorHandler.js';
import { rateLimiter } from './middleware/rateLimiter.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(rateLimiter);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Nexora Knowledge Brain', timestamp: new Date().toISOString() });
});

app.use('/query', queryRouter);
app.use('/ingest', ingestRouter);
app.use('/sources', sourcesRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[server] Nexora Knowledge Brain running on http://localhost:${PORT}`);
  console.log(`[server] Groq model: llama-3.3-70b-versatile`);
  console.log(`[server] ChromaDB: ${process.env.CHROMA_URL || 'http://localhost:8000'}`);
  console.log(`[server] Ollama: ${process.env.OLLAMA_URL || 'http://localhost:11434'}`);
});
