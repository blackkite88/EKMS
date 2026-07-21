// Sign and verify JWTs. The token payload carries the user's ABAC attributes
// so every downstream layer can make access decisions without a DB round-trip.
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

export function signToken(user) {
  const payload = {
    email: user.email,
    name: user.name,
    department: user.department,
    clearance: user.clearance,
    unit: user.unit,
    title: user.title,
  };
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

export function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret);
}
