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

// ── 1. create_work_order ────────────────────────────────────────────
export async function createWorkOrder(args, user) {
  const target = args.target || extractEquipmentTag(args.query || args.title || '');
  const access = await equipmentAccess(target);
  const num_ = `WO-${3000 + Math.floor(Math.random() * 6000)}`;
  const title = args.title || (target ? `Maintenance action for ${target}` : 'Maintenance work order');
  const description = args.description || args.query || 'Created via AssetBrain assistant.';
  const priority = ['low', 'medium', 'high', 'critical'].includes(args.priority) ? args.priority : 'medium';

  const { rows } = await query(
    `INSERT INTO work_orders (wo_number, title, description, equipment_id, priority, status, created_by, assigned_to, access_department, access_unit, access_min_clearance)
     VALUES ($1,$2,$3,$4,$5,'open',$6,$7,$8,$9,$10) RETURNING wo_number, status`,
    [num_, title, description, target, priority, user?.email, 'maintenance', access.department, access.unit, access.min_clearance]
  );
  return { mode: 'live', result: { wo_number: rows[0].wo_number, title, equipment_id: target, priority, status: rows[0].status } };
}

// ── 2. draft_notification ───────────────────────────────────────────
export async function draftNotification(args, user) {
  const target = args.target || extractEquipmentTag(args.query || '');
  const recipient = args.recipient || 'engineering'; // role-based by default
  const title = args.title || (target ? `Attention needed: ${target}` : 'Plant notification');
  const body = args.body || args.query || 'Notification from AssetBrain.';

  await query(
    `INSERT INTO notifications (recipient, sender, title, body, related_to) VALUES ($1,$2,$3,$4,$5)`,
    [recipient, user?.email, title, body, target]
  );
  return { mode: 'live', result: { recipient, title, related_to: target, status: 'delivered' } };
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
