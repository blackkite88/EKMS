// Extracts nodes and edges from the ingested industrial documents. Hybrid:
//
//   1. BACKBONE (deterministic): read explicit fields (equipment_id, related_*,
//      governed_by, similar_to, failure_mode, technician) plus regex-extracted
//      equipment tags (P-101, HX-205...) mentioned in free text. Guarantees a
//      correct graph for the demo.
//
//   2. ENRICHMENT (LLM, optional): ask Groq to surface additional causal links
//      (CAUSED_BY / CONTRIBUTED_TO / PRECEDED) from the document text — the
//      "AI found more connections" story. Failures here never break the backbone.
import { getGroqClient, GROQ_MODEL } from '../config/groq.js';
import { NODE_LABELS, RELATIONSHIPS, sourceTypeToLabel } from './schema.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('extractor');

// Equipment tag pattern: P-101, HX-205, C-301, V-410, T-501, F-101, K-401...
const EQUIP_TAG_RE = /\b([A-Z]{1,2}-\d{2,4})\b/g;
// Regulation id pattern: OISD-STD-106, PESO-SMPV-2016, FACTORY-ACT-M...
const REG_ID_RE = /\b((?:OISD-(?:STD|GDN)-\d+)|(?:PESO-[A-Z]+-\d+)|(?:FACTORY-ACT-[A-Z]))\b/g;

function makeNode(id, label, props = {}, access = null) {
  return { id: String(id), label, props, access };
}
function makeEdge(from, to, type, props = {}) {
  return { from: String(from), to: String(to), type, props };
}

function uniqueMatches(text, re) {
  const found = new Set();
  let m;
  re.lastIndex = 0;
  while ((m = re.exec(text)) !== null) found.add(m[1]);
  return [...found];
}

// ---- backbone extraction ---------------------------------------------------

