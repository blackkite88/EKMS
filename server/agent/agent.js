import { search } from '../retrieval/retriever.js';
import { getGroqClient, GROQ_MODEL } from '../config/groq.js';
import { SYSTEM_PROMPT } from './prompts.js';
import { tools } from './tools.js';

export const queryStream = async (query, res) => {
    // Configure SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
        // Retrieve top 8 nodes
        const nodes = await search(query);

        // Immediately stream sources event
        const sourcesEvent = {
            type: "sources",
            sources: nodes.map(n => n.metadata)
        };
        res.write(`data: ${JSON.stringify(sourcesEvent)}\n\n`);

        // Construct context
        let contextString = 'Retrieved Context:\n\n';
        nodes.forEach(node => {
            let sourceType = (node.metadata.source_type || 'DOC').toUpperCase();
            // Handle singularizing if needed, or just use as is (e.g. EMAILS -> EMAIL)
            if (sourceType.endsWith('S')) sourceType = sourceType.slice(0, -1);
            
            const sourceKey = `${sourceType} | ${node.metadata.source_id}`;
            contextString += `[${sourceKey}]\n${node.content}\n\n`;
        });

        const messages = [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: `${contextString}Question: ${query}` }
        ];

        const groq = getGroqClient();

        // Call Groq
        const stream = await groq.chat.completions.create({
            messages,
            model: GROQ_MODEL,
            tools: tools,
            stream: true,
        });

        let toolCalls = [];

        // For every streamed token emit
        for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta;
            
            if (delta?.content) {
                res.write(`data: ${JSON.stringify({ type: "text", text: delta.content })}\n\n`);
            }

            // Collect every tool call
            if (delta?.tool_calls) {
                for (const tc of delta.tool_calls) {
                    const idx = tc.index;
                    if (!toolCalls[idx]) {
                        toolCalls[idx] = {
                            id: tc.id,
                            type: tc.type,
                            function: {
                                name: tc.function.name,
                                arguments: tc.function.arguments || ""
                            }
                        };
                    } else {
                        if (tc.function?.arguments) {
                            toolCalls[idx].function.arguments += tc.function.arguments;
                        }
                    }
                }
            }
        }

        // After completion emit tool_result
        for (const tc of toolCalls) {
            if (!tc) continue;
            let parsedArgs = {};
            try {
                parsedArgs = JSON.parse(tc.function.arguments);
            } catch (e) {
                console.error('Failed to parse tool arguments:', tc.function.arguments);
            }
            
            res.write(`data: ${JSON.stringify({
                type: "tool_result",
                name: tc.function.name,
                arguments: parsedArgs
            })}\n\n`);
        }

    } catch (error) {
        console.error('Error during queryStream:', error);
        res.write(`data: ${JSON.stringify({ type: "error", error: error.message })}\n\n`);
    } finally {
        // Finally emit [DONE]
        res.write(`data: [DONE]\n\n`);
        res.end();
    }
};
