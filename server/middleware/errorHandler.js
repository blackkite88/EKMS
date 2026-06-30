export function errorHandler(err, req, res, next) {
  console.error(`[error] ${req.method} ${req.path} — ${err.message}`);
  if (err.stack) console.error(err.stack);

  const status = err.status || err.statusCode || 500;
  res.status(status).json({ error: err.message || 'Internal server error' });
}
