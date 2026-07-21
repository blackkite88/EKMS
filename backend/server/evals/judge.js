// LLM-as-judge scoring for eval cases. Scores answer correctness against
// expected key facts and checks groundedness. Access-correctness and citation
// presence are checked deterministically (not by the LLM) since they're
// objective.
import { getGroqClient, GROQ_MODEL } from '../config/groq.js';

const REFUSAL_MARKERS = [
  "don't have enough information",
  'above your access level',
  'not authorized',
  'restricted',
  'do not have access',
];

export function looksLikeRefusal(text) {
  const t = (text || '').toLowerCase();
  return REFUSAL_MARKERS.some((m) => t.includes(m));
}

export function hasCitation(text) {
  return /\[(EQUIPMENT|WO|INSPECTION|FAILURE|MANUAL|PROCEDURE|REGULATION|LOG)\s*\|/i.test(text || '');
}

// Deterministic access-correctness check.
export function scoreAccess(expect, captured) {
  const answer = captured.text || '';
  if (expect.access === 'denied') {
    const refused = looksLikeRefusal(answer) || answer.trim().length === 0;
    return { pass: refused, detail: refused ? 'correctly denied' : 'LEAKED restricted content' };
  }
  // full
  const substantive = answer.trim().length > 40 && !looksLikeRefusal(answer);
  return { pass: substantive, detail: substantive ? 'answered' : 'unexpectedly refused/empty' };
}

// LLM-scored correctness (0-10) against key facts.
export async function scoreCorrectness(question, expect, answer) {
  if (!expect.keyFacts || expect.keyFacts.length === 0) return null;
  const client = getGroqClient();
  const prompt = `You are grading an answer for factual correctness.
Question: ${question}
Expected key facts that should appear: ${expect.keyFacts.join(', ')}
Answer: ${answer}
Score 0-10 for how well the answer covers the expected key facts and stays grounded.
Respond STRICT JSON: {"score": <0-10>, "reason": "<short>"}. No prose.`;
  try {
    const res = await client.chat.completions.create({
      model: GROQ_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
      max_tokens: 120,
      response_format: { type: 'json_object' },
    });
    const parsed = JSON.parse(res.choices[0]?.message?.content || '{}');
    return { score: parsed.score ?? null, reason: parsed.reason || '' };
  } catch (err) {
    return { score: null, reason: `judge error: ${err.message}` };
  }
}

// Full per-case scoring.
export async function judgeCase(evalCase, captured) {
  const answer = captured.text || '';
  const toolFired =
    evalCase.expect.toolExpected && captured.tools.some((t) => t.name === evalCase.expect.toolExpected);

  // For action cases, a successful tool call IS a successful response even with
  // no prose — so treat a fired tool as satisfying the access/answered check.
  const access = toolFired
    ? { pass: true, detail: 'action performed' }
    : scoreAccess(evalCase.expect, captured);

  const checks = { access };

  if (evalCase.expect.access === 'full') {
    if (evalCase.expect.mustCite) {
      checks.citation = { pass: hasCitation(answer), detail: hasCitation(answer) ? 'cited' : 'no citation' };
    }
    if (evalCase.expect.toolExpected) {
      checks.tool = { pass: Boolean(toolFired), detail: toolFired ? `${evalCase.expect.toolExpected} fired` : 'tool not triggered' };
    }
    if (evalCase.expect.keyFacts) {
      checks.correctness = await scoreCorrectness(evalCase.question, evalCase.expect, answer);
    }
  }

  const gates = [checks.access?.pass, checks.citation?.pass, checks.tool?.pass].filter(
    (v) => v !== undefined
  );
  const pass = gates.every(Boolean);

  return { id: evalCase.id, pass, checks };
}
