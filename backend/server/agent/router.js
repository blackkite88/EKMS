// The front-door router. ONE Groq call per message that decides what kind of
// message this is and, when needed, rewrites a vague follow-up into a self-
// contained query BEFORE retrieval/graph run — so a pronoun like "this" never
// misleads the document search. Consolidates the old intent classifier.
//
// Returns one of:
//   { type:"conversation", reply }          → greeting/chit-chat, no search
//   { type:"rca", query }                    → root-cause question → RCA agent
//   { type:"compliance", query }             → compliance/regulatory question
//   { type:"knowledge", query, intent }      → normal cited answer (factual/causal)
//   { type:"action", action, target, query } → perform a tool action
//
// `query` is always the search-ready form (rewritten if it was a follow-up).
// A heuristic fallback guarantees a safe result if the LLM call fails.
import { getGroqClient, GROQ_MODEL } from '../config/groq.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('router');

export const ROUTE_TYPES = ['conversation', 'rca', 'compliance', 'knowledge', 'action'];
export const ACTIONS = ['generate_rca_report', 'create_work_order', 'generate_compliance_report', 'draft_notification'];

const ROUTER_PROMPT = `You are the router for AssetBrain, an industrial knowledge assistant for a process plant.
Given the recent conversation and the user's new message, decide how to handle it. Return STRICT JSON.

Route types:
- "conversation": greetings, thanks, small talk, or questions about what you can do. Provide a short friendly "reply". No document search.
- "rca": the user asks WHY a piece of equipment failed, the root cause of a failure, or the chain of events behind a breakdown.
- "compliance": the user asks about regulatory compliance, inspection due dates, compliance gaps, or audit readiness (OISD/PESO/Factory Act).
- "action": the user issues a COMMAND to DO something NOW — generate an RCA report, create a work order, generate a compliance report, or notify/alert a team. Set "action" to one of: generate_rca_report, create_work_order, generate_compliance_report, draft_notification. Set "target" to the equipment tag or subject if identifiable. IMPORTANT: only route to "action" for imperative commands ("create…", "generate…", "notify…", "raise…"). A QUESTION about whether something was done or its status ("is he given the work order?", "did that get created?", "what's the status?") is NOT an action — route it to "knowledge" and answer from the conversation/records.
- "knowledge": any other question about equipment, maintenance history, inspections, procedures, manuals (factual lookup).

CRITICAL — resolve references: if the new message refers to earlier context (e.g. "this", "that pump", "it", "the same"), REWRITE it into a fully self-contained "query" using the conversation. Example: after discussing P-101's failure, "who worked on it?" → "who worked on pump P-101".

Return JSON:
{"type":"conversation","reply":"..."}  OR
{"type":"rca","query":"<self-contained>"}  OR
{"type":"compliance","query":"<self-contained>"}  OR
{"type":"action","action":"<action_name>","target":"<equipment or subject>","query":"<self-contained>"}  OR
{"type":"knowledge","query":"<self-contained>","intent":"factual|causal"}
No prose outside the JSON.`;

function heuristic(message) {
  const q = message.toLowerCase().trim();
  if (/^(hi|hello|hey|thanks|thank you|good morning|good afternoon|who are you|what can you do|help)\b/.test(q)) {
    return { type: 'conversation', reply: "Hi — I'm AssetBrain, your plant knowledge assistant. Ask me about equipment, maintenance history, why something failed, or compliance status." };
  }
  if (/\b(generate|create|file|open|raise|draft|notify|alert)\b.*\b(report|work order|ticket|rca|notification|team)\b/.test(q)) {
    if (/rca|root cause/.test(q)) return { type: 'action', action: 'generate_rca_report', query: message };
    if (/work order|ticket/.test(q)) return { type: 'action', action: 'create_work_order', query: message };
    if (/compliance|audit/.test(q)) return { type: 'action', action: 'generate_compliance_report', query: message };
    if (/notify|alert|notification/.test(q)) return { type: 'action', action: 'draft_notification', query: message };
  }
  if (/\bcompliance|overdue|regulat|oisd|peso|factory act|audit|inspection due\b/.test(q)) return { type: 'compliance', query: message };
  if (/\bwhy\b|root cause|what caused|chain of|led to (the )?failure|why did/.test(q)) return { type: 'rca', query: message };
  return { type: 'knowledge', query: message, intent: 'factual' };
}

export async function route(message, memoryContext = '') {
  try {
    const client = getGroqClient();
    const userContent = memoryContext
      ? `RECENT CONVERSATION:\n${memoryContext}\n\nNEW MESSAGE: ${message}`
      : `NEW MESSAGE: ${message}`;
    const res = await client.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: ROUTER_PROMPT },
        { role: 'user', content: userContent },
      ],
      temperature: 0,
      max_tokens: 200,
      response_format: { type: 'json_object' },
    });
    const parsed = JSON.parse(res.choices[0]?.message?.content || '{}');
    if (!ROUTE_TYPES.includes(parsed.type)) return heuristic(message);

    // Validate/normalize each shape; fall back to a safe knowledge route on gaps.
    if (parsed.type === 'conversation') {
      return { type: 'conversation', reply: parsed.reply || "How can I help with the plant today?" };
    }
    if (parsed.type === 'action') {
      if (!ACTIONS.includes(parsed.action)) return { type: 'knowledge', query: message, intent: 'factual' };
      return { type: 'action', action: parsed.action, target: parsed.target || null, query: parsed.query || message };
    }
    // rca / compliance / knowledge — need a query
    const query = parsed.query || message;
    if (parsed.type === 'knowledge') return { type: 'knowledge', query, intent: parsed.intent === 'causal' ? 'causal' : 'factual' };
    return { type: parsed.type, query };
  } catch (err) {
    log.warn(`Router LLM failed, using heuristic: ${err.message}`);
    return heuristic(message);
  }
}
