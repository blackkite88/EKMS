// Internal tools that need no external service — they just structure data the
// LLM already produced.
export function extractActionItems(args) {
  const items = Array.isArray(args.items) ? args.items : [];
  return {
    kind: 'action_items',
    count: items.length,
    items: items.map((it) => ({
      action: it.action,
      owner: it.owner,
      due_date: it.due_date || null,
    })),
  };
}

export function generateReport(args) {
  const sections = Array.isArray(args.sections) ? args.sections : [];
  return {
    kind: 'report',
    title: args.title || 'Report',
    sections: sections.map((s) => ({ heading: s.heading, content: s.content })),
    generated_at: new Date().toISOString(),
  };
}
