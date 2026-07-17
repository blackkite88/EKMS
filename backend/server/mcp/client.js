// MCP client — routes a tool call from the agent to the right action server
// (Jira, Gmail) or an internal handler, records the action in Postgres, and
// returns { result, mode } where mode is 'live' or 'simulated'.
import { createTicket } from './servers/jira.js';
import { draftEmail } from './servers/gmail.js';
import { extractActionItems, generateReport } from './internal.js';
import { query } from '../config/postgres.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('mcp-client');

async function recordAction(userEmail, tool, args, result, mode) {
  try {
    await query(
      `INSERT INTO action_records (user_email, tool, arguments, result, mode)
       VALUES ($1, $2, $3, $4, $5)`,
      [userEmail, tool, JSON.stringify(args), JSON.stringify(result), mode]
    );
  } catch (err) {
    log.warn(`Failed to record action: ${err.message}`);
  }
}

export async function executeTool(name, args, user) {
  let mode = 'internal';
  let result;

  switch (name) {
    case 'create_ticket': {
      const out = await createTicket(args);
      result = out.result;
      mode = out.mode;
      break;
    }
    case 'draft_email': {
      const out = await draftEmail(args);
      result = out.result;
      mode = out.mode;
      break;
    }
    case 'extract_action_items':
      result = extractActionItems(args);
      mode = 'internal';
      break;
    case 'generate_report':
      result = generateReport(args);
      mode = 'internal';
      break;
    default:
      throw new Error(`Unknown tool: ${name}`);
  }

  await recordAction(user?.email, name, args, result, mode);
  log.info(`Executed ${name} (${mode}) for ${user?.email || 'anonymous'}`);
  return { result, mode };
}
