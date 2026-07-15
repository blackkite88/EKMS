// Provider-agnostic embedding generation. The spec default is Ollama
// (all-minilm, local); Jina is a cloud fallback for environments where the
// Ollama model registry is unreachable (e.g. corporate TLS interception).
// Both ingestion and retrieval import from here, so there is one source of
// truth for how a vector is produced.
import axios from 'axios';
import { env } from './env.js';

const OLLAMA_EMBED_ENDPOINT = `${env.ollamaUrl}/api/embeddings`;
const JINA_EMBED_ENDPOINT = 'https://api.jina.ai/v1/embeddings';

async function embedWithOllama(text) {
  const { data } = await axios.post(OLLAMA_EMBED_ENDPOINT, {
    model: env.ollamaEmbedModel,
    prompt: text,
  });
  return data.embedding;
}

async function embedWithJina(text) {
  const { data } = await axios.post(
    JINA_EMBED_ENDPOINT,
    { model: env.jinaEmbedModel, input: [text] },
    { headers: { Authorization: `Bearer ${env.jinaApiKey}` } }
  );
  return data.data[0].embedding;
}

export async function generateEmbedding(text) {
  if (env.embeddingProvider === 'jina') return embedWithJina(text);
  return embedWithOllama(text);
}

// Convenience: embed many texts sequentially. Kept simple/serial because
// local Ollama is fast and Jina's free tier is rate-limited.
export async function generateEmbeddings(texts) {
  const out = [];
  for (const text of texts) {
    out.push(await generateEmbedding(text));
  }
  return out;
}

export function getEmbeddingProvider() {
  return env.embeddingProvider;
}

export default generateEmbedding;
