// The orchestrator — the brain on top. For each message it:
//   1. streams auth context (who is reasoning)
//   2. ROUTES via one combined router call (classify + rewrite + reply)
//   3. dispatches to the right path:
//        conversation → reply directly, no search
//        rca          → deep causal traversal + RCA-structured answer
//        compliance   → gap detection + compliance summary
//        knowledge    → graph traversal + retrieval + cited answer
//        action       → perform a governed tool action (Phase 5 adds permissions)
//   4. streams tokens + citation highlights + confidence + time-to-answer
//   5. records memory + writes the audit log
import { getGroqClient, GROQ_MODEL } from '../config/groq.js';
import { route } from './router.js';
import { traverse, listPeople } from '../graph/traversal.js';
import { hybridSearch } from '../retrieval/hybrid.js';
import { buildRetrievalContext, buildGraphContext, buildUserMessage, SYSTEM_PROMPT } from './prompts.js';
import { RCA_SYSTEM_PROMPT, buildRcaContext, gatherRca } from './rca.js';
import { COMPLIANCE_SYSTEM_PROMPT, buildComplianceContext, gatherCompliance, detectComplianceGaps } from './compliance.js';
import { buildMemoryContext, recordTurn } from './memory.js';
import { canPerform } from '../auth/action-policy.js';
import { writeAudit } from '../middleware/auditLogger.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('orchestrator');
const CITATION_RE = /\[(EQUIPMENT|WO|INSPECTION|FAILURE|MANUAL|PROCEDURE|REGULATION|LOG)\s*\|\s*([^\]]+)\]/gi;

// ── helpers ─────────────────────────────────────────────────────────

function emitCitations(stream, buffer, alreadyEmitted) {
  let match;
  CITATION_RE.lastIndex = 0;
  while ((match = CITATION_RE.exec(buffer)) !== null) {
    const rawId = match[2].trim();
    if (!alreadyEmitted.has(rawId)) {
      alreadyEmitted.add(rawId);
      stream.citationHighlight(rawId);
    }
  }
}

// Stream a completion, emitting text + citation highlights; returns the text.
async function streamAnswer(stream, systemPrompt, userMessage, { temperature = 0.2, maxTokens = 1600 } = {}) {
  const client = getGroqClient();
  let answerText = '';
  const emitted = new Set();
  try {
    const completion = await client.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      stream: true,
      temperature,
      max_tokens: maxTokens,
    });
    for await (const chunk of completion) {
      const delta = chunk.choices[0]?.delta;
      if (delta?.content) {
        answerText += delta.content;
        stream.text(delta.content);
        emitCitations(stream, answerText, emitted);
      }
    }
  } catch (err) {
    log.error(`LLM streaming failed: ${err.message}`);
    stream.error(`Model error: ${err.message}`);
  }
  return answerText;
}

