// In-memory sliding-window rate limiter: 10 requests per minute per IP.
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 10;
const log = new Map(); // ip -> { count, windowStart }

function sweep() {
  const now = Date.now();
  for (const [ip, entry] of log.entries()) {
    if (now - entry.windowStart > WINDOW_MS) log.delete(ip);
  }
}

export function rateLimiter(req, res, next) {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  sweep();

  const entry = log.get(ip);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    log.set(ip, { count: 1, windowStart: now });
    return next();
  }
  if (entry.count >= MAX_REQUESTS) {
    const retryAfter = Math.ceil((WINDOW_MS - (now - entry.windowStart)) / 1000);
    res.setHeader('Retry-After', retryAfter);
    return res.status(429).json({
      error: `Rate limit exceeded. Max ${MAX_REQUESTS} requests/minute. Retry in ${retryAfter}s.`,
    });
  }
  entry.count++;
  return next();
}
