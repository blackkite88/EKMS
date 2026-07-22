// Action dispatcher — routes an action request to its handler, but FIRST checks
// action-level permissions (not everyone can create a work order). Records every
// action (or permission denial) to Postgres.
import { createWorkOrder, draftNotification, generateRcaReport, generateComplianceReport } from './actions.js';
import { canPerform } from '../auth/action-policy.js';
import { query } from '../config/postgres.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('mcp-client');

const HANDLERS = {
  create_work_order: createWorkOrder,
  draft_notification: draftNotification,
  generate_rca_report: generateRcaReport,
  generate_compliance_report: generateComplianceReport,
};

async function recordAction(userEmail, tool, args, result, mode) {
  try {
    // Don't store the user object nested in args.
    const { user: _u, ...cleanArgs } = args || {};
    await query(
      `INSERT INTO action_records (user_email, tool, arguments, result, mode) VALUES ($1,$2,$3,$4,$5)`,
      [userEmail, tool, JSON.stringify(cleanArgs), JSON.stringify(result), mode]
    );
  } catch (err) {
    log.warn(`Failed to record action: ${err.message}`);
  }
}

// A human-readable confirmation (or denial) for a completed action — shown to
// the user after they click a tile and the action actually runs.
export function actionConfirmationText(action, result, mode) {
  if (mode === 'denied') return result?.reason || "You don't have permission to perform that action.";
  if (result?.error) return `The action could not be completed: ${result.error}`;
  switch (action) {
    case 'create_work_order':
      return `✓ Work order ${result.wo_number} created${result.equipment_id ? ` for ${result.equipment_id}` : ''} (priority: ${result.priority}, status: ${result.status}). It's now in the Work Orders section.`;
    case 'draft_notification':
      return `✓ Notification sent to ${result.recipient}${result.related_to ? ` regarding ${result.related_to}` : ''}. They'll see it in their inbox.`;
    case 'generate_rca_report':
      return `✓ RCA report #${result.report_id} generated${result.equipment_id ? ` for ${result.equipment_id}` : ''} (${result.sections} sections). Available in Reports.`;
    case 'generate_compliance_report':
      return `✓ Compliance report #${result.report_id} generated covering ${result.gap_count} gap(s). Available in the Compliance section.`;
    default:
      return '✓ Action completed.';
  }
}

export async function executeTool(name, args, user) {
  const handler = HANDLERS[name];
  if (!handler) throw new Error(`Unknown action: ${name}`);

  // Permission gate — the "not everyone can do this" check.
  const perm = canPerform(user, name);
  if (!perm.allowed) {
    log.info(`DENIED ${name} for ${user?.email} (${user?.department} L${user?.clearance})`);
    await recordAction(user?.email, name, args, { denied: true, reason: perm.reason }, 'denied');
    return { result: { denied: true, reason: perm.reason }, mode: 'denied' };
  }

  const { result, mode } = await handler(args, user);
  await recordAction(user?.email, name, args, result, mode);
  log.info(`Executed ${name} (${mode}) for ${user?.email}`);
  return { result, mode };
}
