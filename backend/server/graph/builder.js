// Builds the Neo4j graph from ingested documents. Extracts the deterministic
// backbone + optional LLM enrichment, then writes everything with idempotent
// MERGE statements so re-ingesting is safe.
//
// Every node is created with two labels: a shared :Node label (for the single
// uniqueness constraint on id) and its specific label (:Email, :Decision, ...).
// ABAC access attributes are stored as flat properties on each node so the
// traversal query can filter on them directly.
import { getSession, writeQuery } from '../config/neo4j.js';
import { SCHEMA_STATEMENTS, SHARED_LABEL } from './schema.js';
import { extractBackbone, extractEnrichment } from './extractor.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('graph-builder');

async function ensureSchema() {
  for (const stmt of SCHEMA_STATEMENTS) {
    try {
      await writeQuery(stmt);
    } catch (err) {
      log.warn(`Schema statement warning: ${err.message}`);
    }
  }
}

function accessProps(access) {
  if (!access) return {};
  return {
    access_department: access.department || 'general',
    access_projects: access.projects || [],
    access_min_clearance: Number.isInteger(access.min_clearance) ? access.min_clearance : 1,
    access_sensitivity: access.sensitivity || 'public',
  };
}

async function writeNodes(nodes) {
  const session = getSession();
  try {
    // Batch with UNWIND for performance. We can't parameterize labels, so group
    // by label and run one UNWIND per label.
    const byLabel = new Map();
    for (const n of nodes) {
      if (!byLabel.has(n.label)) byLabel.set(n.label, []);
      byLabel.get(n.label).push({
        id: n.id,
        props: { ...n.props, ...accessProps(n.access) },
      });
    }
    for (const [label, rows] of byLabel) {
      await session.run(
        `UNWIND $rows AS row
         MERGE (n:${SHARED_LABEL}:${label} { id: row.id })
         SET n += row.props`,
        { rows }
      );
    }
  } finally {
    await session.close();
  }
}

async function writeEdges(edges) {
  const session = getSession();
  try {
    // Group by relationship type (labels/types can't be parameterized).
    const byType = new Map();
    for (const e of edges) {
      if (!byType.has(e.type)) byType.set(e.type, []);
      byType.get(e.type).push({ from: e.from, to: e.to, props: e.props || {} });
    }
    for (const [type, rows] of byType) {
      // Only connect nodes that already exist (MATCH, not MERGE, on endpoints)
      // so we don't create empty phantom nodes from dangling references.
      await session.run(
        `UNWIND $rows AS row
         MATCH (a:${SHARED_LABEL} { id: row.from })
         MATCH (b:${SHARED_LABEL} { id: row.to })
         MERGE (a)-[r:${type}]->(b)
         SET r += row.props`,
        { rows }
      );
    }
  } finally {
    await session.close();
  }
}

export async function clearGraph() {
  await writeQuery('MATCH (n) DETACH DELETE n');
  log.info('Cleared existing graph');
}

export async function buildGraph(documents, { enrich = true, reset = true } = {}) {
  await ensureSchema();
  if (reset) await clearGraph();

  const { nodes, edges } = extractBackbone(documents);
  log.info(`Backbone: ${nodes.length} nodes, ${edges.length} edges`);

  await writeNodes(nodes);

  let enrichmentEdges = [];
  if (enrich) {
    try {
      enrichmentEdges = await extractEnrichment(documents);
    } catch (err) {
      log.warn(`Enrichment failed, using backbone only: ${err.message}`);
    }
  }

  // Write backbone edges first, then enrichment edges (both MATCH endpoints).
  await writeEdges(edges);
  if (enrichmentEdges.length) await writeEdges(enrichmentEdges);

  return {
    nodes: nodes.length,
    edges: edges.length + enrichmentEdges.length,
    enrichmentEdges: enrichmentEdges.length,
  };
}
