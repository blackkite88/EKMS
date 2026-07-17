// In-memory sliding-window rate limiter. Only the expensive /query endpoint is
// limited (it drives Groq/LLM calls); lightweight read/auth endpoints are
// exempt so normal use — and live demos — never trip the limit.
const WINDOW_MS = 60 * 1000;
const MAX_REQUESTS = 30; // per IP per minute, on /query only
const buckets = new Map(); // ip -> { count, windowStart }

// Paths that bypass rate limiting entirely.
function isExempt(req) {
  const p = req.path;
  return (
    p === '/health' ||
    p.startsWith('/auth') ||
    p === '/graph' ||
    p === '/sources' ||
    p.startsWith('/audit')
  );
}

function sweep(now) {
  for (const [ip, entry] of buckets.entries()) {
    if (now - entry.windowStart > WINDOW_MS) buckets.delete(ip);
  }
}

export function rateLimiter(req, res, next) {
  if (isExempt(req)) return next();

  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  sweep(now);

  const entry = buckets.get(ip);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    buckets.set(ip, { count: 1, windowStart: now });
    return next();
  }
  if (entry.count >= MAX_REQUESTS) {
    const retryAfter = Math.ceil((WINDOW_MS - (now - entry.windowStart)) / 1000);
    res.setHeader('Retry-After', retryAfter);
    return res.status(429).json({
      error: `Rate limit exceeded. Max ${MAX_REQUESTS} requests/minute on /query. Retry in ${retryAfter}s.`,
    });
  }
  entry.count++;
  return next();
}
