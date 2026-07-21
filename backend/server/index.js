// Application entrypoint. Wires middleware and routes, initializes the Postgres
// schema, seeds demo users, checks connectivity to the backing services, and
// starts the HTTP server.
import './config/env.js';
import express from 'express';
import cors from 'cors';

import { env } from './config/env.js';
import { createLogger } from './utils/logger.js';

import authRouter from './routes/auth.js';
import queryRouter from './routes/query.js';
import graphRouter from './routes/graph.js';
import ingestRouter from './routes/ingest.js';
import sourcesRouter from './routes/sources.js';
import auditRouter from './routes/audit.js';
import workOrdersRouter from './routes/workorders.js';
import notificationsRouter from './routes/notifications.js';
import reportsRouter from './routes/reports.js';
import documentsRouter from './routes/documents.js';

import { rateLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';

import { initSchema, pingPostgres, closePostgres } from './config/postgres.js';
import { seedUsers } from './auth/users.js';
import { pingNeo4j, closeNeo4j } from './config/neo4j.js';
import { pingChroma } from './config/chroma.js';

const log = createLogger('server');
const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(rateLimiter);

// Health endpoint reports connectivity to each backing service.
app.get('/health', async (_req, res) => {
  const status = { service: 'AssetBrain — Industrial Knowledge Intelligence', version: '2.0.0', time: new Date().toISOString() };
  const checks = {};
  await Promise.all([
    pingPostgres().then(() => (checks.postgres = 'ok')).catch((e) => (checks.postgres = e.message)),
    pingNeo4j().then(() => (checks.neo4j = 'ok')).catch((e) => (checks.neo4j = e.message)),
    pingChroma().then(() => (checks.chroma = 'ok')).catch((e) => (checks.chroma = e.message)),
  ]);
  const healthy = Object.values(checks).every((v) => v === 'ok');
  res.status(healthy ? 200 : 503).json({ ...status, status: healthy ? 'ok' : 'degraded', checks });
});

app.use('/auth', authRouter);
app.use('/query', queryRouter);
app.use('/graph', graphRouter);
app.use('/ingest', ingestRouter);
app.use('/sources', sourcesRouter);
app.use('/audit', auditRouter);
app.use('/work-orders', workOrdersRouter);
app.use('/notifications', notificationsRouter);
app.use('/reports', reportsRouter);
app.use('/documents', documentsRouter);

app.use(notFound);
app.use(errorHandler);

async function bootstrap() {
  // Postgres schema + demo users are required for auth to work at all.
  try {
    await initSchema();
    await seedUsers();
  } catch (err) {
    log.error(`Postgres init failed — auth will not work until Postgres is up: ${err.message}`);
  }

  // Report (but don't block on) the other services.
  await pingNeo4j().then(() => log.info('Neo4j: connected')).catch((e) => log.warn(`Neo4j: ${e.message}`));
  await pingChroma().then(() => log.info('ChromaDB: connected')).catch((e) => log.warn(`ChromaDB: ${e.message}`));

  app.listen(env.port, () => {
    log.info(`Nexora Knowledge Brain v2 listening on http://localhost:${env.port}`);
    log.info(`Groq model: ${env.groqModel} · embeddings: ${env.embeddingProvider}`);
    log.info('Endpoints: POST /auth/login · POST /query · GET /graph · POST /ingest · GET /sources · GET /audit · GET /health');
  });
}

async function shutdown(signal) {
  log.info(`${signal} received — shutting down`);
  await closeNeo4j().catch(() => {});
  await closePostgres().catch(() => {});
  process.exit(0);
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

bootstrap().catch((err) => {
  log.error('Fatal bootstrap error', err);
  process.exit(1);
});
