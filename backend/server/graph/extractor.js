// Extracts nodes and edges from the ingested documents. Hybrid strategy:
//
//   1. BACKBONE (deterministic, reliable): read the explicit cross-references
//      already present in the dataset (linked_tickets, linked_emails,
//      linked_meetings, linked_prs, linked_docs), plus authorship/attendance
//      and project tags. This guarantees a correct graph for the demo.
//
//   2. ENRICHMENT (LLM, optional): ask Groq to read each document and surface
//      Decision/Incident concepts and causal edges (CAUSED / LED_TO / BLOCKS)
//      that aren't explicit in the metadata — the "the AI built its own graph"
//      story. Failures here never break the backbone.
import { getGroqClient, GROQ_MODEL } from '../config/groq.js';
import {
  NODE_LABELS,
  RELATIONSHIPS,
  sourceTypeToLabel,
} from './schema.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('extractor');

// ---- helpers ---------------------------------------------------------------

function makeNode(id, label, props = {}, access = null) {
  return { id: String(id), label, props, access };
}
function makeEdge(from, to, type, props = {}) {
  return { from: String(from), to: String(to), type, props };
}

// Which linked_* field maps to which artifact label.
const LINK_FIELDS = {
  linked_emails: NODE_LABELS.EMAIL,
  linked_tickets: NODE_LABELS.TICKET,
  linked_meetings: NODE_LABELS.MEETING,
  linked_prs: NODE_LABELS.PR,
  linked_docs: NODE_LABELS.DOC,
};

