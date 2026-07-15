// GET /graph → the full knowledge graph, ABAC-filtered to what the current user
// may see. The frontend renders this as the dim "company brain" backdrop, then
// lights the active subgraph on top during a query. Restricted nodes are simply
// absent (never sent), consistent with the traversal's security model.
import { Router } from 'express';
import { requireAuth } from '../auth/middleware.js';
import { readQuery } from '../config/neo4j.js';
import { canAccess } from '../auth/policy.js';
import { SHARED_LABEL } from '../graph/schema.js';
import { writeAudit } from '../middleware/auditLogger.js';

const router = Router();

function nodeAccess(props) {
  return {
    department: props.access_department || 'general',
    projects: Array.isArray(props.access_projects) ? props.access_projects : [],
    min_clearance:
      typeof props.access_min_clearance === 'number'
        ? props.access_min_clearance
        : props.access_min_clearance?.toNumber?.() ?? 1,
    sensitivity: props.access_sensitivity || 'public',
  };
}

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const rawNodes = await readQuery(
      `MATCH (n:${SHARED_LABEL})
       RETURN n.id AS id, labels(n) AS labels, properties(n) AS props`,
      {},
      (r) => ({ id: r.get('id'), labels: r.get('labels'), props: r.get('props') })
    );

    // ABAC filter — only nodes the user may see.
    const visible = rawNodes.filter((n) => canAccess(req.user, nodeAccess(n.props)));
    const visibleIds = new Set(visible.map((n) => n.id));

    const nodes = visible.map((n) => ({
      id: n.id,
      label: (n.labels || []).find((l) => l !== SHARED_LABEL) || SHARED_LABEL,
      title: n.props.title || n.id,
    }));

    // Only edges where BOTH endpoints are visible.
    const rawEdges = await readQuery(
      `MATCH (a:${SHARED_LABEL})-[r]->(b:${SHARED_LABEL})
       RETURN a.id AS from, b.id AS to, type(r) AS rel`,
      {},
      (r) => ({ from: r.get('from'), to: r.get('to'), relation: r.get('rel') })
    );
    const edges = rawEdges.filter((e) => visibleIds.has(e.from) && visibleIds.has(e.to));

    await writeAudit({
      userEmail: req.user.email,
      action: 'graph',
      grantedIds: [],
      deniedCount: rawNodes.length - visible.length,
      metadata: { visibleNodes: nodes.length, totalNodes: rawNodes.length },
    });

    res.json({
      nodes,
      edges,
      stats: { visible: nodes.length, hidden: rawNodes.length - visible.length, total: rawNodes.length },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