// Does the query ask to enumerate people (a roster)? e.g. "name all employees",
// "list the staff", "who is on the maintenance team".
function isRosterQuery(query) {
  const q = query.toLowerCase();
  const peopleWord = /\b(employee|employees|staff|people|personnel|team members|workforce|everyone|technicians|engineers|operators)\b/.test(q);
  const listWord = /\b(all|list|name|names|who are|everyone|every|show me the)\b/.test(q);
  const teamRoster = /\bwho (is|are|'s) (on|in) (the )?\w+ team\b/.test(q);
  return (peopleWord && listWord) || teamRoster;
}

// If the roster query names a team/department/unit, return that scope keyword.
function teamScopeOf(query) {
  const q = query.toLowerCase();
  const m = q.match(/\b(maintenance|operations|engineering|safety|inspection|management|unit-1|unit-2|qa|team-a|team-b)\b/);
  return m ? m[1] : null;
}

// True when the request references a compliance gap but doesn't say WHICH one
// (no specific equipment tag like P-101 or regulation id like OISD-STD-106).
function mentionsUnspecifiedComplianceGap(message) {
  const q = message.toLowerCase();
  if (!/\bcompliance gap/.test(q) && !/\bgap(s)?\b/.test(q)) return false;
  if (!/\bcompliance|gap|overdue|inspection|non-?complian/.test(q)) return false;
  // If they named a specific equipment tag or regulation, it's already specific.
  const hasEquip = /\b[A-Z]{1,2}-\d{2,4}\b/.test(message);
  const hasReg = /\b(OISD|PESO|FACTORY-ACT)[-A-Z0-9]*/i.test(message);
  return !hasEquip && !hasReg;
}

// Heuristic confidence from retrieval strength + graph coverage.
function confidenceOf(retrieval, graph) {
  const sources = retrieval.results?.length || 0;
  const graphNodes = graph?.nodes?.length || 0;
  let level = 'low';
  if (sources >= 5 && graphNodes >= 5) level = 'high';
  else if (sources >= 3 || graphNodes >= 3) level = 'medium';
  return { level, sourceCount: sources };
}

// A human-readable PROPOSAL — what the AI would do if the user confirms. It does
// NOT perform the action; it describes it and invites a click.
function actionProposalText(action, target, message) {
  const t = target ? ` for **${target}**` : '';
  switch (action) {
    case 'create_work_order':
      return `I can raise a work order${t} based on this. Review the details and click **Create Work Order** below to file it.`;
    case 'draft_notification':
      return `I can notify the relevant team${t} about this. Click **Notify Team** below to send it.`;
    case 'generate_rca_report':
      return `I can generate a formal Root Cause Analysis report${t}. Click **Generate RCA Report** below to produce it.`;
    case 'generate_compliance_report':
      return `I can compile a compliance evidence report covering the current gaps. Click **Compliance Report** below to generate it.`;
    default:
      return `I can perform that action — click the button below to confirm.`;
  }
}

// The primary proposed action first, plus a sensible companion offer.
function proposedActionSet(primary) {
  switch (primary) {
    case 'create_work_order': return ['create_work_order', 'draft_notification'];
    case 'generate_rca_report': return ['generate_rca_report', 'create_work_order'];
    case 'generate_compliance_report': return ['generate_compliance_report', 'create_work_order'];
    case 'draft_notification': return ['draft_notification'];
    default: return [primary];
  }
}

// Suggested contextual actions based on the route type + target.
function suggestedActions(routed) {
  switch (routed.type) {
    case 'rca': return ['generate_rca_report', 'create_work_order', 'draft_notification'];
    case 'compliance': return ['generate_compliance_report', 'create_work_order'];
    default: return [];
  }
}

// ── main entry ──────────────────────────────────────────────────────

export async function runQuery({ query: message, user, sessionId, stream }) {
  const startedAt = Date.now();
  stream.authContext(user);

  // 1. ROUTE (one combined call: classify + rewrite + maybe reply)
  const memoryContext = await buildMemoryContext(sessionId);
  const routed = await route(message, memoryContext);
  const searchQuery = routed.query || message;
  stream.queryReceived(searchQuery, routed.type);
  // Surface the routing decision (and any rewrite) as visible intelligence.
  stream.send({
    type: 'routing',
    decision: routed.type,
    rewritten: routed.query && routed.query !== message ? routed.query : null,
  });
  log.info(`Route=${routed.type} for ${user.email}: "${message.slice(0, 50)}"${routed.query && routed.query !== message ? ` → "${routed.query.slice(0, 50)}"` : ''}`);

  // 2a. CONVERSATION — reply directly, no search
  if (routed.type === 'conversation') {
    for (const ch of routed.reply) stream.text(ch); // stream char-ish for a live feel
    await recordTurn(sessionId, user.email, 'user', message);
    await recordTurn(sessionId, user.email, 'assistant', routed.reply);
    await writeAudit({ userEmail: user.email, action: 'conversation', query: message });
    stream.done({ elapsedMs: Date.now() - startedAt });
    return;
  }

  // 2b. ACTION — PROPOSE, don't execute. The AI explains what it would do and
  //     offers action tile(s); the action only runs when the user clicks a tile
  //     (which calls POST /actions/:action/execute). This keeps actions a
  //     deliberate, human-approved step rather than something the AI auto-fires.
  if (routed.type === 'action') {
    const perm = canPerform(user, routed.action);
    if (!perm.allowed) {
      // The user can't perform this action at all — say so, offer nothing.
      stream.text(perm.reason);
      await recordTurn(sessionId, user.email, 'user', message);
      await recordTurn(sessionId, user.email, 'assistant', perm.reason);
      await writeAudit({ userEmail: user.email, action: 'action_denied', query: message, metadata: { tool: routed.action } });
      stream.done({ elapsedMs: Date.now() - startedAt });
      return;
    }

    // Clarify vague "compliance gap" references BEFORE proposing an action.
    // If the request is about "a/one/some compliance gap" without naming which
    // (no specific regulation/equipment), show the gaps and ask which one — so
    // the action targets a real gap rather than a hand-wave.
    if (mentionsUnspecifiedComplianceGap(message)) {
      let gaps = [];
      try { gaps = await detectComplianceGaps(user); } catch (err) { log.warn(`gap detect failed: ${err.message}`); }
      if (gaps.length > 0) {
        stream.send({ type: 'compliance_gaps', count: gaps.length, gaps });
        const list = gaps.slice(0, 8).map((g, i) =>
          `${i + 1}. **${g.equipment}** — ${g.activity} (${g.regulation})${g.overdue_days != null ? `, ${g.overdue_days}d overdue` : ''}`
        ).join('\n');
        const who = routed.target ? ` for **${routed.target}**` : '';
        const clarify = `There are ${gaps.length} open compliance gaps. Which one${who} should I act on?\n\n${list}\n\nTell me which gap (by equipment or number) and I'll propose the action.`;
        stream.text(clarify);
        await recordTurn(sessionId, user.email, 'user', message);
        await recordTurn(sessionId, user.email, 'assistant', clarify);
        stream.done({ elapsedMs: Date.now() - startedAt });
        return;
      }
    }

    const proposal = actionProposalText(routed.action, routed.target, message);
    stream.text(proposal);
    // Offer the proposed action (pre-filled) plus any sensible companions.
    stream.send({
      type: 'proposed_action',
      action: routed.action,
      target: routed.target || null,
      args: { target: routed.target || null, query: searchQuery, request: message },
    });
    stream.send({ type: 'suggested_actions', actions: proposedActionSet(routed.action) });
    await recordTurn(sessionId, user.email, 'user', message);
    await recordTurn(sessionId, user.email, 'assistant', proposal);
    await writeAudit({ userEmail: user.email, action: 'action_proposed', query: message, metadata: { tool: routed.action } });
    stream.done({ elapsedMs: Date.now() - startedAt });
    return;
  }

  // 2c. RCA — deep causal traversal + structured RCA answer
  if (routed.type === 'rca') {
    let graph = { nodes: [], edges: [], blockedCount: 0 };
    let retrieval = { results: [], deniedCount: 0 };
    try {
      ({ graph, retrieval } = await gatherRca(searchQuery, user, (ev) => stream.sendPaced(ev)));
    } catch (err) {
      log.warn(`RCA gather failed: ${err.message}`);
    }
    stream.contextAssembled(retrieval.results.length);
    // An RCA needs the causal subgraph. If the graph is empty because the user's
    // access blocked the failure records (blockedCount > 0), degrade to an
    // access-limited message rather than assembling a partial RCA from whatever
    // public fragments retrieval happened to surface.
    if (graph.nodes.length === 0 && (graph.blockedCount > 0 || retrieval.deniedCount > 0)) {
      return finishEmpty(stream, sessionId, user, message, graph, retrieval, startedAt);
    }
    if (retrieval.results.length === 0 && graph.nodes.length === 0) {
      return finishEmpty(stream, sessionId, user, message, graph, retrieval, startedAt);
    }
    const ctx = buildRcaContext(graph, retrieval);
    const answer = await streamAnswer(stream, RCA_SYSTEM_PROMPT, `${ctx}\n\nFAILURE QUESTION: ${searchQuery}`, { maxTokens: 1800 });
    stream.send({ type: 'confidence', ...confidenceOf(retrieval, graph) });
    stream.send({ type: 'suggested_actions', actions: suggestedActions(routed) });
    return finish(stream, sessionId, user, message, answer, graph, retrieval, 'rca', startedAt);
  }

  // 2d. COMPLIANCE — gap detection + summary
  if (routed.type === 'compliance') {
    let gaps = [];
    let retrieval = { results: [], deniedCount: 0 };
    try {
      ({ gaps, retrieval } = await gatherCompliance(searchQuery, user));
    } catch (err) {
      log.warn(`Compliance gather failed: ${err.message}`);
    }
    stream.contextAssembled(retrieval.results.length);
    stream.send({ type: 'compliance_gaps', count: gaps.length, gaps });
    const ctx = buildComplianceContext(gaps, retrieval);
    const answer = await streamAnswer(stream, COMPLIANCE_SYSTEM_PROMPT, `${ctx}\n\nUSER QUESTION: ${searchQuery}`);
    stream.send({ type: 'confidence', level: gaps.length >= 0 ? 'high' : 'medium', sourceCount: retrieval.results.length });
    stream.send({ type: 'suggested_actions', actions: suggestedActions(routed) });
    return finish(stream, sessionId, user, message, answer, { nodes: [], edges: [], blockedCount: 0 }, retrieval, 'compliance', startedAt);
  }

  // 2e. KNOWLEDGE — graph traversal (if causal) + retrieval + cited answer
  let graph = { nodes: [], edges: [], blockedCount: 0 };
  try {
    graph = await traverse(searchQuery, user, (ev) => stream.sendPaced(ev));
  } catch (err) {
    log.warn(`Traversal failed (continuing with retrieval only): ${err.message}`);
  }

  // Roster queries ("name all employees", "who is on the maintenance team")
  // need the FULL people list, not just the vector top-K. Fetch all accessible
  // Person nodes and merge them into the graph context.
  if (isRosterQuery(searchQuery)) {
    try {
      const scope = teamScopeOf(searchQuery);
      const people = await listPeople(user, { scope });
      const existing = new Set(graph.nodes.map((n) => n.id));
      for (const p of people) if (!existing.has(p.id)) graph.nodes.push(p);
    } catch (err) {
      log.warn(`Roster augmentation failed: ${err.message}`);
    }
  }
  let retrieval = { results: [], deniedCount: 0 };
  try {
    retrieval = await hybridSearch(searchQuery, user);
  } catch (err) {
    log.error(`Retrieval failed: ${err.message}`);
  }
  stream.contextAssembled(retrieval.results.length);
  if (retrieval.results.length === 0 && graph.nodes.length === 0) {
    return finishEmpty(stream, sessionId, user, message, graph, retrieval, startedAt);
  }
  const userMessage = buildUserMessage({
    query: searchQuery,
    graphContext: buildGraphContext(graph),
    retrievalContext: buildRetrievalContext(retrieval.results),
    memoryContext,
  });
  const answer = await streamAnswer(stream, SYSTEM_PROMPT, userMessage);
  stream.send({ type: 'confidence', ...confidenceOf(retrieval, graph) });
  return finish(stream, sessionId, user, message, answer, graph, retrieval, routed.intent || 'factual', startedAt);
}

// ── finishers ───────────────────────────────────────────────────────

async function finish(stream, sessionId, user, message, answer, graph, retrieval, intent, startedAt) {
  await recordTurn(sessionId, user.email, 'user', message);
  if (answer) await recordTurn(sessionId, user.email, 'assistant', answer);
  await writeAudit({
    userEmail: user.email,
    action: 'query',
    query: message,
    grantedIds: (retrieval.results || []).map((r) => r.metadata?.source_id).filter(Boolean),
    deniedCount: (retrieval.deniedCount || 0) + (graph.blockedCount || 0),
    metadata: { intent, graphNodes: graph.nodes?.length || 0 },
  });
  stream.done({ elapsedMs: Date.now() - startedAt });
}

async function finishEmpty(stream, sessionId, user, message, graph, retrieval, startedAt) {
  const msg =
    (graph.blockedCount || 0) > 0 || (retrieval.deniedCount || 0) > 0
      ? 'Some information relevant to your question exists but is above your access level.'
      : "I don't have enough information in the knowledge base to answer that.";
  stream.text(msg);
  await recordTurn(sessionId, user.email, 'user', message);
  await recordTurn(sessionId, user.email, 'assistant', msg);
  await writeAudit({ userEmail: user.email, action: 'query', query: message, deniedCount: (retrieval.deniedCount || 0) + (graph.blockedCount || 0), metadata: { empty: true } });
  stream.done({ elapsedMs: Date.now() - startedAt });
}
