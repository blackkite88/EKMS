// Preset demo users, seeded into Postgres on startup. No signup flow — these
// fixed identities let us switch users instantly during the demo to show ABAC.
// The attribute profiles are designed for dramatic contrast: note that
// `engineer@nexora` is a real cleared engineer but is NOT on the payments
// project, so they cannot see payments-confidential content — the ABAC
// "it's not just seniority" moment.
import bcrypt from 'bcryptjs';
import { query } from '../config/postgres.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('users');

export const DEMO_USERS = [
  {
    email: 'cto@nexora.com',
    name: 'Raj Patel',
    title: 'Chief Technology Officer',
    password: 'demo',
    department: 'executive',
    clearance: 5,
    projects: ['payments', 'search', 'infra', 'security', 'mobile'],
  },
  {
    email: 'security@nexora.com',
    name: 'Kenji Nakamura',
    title: 'Security Lead',
    password: 'demo',
    department: 'security',
    clearance: 5,
    projects: ['security', 'payments', 'infra'],
  },
  {
    email: 'eng.lead@nexora.com',
    name: 'Priya Sharma',
    title: 'Engineering Manager',
    password: 'demo',
    department: 'engineering',
    clearance: 4,
    projects: ['payments', 'infra'],
  },
  {
    email: 'engineer@nexora.com',
    name: 'Riya Desai',
    title: 'Software Engineer (Search)',
    password: 'demo',
    department: 'engineering',
    clearance: 3,
    projects: ['search'],
  },
  {
    email: 'intern@nexora.com',
    name: 'Sam Wilson',
    title: 'Engineering Intern',
    password: 'demo',
    department: 'engineering',
    clearance: 1,
    projects: [],
  },
];

export async function seedUsers() {
  for (const u of DEMO_USERS) {
    const hash = await bcrypt.hash(u.password, 10);
    await query(
      `INSERT INTO users (email, name, password_hash, department, clearance, projects, title)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (email) DO UPDATE SET
         name = EXCLUDED.name,
         password_hash = EXCLUDED.password_hash,
         department = EXCLUDED.department,
         clearance = EXCLUDED.clearance,
         projects = EXCLUDED.projects,
         title = EXCLUDED.title`,
      [u.email, u.name, hash, u.department, u.clearance, u.projects, u.title]
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
    projects: user.projects,
  };
}
