import axios from 'axios';
import { getCollection } from '../config/chroma.js';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const EMBED_MODEL = 'all-minilm';
const TOP_K = 8;

async function generateQueryEmbedding(query) {
  const response = await axios.post(`${OLLAMA_URL}/api/embeddings`, {
    model: EMBED_MODEL,
    prompt: query,
  });
  return response.data.embedding;
}

export async function search(query) {
  const embedding = await generateQueryEmbedding(query);
  const collection = await getCollection();

  const results = await collection.query({
    queryEmbeddings: [embedding],
    nResults: TOP_K,
    include: ['documents', 'metadatas', 'distances'],
  });

  const nodes = [];
  const docs = results.documents[0] || [];
  const metas = results.metadatas[0] || [];
  const distances = results.distances[0] || [];

  for (let i = 0; i < docs.length; i++) {
    nodes.push({
      content: docs[i],
      metadata: metas[i] || {},
      score: distances[i] !== undefined ? 1 - distances[i] : null,
    });
  }

  return nodes;
}
