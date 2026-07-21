// Preset demo users, seeded into Postgres on startup. No signup flow — these
// fixed plant-role identities let us switch users instantly during the demo to
// show role-based access AND action permissions. Attribute profiles are
// designed for contrast: a field operator can ask questions but cannot see
// maintenance failure records or create work orders; a reliability engineer
// can do RCA; a plant manager sees everything including safety incidents.
import bcrypt from 'bcryptjs';
import { query } from '../config/postgres.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('users');

export const DEMO_USERS = [
  {
    email: 'manager@bpi.com',
    name: 'Anita Deshmukh',
    title: 'Plant Manager',
    password: 'demo',
    department: 'management',
    clearance: 5,
    unit: 'all',
  },
  {
    email: 'safety@bpi.com',
    name: 'Vikram Rao',
    title: 'Safety Lead',
    password: 'demo',
    department: 'safety',
    clearance: 5,
    unit: 'all',
  },
  {
    email: 'reliability@bpi.com',
    name: 'Meera Krishnan',
    title: 'Reliability Engineer',
    password: 'demo',
    department: 'engineering',
    clearance: 4,
    unit: 'unit-2',
  },
  {
    email: 'technician@bpi.com',
    name: 'Ravi Kulkarni',
    title: 'Maintenance Technician',
    password: 'demo',
    department: 'maintenance',
    clearance: 2,
    unit: 'unit-2',
  },
  {
    email: 'operator@bpi.com',
    name: 'Sunil Yadav',
    title: 'Field Operator',
    password: 'demo',
    department: 'operations',
    clearance: 1,
    unit: 'unit-2',
  },
];

export async function seedUsers() {
  for (const u of DEMO_USERS) {
    const hash = await bcrypt.hash(u.password, 10);
    await query(
      `INSERT INTO users (email, name, password_hash, department, clearance, unit, title)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (email) DO UPDATE SET
         name = EXCLUDED.name,
         password_hash = EXCLUDED.password_hash,
         department = EXCLUDED.department,
         clearance = EXCLUDED.clearance,
         unit = EXCLUDED.unit,
         title = EXCLUDED.title`,
      [u.email, u.name, hash, u.department, u.clearance, u.unit, u.title]
    );
  }
  log.info(`Seeded ${DEMO_USERS.length} demo users`);
}

export async function findUserByEmail(email) {
  const { rows } = await query('SELECT * FROM users WHERE email = $1', [email.toLowerCase()]);
  return rows[0] || null;
}

export async function verifyCredentials(email, password) {
  const user = await findUserByEmail(email);
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return null;
  return {
    email: user.email,
    name: user.name,
    title: user.title,
    department: user.department,
    clearance: user.clearance,
    unit: user.unit,
  };
}
