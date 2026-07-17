// The knowledge-graph schema: node labels, relationship types, and helpers.
//
// Two tiers of nodes:
//   Tier 1 — Artifacts (the evidence): Email, Ticket, Meeting, PR, Doc
//   Tier 2 — Concepts (the meaning):   Person, Project, Decision, Incident
//
// The concept tier is what turns "what is connected to what" into "why" — a
// Decision/Incident node is the anchor a causal query resolves to, with
// artifacts hanging off it as evidence.

export const NODE_LABELS = {
  // Artifacts
  EMAIL: 'Email',
  TICKET: 'Ticket',
  MEETING: 'Meeting',
  PR: 'PR',
  DOC: 'Doc',
  // Concepts
  PERSON: 'Person',
  PROJECT: 'Project',
  DECISION: 'Decision',
  INCIDENT: 'Incident',
};

export const ARTIFACT_LABELS = [
  NODE_LABELS.EMAIL,
  NODE_LABELS.TICKET,
  NODE_LABELS.MEETING,
  NODE_LABELS.PR,
  NODE_LABELS.DOC,
];

export const RELATIONSHIPS = {
  // Structural (reliable backbone from explicit cross-references)
  REFERENCES: 'REFERENCES',
  AUTHORED_BY: 'AUTHORED_BY',
  ABOUT: 'ABOUT',
  ATTENDED: 'ATTENDED',
  // Causal / semantic (the reasoning layer)
  CAUSED: 'CAUSED',
  BLOCKS: 'BLOCKS',
  LED_TO: 'LED_TO',
  APPROVED: 'APPROVED',
  EVIDENCES: 'EVIDENCES',
  RESULTED_FROM: 'RESULTED_FROM',
};

// Map a data/ source_type to its artifact node label.
export function sourceTypeToLabel(sourceType) {
  switch (sourceType) {
    case 'emails': return NODE_LABELS.EMAIL;
    case 'tickets': return NODE_LABELS.TICKET;
    case 'meetings': return NODE_LABELS.MEETING;
    case 'github': return NODE_LABELS.PR;
    case 'docs': return NODE_LABELS.DOC;
    default: return NODE_LABELS.DOC;
  }
}

// Map an artifact label back to the citation tag used in answers, e.g. Email → EMAIL.
export function labelToCitationTag(label) {
  switch (label) {
    case NODE_LABELS.EMAIL: return 'EMAIL';
    case NODE_LABELS.TICKET: return 'TICKET';
    case NODE_LABELS.MEETING: return 'MEETING';
    case NODE_LABELS.PR: return 'PR';
    case NODE_LABELS.DOC: return 'DOC';
    default: return label.toUpperCase();
  }
}

// The Cypher constraints/indexes to create once at build time.
export const SCHEMA_STATEMENTS = [
  'CREATE CONSTRAINT node_id_unique IF NOT EXISTS FOR (n:Node) REQUIRE n.id IS UNIQUE',
];

// Because we use a shared :Node label plus a specific label on every node, we
// can enforce a single uniqueness constraint on id. Nodes are created with both
// labels, e.g. (:Node:Email { id: "email_02" }).
export const SHARED_LABEL = 'Node';
