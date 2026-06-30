import { getCollection } from '../config/chroma.js';
import { generateEmbedding } from '../config/embeddings.js';

const TOP_K = 8;

export async function search(query) {
  const embedding = await generateEmbedding(query);
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
