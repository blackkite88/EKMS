import { ChromaClient } from 'chromadb';

const COLLECTION_NAME = 'knowledge';

let chromaClient = null;
let collection = null;

export async function getChromaClient() {
  if (!chromaClient) {
    chromaClient = new ChromaClient({ path: process.env.CHROMA_URL || 'http://localhost:8000' });
  }
  return chromaClient;
}

export async function getCollection() {
  if (!collection) {
    const client = await getChromaClient();
    collection = await client.getOrCreateCollection({
      name: COLLECTION_NAME,
      metadata: { 'hnsw:space': 'cosine' },
      embeddingFunction: {
        generate: async () => {
          throw new Error('Chroma should never auto-embed: embeddings are always supplied explicitly');
        },
      },
    });
  }
  return collection;
}

export async function resetCollection() {
  const client = await getChromaClient();
  try {
    await client.deleteCollection({ name: COLLECTION_NAME });
  } catch (_) {}
  collection = null;
  return getCollection();
}

export { COLLECTION_NAME };
