// Gmail action server. Creates a real Gmail DRAFT (never auto-sends) via the
// Gmail API when configured; otherwise returns a convincing simulated draft.
// Drafting (not sending) is deliberate: real enough for the demo, safe on stage.
import { google } from 'googleapis';
import { env, gmailConfigured } from '../../config/env.js';
import { createLogger } from '../../utils/logger.js';

const log = createLogger('mcp-gmail');

function simulate(args) {
  return {
    mode: 'simulated',
    result: {
      draft_id: `draft_${Date.now()}`,
      to: args.to,
      subject: args.subject,
      body: args.body,
      status: 'draft_created',
      simulated: true,
    },
  };
}

function toRawMessage({ to, subject, body }) {
  const lines = [
    `To: ${to}`,
    'Content-Type: text/plain; charset="UTF-8"',
    'MIME-Version: 1.0',
    `Subject: ${subject}`,
    '',
    body,
  ];
  return Buffer.from(lines.join('\n'))
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export async function draftEmail(args) {
  if (!gmailConfigured()) {
    log.info('Gmail not configured — simulating email draft');
    return simulate(args);
  }

  try {
    const oauth2 = new google.auth.OAuth2(env.gmail.clientId, env.gmail.clientSecret);
    oauth2.setCredentials({ refresh_token: env.gmail.refreshToken });
    const gmail = google.gmail({ version: 'v1', auth: oauth2 });

    const { data } = await gmail.users.drafts.create({
      userId: env.gmail.user,
      requestBody: { message: { raw: toRawMessage(args) } },
    });

    return {
      mode: 'live',
      result: {
        draft_id: data.id,
        to: args.to,
        subject: args.subject,
        body: args.body,
        status: 'draft_created',
        simulated: false,
      },
    };
  } catch (err) {
    log.warn(`Gmail live call failed, falling back to simulation: ${err.message}`);
    return simulate(args);
  }
}
