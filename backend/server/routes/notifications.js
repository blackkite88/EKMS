// GET /notifications → the current user's inbox (targeted to them by email or
// role/department). POST /notifications/:id/read → mark read.
import { Router } from 'express';
import { requireAuth } from '../auth/middleware.js';
import { query } from '../config/postgres.js';

const router = Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    // A notification reaches a user if it targets their email or their department/role.
    const { rows } = await query(
      `SELECT * FROM notifications
       WHERE recipient = $1 OR recipient = $2
       ORDER BY created_at DESC LIMIT 100`,
      [req.user.email, req.user.department]
    );
    res.json({
      notifications: rows.map((r) => ({
        id: r.id, title: r.title, body: r.body, sender: r.sender,
        related_to: r.related_to, is_read: r.is_read, created_at: r.created_at,
      })),
      unread: rows.filter((r) => !r.is_read).length,
    });
  } catch (err) { next(err); }
});

router.post('/:id/read', requireAuth, async (req, res, next) => {
  try {
    await query('UPDATE notifications SET is_read = true WHERE id = $1', [req.params.id]);
    res.json({ success: true });
  } catch (err) { next(err); }
});

export default router;
