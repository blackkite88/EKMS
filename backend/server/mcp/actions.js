// The four industrial actions the assistant can perform. Each one is REAL:
// it writes to Postgres (work_orders / notifications / action_reports) so the
// artifact actually exists and shows up in its section of the app. Access
// attributes are derived from the target equipment/context so the output is
// ABAC-scoped like any document.
import { query } from '../config/postgres.js';
import { getGroqClient, GROQ_MODEL } from '../config/groq.js';
import { getSession } from '../config/neo4j.js';
import { SHARED_LABEL } from '../graph/schema.js';
import { gatherRca, buildRcaContext, RCA_SYSTEM_PROMPT } from '../agent/rca.js';
import { gatherCompliance, buildComplianceContext, COMPLIANCE_SYSTEM_PROMPT } from '../agent/compliance.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('actions');

function num(v) { return typeof v === 'number' ? v : v?.toNumber?.() ?? v; }

// Look up an equipment node's access attributes so the action output inherits
// the right ABAC scope; defaults to maintenance/internal if unknown.
async function equipmentAccess(equipmentId) {
  if (!equipmentId) return { department: 'maintenance', unit: 'all', min_clearance: 2, sensitivity: 'internal' };
  const session = getSession();
  try {
    const r = await session.run(`MATCH (n:${SHARED_LABEL} {id:$id}) RETURN properties(n) AS p`, { id: equipmentId });
    const p = r.records[0]?.get('p') || {};
    return {
      department: p.access_department || 'maintenance',
      unit: p.access_unit || 'all',
      min_clearance: num(p.access_min_clearance) ?? 2,
      sensitivity: p.access_sensitivity || 'internal',
    };
  } finally {
    await session.close();
  }
}

function extractEquipmentTag(text = '') {
  const m = String(text).match(/\b([A-Z]{1,2}-\d{2,4})\b/);
  return m ? m[1] : null;
}

// Resolve WHO should be notified about a piece of equipment: the person who
// owns/executed its work orders (preferring one with a login email so it lands
// in a real inbox), plus the responsible department. Falls back to the
// equipment's access-department when no specific person is known.
export async function resolveNotificationTarget(equipmentId) {
  const access = await equipmentAccess(equipmentId);
  const fallback = { recipient: access.department, person: null, department: access.department, title: null, specialization: null };
  if (!equipmentId) return fallback;
  const session = getSession();
  try {
    // A person linked to this equipment via the work orders they executed.
    const r = await session.run(
      `MATCH (p:Person)<-[:EXECUTED_BY]-(:WorkOrder)-[:PERFORMED_ON]->(e {id:$id})
       RETURN p.name AS name, p.email AS email, p.department AS dept,
              p.person_title AS title, p.specialization AS spec
       ORDER BY (p.email IS NOT NULL) DESC
       LIMIT 1`,
      { id: equipmentId }
    );
    const rec = r.records[0];
    if (rec) {
      const email = rec.get('email');
      const name = rec.get('name');
      const dept = rec.get('dept') || access.department;
      // Prefer a real email inbox; otherwise target the person's name/department.
      return { recipient: email || dept, person: name, department: dept, title: rec.get('title'), specialization: rec.get('spec') };
    }
  } catch (err) {
    log.warn(`resolveNotificationTarget failed for ${equipmentId}: ${err.message}`);
  } finally {
    await session.close();
  }
  return fallback;
}

// ── 1. create_work_order ────────────────────────────────────────────
export async function createWorkOrder(args, user) {
  const target = args.target || extractEquipmentTag(args.query || args.title || '');
  const access = await equipmentAccess(target);
  const num_ = `WO-${3000 + Math.floor(Math.random() * 6000)}`;
  const title = args.title || (target ? `Maintenance action for ${target}` : 'Maintenance work order');
  const description = args.description || args.query || 'Created via AssetBrain assistant.';
  const priority = ['low', 'medium', 'high', 'critical'].includes(args.priority) ? args.priority : 'medium';

  // Assign to a named person when one is explicitly requested or clearly owns
  // the equipment; otherwise the responsible department.
  const owner = await resolveNotificationTarget(target);
  const assignedTo = args.assigned_to || owner.person || owner.department || 'maintenance';

  const { rows } = await query(
    `INSERT INTO work_orders (wo_number, title, description, equipment_id, priority, status, created_by, assigned_to, access_department, access_unit, access_min_clearance)
     VALUES ($1,$2,$3,$4,$5,'open',$6,$7,$8,$9,$10) RETURNING wo_number, status`,
    [num_, title, description, target, priority, user?.email, assignedTo, access.department, access.unit, access.min_clearance]
  );
  return { mode: 'live', result: { wo_number: rows[0].wo_number, title, equipment_id: target, priority, status: rows[0].status, assigned_to: assignedTo } };
}

