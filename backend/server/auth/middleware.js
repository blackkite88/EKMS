// Express auth middleware. Extracts the bearer token, verifies it, and attaches
// the user's attributes to req.user for downstream layers (retrieval, graph,
// actions) to enforce ABAC.
import { verifyToken } from './jwt.js';
import { normalizeUserAttributes } from './attributes.js';

function extractToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  // Allow token via query param for SSE/EventSource clients that cannot set headers.
  if (req.query && typeof req.query.token === 'string') return req.query.token;
  return null;
}

// Hard requirement: reject if no valid token.
export function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Authentication required. Provide a Bearer token.' });
  }
  try {
    const decoded = verifyToken(token);
    req.user = normalizeUserAttributes(decoded);
    req.userFull = decoded;
    return next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

// Soft variant: attach user if a valid token is present, otherwise continue as
// anonymous (used by endpoints that are readable by everyone but personalize
// results when authenticated).
export function optionalAuth(req, res, next) {
  const token = extractToken(req);
  if (token) {
    try {
      const decoded = verifyToken(token);
      req.user = normalizeUserAttributes(decoded);
      req.userFull = decoded;
    } catch {
      // ignore — treat as anonymous
    }
  }
  if (!req.user) {
    req.user = normalizeUserAttributes({ email: 'anonymous', department: 'general', clearance: 1 });
  }
  return next();
}
