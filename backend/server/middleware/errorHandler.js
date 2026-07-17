// Global Express error handler. Returns a consistent { error } shape.
import { createLogger } from '../utils/logger.js';

const log = createLogger('http');

export function errorHandler(err, req, res, _next) {
  log.error(`${req.method} ${req.path} — ${err.message}`);
  const status = err.status || err.statusCode || 500;
  if (res.headersSent) return; // SSE already streaming; can't change status
  res.status(status).json({ error: err.message || 'Internal server error' });
}

export function notFound(req, res) {
  res.status(404).json({ error: `Not found: ${req.method} ${req.path}` });
}
