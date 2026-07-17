// Shapes and constants for the ABAC attribute model. Both users and resources
// (documents / graph nodes) are described by attributes; the policy engine
// (policy.js) compares them to make access decisions.

// Clearance levels — higher sees more.
export const CLEARANCE = {
  INTERN: 1,
  ENGINEER: 3,
  LEAD: 4,
  EXECUTIVE: 5,
};

// Departments.
export const DEPARTMENTS = ['engineering', 'security', 'executive', 'product', 'general'];

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
    department: raw.department || 'general',
    clearance: Number.isInteger(raw.clearance) ? raw.clearance : 1,
    projects: Array.isArray(raw.projects) ? raw.projects : [],
  };
}

// Normalize a resource's access attributes. Missing values default to the most
// permissive (public, clearance 1, no project scope) so untagged content is
// visible rather than accidentally locked away.
export function normalizeResourceAccess(raw = {}) {
  const access = raw.access || raw || {};
  return {
    department: access.department || 'general',
    projects: Array.isArray(access.projects) ? access.projects : [],
    min_clearance: Number.isInteger(access.min_clearance) ? access.min_clearance : 1,
    sensitivity: access.sensitivity || SENSITIVITY.PUBLIC,
  };
}
