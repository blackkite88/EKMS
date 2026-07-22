// Conversational memory, persisted in Postgres. Keeps the last few turns per
// session so follow-ups resolve references ("who decided that?" → "draft an
// email to them"). A compact summary is injected into each new query's context.
import { query } from '../config/postgres.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('memory');
const WINDOW_TURNS = 6;

export async function recordTurn(sessionId, userEmail, role, content, entities = []) {
  try {
    await query(
      `INSERT INTO conversations (session_id, user_email, role, content, entities)
       VALUES ($1, $2, $3, $4, $5)`,
      [sessionId, userEmail, role, content, JSON.stringify(entities)]
    );
  } catch (err) {
    log.warn(`Failed to record turn: ${err.message}`);
  }
}

export async function getRecentTurns(sessionId, limit = WINDOW_TURNS) {
  try {
    const { rows } = await query(
      `SELECT role, content FROM conversations
       WHERE session_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [sessionId, limit]
    );
    return rows.reverse(); // chronological
  } catch (err) {
    log.warn(`Failed to load memory: ${err.message}`);
    return [];
  }
}

// A compact text block for prompt injection.
export async function buildMemoryContext(sessionId) {
  const turns = await getRecentTurns(sessionId);
  if (turns.length === 0) return '';
  return turns
    .map((t) => `${t.role === 'user' ? 'User' : 'Assistant'}: ${t.content.slice(0, 400)}`)
    .join('\n');
}

// List a user's past conversations (one row per session), newest first, with a
// title derived from the first user message and a turn count.
export async function listSessions(userEmail, limit = 50) {
  try {
    const { rows } = await query(
      `SELECT c.session_id,
              MIN(c.created_at) AS started_at,
              MAX(c.created_at) AS last_at,
              COUNT(*) AS turns,
              (ARRAY_AGG(c.content ORDER BY c.created_at) FILTER (WHERE c.role = 'user'))[1] AS first_message
       FROM conversations c
       WHERE c.user_email = $1
       GROUP BY c.session_id
       ORDER BY MAX(c.created_at) DESC
       LIMIT $2`,
      [userEmail, limit]
    );
    return rows.map((r) => ({
      session_id: r.session_id,
      title: (r.first_message || 'Conversation').slice(0, 80),
      turns: Number(r.turns),
      started_at: r.started_at,
      last_at: r.last_at,
    }));
  } catch (err) {
    log.warn(`Failed to list sessions: ${err.message}`);
    return [];
  }
}

// Load the full transcript of one session (verifying it belongs to the user).
export async function loadSession(sessionId, userEmail) {
  try {
    const { rows } = await query(
      `SELECT role, content, created_at FROM conversations
       WHERE session_id = $1 AND user_email = $2
       ORDER BY created_at ASC`,
      [sessionId, userEmail]
    );
    return rows;
  } catch (err) {
    log.warn(`Failed to load session: ${err.message}`);
    return [];
  }
}