// ── 2. draft_notification ───────────────────────────────────────────
export async function draftNotification(args, user) {
  const target = args.target || extractEquipmentTag(args.query || '');
  // Route to the right person/team unless the caller named a recipient.
  const resolved = args.recipient
    ? { recipient: args.recipient, person: null, department: args.recipient }
    : await resolveNotificationTarget(target);
  const title = args.title || (target ? `Attention needed: ${target}` : 'Plant notification');
  const body = args.body || args.query || 'Notification from AssetBrain.';

  await query(
    `INSERT INTO notifications (recipient, sender, title, body, related_to) VALUES ($1,$2,$3,$4,$5)`,
    [resolved.recipient, user?.email, title, body, target]
  );
  return {
    mode: 'live',
    result: {
      recipient: resolved.recipient,
      recipient_name: resolved.person,
      department: resolved.department,
      title,
      related_to: target,
      status: 'delivered',
    },
  };
}

// ── 3. generate_rca_report ──────────────────────────────────────────
export async function generateRcaReport(args, user) {
  const target = args.target || extractEquipmentTag(args.query || '');
  const q = args.query || (target ? `root cause of ${target} failure` : 'root cause analysis');
  const { graph, retrieval } = await gatherRca(q, user, () => {});
  const ctx = buildRcaContext(graph, retrieval);

  const client = getGroqClient();
  const res = await client.chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      { role: 'system', content: RCA_SYSTEM_PROMPT + '\nReturn the RCA as STRICT JSON: {"sections":[{"heading":"Immediate Cause","content":"..."},...]}' },
      { role: 'user', content: `${ctx}\n\nFAILURE: ${q}\nReturn JSON only.` },
    ],
    temperature: 0.1,
    max_tokens: 1500,
    response_format: { type: 'json_object' },
  });
  let content;
  try { content = JSON.parse(res.choices[0]?.message?.content || '{}'); }
  catch { content = { sections: [{ heading: 'Analysis', content: res.choices[0]?.message?.content || '' }] }; }

  const access = await equipmentAccess(target);
  const title = target ? `RCA Report — ${target}` : 'RCA Report';
  const { rows } = await query(
    `INSERT INTO action_reports (report_type, title, content, equipment_id, created_by, access_department, access_unit, access_min_clearance, access_sensitivity)
     VALUES ('rca',$1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
    [title, JSON.stringify(content), target, user?.email, access.department, access.unit, access.min_clearance, access.sensitivity]
  );
  return { mode: 'live', result: { report_id: rows[0].id, type: 'rca', title, equipment_id: target, sections: content.sections?.length || 0 } };
}

// ── 4. generate_compliance_report ───────────────────────────────────
export async function generateComplianceReport(args, user) {
  const { gaps, retrieval } = await gatherCompliance(args.query || 'compliance status', user);
  const ctx = buildComplianceContext(gaps, retrieval);

  const client = getGroqClient();
  const res = await client.chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      { role: 'system', content: COMPLIANCE_SYSTEM_PROMPT + '\nReturn the report as STRICT JSON: {"summary":"...","gaps":[{"equipment":"...","regulation":"...","finding":"...","action":"..."}]}' },
      { role: 'user', content: `${ctx}\nReturn JSON only.` },
    ],
    temperature: 0.1,
    max_tokens: 1500,
    response_format: { type: 'json_object' },
  });
  let content;
  try { content = JSON.parse(res.choices[0]?.message?.content || '{}'); }
  catch { content = { summary: res.choices[0]?.message?.content || '', gaps }; }
  content.gap_count = gaps.length;

  const { rows } = await query(
    `INSERT INTO action_reports (report_type, title, content, created_by, access_department, access_unit, access_min_clearance, access_sensitivity)
     VALUES ('compliance',$1,$2,$3,'compliance','all',4,'internal') RETURNING id`,
    [`Compliance Evidence Report (${gaps.length} gaps)`, JSON.stringify(content), user?.email]
  );
  return { mode: 'live', result: { report_id: rows[0].id, type: 'compliance', title: `Compliance Report`, gap_count: gaps.length } };
}
