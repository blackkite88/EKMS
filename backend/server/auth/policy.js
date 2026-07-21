// The ABAC policy engine. Access rules are declared as DATA (a list of policy
// objects), not hardcoded conditionals — the model used by real systems like
// AWS IAM and Open Policy Agent. Every access decision in the system (vector
// retrieval, graph traversal, the /graph backdrop, action outputs, the eval
// harness) flows through the single canAccess() function.
//
// Industrial model:
//   - clearance gates sensitivity (higher clearance → more sensitive docs)
//   - department read-hierarchy: senior functions can read the operational
//     data of the functions they oversee (a reliability engineer must be able
//     to read maintenance failure records to do RCA), but not vice versa
//   - restricted safety-incident material requires top clearance (5)
import { normalizeUserAttributes, normalizeResourceAccess, SENSITIVITY } from './attributes.js';

// Which resource-departments a user-department is allowed to READ.
// A field operator sees only operations; a technician sees maintenance +
// operations; a reliability engineer sees engineering + maintenance +
// operations; a plant manager / safety lead sees everything.
const DEPARTMENT_READ_SCOPE = {
  operations: ['operations', 'compliance'],
  maintenance: ['maintenance', 'operations', 'compliance'],
  engineering: ['engineering', 'maintenance', 'operations', 'compliance'],
  safety: ['safety', 'engineering', 'maintenance', 'operations', 'compliance'],
  management: ['management', 'safety', 'engineering', 'maintenance', 'operations', 'compliance'],
};

function canReadDepartment(userDept, resourceDept) {
  if (userDept === 'management' || userDept === 'executive') return true;
  const scope = DEPARTMENT_READ_SCOPE[userDept] || [userDept];
  return scope.includes(resourceDept);
}

export const POLICIES = [
  {
    id: 'clearance-floor',
    description: 'User clearance must meet or exceed the resource minimum clearance.',
    when: (user, resource) => user.clearance >= resource.min_clearance,
  },
  {
    id: 'department-read-scope',
    description:
      'Resource must be public, OR fall within the departments the user\'s function is allowed to read (e.g. a reliability engineer can read maintenance records).',
    when: (user, resource) =>
      resource.sensitivity === SENSITIVITY.PUBLIC ||
      canReadDepartment(user.department, resource.department),
  },
  {
    id: 'restricted-requires-top-clearance',
    description:
      'Restricted material (e.g. safety-incident investigations) requires top clearance (level 5).',
    when: (user, resource) =>
      resource.sensitivity !== SENSITIVITY.RESTRICTED || user.clearance >= 5,
  },
];

// Decide access. Returns { allowed, failedPolicy|null }.
export function evaluate(userAttrs, resourceAccess) {
  const user = normalizeUserAttributes(userAttrs);
  const resource = normalizeResourceAccess(resourceAccess);

  for (const policy of POLICIES) {
    if (!policy.when(user, resource)) {
      return { allowed: false, failedPolicy: policy.id };
    }
  }
  return { allowed: true, failedPolicy: null };
}

// Convenience boolean — the single source of truth used everywhere.
export function canAccess(userAttrs, resourceAccess) {
  return evaluate(userAttrs, resourceAccess).allowed;
}

// Partition a list of items into { allowed, denied } for a given user.
export function partitionByAccess(userAttrs, items, getAccess = (i) => i.access) {
  const allowed = [];
  const denied = [];
  for (const item of items) {
    if (canAccess(userAttrs, getAccess(item))) allowed.push(item);
    else denied.push(item);
  }
  return { allowed, denied };
}

// Describe the policy set (used by the /audit or docs endpoints and evals).
export function describePolicies() {
  return POLICIES.map(({ id, description }) => ({ id, description }));
}
