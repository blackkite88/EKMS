// ★ The heart of the wow moment: access-aware, breadth-first, OBSERVABLE
// traversal of the knowledge graph.
//
// - Breadth-first: explores hop by hop, so one blocked node is a LOCAL wall,
//   not a global stop — other routes keep expanding.
// - Access-aware: at every hop, a neighbor is only visited if the user's ABAC
//   attributes clear that node. A restricted node is never entered, so nodes
//   reachable ONLY through it stay hidden ("dark at the boundary"), while nodes
//   reachable by an alternate public path are still found.
// - Observable: an onStep callback fires for each activation / edge / block, so
//   the agent can stream them (paced) to the frontend and light up the graph.
import { getSession, neo4j } from '../config/neo4j.js';
import { canAccess } from '../auth/policy.js';
import { SHARED_LABEL, labelToCitationTag } from './schema.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('traversal');

const DEFAULT_MAX_HOPS = 3;
const DEFAULT_MAX_NODES = 25;

// Extract ABAC access attributes from a Neo4j node's flat properties.
function nodeAccess(props) {
  return {
    department: props.access_department || 'operations',
    unit: props.access_unit || 'all',
    min_clearance: typeof props.access_min_clearance === 'number'
      ? props.access_min_clearance
      : (props.access_min_clearance?.toNumber?.() ?? 1),
    sensitivity: props.access_sensitivity || 'public',
  };
}

function primaryLabel(labels) {
  return labels.find((l) => l !== SHARED_LABEL) || SHARED_LABEL;
}

// Stopwords stripped from queries when deriving seed keywords.
const STOPWORDS = new Set([
  'the', 'was', 'were', 'why', 'who', 'what', 'when', 'where', 'how', 'is', 'are',
  'did', 'does', 'do', 'a', 'an', 'of', 'to', 'in', 'on', 'for', 'and', 'or', 'that',
  'this', 'it', 'about', 'chain', 'events', 'led', 'feature', 'summarize', 'draft',
  'create', 'me', 'my', 'our', 'with', 'from', 'by', 'at', 'as', 'be', 'been',
]);

// Derive meaningful search terms from the query: keep explicit IDs (NEX-231,
// email_02, pr_47) verbatim, plus content words longer than 2 chars.
function queryKeywords(query) {
  const ids = [...query.matchAll(/\b(?:nex-\d+|email_\d+|pr_\d+|ticket_[a-z0-9-]+|standup_\d+)\b/gi)].map((m) => m[0]);
  const words = query
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
  return [...new Set([...ids, ...words])];
}

