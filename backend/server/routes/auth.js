// POST /login → verify credentials, return a JWT carrying ABAC attributes.
// GET /me → return the current user (from the token).
import { Router } from 'express';
import { verifyCredentials, DEMO_USERS } from '../auth/users.js';
import { signToken } from '../auth/jwt.js';
import { requireAuth } from '../auth/middleware.js';
import { permittedActions, describeActionPermissions } from '../auth/action-policy.js';
import { writeAudit } from '../middleware/auditLogger.js';

const router = Router();

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required' });
    }
    const user = await verifyCredentials(email.toLowerCase(), password);
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = signToken(user);
    await writeAudit({ userEmail: user.email, action: 'login' });
    // Include which actions this user is permitted to perform (for the UI tiles).
    res.json({ token, user: { ...user, permittedActions: permittedActions(user) } });
  } catch (err) {
    next(err);
  }
});

// Convenience for the demo UI: list the preset plant identities.
router.get('/demo-users', (_req, res) => {
  res.json(
    DEMO_USERS.map(({ email, name, title, department, clearance, unit }) => ({
      email,
      name,
      title,
      department,
      clearance,
      unit,
      password: 'demo',
    }))
  );
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: { ...req.userFull, permittedActions: permittedActions(req.user) } });
});

// The action-permission matrix — for the audit/policies view.
router.get('/action-permissions', requireAuth, (_req, res) => {
  res.json({ permissions: describeActionPermissions() });
});

export default router;
