import axios from 'axios';

const PROVIDER = (process.env.EMBEDDING_PROVIDER || 'ollama').toLowerCase();

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_EMBED_MODEL || 'all-minilm';

const JINA_URL = 'https://api.jina.ai/v1/embeddings';
const JINA_MODEL = process.env.JINA_EMBED_MODEL || 'jina-embeddings-v2-base-en';

async function embedWithOllama(text) {
  const response = await axios.post(`${OLLAMA_URL}/api/embeddings`, {
    model: OLLAMA_MODEL,
    prompt: text,
  });
  return response.data.embedding;
}

async function embedWithJina(text) {
  if (!process.env.JINA_API_KEY) {
    throw new Error('JINA_API_KEY is not set in environment variables');
  }
  const response = await axios.post(
    JINA_URL,
    { model: JINA_MODEL, input: [text] },
    { headers: { Authorization: `Bearer ${process.env.JINA_API_KEY}` } }
  );
  return response.data.data[0].embedding;
}

export async function generateEmbedding(text) {
  switch (PROVIDER) {
    case 'jina':
      return embedWithJina(text);
    case 'ollama':
    default:
      return embedWithOllama(text);
  }
}

export function getEmbeddingProvider() {
  return PROVIDER;
}
