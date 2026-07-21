// The ingestion pipeline:
//   scan files → read (+ABAC) → chunk → embed → store vectors in ChromaDB
//   → build the Neo4j knowledge graph from the same documents.
//
// ChromaDB metadata must be scalar, so the ABAC access object is flattened into
// access_department / access_projects (CSV) / access_min_clearance /
// access_sensitivity, and rehydrated at query time.
import '../config/env.js';
import { scanDataFiles } from './scanner.js';
import { readAllDocuments } from './readers.js';
import { chunkText } from '../config/llamaindex.js';
import { getCollection, resetCollection } from '../config/chroma.js';
import { generateEmbedding, getEmbeddingProvider } from '../config/embeddings.js';
import { buildGraph } from '../graph/builder.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('loader');
const BATCH_SIZE = 50;

function flattenAccess(access) {
  return {
    access_department: access.department,
    access_unit: access.unit || 'all',
    access_min_clearance: access.min_clearance,
    access_sensitivity: access.sensitivity,
  };
}

function buildChunkMetadata(docMeta, chunkIndex) {
  return {
    source_type: docMeta.source_type,
    source_id: docMeta.source_id,
    filename: docMeta.filename,
    chunk_index: chunkIndex,
    ...flattenAccess(docMeta.access),
  };
}

async function flushBatch(collection, batch) {
  if (batch.ids.length === 0) return;
  await collection.add({
    ids: [...batch.ids],
    embeddings: [...batch.embeddings],
    documents: [...batch.documents],
    metadatas: [...batch.metadatas],
  });
  log.info(`Inserted ${batch.ids.length} chunks into ChromaDB`);
  batch.ids.length = 0;
  batch.embeddings.length = 0;
  batch.documents.length = 0;
  batch.metadatas.length = 0;
}

export async function runIngestionPipeline({ reset = false, buildGraphToo = true } = {}) {
  log.info(`Starting ingestion (embeddings: ${getEmbeddingProvider()}, reset: ${reset})`);

  const collection = reset ? await resetCollection() : await getCollection();

  const filePaths = await scanDataFiles();
  log.info(`Found ${filePaths.length} files`);

  const documents = await readAllDocuments(filePaths);
  log.info(`Read ${documents.length} documents`);

  const batch = { ids: [], embeddings: [], documents: [], metadatas: [] };
  let totalChunks = 0;
  let failedFiles = 0;

  for (const doc of documents) {
    try {
      const chunks = chunkText(doc.text);
      for (let i = 0; i < chunks.length; i++) {
        try {
          const embedding = await generateEmbedding(chunks[i]);
          batch.ids.push(`${doc.metadata.source_id}_chunk_${i}`);
          batch.embeddings.push(embedding);
          batch.documents.push(chunks[i]);
          batch.metadatas.push(buildChunkMetadata(doc.metadata, i));
          totalChunks++;
          if (batch.ids.length >= BATCH_SIZE) await flushBatch(collection, batch);
        } catch (embErr) {
          log.error(`Embedding failed (${doc.metadata.source_id} #${i}): ${embErr.message}`);
        }
      }
    } catch (err) {
      log.error(`Failed to process ${doc.metadata.source_id}: ${err.message}`);
      failedFiles++;
    }
  }
  await flushBatch(collection, batch);
  log.info(`Vector ingestion complete: ${totalChunks} chunks, ${failedFiles} failed files`);

  let graphStats = null;
  if (buildGraphToo) {
    try {
      graphStats = await buildGraph(documents);
      log.info(`Graph built: ${graphStats.nodes} nodes, ${graphStats.edges} edges`);
    } catch (err) {
      log.error(`Graph build failed (vectors still indexed): ${err.message}`);
      graphStats = { error: err.message };
    }
  }

  return { totalChunks, failedFiles, files: documents.length, graph: graphStats };
}

// CLI entrypoint: `node server/ingestion/loader.js [--reset] [--no-graph]`
if (process.argv[1] && process.argv[1].endsWith('loader.js')) {
  const reset = process.argv.includes('--reset');
  const buildGraphToo = !process.argv.includes('--no-graph');
  runIngestionPipeline({ reset, buildGraphToo })
    .then((r) => {
      log.info(`Done. ${r.totalChunks} chunks, ${r.files} files, graph: ${JSON.stringify(r.graph)}`);
      process.exit(0);
    })
    .catch((err) => {
      log.error('Fatal ingestion error', err);
      process.exit(1);
    });
}
