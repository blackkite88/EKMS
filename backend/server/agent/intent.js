// LLM-based intent classification. Routes each query to the right capability.
// Uses a fast, cheap Groq call (robust to how people naturally phrase things),
// with a keyword heuristic as an instant fallback if the LLM call fails.
import { getGroqClient, GROQ_MODEL } from '../config/groq.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('intent');

export const INTENTS = {
  CAUSAL: 'causal', // "why", "what led to" — use GraphRAG traversal
  ACTION: 'action', // "draft", "create", "file", "send" — use a tool
  FACTUAL: 'factual', // "who", "what", "when", "summarize" — use retrieval
};

const CLASSIFY_PROMPT = `Classify the user's request into exactly one intent:
- "causal": asks WHY something happened, what caused/led to/blocked something, or the chain of events/decisions behind something.
- "action": asks to DO something — draft/write an email, create/file a ticket, extract action items, or generate a report.
- "factual": asks who/what/when/where, or to summarize/explain existing information.
Respond with STRICT JSON: {"intent":"causal|action|factual"}. No prose.`;

function heuristic(query) {
  const q = query.toLowerCase();
  if (/\b(draft|write|compose|create|file|open|send|generate a report|extract)\b/.test(q)) return INTENTS.ACTION;
  if (/\b(why|what led to|what caused|chain of|root cause|because|led to the)\b/.test(q)) return INTENTS.CAUSAL;
  return INTENTS.FACTUAL;
}

export async function classifyIntent(query) {
  try {
    const client = getGroqClient();
    const res = await client.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: CLASSIFY_PROMPT },
        { role: 'user', content: query },
      ],
      temperature: 0,
      max_tokens: 20,
      response_format: { type: 'json_object' },
    });
    const parsed = JSON.parse(res.choices[0]?.message?.content || '{}');
    if (Object.values(INTENTS).includes(parsed.intent)) return parsed.intent;
    return heuristic(query);
  } catch (err) {
    log.warn(`Intent LLM failed, using heuristic: ${err.message}`);
    return heuristic(query);
  }
}
