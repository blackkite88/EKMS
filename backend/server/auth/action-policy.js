// Action-level permissions — the counterpart to ABAC document access. ABAC
// controls what a user can READ; this controls what a user can DO. Each action
// requires a minimum clearance and/or specific departments. A field operator
// can ask questions and receive notifications but cannot create work orders or
// generate reports.
//
// Declarative, like the read policies: one table, one canPerform() function.

// action → { minClearance, departments? }  (departments omitted = any function)
export const ACTION_PERMISSIONS = {
  generate_rca_report: { minClearance: 2, label: 'generate an RCA report' },
  create_work_order: { minClearance: 2, label: 'create a work order' },
  generate_compliance_report: { minClearance: 4, label: 'generate a compliance report' },
  draft_notification: { minClearance: 1, label: 'send a notification' },
};

// A friendly suggestion of what a blocked user CAN do instead.
const ALTERNATIVES = {
  generate_rca_report: 'I can explain the likely root cause, and a maintenance technician or reliability engineer can generate the formal report.',
  create_work_order: 'I can draft the details, and a maintenance technician can create the work order.',
  generate_compliance_report: 'I can summarise the compliance status; a reliability engineer or plant manager can generate the formal report.',
  draft_notification: '',
};

export function canPerform(user, action) {
  const perm = ACTION_PERMISSIONS[action];
  if (!perm) return { allowed: false, reason: `Unknown action: ${action}` };

  const clearance = Number.isInteger(user?.clearance) ? user.clearance : 1;
  if (clearance < perm.minClearance) {
    return {
      allowed: false,
      reason: `You don't have permission to ${perm.label}. ${ALTERNATIVES[action] || ''}`.trim(),
    };
  }
  if (perm.departments && !perm.departments.includes(user.department) && user.department !== 'management') {
    return {
      allowed: false,
      reason: `You don't have permission to ${perm.label} for your function. ${ALTERNATIVES[action] || ''}`.trim(),
    };
  }
  return { allowed: true, reason: null };
}

// For the UI: which of the four actions the current user is permitted to trigger.
export function permittedActions(user) {
  return Object.keys(ACTION_PERMISSIONS).filter((a) => canPerform(user, a).allowed);
}

export function describeActionPermissions() {
  return Object.entries(ACTION_PERMISSIONS).map(([action, p]) => ({
    action,
    label: p.label,
    min_clearance: p.minClearance,
    departments: p.departments || 'any',
  }));
}
