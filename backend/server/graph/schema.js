// The knowledge-graph schema: node labels, relationship types, and helpers.
//
// Two tiers of nodes:
//   Tier 1 — Artifacts (evidence): WorkOrder, Inspection, FailureReport,
//            Manual, Procedure, Regulation, OperatingLog
//   Tier 2 — Concepts (meaning):   Equipment (the central hub), FailureMode,
//            Person, Unit
//
// The concept tier is what turns "what is connected to what" into "why" — an
// Equipment/FailureMode node is the anchor a root-cause query resolves to, with
// artifacts (work orders, inspections, manuals) hanging off it as evidence.

export const NODE_LABELS = {
  // Artifacts
  WORK_ORDER: 'WorkOrder',
  INSPECTION: 'Inspection',
  FAILURE: 'FailureReport',
  MANUAL: 'Manual',
  PROCEDURE: 'Procedure',
  REGULATION: 'Regulation',
  LOG: 'OperatingLog',
  // Concepts
  EQUIPMENT: 'Equipment',
  FAILURE_MODE: 'FailureMode',
  PERSON: 'Person',
  UNIT: 'Unit',
};

export const ARTIFACT_LABELS = [
  NODE_LABELS.WORK_ORDER,
  NODE_LABELS.INSPECTION,
  NODE_LABELS.FAILURE,
  NODE_LABELS.MANUAL,
  NODE_LABELS.PROCEDURE,
  NODE_LABELS.REGULATION,
  NODE_LABELS.LOG,
];

export const RELATIONSHIPS = {
  // Structural (reliable backbone from explicit cross-references)
  PERFORMED_ON: 'PERFORMED_ON', // WorkOrder → Equipment
  INSPECTED: 'INSPECTED', // Inspection → Equipment
  OCCURRED_ON: 'OCCURRED_ON', // FailureReport → Equipment
  COVERS: 'COVERS', // Manual → Equipment
  APPLIES_TO: 'APPLIES_TO', // Procedure → Equipment
  GOVERNS: 'GOVERNS', // Regulation → Equipment/Procedure
  PART_OF: 'PART_OF', // Equipment → Unit
  EXECUTED_BY: 'EXECUTED_BY', // WorkOrder → Person
  REFERENCES: 'REFERENCES', // generic artifact → artifact
  // Causal / semantic (the reasoning layer — RCA lives here)
  CAUSED_BY: 'CAUSED_BY', // FailureReport → cause artifact
  CONTRIBUTED_TO: 'CONTRIBUTED_TO', // artifact → FailureReport
  PRECEDED: 'PRECEDED', // Inspection/log → FailureReport
  HAS_MODE: 'HAS_MODE', // FailureReport → FailureMode
  SIMILAR_TO: 'SIMILAR_TO', // FailureReport ↔ FailureReport (lessons learned)
};

// Map a data/ source_type (folder name) to its artifact node label.
export function sourceTypeToLabel(sourceType) {
  switch (sourceType) {
    case 'workorders': return NODE_LABELS.WORK_ORDER;
    case 'inspections': return NODE_LABELS.INSPECTION;
    case 'failures': return NODE_LABELS.FAILURE;
    case 'manuals': return NODE_LABELS.MANUAL;
    case 'procedures': return NODE_LABELS.PROCEDURE;
    case 'regulations': return NODE_LABELS.REGULATION;
    case 'logs': return NODE_LABELS.LOG;
    case 'equipment': return NODE_LABELS.EQUIPMENT;
    default: return NODE_LABELS.MANUAL;
  }
}

// Map a node label to the citation tag used in answers, e.g. WorkOrder → WO.
export function labelToCitationTag(label) {
  switch (label) {
    case NODE_LABELS.WORK_ORDER: return 'WO';
    case NODE_LABELS.INSPECTION: return 'INSPECTION';
    case NODE_LABELS.FAILURE: return 'FAILURE';
    case NODE_LABELS.MANUAL: return 'MANUAL';
    case NODE_LABELS.PROCEDURE: return 'PROCEDURE';
    case NODE_LABELS.REGULATION: return 'REGULATION';
    case NODE_LABELS.LOG: return 'LOG';
    case NODE_LABELS.EQUIPMENT: return 'EQUIPMENT';
    default: return label.toUpperCase();
  }
}

// The citation tags that correspond to real source documents (for the copilot's
// citation chips and the source-document viewer).
export const CITABLE_TAGS = ['WO', 'INSPECTION', 'FAILURE', 'MANUAL', 'PROCEDURE', 'REGULATION', 'LOG', 'EQUIPMENT'];

// The Cypher constraints/indexes to create once at build time.
export const SCHEMA_STATEMENTS = [
  'CREATE CONSTRAINT node_id_unique IF NOT EXISTS FOR (n:Node) REQUIRE n.id IS UNIQUE',
];

// Every node carries a shared :Node label (for the single uniqueness constraint
// on id) plus its specific label, e.g. (:Node:Equipment { id: "P-101" }).
export const SHARED_LABEL = 'Node';