// Find seed node ids by matching query keywords against node ids/titles, ranked
// by how many distinct keywords a node matches.
async function findSeeds(query, limit = 3) {
  const keywords = queryKeywords(query);
  if (keywords.length === 0) return [];
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (n:${SHARED_LABEL})
       WITH n, [kw IN $keywords WHERE toLower(n.id) CONTAINS kw
                                    OR toLower(coalesce(n.title,'')) CONTAINS kw] AS hits
       WHERE size(hits) > 0
       RETURN n.id AS id, labels(n) AS labels, coalesce(n.title,'') AS title, size(hits) AS score
       ORDER BY score DESC, n.id
       LIMIT $limit`,
      { keywords, limit: neo4j.int(limit) }
    );
    return result.records.map((r) => ({
      id: r.get('id'),
      label: primaryLabel(r.get('labels')),
      title: r.get('title'),
    }));
  } finally {
    await session.close();
  }
}

// Fetch a node's outgoing+incoming neighbors (id, labels, props, rel type).
async function getNeighbors(nodeId) {
  const session = getSession();
  try {
    const result = await session.run(
      `MATCH (n:${SHARED_LABEL} { id: $id })-[r]-(m:${SHARED_LABEL})
       RETURN m.id AS id, labels(m) AS labels, properties(m) AS props,
              type(r) AS rel, startNode(r).id AS fromId`,
      { id: nodeId }
    );
    return result.records.map((r) => ({
      id: r.get('id'),
      label: primaryLabel(r.get('labels')),
      props: r.get('props'),
      rel: r.get('rel'),
      fromId: r.get('fromId'),
    }));
  } finally {
    await session.close();
  }
}

/**
 * Traverse the graph from seeds derived from `query`, respecting the user's
 * ABAC attributes. Emits steps via onStep(event) as it goes.
 *
 * @returns {Promise<{nodes, edges, blockedCount, citations}>}
 */
export async function traverse(query, user, onStep = () => {}, options = {}) {
  const maxHops = options.maxHops ?? DEFAULT_MAX_HOPS;
  const maxNodes = options.maxNodes ?? DEFAULT_MAX_NODES;

  const seeds = await findSeeds(query, options.seedLimit ?? 3);
  if (seeds.length === 0) {
    return { nodes: [], edges: [], blockedCount: 0, citations: [], seeds: [] };
  }

  const visited = new Set();
  const resultNodes = [];
  const resultEdges = [];
  const citations = [];
  let blockedCount = 0;

  // BFS queue holds { id, depth }. Seeds enter at depth 0 (already access-checked
  // implicitly: seeds themselves must be accessible or we skip them).
  const queue = [];

  for (const seed of seeds) {
    // Verify seed access by fetching its props via a neighbor-less lookup.
    const session = getSession();
    let seedProps;
    try {
      const r = await session.run(
        `MATCH (n:${SHARED_LABEL} { id: $id }) RETURN properties(n) AS props`,
        { id: seed.id }
      );
      seedProps = r.records[0]?.get('props') || {};
    } finally {
      await session.close();
    }
    if (!canAccess(user, nodeAccess(seedProps))) {
      blockedCount++;
      onStep({ type: 'node_blocked', reason: 'restricted' });
      continue;
    }
    visited.add(seed.id);
    resultNodes.push({ id: seed.id, label: seed.label, title: seedProps.title || seed.id });
    onStep({ type: 'graph_seed', node: seed.id, label: seed.label, title: seedProps.title || seed.id });
    queue.push({ id: seed.id, depth: 0 });
  }

  while (queue.length > 0 && resultNodes.length < maxNodes) {
    const { id, depth } = queue.shift();
    if (depth >= maxHops) continue;

    let neighbors;
    try {
      neighbors = await getNeighbors(id);
    } catch (err) {
      log.warn(`Neighbor fetch failed for ${id}: ${err.message}`);
      continue;
    }

    for (const nb of neighbors) {
      if (resultNodes.length >= maxNodes) break;

      const access = nodeAccess(nb.props);
      if (!canAccess(user, access)) {
        // LOCAL WALL: do not enter, do not traverse through. Emit a blocked
        // signal carrying NO identifying data (so the stream can't leak it).
        blockedCount++;
        onStep({ type: 'node_blocked', reason: 'restricted' });
        continue;
      }

      if (!visited.has(nb.id)) {
        visited.add(nb.id);
        const rn = { id: nb.id, label: nb.label, title: nb.props.title || nb.id };
        // Carry role/unit for people so downstream context (e.g. RCA) can name
        // WHO is responsible/qualified, not just that a person exists.
        if (nb.label === 'Person') {
          rn.person_title = nb.props.person_title || null;
          rn.specialization = nb.props.specialization || null;
          rn.unit = nb.props.unit || null;
        }
        resultNodes.push(rn);
        onStep({
          type: 'node_activated',
          node: nb.id,
          label: nb.label,
          reason: nb.rel,
          title: nb.props.title || nb.id,
        });
        queue.push({ id: nb.id, depth: depth + 1 });

        // Collect artifact nodes as potential citations.
        const tag = labelToCitationTag(nb.label);
        if (['EMAIL', 'TICKET', 'MEETING', 'PR', 'DOC'].includes(tag)) {
          citations.push({ tag, id: nb.id, title: nb.props.title || nb.id });
        }
      }

      // Record + emit the edge (both endpoints are accessible here).
      const edgeKey = `${nb.fromId}->${nb.id}:${nb.rel}`;
      if (!resultEdges.some((e) => e.key === edgeKey)) {
        const edge = { key: edgeKey, from: nb.fromId, to: nb.id, relation: nb.rel };
        resultEdges.push(edge);
        onStep({ type: 'edge_traversed', from: nb.fromId, to: nb.id, relation: nb.rel });
      }
    }
  }

  onStep({ type: 'traversal_complete', nodeCount: resultNodes.length, blockedCount });
  return {
    nodes: resultNodes,
    edges: resultEdges.map(({ key, ...e }) => e),
    blockedCount,
    citations,
    seeds,
  };
}

// Fetch ALL Person nodes (ABAC-filtered) for roster-style queries like "name
// all employees" or "who is on the maintenance team" — where the vector top-K
// would only surface a handful. Optionally scope by department/unit keyword.
export async function listPeople(user, { scope = null } = {}) {
  const session = getSession();
  try {
    const r = await session.run(
      `MATCH (p:Person) RETURN p.id AS id, properties(p) AS props ORDER BY p.name`
    );
    const people = [];
    for (const rec of r.records) {
      const props = rec.get('props') || {};
      if (!canAccess(user, nodeAccess(props))) continue;
      if (scope) {
        const s = scope.toLowerCase();
        const hay = `${props.department || ''} ${props.unit || ''} ${props.name || ''} ${props.specialization || ''}`.toLowerCase();
        if (!hay.includes(s)) continue;
      }
      people.push({
        id: rec.get('id'),
        label: 'Person',
        title: props.title || props.name || rec.get('id'),
        name: props.name || null,
        person_title: props.person_title || null,
        department: props.department || null,
        unit: props.unit || null,
        specialization: props.specialization || null,
        email: props.email || null,
      });
    }
    return people;
  } finally {
    await session.close();
  }
}
