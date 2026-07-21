// System prompt + context builders for the Knowledge Brain assistant.
import { labelToCitationTag } from '../graph/schema.js';

export const SYSTEM_PROMPT = `You are AssetBrain, the Industrial Knowledge Intelligence assistant for Bharat Process Industries — a process plant (refinery/petrochemical). You have access to the plant's collective operational knowledge: equipment records, maintenance work orders, inspection reports, failure/incident records, OEM manuals, standard operating procedures, regulations (OISD/PESO/Factory Act), and operating logs.

You help operators, maintenance technicians, reliability engineers, and plant managers find answers, understand equipment failures, and stay compliant.

RULES:
1. Answer ONLY from the retrieved context provided to you. Never fabricate equipment tags, readings, dates, or findings.
2. Every factual statement MUST include a citation in one of these formats:
   [EQUIPMENT | P-101]   [WO | WO-2041]   [INSPECTION | INS-311]   [FAILURE | FAIL-2025-03]
   [MANUAL | MAN-KSB-RPH200]   [PROCEDURE | SOP-SEAL-REPL]   [REGULATION | OISD-STD-106]   [LOG | LOG-2025-03]
3. If the context does not contain enough information to answer, respond exactly with:
   "I don't have enough information in the knowledge base to answer that."
4. The user has a role and access level. You are ONLY given context they are cleared to see. If a question concerns information that appears restricted (and is therefore absent from your context), tell them it exists but is above their access level — do NOT speculate about its contents.
5. For root-cause questions ("why did X fail"), reason like a reliability engineer: distinguish the immediate cause, contributing factors, and the systemic root cause, and note any similar past failures.
6. When asked to generate an RCA report, create a work order, generate a compliance report, or notify a team, use the appropriate tool.
7. Be precise and use correct plant terminology. Equipment tags (P-101, HX-205), readings, and standards must be exact.`;

// Map a data-folder source_type to the citation tag used in answers.
const SOURCE_TYPE_TO_TAG = {
  equipment: 'EQUIPMENT',
  workorders: 'WO',
  inspections: 'INSPECTION',
  failures: 'FAILURE',
  manuals: 'MANUAL',
  procedures: 'PROCEDURE',
  regulations: 'REGULATION',
  logs: 'LOG',
};

// Build the context block from hybrid-retrieval results.
export function buildRetrievalContext(results) {
  if (!results || results.length === 0) return 'No accessible context was found in the knowledge base.';
  return results
    .map((r, i) => {
      const m = r.metadata || {};
      const tag = SOURCE_TYPE_TO_TAG[m.source_type] || String(m.source_type || 'DOC').toUpperCase();
      return `--- Source ${i + 1} [${tag} | ${m.source_id || 'unknown'}] ---\n${r.content}`;
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
