// GET /notifications → the current user's inbox (targeted to them by email or
// role/department). POST /notifications/:id/read → mark read.
import { Router } from 'express';
import { requireAuth } from '../auth/middleware.js';
import { query } from '../config/postgres.js';

const router = Router();

router.get('/', requireAuth, async (req, res, next) => {
  try {
    // A notification is shown to a user if it targets their email or their
    // department/role, OR if they sent it (so senders see what they dispatched).
    const { rows } = await query(
      `SELECT * FROM notifications
       WHERE recipient = $1 OR recipient = $2 OR sender = $1
       ORDER BY created_at DESC LIMIT 100`,
      [req.user.email, req.user.department]
    );
    const notifications = rows.map((r) => ({
      id: r.id, title: r.title, body: r.body, sender: r.sender,
      related_to: r.related_to, is_read: r.is_read, created_at: r.created_at,
      // "sent" if this user dispatched it and it isn't addressed back to them.
      direction: r.sender === req.user.email && r.recipient !== req.user.email && r.recipient !== req.user.department
        ? 'sent' : 'received',
    }));
    res.json({
      notifications,
      // Only unread RECEIVED notifications count toward the badge.
      unread: notifications.filter((n) => !n.is_read && n.direction === 'received').length,
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
