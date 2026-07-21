// Shapes and constants for the ABAC attribute model. Both users and resources
// (documents / graph nodes / action outputs) are described by attributes; the
// policy engine (policy.js) compares them to make access decisions.

// Clearance levels — higher sees more.
export const CLEARANCE = {
  OPERATOR: 1,
  TECHNICIAN: 2,
  ENGINEER: 4,
  MANAGER: 5,
};

// Plant functions / departments.
export const DEPARTMENTS = ['operations', 'maintenance', 'engineering', 'safety', 'compliance', 'management'];

// Sensitivity floors for resources.
export const SENSITIVITY = {
  PUBLIC: 'public',
  INTERNAL: 'internal',
  CONFIDENTIAL: 'confidential',
  RESTRICTED: 'restricted',
};

// Normalize a user's attributes into a predictable shape.
export function normalizeUserAttributes(raw = {}) {
  return {
    email: raw.email || 'anonymous',
    department: raw.department || 'operations',
    clearance: Number.isInteger(raw.clearance) ? raw.clearance : 1,
    unit: raw.unit || 'all',
  };
}

// Normalize a resource's access attributes. Missing values default to the most
// permissive (public, clearance 1) so untagged content is visible rather than
// accidentally locked away.
export function normalizeResourceAccess(raw = {}) {
  const access = raw.access || raw || {};
  return {
    department: access.department || 'operations',
    unit: access.unit || 'all',
    min_clearance: Number.isInteger(access.min_clearance) ? access.min_clearance : 1,
    sensitivity: access.sensitivity || SENSITIVITY.PUBLIC,
  };
}
