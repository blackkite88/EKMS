// System prompt + context builders for the Knowledge Brain assistant.
import { labelToCitationTag } from '../graph/schema.js';

export const SYSTEM_PROMPT = `You are the Knowledge Brain of Nexora Inc., an internal AI assistant with access to the company's collective knowledge — emails, meeting transcripts, Jira tickets, internal documentation, and GitHub pull requests.

RULES:
1. Answer ONLY from the retrieved context provided to you. Never fabricate information.
2. Every factual statement MUST include a citation in one of these formats:
   [EMAIL | email_04]   [TICKET | ticket_NEX-231]   [MEETING | standup_03]
   [DOC | pci-dss-compliance]   [PR | pr_47]
3. If the context does not contain enough information to answer, respond exactly with:
   "I don't have enough information in the knowledge base to answer that."
4. The user has an access level. You are ONLY given context they are cleared to see. If their question concerns information that appears to be restricted (and is therefore absent from your context), tell them the information exists but is above their access level — do NOT speculate about its contents.
5. When asked to draft an email, create a ticket, extract action items, or generate a report, use the appropriate tool.
6. Be concise, professional, and precise. You represent Nexora's institutional memory.`;

// Build the context block from hybrid-retrieval results.
export function buildRetrievalContext(results) {
  if (!results || results.length === 0) return 'No accessible context was found in the knowledge base.';
  return results
    .map((r, i) => {
      const m = r.metadata || {};
      const tag = `[${String(m.source_type || 'doc').toUpperCase()} | ${m.source_id || 'unknown'}]`;
      return `--- Source ${i + 1} ${tag} ---\n${r.content}`;
    })
    .join('\n\n');
}

// Build a compact block describing the causal subgraph the traversal found,
// so the LLM can narrate the chain (not just quote isolated chunks).
export function buildGraphContext(graph) {
  if (!graph || !graph.nodes || graph.nodes.length === 0) return '';
  const nodeLines = graph.nodes
    .map((n) => `  (${n.id}) [${labelToCitationTag(n.label) || n.label}] ${n.title || ''}`.trimEnd())
    .join('\n');
  const edgeLines = graph.edges
    .map((e) => `  (${e.from}) -[${e.relation}]-> (${e.to})`)
    .join('\n');
  return `KNOWLEDGE GRAPH (the reasoning path connecting these sources):\nNodes:\n${nodeLines}\nRelationships:\n${edgeLines}`;
}

// Compose the full user message: graph reasoning + retrieved evidence + question.
export function buildUserMessage({ query, graphContext, retrievalContext, memoryContext }) {
  const parts = [];
  if (memoryContext) parts.push(`CONVERSATION SO FAR:\n${memoryContext}`);
  if (graphContext) parts.push(graphContext);
  parts.push(`RETRIEVED CONTEXT:\n${retrievalContext}`);
  parts.push(`USER QUESTION:\n${query}`);
  return parts.join('\n\n');
}
