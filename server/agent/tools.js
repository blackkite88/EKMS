export const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'draft_email',
      description: 'Draft a professional email on behalf of a Nexora team member. Use this when the user asks to write, compose, or draft an email.',
      parameters: {
        type: 'object',
        properties: {
          to: {
            type: 'string',
            description: 'Recipient email address or name',
          },
          subject: {
            type: 'string',
            description: 'Email subject line',
          },
          body: {
            type: 'string',
            description: 'Full email body content',
          },
        },
        required: ['to', 'subject', 'body'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_ticket',
      description: 'Create a Jira ticket for tracking work items, bugs, or feature requests. Use this when the user asks to log, track, or create a ticket.',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Ticket title or summary',
          },
          description: {
            type: 'string',
            description: 'Detailed description of the issue or task',
          },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'critical'],
            description: 'Priority level of the ticket',
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
      description: 'Extract and list action items from meeting transcripts, emails, or documents. Use this when asked to pull out tasks or next steps.',
      parameters: {
        type: 'object',
        properties: {
          items: {
            type: 'array',
            description: 'List of action items extracted from the context',
            items: {
              type: 'object',
              properties: {
                action: { type: 'string', description: 'What needs to be done' },
                owner: { type: 'string', description: 'Who is responsible' },
                due_date: { type: 'string', description: 'When it needs to be done (if mentioned)' },
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
      description: 'Generate a structured report from knowledge base content. Use this when asked to summarize, report, or compile information into a document.',
      parameters: {
        type: 'object',
        properties: {
          title: {
            type: 'string',
            description: 'Report title',
          },
          sections: {
            type: 'array',
            description: 'Report sections',
            items: {
              type: 'object',
              properties: {
                heading: { type: 'string', description: 'Section heading' },
                content: { type: 'string', description: 'Section content' },
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
