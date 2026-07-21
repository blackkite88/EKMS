// Semantic (vector) search over ChromaDB. Rehydrates the flattened ABAC access
// attributes from Chroma metadata back into the nested shape the policy engine
// expects.
import { getCollection } from '../config/chroma.js';
import { generateEmbedding } from '../config/embeddings.js';

function rehydrateAccess(meta) {
  return {
    department: meta.access_department || 'operations',
    unit: meta.access_unit || 'all',
    min_clearance: typeof meta.access_min_clearance === 'number' ? meta.access_min_clearance : 1,
    sensitivity: meta.access_sensitivity || 'public',
  };
}

export async function vectorSearch(query, topK = 15) {
  const embedding = await generateEmbedding(query);
  const collection = await getCollection();

  const results = await collection.query({
    queryEmbeddings: [embedding],
    nResults: topK,
    include: ['documents', 'metadatas', 'distances'],
  });

  const docs = results.documents?.[0] || [];
  const metas = results.metadatas?.[0] || [];
  const distances = results.distances?.[0] || [];

  return docs.map((content, i) => ({
    content,
    metadata: metas[i] || {},
    access: rehydrateAccess(metas[i] || {}),
    score: distances[i] !== undefined ? 1 - distances[i] : null,
    source: 'vector',
  }));
}
