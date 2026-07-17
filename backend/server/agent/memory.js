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
