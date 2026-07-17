// The ABAC policy engine. Access rules are declared as DATA (a list of policy
// objects), not hardcoded conditionals — the model used by real systems like
// AWS IAM and Open Policy Agent. Every access decision in the system (vector
// retrieval, graph traversal, the /graph backdrop, the eval harness) flows
// through the single canAccess() function, so there is exactly one place that
// decides "who can see what".
import { normalizeUserAttributes, normalizeResourceAccess, SENSITIVITY } from './attributes.js';

// A policy is { id, description, effect, when(user, resource) -> boolean }.
// Semantics: access is GRANTED only if ALL "allow" policies pass. Any single
// failing policy denies access (logical AND of allow-conditions). This makes
// the rules composable and easy to reason about.
export const POLICIES = [
  {
    id: 'clearance-floor',
    description: 'User clearance must meet or exceed the resource minimum clearance.',
    when: (user, resource) => user.clearance >= resource.min_clearance,
  },
  {
    id: 'department-scope',
    description:
      'Resource must be public, OR belong to the user\'s department, OR the user is an executive (cross-department).',
    when: (user, resource) =>
      resource.sensitivity === SENSITIVITY.PUBLIC ||
      user.department === resource.department ||
      user.department === 'executive',
  },
  {
    id: 'project-scope',
    description:
      'If the resource is scoped to projects, the user must share at least one project — UNLESS the resource is public, or the user holds top clearance (>=5).',
    when: (user, resource) =>
      resource.sensitivity === SENSITIVITY.PUBLIC ||
      resource.projects.length === 0 ||
      user.clearance >= 5 ||
      resource.projects.some((p) => user.projects.includes(p)),
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

// Partition a list of items (each carrying an `access` field, or a metadata
// object) into { allowed, denied } for a given user. `getAccess` extracts the
// access attributes from an item.
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
