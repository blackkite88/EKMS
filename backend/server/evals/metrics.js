// Deterministic structural metrics — no LLM needed. These directly answer the
// challenge's Evaluation Focus: entity-extraction accuracy across document
// types, knowledge-graph linkage completeness, and compliance-gap detection.
import { readAllDocuments } from '../ingestion/readers.js';
import { scanDataFiles, getSourceType } from '../ingestion/scanner.js';
import { extractBackbone } from '../graph/extractor.js';
import { readQuery } from '../config/neo4j.js';
import { SHARED_LABEL } from '../graph/schema.js';
import { detectComplianceGaps } from '../agent/compliance.js';

// 1. ENTITY EXTRACTION ACCURACY — did every equipment reference in the source
//    documents (across all types) become a linked graph node?
export async function entityExtractionMetric() {
  const docs = await readAllDocuments(await scanDataFiles());
  const { nodes } = extractBackbone(docs);
  const nodeIds = new Set(nodes.map((n) => n.id));

  let checked = 0;
  let correct = 0;
  const byType = {};
  for (const d of docs) {
    const s = d.structured || {};
    if (s.equipment_id) {
      checked++;
      const type = getSourceType(d.metadata.chunk_origin);
      byType[type] = byType[type] || { checked: 0, correct: 0 };
      byType[type].checked++;
      if (nodeIds.has(s.equipment_id)) { correct++; byType[type].correct++; }
    }
  }
  const entityTypes = [...new Set(nodes.map((n) => n.label))];
  return {
    accuracy: checked ? Math.round((100 * correct) / checked) : 100,
    checked,
    correct,
    entityTypeCount: entityTypes.length,
    entityTypes,
    perDocType: byType,
  };
}

// 2. GRAPH LINKAGE COMPLETENESS — orphan rate + cross-document-type edge share.
export async function graphLinkageMetric() {
  const [totalR, edgeR, orphanR, crossR] = await Promise.all([
    readQuery(`MATCH (n:${SHARED_LABEL}) RETURN count(n) AS c`, {}, (x) => x.get('c').toNumber()),
    readQuery(`MATCH ()-[r]->() RETURN count(r) AS c`, {}, (x) => x.get('c').toNumber()),
    readQuery(`MATCH (n:${SHARED_LABEL}) WHERE NOT (n)--() RETURN count(n) AS c`, {}, (x) => x.get('c').toNumber()),
    readQuery(`MATCH (a:${SHARED_LABEL})-[r]->(b:${SHARED_LABEL}) WHERE labels(a)[1] <> labels(b)[1] RETURN count(r) AS c`, {}, (x) => x.get('c').toNumber()),
  ]);
  const nodes = totalR[0];
  const edges = edgeR[0];
  const orphans = orphanR[0];
  const cross = crossR[0];
  return {
    nodes,
    edges,
    orphans,
    connectedPct: nodes ? Math.round((100 * (nodes - orphans)) / nodes) : 100,
    density: nodes ? +(edges / nodes).toFixed(2) : 0,
    crossTypePct: edges ? Math.round((100 * cross) / edges) : 0,
  };
}

// 3. COMPLIANCE GAP DETECTION — number of gaps a full-clearance scan finds.
export async function complianceMetric() {
  const gaps = await detectComplianceGaps({ email: 'eval@bpi.com', department: 'management', clearance: 5 });
  const overdue = gaps.filter((g) => g.status === 'overdue');
  return {
    gapsDetected: gaps.length,
    overdue: overdue.length,
    noRecord: gaps.length - overdue.length,
    sample: gaps.slice(0, 6).map((g) => `${g.equipment} — ${g.activity} (${g.regulation})`),
  };
}