export function extractBackbone(documents) {
  const nodes = new Map();
  const edges = [];
  const edgeKeys = new Set();

  const addNode = (node) => {
    const existing = nodes.get(node.id);
    if (existing) {
      existing.props = { ...existing.props, ...node.props };
      if (node.access && !existing.access) existing.access = node.access;
      if (node.label !== NODE_LABELS.EQUIPMENT && existing.label === NODE_LABELS.EQUIPMENT) {
        // don't downgrade a real Equipment node to a stub
      } else if (existing._stub && !node._stub) {
        existing.label = node.label;
        existing._stub = false;
      }
    } else {
      nodes.set(node.id, node);
    }
  };

  const addEdge = (from, to, type, props = {}) => {
    const key = `${from}->${to}:${type}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    edges.push(makeEdge(from, to, type, props));
  };

  // Ensure a referenced equipment node exists (stub if we haven't seen its file).
  const ensureEquipment = (tag, access = null) => {
    if (!nodes.has(tag)) {
      addNode({ ...makeNode(tag, NODE_LABELS.EQUIPMENT, { title: tag }, access), _stub: true });
    }
  };
  const ensureRegulation = (regId, access = null) => {
    if (!nodes.has(regId)) {
      addNode({ ...makeNode(regId, NODE_LABELS.REGULATION, { title: regId }, access), _stub: true });
    }
  };

  for (const doc of documents) {
    const meta = doc.metadata;
    const s = doc.structured || {};
    const label = sourceTypeToLabel(meta.source_type);
    const selfId = meta.source_id;
    const access = meta.access;

    // ── PEOPLE directory ──
    // A people/*.json record enriches the Person node the work-order technician
    // field already creates (id `person:<name>`), so they merge into one node
    // rather than forming a parallel island. `title` is set to the name so the
    // seed matcher (which keys off id/title) can find "who is <name>" queries.
    if (label === NODE_LABELS.PERSON) {
      const name = s.name || selfId;
      const pid = s.id || `person:${name}`;
      addNode(
        makeNode(
          pid,
          NODE_LABELS.PERSON,
          {
            title: name,
            name,
            email: s.email || null,
            person_title: s.title || null,
            department: s.department || null,
            unit: s.unit || null,
            specialization: s.specialization || null,
            source_type: meta.source_type,
          },
          access
        )
      );
      // Person → Unit
      if (s.unit) {
        const uid = `unit:${s.unit}`;
        addNode(makeNode(uid, NODE_LABELS.UNIT, { name: s.unit }));
        addEdge(pid, uid, RELATIONSHIPS.PART_OF);
      }
      // Person → Equipment they focus on (REFERENCES; equipment stub if unseen)
      for (const eq of s.equipment_focus || []) {
        ensureEquipment(eq, access);
        addEdge(pid, eq, RELATIONSHIPS.REFERENCES);
      }
      continue; // people carry no artifact-style links; skip the rest
    }

    // The artifact/equipment node itself.
    addNode(
      makeNode(
        selfId,
        label,
        {
          title: s.title || s.name || meta.source_id,
          source_type: meta.source_type,
          date: s.date || s.installed || null,
          status: s.status || null,
          equipment_id: s.equipment_id || null,
          regulation: s.regulation || null,
        },
        access
      )
    );

    // ── EQUIPMENT master record ──
    if (label === NODE_LABELS.EQUIPMENT) {
      // Unit membership
      if (s.unit) {
        const uid = `unit:${s.unit}`;
        addNode(makeNode(uid, NODE_LABELS.UNIT, { name: s.unit }));
        addEdge(selfId, uid, RELATIONSHIPS.PART_OF);
      }
      // governed_by → Regulation
      for (const reg of s.governed_by || []) {
        ensureRegulation(reg, access);
        addEdge(reg, selfId, RELATIONSHIPS.GOVERNS);
      }
      // related manuals
      for (const man of s.related_manuals || []) {
        addEdge(man, selfId, RELATIONSHIPS.COVERS);
      }
    }

    // ── Link this artifact to the equipment it concerns ──
    const eqId = s.equipment_id;
    if (eqId && label !== NODE_LABELS.EQUIPMENT) {
      ensureEquipment(eqId, access);
      const rel =
        label === NODE_LABELS.WORK_ORDER ? RELATIONSHIPS.PERFORMED_ON
        : label === NODE_LABELS.INSPECTION ? RELATIONSHIPS.INSPECTED
        : label === NODE_LABELS.FAILURE ? RELATIONSHIPS.OCCURRED_ON
        : RELATIONSHIPS.REFERENCES;
      addEdge(selfId, eqId, rel);
    }

    // ── Technician → Person ──
    if (s.technician) {
      const pid = `person:${s.technician}`;
      addNode(makeNode(pid, NODE_LABELS.PERSON, { name: s.technician }));
      addEdge(selfId, pid, RELATIONSHIPS.EXECUTED_BY);
    }

    // ── FAILURE causal backbone (the RCA spine) ──
    if (label === NODE_LABELS.FAILURE) {
      // failure mode concept node
      if (s.failure_mode) {
        const fmId = `mode:${s.failure_mode.toLowerCase()}`;
        addNode(makeNode(fmId, NODE_LABELS.FAILURE_MODE, { name: s.failure_mode }));
        addEdge(selfId, fmId, RELATIONSHIPS.HAS_MODE);
      }
      // related work orders CONTRIBUTED_TO this failure
      for (const wo of s.related_workorders || []) addEdge(wo, selfId, RELATIONSHIPS.CONTRIBUTED_TO);
      // inspections/logs PRECEDED the failure (warning signs)
      for (const ins of s.related_inspections || []) addEdge(ins, selfId, RELATIONSHIPS.PRECEDED);
      for (const lg of s.related_logs || []) addEdge(lg, selfId, RELATIONSHIPS.PRECEDED);
      // procedures/manuals as causal evidence
      for (const proc of s.related_procedures || []) addEdge(selfId, proc, RELATIONSHIPS.CAUSED_BY);
      for (const man of s.related_manuals || []) addEdge(selfId, man, RELATIONSHIPS.REFERENCES);
      // SIMILAR_TO — the lessons-learned edge (bidirectional)
      for (const sim of s.similar_to || []) {
        addEdge(selfId, sim, RELATIONSHIPS.SIMILAR_TO);
        addEdge(sim, selfId, RELATIONSHIPS.SIMILAR_TO);
      }
    }

    // ── WORK ORDER links ──
    if (label === NODE_LABELS.WORK_ORDER) {
      if (s.procedure) addEdge(selfId, s.procedure, RELATIONSHIPS.REFERENCES);
      for (const f of s.related_failures || []) addEdge(selfId, f, RELATIONSHIPS.REFERENCES);
    }

    // ── Free-text mentions: equipment tags + regulation ids in any document ──
    const text = doc.text || '';
    for (const tag of uniqueMatches(text, EQUIP_TAG_RE)) {
      if (tag === selfId) continue;
      // Only link if the tag looks like real equipment (avoid false positives
      // like INS-311 / WO-2041 which match the pattern but aren't equipment).
      // Real equipment tags in this plant start with a letter class we know.
      if (/^(P|HX|C|V|T|F|K)-\d{3}$/.test(tag)) {
        ensureEquipment(tag, access);
        addEdge(selfId, tag, RELATIONSHIPS.REFERENCES);
      }
    }
    for (const reg of uniqueMatches(text, REG_ID_RE)) {
      if (reg === selfId) continue;
      ensureRegulation(reg, access);
      addEdge(reg, selfId, RELATIONSHIPS.GOVERNS);
    }
  }

  // strip internal _stub flag
  const nodeList = [...nodes.values()].map(({ _stub, ...n }) => n);
  return { nodes: nodeList, edges };
}

// ---- LLM enrichment --------------------------------------------------------

const ENRICH_PROMPT = `You are a reliability engineer extracting causal relationships from an industrial maintenance document.
Return STRICT JSON: {"causal_edges":[{"from":"<id>","to":"<id>","relation":"CAUSED_BY|CONTRIBUTED_TO|PRECEDED"}]}
Use only equipment tags (e.g. P-101), work order ids (WO-xxxx), inspection ids (INS-xxx),
failure ids (FAIL-xxxx), procedure ids (SOP-xxx), or manual ids that appear in THIS document.
If no clear causal links, return {"causal_edges":[]}. No prose.`;

async function enrichDocument(doc) {
  const client = getGroqClient();
  const res = await client.chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      { role: 'system', content: ENRICH_PROMPT },
      { role: 'user', content: `document id: ${doc.metadata.source_id}\n\n${doc.text.slice(0, 4000)}` },
    ],
    temperature: 0,
    max_tokens: 500,
    response_format: { type: 'json_object' },
  });
  const parsed = JSON.parse(res.choices[0]?.message?.content || '{}');
  const edges = Array.isArray(parsed.causal_edges) ? parsed.causal_edges : [];
  return edges
    .filter((e) => e.from && e.to && e.relation)
    .map((e) => makeEdge(e.from, e.to, e.relation, { source: 'llm' }));
}

// Enrich the causal-heavy document types (failures + inspections).
export async function extractEnrichment(documents, { limit = 20 } = {}) {
  const candidates = documents
    .filter((d) => ['failures', 'inspections'].includes(d.metadata.source_type))
    .slice(0, limit);

  const edges = [];
  for (const doc of candidates) {
    try {
      edges.push(...(await enrichDocument(doc)));
    } catch (err) {
      log.warn(`LLM enrichment skipped for ${doc.metadata.source_id}: ${err.message}`);
    }
  }
  log.info(`LLM enrichment produced ${edges.length} causal edges`);
  return edges;
}
