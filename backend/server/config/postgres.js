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
  unit          TEXT NOT NULL DEFAULT 'all',
  title         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Migrate legacy 'projects' schema to 'unit' if this DB predates the industrial model.
ALTER TABLE users ADD COLUMN IF NOT EXISTS unit TEXT NOT NULL DEFAULT 'all';
ALTER TABLE users DROP COLUMN IF EXISTS projects;

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
  tool        TEXT NOT NULL,          -- 'generate_rca_report' | 'create_work_order' ...
  arguments   JSONB NOT NULL,
  result      JSONB,
  mode        TEXT NOT NULL,          -- 'live' | 'simulated' | 'internal'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Real work orders created via the assistant. ABAC-scoped like documents.
CREATE TABLE IF NOT EXISTS work_orders (
  id            SERIAL PRIMARY KEY,
  wo_number     TEXT UNIQUE NOT NULL,
  title         TEXT NOT NULL,
  description   TEXT,
  equipment_id  TEXT,
  priority      TEXT NOT NULL DEFAULT 'medium',
  status        TEXT NOT NULL DEFAULT 'open',
  created_by    TEXT,
  assigned_to   TEXT,
  access_department TEXT NOT NULL DEFAULT 'maintenance',
  access_unit       TEXT NOT NULL DEFAULT 'all',
  access_min_clearance INTEGER NOT NULL DEFAULT 2,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- In-app notifications delivered to a specific recipient (role or email).
CREATE TABLE IF NOT EXISTS notifications (
  id          SERIAL PRIMARY KEY,
  recipient   TEXT NOT NULL,          -- an email or a role/department name
  sender      TEXT,
  title       TEXT NOT NULL,
  body        TEXT,
  related_to  TEXT,                   -- e.g. equipment tag or WO number
  is_read     BOOLEAN NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient, created_at);

-- Generated RCA / compliance reports. ABAC-scoped.
CREATE TABLE IF NOT EXISTS action_reports (
  id            SERIAL PRIMARY KEY,
  report_type   TEXT NOT NULL,        -- 'rca' | 'compliance'
  title         TEXT NOT NULL,
  content       JSONB NOT NULL,       -- structured sections
  equipment_id  TEXT,
  created_by    TEXT,
  access_department TEXT NOT NULL DEFAULT 'engineering',
  access_unit       TEXT NOT NULL DEFAULT 'all',
  access_min_clearance INTEGER NOT NULL DEFAULT 2,
  access_sensitivity   TEXT NOT NULL DEFAULT 'internal',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
`;

export async function initSchema() {
  await getPool().query(SCHEMA);
  log.info('Postgres schema ensured (users, conversations, audit_log, action_records, work_orders, notifications, action_reports)');
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
