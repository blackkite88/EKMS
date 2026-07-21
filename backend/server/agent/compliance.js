// The compliance agent — maps regulatory requirements against equipment
// inspection/test records and detects gaps (overdue mandated activities).
//
// Detection is deterministic where possible (interval math against inspection
// dates), which makes it measurable ("N gaps detected") for the eval harness,
// then the LLM narrates the findings with citations. The regulation intervals
// are read from the regulation documents' stated compliance basis.
import { getSession } from '../config/neo4j.js';
import { canAccess } from '../auth/policy.js';
import { SHARED_LABEL } from '../graph/schema.js';
import { hybridSearch } from '../retrieval/hybrid.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('compliance');

// Known regulatory intervals (days) — the "compliance basis" stated in the
// regulation documents. In a fuller system these would be parsed from the docs;
// here they are the ground truth the demo dataset is built against.
const REGULATION_INTERVALS = {
  'OISD-STD-106': { days: 90, activity: 'vibration monitoring', applies: 'rotating equipment in hydrocarbon service' },
  'PESO-SMPV-2016': { days: 1460, activity: 'hydrostatic test', applies: 'pressure vessels' },
  'OISD-STD-130': { days: 730, activity: 'thickness monitoring', applies: 'heat exchangers' },
  'OISD-STD-105': { days: 1460, activity: 'internal inspection', applies: 'pressure vessels' },
};

// Reference date for the demo (the "today" the plant is evaluated against).
// Passed in so results are deterministic and testable.
const DEFAULT_AS_OF = '2025-03-31';

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / (1000 * 60 * 60 * 24));
}

function nodeAccess(props) {
  return {
    department: props.access_department || 'operations',
    unit: props.access_unit || 'all',
    min_clearance: typeof props.access_min_clearance === 'number' ? props.access_min_clearance : (props.access_min_clearance?.toNumber?.() ?? 1),
    sensitivity: props.access_sensitivity || 'public',
  };
}
function num(v) { return typeof v === 'number' ? v : v?.toNumber?.() ?? v; }

// Find the most recent inspection of a given activity for each equipment, then
// compare against the regulation interval. Returns an array of gap objects.
export async function detectComplianceGaps(user, asOf = DEFAULT_AS_OF) {
  const session = getSession();
  try {
    // Pull equipment + the regulations that govern them + the inspections done
    // specifically UNDER that regulation (matched by the inspection's
    // `regulation` property), so we compare like-for-like.
    const result = await session.run(
      `MATCH (reg:${SHARED_LABEL}:Regulation)-[:GOVERNS]->(eq:${SHARED_LABEL}:Equipment)
       OPTIONAL MATCH (ins:${SHARED_LABEL}:Inspection)-[:INSPECTED]->(eq)
         WHERE ins.regulation = reg.id
       RETURN reg.id AS reg, eq.id AS equipment, properties(eq) AS eqProps,
              collect(ins.date) AS inspectionDates`
    );

    const gaps = [];
    for (const rec of result.records) {
      const regId = rec.get('reg');
      const interval = REGULATION_INTERVALS[regId];
      if (!interval) continue; // only reason about regulations we have intervals for

      const equipment = rec.get('equipment');
      const eqProps = rec.get('eqProps');
      // ABAC: skip equipment the user can't see.
      if (!canAccess(user, nodeAccess(eqProps))) continue;

      const dates = rec.get('inspectionDates').filter(Boolean).sort();
      const lastDate = dates.length ? dates[dates.length - 1] : null;

      if (!lastDate) {
        gaps.push({ regulation: regId, equipment, activity: interval.activity, status: 'no record', last: null, overdue_days: null });
        continue;
      }
      const age = daysBetween(lastDate, asOf);
      if (age > interval.days) {
        gaps.push({
          regulation: regId,
          equipment,
          activity: interval.activity,
          status: 'overdue',
          last: lastDate,
          interval_days: interval.days,
          overdue_days: age - interval.days,
        });
      }
    }
    log.info(`Compliance scan: ${gaps.length} gaps detected (as of ${asOf})`);
    return gaps;
  } finally {
    await session.close();
  }
}

export const COMPLIANCE_SYSTEM_PROMPT = `You are AssetBrain performing a regulatory compliance assessment for a process plant.
You are given a list of detected compliance gaps (equipment overdue on a mandated regulatory activity) plus supporting documents.

Summarize the compliance status clearly:
- State the total number of gaps found.
- For each gap: the equipment, the regulation violated, the required activity, and how overdue it is.
- Recommend the corrective action (schedule the overdue activity).

RULES:
- Use ONLY the provided gap data and evidence. Do not invent equipment or dates.
- Cite the regulation and equipment: [REGULATION | OISD-STD-106], [EQUIPMENT | P-210].
- Be precise and audit-ready.`;

export function buildComplianceContext(gaps, retrieval) {
  const gapLines = gaps.length
    ? gaps.map((g) => `- ${g.equipment}: ${g.activity} per ${g.regulation} — ${g.status}${g.overdue_days != null ? ` (overdue by ${g.overdue_days} days; last done ${g.last})` : ''}`).join('\n')
    : 'No compliance gaps detected — all mandated activities are within their required intervals.';
  const evidence = (retrieval.results || [])
    .slice(0, 6)
    .map((r) => `[${(r.metadata.source_type || 'doc').toUpperCase()} | ${r.metadata.source_id}] ${r.content.slice(0, 300)}`)
    .join('\n');
  return `DETECTED COMPLIANCE GAPS (${gaps.length}):\n${gapLines}\n\nSUPPORTING REGULATORY CONTEXT:\n${evidence}`;
}

export async function gatherCompliance(query, user, asOf) {
  const gaps = await detectComplianceGaps(user, asOf);
  const retrieval = await hybridSearch(query || 'regulatory compliance inspection requirements', user, { topK: 8 });
  return { gaps, retrieval };
}
