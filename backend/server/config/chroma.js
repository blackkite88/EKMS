// ChromaDB client + the 'knowledge' collection. Embeddings are always supplied
// explicitly by our own pipeline, so the collection's embeddingFunction is a
// guard that throws if Chroma ever tries to auto-embed (which would silently
// use the wrong model). The vector dimension is inferred from inserted vectors.
import { ChromaClient } from 'chromadb';
import { env } from './env.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('chroma');
const COLLECTION_NAME = 'knowledge';

let chromaClient = null;
let collection = null;

const guardEmbeddingFunction = {
  generate: async () => {
    throw new Error(
      'Chroma attempted to auto-embed, but embeddings must always be supplied explicitly.'
    );
  },
};

export function getChromaClient() {
  if (!chromaClient) {
    chromaClient = new ChromaClient({ path: env.chromaUrl });
  }
  return chromaClient;
}

export async function getCollection() {
  if (!collection) {
    const client = getChromaClient();
    collection = await client.getOrCreateCollection({
      name: COLLECTION_NAME,
      metadata: { 'hnsw:space': 'cosine' },
      embeddingFunction: guardEmbeddingFunction,
    });
  }
  return collection;
}

export async function resetCollection() {
  const client = getChromaClient();
  try {
    await client.deleteCollection({ name: COLLECTION_NAME });
    log.info(`Deleted existing '${COLLECTION_NAME}' collection`);
  } catch {
    // Collection did not exist — fine.
  }
  collection = null;
  return getCollection();
}

export async function pingChroma() {
  const client = getChromaClient();
  await client.heartbeat();
  return true;
}

export { COLLECTION_NAME };
