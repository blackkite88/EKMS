// Tool (function-calling) schemas exposed to Groq. These are the "actions" the
// assistant can take. The execution behind them (client.js) routes to real
// integrations (Jira, Gmail) or convincing simulations.
export const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'draft_email',
      description:
        'Draft a professional email on behalf of a Nexora team member. Use when the user asks to write, compose, or draft an email.',
      parameters: {
        type: 'object',
        properties: {
          to: { type: 'string', description: 'Recipient email address or name' },
          subject: { type: 'string', description: 'Email subject line' },
          body: { type: 'string', description: 'Full email body content' },
        },
        required: ['to', 'subject', 'body'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_ticket',
      description:
        'Create a Jira ticket for tracking work, bugs, or requests. Use when the user asks to log, track, file, or create a ticket.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Ticket title / summary' },
          description: { type: 'string', description: 'Detailed description' },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'critical'],
            description: 'Priority level',
          },
        },
        required: ['title', 'description', 'priority'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'extract_action_items',
      description:
        'Extract and list action items from meeting transcripts, emails, or docs. Use when asked to pull out tasks or next steps.',
      parameters: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            description: 'Extracted action items',
            items: {
              type: 'object',
              properties: {
                action: { type: 'string' },
                owner: { type: 'string' },
                due_date: { type: 'string' },
              },
              required: ['action', 'owner'],
            },
          },
        },
        required: ['items'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'generate_report',
      description:
        'Generate a structured report from knowledge-base content. Use when asked to compile information into a document.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          sections: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                heading: { type: 'string' },
                content: { type: 'string' },
              },
              required: ['heading', 'content'],
            },
          },
        },
        required: ['title', 'sections'],
      },
    },
  },
];

export const TOOL_NAMES = TOOLS.map((t) => t.function.name);