// Normalize an id that may appear in different forms across files.
// e.g. a ticket file id is "ticket_NEX-204" but links reference "NEX-204".
function normalizeLinkedId(rawId, label) {
  const id = String(rawId);
  if (label === NODE_LABELS.TICKET && /^NEX-/i.test(id)) return `ticket_${id}`;
  if (label === NODE_LABELS.PR && /^\d+$/.test(id)) return `pr_${id}`;
  if (label === NODE_LABELS.PR && /^#\d+$/.test(id)) return `pr_${id.slice(1)}`;
  return id;
}

// ---- backbone extraction ---------------------------------------------------

export function extractBackbone(documents) {
  const nodes = new Map(); // id -> node
  const edges = [];

  const addNode = (node) => {
    const existing = nodes.get(node.id);
    if (existing) {
      // merge props/access if we learn more later
      existing.props = { ...existing.props, ...node.props };
      if (node.access && !existing.access) existing.access = node.access;
    } else {
      nodes.set(node.id, node);
    }
  };

  for (const doc of documents) {
    const meta = doc.metadata;
    const s = doc.structured || {};
    const label = sourceTypeToLabel(meta.source_type);
    const selfId = meta.source_id;

    // The artifact node itself, carrying its ABAC access for traversal filtering.
    addNode(
      makeNode(
        selfId,
        label,
        {
          title: s.title || s.subject || meta.source_id,
          source_type: meta.source_type,
          date: s.date || s.created || null,
          status: s.status || null,
        },
        meta.access
      )
    );

    // People: from/to/author/assignee/reporter/attendees.
    const people = new Set();
    for (const key of ['from', 'author', 'assignee', 'reporter']) {
      if (typeof s[key] === 'string') people.add(s[key]);
    }
    const attendees = [];
    if (Array.isArray(s.attendees)) attendees.push(...s.attendees);
    if (Array.isArray(s.to)) s.to.forEach((p) => people.add(p));
    if (typeof s.to === 'string') people.add(s.to);

    for (const person of people) {
      const pid = `person:${person}`;
      addNode(makeNode(pid, NODE_LABELS.PERSON, { name: person }));
      edges.push(makeEdge(selfId, pid, RELATIONSHIPS.AUTHORED_BY));
    }
    for (const person of attendees) {
      const pid = `person:${person}`;
      addNode(makeNode(pid, NODE_LABELS.PERSON, { name: person }));
      edges.push(makeEdge(pid, selfId, RELATIONSHIPS.ATTENDED));
    }

    // Project membership (from ABAC projects or an explicit `project` field).
    const projects = new Set();
    if (Array.isArray(meta.access?.projects)) meta.access.projects.forEach((p) => projects.add(p));
    if (typeof s.project === 'string') projects.add(s.project);
    for (const project of projects) {
      const prid = `project:${project}`;
      addNode(makeNode(prid, NODE_LABELS.PROJECT, { name: project }));
      edges.push(makeEdge(selfId, prid, RELATIONSHIPS.ABOUT));
    }

    // Explicit cross-references → REFERENCES edges.
    for (const [field, linkedLabel] of Object.entries(LINK_FIELDS)) {
      const links = s[field];
      if (!Array.isArray(links)) continue;
      for (const raw of links) {
        const targetId = normalizeLinkedId(raw, linkedLabel);
        edges.push(makeEdge(selfId, targetId, RELATIONSHIPS.REFERENCES, { linked_as: linkedLabel }));
      }
    }

    // Authored concept nodes declared directly in the data (hand-authored
    // backbone for Decisions/Incidents), e.g. { "decisions": [...] }.
    if (Array.isArray(s.decisions)) {
      for (const d of s.decisions) {
        const did = `decision:${d.id || d.title}`;
        addNode(makeNode(did, NODE_LABELS.DECISION, { title: d.title, summary: d.summary || '' }, meta.access));
        edges.push(makeEdge(selfId, did, RELATIONSHIPS.EVIDENCES));
        if (d.approved_by) {
          const pid = `person:${d.approved_by}`;
          addNode(makeNode(pid, NODE_LABELS.PERSON, { name: d.approved_by }));
          edges.push(makeEdge(pid, did, RELATIONSHIPS.APPROVED));
        }
        if (Array.isArray(d.caused_by)) {
          for (const c of d.caused_by) {
            edges.push(makeEdge(normalizeLinkedId(c.id || c, NODE_LABELS.TICKET), did, RELATIONSHIPS.RESULTED_FROM));
          }
        }
        if (Array.isArray(d.led_to)) {
          for (const l of d.led_to) {
            edges.push(makeEdge(did, normalizeLinkedId(l.id || l, NODE_LABELS.TICKET), RELATIONSHIPS.LED_TO));
          }
        }
      }
    }
    if (Array.isArray(s.incidents)) {
      for (const inc of s.incidents) {
        const iid = `incident:${inc.id || inc.title}`;
        addNode(makeNode(iid, NODE_LABELS.INCIDENT, { title: inc.title, summary: inc.summary || '' }, meta.access));
        edges.push(makeEdge(selfId, iid, RELATIONSHIPS.EVIDENCES));
        if (Array.isArray(inc.caused_by)) {
          for (const c of inc.caused_by) {
            edges.push(makeEdge(normalizeLinkedId(c.id || c, NODE_LABELS.TICKET), iid, RELATIONSHIPS.CAUSED));
          }
        }
      }
    }

    // Explicit blocks (ticket-level).
    if (Array.isArray(s.blocks)) {
      for (const b of s.blocks) {
        edges.push(makeEdge(selfId, normalizeLinkedId(b, NODE_LABELS.TICKET), RELATIONSHIPS.BLOCKS));
      }
    }
  }

  return { nodes: [...nodes.values()], edges };
}

// ---- LLM enrichment --------------------------------------------------------

const ENRICH_PROMPT = `You extract causal relationships from an enterprise document.
Return STRICT JSON: {"causal_edges":[{"from":"<source_id>","to":"<source_id>","relation":"CAUSED|LED_TO|BLOCKS"}]}
Only use source_ids that appear in the document's own metadata or linked_* fields.
If there are no clear causal links, return {"causal_edges":[]}. No prose.`;

async function enrichDocument(doc) {
  const client = getGroqClient();
  const content = doc.text.slice(0, 4000);
  const res = await client.chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      { role: 'system', content: ENRICH_PROMPT },
      { role: 'user', content: `source_id: ${doc.metadata.source_id}\n\n${content}` },
    ],
    temperature: 0,
    max_tokens: 500,
    response_format: { type: 'json_object' },
  });
  const raw = res.choices[0]?.message?.content || '{}';
  const parsed = JSON.parse(raw);
  const edges = Array.isArray(parsed.causal_edges) ? parsed.causal_edges : [];
  return edges
    .filter((e) => e.from && e.to && e.relation)
    .map((e) => makeEdge(e.from, e.to, e.relation, { source: 'llm' }));
}

// Enrich a subset of documents (causal-heavy types) to keep ingest fast.
export async function extractEnrichment(documents, { limit = 30 } = {}) {
  const candidates = documents
    .filter((d) => ['emails', 'meetings', 'tickets'].includes(d.metadata.source_type))
    .slice(0, limit);

  const edges = [];
  for (const doc of candidates) {
    try {
      const found = await enrichDocument(doc);
      edges.push(...found);
    } catch (err) {
      log.warn(`LLM enrichment skipped for ${doc.metadata.source_id}: ${err.message}`);
    }
  }
  log.info(`LLM enrichment produced ${edges.length} causal edges`);
  return edges;
}
