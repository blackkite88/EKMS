// Postgres pool + schema initialization. Postgres is the relational backbone:
// it stores users (+ABAC attributes), conversation memory, the audit log, and
// records of every MCP action taken.
import pg from 'pg';
import { env } from './env.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('postgres');
const { Pool } = pg;

let pool = null;

export function getPool() {
  if (!pool) {
    pool = new Pool({ connectionString: env.postgresUrl, max: 20 });
    pool.on('error', (err) => log.error('Idle client error', err.message));
  }
  return pool;
}

export async function query(text, params = []) {
  return getPool().query(text, params);
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  email         TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  department    TEXT NOT NULL,
  clearance     INTEGER NOT NULL,
  projects      TEXT[] NOT NULL DEFAULT '{}',
  title         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversations (
  id          SERIAL PRIMARY KEY,
  session_id  TEXT NOT NULL,
  user_email  TEXT NOT NULL,
  role        TEXT NOT NULL,          -- 'user' | 'assistant'
  content     TEXT NOT NULL,
  entities    JSONB DEFAULT '[]',     -- salient entities surfaced this turn
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_conversations_session ON conversations(session_id, created_at);

CREATE TABLE IF NOT EXISTS audit_log (
  id            SERIAL PRIMARY KEY,
  user_email    TEXT,
  action        TEXT NOT NULL,        -- 'query' | 'graph' | 'login' | 'mcp_action' ...
  query         TEXT,
  granted_ids   TEXT[] DEFAULT '{}',  -- sources the user WAS allowed to see
  denied_count  INTEGER DEFAULT 0,    -- how many candidates were blocked by ABAC
  metadata      JSONB DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_log(user_email, created_at);

CREATE TABLE IF NOT EXISTS action_records (
  id          SERIAL PRIMARY KEY,
  user_email  TEXT,
  tool        TEXT NOT NULL,          -- 'draft_email' | 'create_ticket' ...
  arguments   JSONB NOT NULL,
  result      JSONB,
  mode        TEXT NOT NULL,          -- 'live' | 'simulated'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
`;

export async function initSchema() {
  await getPool().query(SCHEMA);
  log.info('Postgres schema ensured (users, conversations, audit_log, action_records)');
}

export async function pingPostgres() {
  await getPool().query('SELECT 1');
  return true;
}

export async function closePostgres() {
  if (pool) {
    await pool.end();
    pool = null;
    log.info('Postgres pool closed');
  }
}

export default getPool;
