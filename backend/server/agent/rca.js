// The RCA (Root Cause Analysis) agent — the hero capability. For a failure
// question it does a DEEP graph traversal to assemble the causal chain, then
// prompts the LLM to reason like a reliability engineer: immediate cause →
// contributing factors → systemic root cause → similar past failures →
// recommendations. Reuses the same traversal + streaming as the copilot; what
// differs is the depth and the structured prompt.
import { traverse } from '../graph/traversal.js';
import { hybridSearch } from '../retrieval/hybrid.js';
import { labelToCitationTag } from '../graph/schema.js';

// Map a data-folder source_type to the citation tag used in answers, so the
// evidence block shows the same [WO | ...] format we ask the model to emit.
const SOURCE_TYPE_TO_TAG = {
  equipment: 'EQUIPMENT', workorders: 'WO', inspections: 'INSPECTION', failures: 'FAILURE',
  manuals: 'MANUAL', procedures: 'PROCEDURE', regulations: 'REGULATION', logs: 'LOG',
};

export const RCA_SYSTEM_PROMPT = `You are AssetBrain performing a Root Cause Analysis for a process plant, reasoning like a senior reliability engineer.

You are given (a) a knowledge subgraph connecting a failure to its work orders, inspections, procedures, manuals, operating logs, and any similar past failures, and (b) the underlying document evidence.

Produce a structured RCA. Use these exact section headings:
**Immediate Cause** — the direct physical cause of the failure.
**Contributing Factors** — conditions/events that enabled it (missed escalations, operating conditions, maintenance actions).
**Systemic Root Cause** — the underlying process/procedure gap that, if fixed, prevents recurrence.
**Similar Past Failures** — any prior failure with the same pattern (use the SIMILAR_TO links), and whether its corrective action was closed.
**Recommendations** — concrete corrective actions.
**Responsible & Who Can Fix It** — name the specific person(s) or team(s) from the context who worked on this equipment or are qualified to act (e.g. the technician who executed the related work orders, or the engineer whose specialization matches). Use their ACTUAL names from the [PEOPLE] nodes/evidence — do NOT substitute generic departments when a named person is available, and never invent a name.

RULES:
- Use ONLY the provided context. Never invent readings, tags, dates, or people's names.
- Cite every factual statement: [FAILURE | FAIL-2025-03], [WO | WO-2041], [INSPECTION | INS-311], [PROCEDURE | SOP-SEAL-REPL], [MANUAL | MAN-KSB-RPH200], [LOG | LOG-2025-03], [EQUIPMENT | P-101], [PEOPLE | PER-KULKARNI].
- When naming who is responsible or who can fix it, only use people that appear in the context (the [PEOPLE] nodes or evidence). If no specific person is in the context, say which role/team would own it — do not fabricate a name.
- Be concise and precise. If evidence is insufficient, say so.`;

// Build the RCA context: the causal subgraph + the evidence documents.
export function buildRcaContext(graph, retrieval) {
  const nodeLines = (graph.nodes || [])
    .map((n) => {
      const tag = labelToCitationTag(n.label) || n.label;
      // For people, surface their role/unit so the model can name WHO is
      // responsible/qualified rather than falling back to generic departments.
      if (n.label === 'Person') {
        const role = [n.person_title, n.specialization, n.unit].filter(Boolean).join(', ');
        return `  (${n.id}) [PEOPLE] ${n.title || ''}${role ? ' — ' + role : ''}`.trimEnd();
      }
      return `  (${n.id}) [${tag}] ${n.title || ''}`.trimEnd();
    })
    .join('\n');
  const edgeLines = (graph.edges || [])
    .map((e) => `  (${e.from}) -[${e.relation}]-> (${e.to})`)
    .join('\n');
  const evidence = (retrieval.results || [])
    .map((r) => {
      const m = r.metadata || {};
      const tag = SOURCE_TYPE_TO_TAG[m.source_type] || 'DOC';
      return `--- Evidence [${tag} | ${m.source_id}] ---\n${r.content}`;
    })
    .join('\n\n');
  return `CAUSAL SUBGRAPH (the failure and everything connected to it):\nNodes:\n${nodeLines}\nRelationships (causal chain):\n${edgeLines}\n\nDOCUMENT EVIDENCE:\n${evidence}`;
}

// Run the RCA traversal (deeper than a normal query) + retrieval. Emits graph
// events via onStep so the frontend lights up the causal chain.
export async function gatherRca(query, user, onStep) {
  // Deep traversal — more hops/nodes than a factual query, to reach the full
  // causal chain and the SIMILAR_TO patterns.
  const graph = await traverse(query, user, onStep, { maxHops: 4, maxNodes: 30, seedLimit: 4 });
  const retrieval = await hybridSearch(query, user, { topK: 10, fetchK: 20 });
  return { graph, retrieval };
}
