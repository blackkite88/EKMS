import { getGroqClient, GROQ_MODEL } from '../config/groq.js';
import { search } from '../retrieval/retriever.js';
import { SYSTEM_PROMPT, buildContextBlock } from './prompts.js';
import { TOOLS } from './tools.js';

function sendSSE(res, data) {
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

function mergeToolCallDelta(accumulated, delta) {
  if (!delta.tool_calls) return;

  for (const tc of delta.tool_calls) {
    const idx = tc.index;
    if (!accumulated[idx]) {
      accumulated[idx] = { id: '', type: 'function', function: { name: '', arguments: '' } };
    }
    if (tc.id) accumulated[idx].id = tc.id;
    if (tc.function?.name) accumulated[idx].function.name += tc.function.name;
    if (tc.function?.arguments) accumulated[idx].function.arguments += tc.function.arguments;
  }
}

export async function queryStream(query, res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  try {
    const nodes = await search(query);

    sendSSE(res, {
      type: 'sources',
      sources: nodes.map((n) => ({
        source_type: n.metadata.source_type,
        source_id: n.metadata.source_id,
        filename: n.metadata.filename,
        score: n.score,
      })),
    });

    const contextBlock = buildContextBlock(nodes);

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'user',
        content: `RETRIEVED CONTEXT:\n${contextBlock}\n\nUSER QUESTION:\n${query}`,
      },
    ];

    const groq = getGroqClient();

    const stream = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages,
      tools: TOOLS,
      tool_choice: 'auto',
      stream: true,
      temperature: 0.2,
      max_tokens: 2048,
    });

    const accumulatedToolCalls = {};
    let hasToolCalls = false;

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta;
      if (!delta) continue;

      if (delta.content) {
        sendSSE(res, { type: 'text', text: delta.content });
      }

      if (delta.tool_calls && delta.tool_calls.length > 0) {
        hasToolCalls = true;
        mergeToolCallDelta(accumulatedToolCalls, delta);
      }
    }

    if (hasToolCalls) {
      const toolCallList = Object.values(accumulatedToolCalls);
      for (const tc of toolCallList) {
        let parsedArgs = {};
        try {
          parsedArgs = JSON.parse(tc.function.arguments);
        } catch {
          parsedArgs = { raw: tc.function.arguments };
        }
        sendSSE(res, {
          type: 'tool_result',
          name: tc.function.name,
          arguments: parsedArgs,
        });
      }
    }

    sendSSE(res, { type: 'done' });
    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('[agent] Stream error:', err.message);
    sendSSE(res, { type: 'error', message: err.message });
    res.write('data: [DONE]\n\n');
    res.end();
  }
}
