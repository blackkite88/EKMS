// The orchestrator — the brain on top. For each query it:
//   1. streams auth context (who is reasoning)
//   2. classifies intent (causal / factual / action)
//   3. runs the knowledge-graph traversal (paced, observable) when useful
//   4. runs hybrid retrieval (ABAC-filtered) for evidence text
//   5. assembles context (graph reasoning + evidence + memory)
//   6. calls Groq with streaming + tools; streams tokens, highlights citations
//   7. executes any tool calls (MCP) and streams their results
//   8. records the turn to memory and writes the audit log
import { getGroqClient, GROQ_MODEL } from '../config/groq.js';
import { classifyIntent, INTENTS } from './intent.js';
import { traverse } from '../graph/traversal.js';
import { hybridSearch } from '../retrieval/hybrid.js';
import { buildRetrievalContext, buildGraphContext, buildUserMessage, SYSTEM_PROMPT } from './prompts.js';
import { buildMemoryContext, recordTurn } from './memory.js';
import { TOOLS } from '../mcp/tools.js';
import { executeTool } from '../mcp/client.js';
import { writeAudit } from '../middleware/auditLogger.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('orchestrator');
const CITATION_RE = /\[(EQUIPMENT|WO|INSPECTION|FAILURE|MANUAL|PROCEDURE|REGULATION|LOG)\s*\|\s*([^\]]+)\]/gi;

function accumulateToolDeltas(store, delta) {
  if (!delta.tool_calls) return;
  for (const tc of delta.tool_calls) {
    const idx = tc.index;
    if (!store[idx]) store[idx] = { id: '', type: 'function', function: { name: '', arguments: '' } };
    if (tc.id) store[idx].id = tc.id;
    if (tc.function?.name) store[idx].function.name += tc.function.name;
    if (tc.function?.arguments) store[idx].function.arguments += tc.function.arguments;
  }
}

// Scan streamed text for complete citations and emit citation_highlight events
// (only once per node id).
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

export async function runQuery({ query, user, sessionId, stream }) {
  stream.authContext(user);

  // 1. Intent
  const intent = await classifyIntent(query);
  stream.queryReceived(query, intent);
  log.info(`Query from ${user.email} classified as ${intent}: "${query.slice(0, 60)}"`);

  // 2. Graph traversal (for causal + factual; skipped for pure actions to keep
  //    action latency low, though actions still get retrieval evidence).
  let graph = { nodes: [], edges: [], blockedCount: 0, citations: [] };
  if (intent === INTENTS.CAUSAL || intent === INTENTS.FACTUAL) {
    try {
      graph = await traverse(query, user, (ev) => stream.sendPaced(ev));
    } catch (err) {
      log.warn(`Traversal failed (continuing with retrieval only): ${err.message}`);
    }
  }

  // 3. Hybrid retrieval (ABAC-filtered evidence)
  let retrieval = { results: [], deniedCount: 0, candidateCount: 0 };
  try {
    retrieval = await hybridSearch(query, user);
  } catch (err) {
    log.error(`Retrieval failed: ${err.message}`);
  }
  stream.contextAssembled(retrieval.results.length);

  // 4. Assemble context
  const graphContext = buildGraphContext(graph);
  const retrievalContext = buildRetrievalContext(retrieval.results);
  const memoryContext = await buildMemoryContext(sessionId);
  const userMessage = buildUserMessage({ query, graphContext, retrievalContext, memoryContext });

  // 5. Call Groq with streaming + tools
  const client = getGroqClient();
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: userMessage },
  ];

  let answerText = '';
  const toolStore = {};
  let hadToolCalls = false;
  const emittedCitations = new Set();

  try {
    const completion = await client.chat.completions.create({
      model: GROQ_MODEL,
      messages,
      tools: TOOLS,
      tool_choice: 'auto',
      stream: true,
      temperature: 0.2,
      max_tokens: 1600,
    });

    for await (const chunk of completion) {
      const delta = chunk.choices[0]?.delta;
      if (!delta) continue;
      if (delta.content) {
        answerText += delta.content;
        stream.text(delta.content);
        emitCitations(stream, answerText, emittedCitations);
      }
      if (delta.tool_calls?.length) {
        hadToolCalls = true;
        accumulateToolDeltas(toolStore, delta);
      }
    }
  } catch (err) {
    log.error(`LLM streaming failed: ${err.message}`);
    stream.error(`Model error: ${err.message}`);
  }

  // 6. Execute tool calls (MCP)
  if (hadToolCalls) {
    for (const tc of Object.values(toolStore)) {
      let args = {};
      try { args = JSON.parse(tc.function.arguments || '{}'); } catch { args = { raw: tc.function.arguments }; }
      stream.toolCall(tc.function.name, args);
      try {
        const { result, mode } = await executeTool(tc.function.name, args, user);
        stream.toolResult(tc.function.name, result, mode);
      } catch (err) {
        stream.toolResult(tc.function.name, { error: err.message }, 'error');
      }
    }
  }

  // 7. Memory + audit
  await recordTurn(sessionId, user.email, 'user', query);
  if (answerText) await recordTurn(sessionId, user.email, 'assistant', answerText);
  await writeAudit({
    userEmail: user.email,
    action: 'query',
    query,
    grantedIds: retrieval.results.map((r) => r.metadata?.source_id).filter(Boolean),
    deniedCount: retrieval.deniedCount + graph.blockedCount,
    metadata: { intent, graphNodes: graph.nodes.length },
  });

  stream.done();
}
