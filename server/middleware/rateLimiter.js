const requestLog = new Map();
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 10;

function cleanExpiredEntries() {
  const now = Date.now();
  for (const [ip, data] of requestLog.entries()) {
    if (now - data.windowStart > WINDOW_MS) {
      requestLog.delete(ip);
    }
  }
}

export function rateLimiter(req, res, next) {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();

  cleanExpiredEntries();

  if (!requestLog.has(ip)) {
    requestLog.set(ip, { count: 1, windowStart: now });
    return next();
  }

  const entry = requestLog.get(ip);

  if (now - entry.windowStart > WINDOW_MS) {
    entry.count = 1;
    entry.windowStart = now;
    return next();
  }

  if (entry.count >= MAX_REQUESTS) {
    const retryAfter = Math.ceil((WINDOW_MS - (now - entry.windowStart)) / 1000);
    res.setHeader('Retry-After', retryAfter);
    return res.status(429).json({
      error: `Rate limit exceeded. Max ${MAX_REQUESTS} requests per minute. Try again in ${retryAfter}s.`,
    });
  }

  entry.count++;
  next();
}
