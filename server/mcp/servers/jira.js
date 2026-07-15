// Jira action server. Creates a real ticket via the Jira Cloud REST API when
// configured; otherwise returns a convincing simulated ticket so the demo never
// breaks. Either way the shape of the result is identical.
import axios from 'axios';
import { env, jiraConfigured } from '../../config/env.js';
import { createLogger } from '../../utils/logger.js';

const log = createLogger('mcp-jira');

const PRIORITY_MAP = { low: 'Low', medium: 'Medium', high: 'High', critical: 'Highest' };

function simulate(args) {
  const num = Math.floor(1000 + Math.random() * 9000);
  const key = `${env.jira.projectKey}-${num}`;
  return {
    mode: 'simulated',
    result: {
      key,
      url: `${env.jira.baseUrl || 'https://nexora.atlassian.net'}/browse/${key}`,
      title: args.title,
      priority: args.priority,
      status: 'To Do',
      simulated: true,
    },
  };
}

export async function createTicket(args) {
  if (!jiraConfigured()) {
    log.info('Jira not configured — simulating ticket creation');
    return simulate(args);
  }

  try {
    const auth = Buffer.from(`${env.jira.email}:${env.jira.apiToken}`).toString('base64');
    const { data } = await axios.post(
      `${env.jira.baseUrl}/rest/api/3/issue`,
      {
        fields: {
          project: { key: env.jira.projectKey },
          summary: args.title,
          issuetype: { name: 'Task' },
          description: {
            type: 'doc',
            version: 1,
            content: [{ type: 'paragraph', content: [{ type: 'text', text: args.description || '' }] }],
          },
          priority: { name: PRIORITY_MAP[args.priority] || 'Medium' },
        },
      },
      { headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/json' }, timeout: 15000 }
    );
    return {
      mode: 'live',
      result: {
        key: data.key,
        url: `${env.jira.baseUrl}/browse/${data.key}`,
        title: args.title,
        priority: args.priority,
        status: 'To Do',
        simulated: false,
      },
    };
  } catch (err) {
    log.warn(`Jira live call failed, falling back to simulation: ${err.message}`);
    return simulate(args);
  }
}
