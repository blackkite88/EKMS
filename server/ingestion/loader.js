import 'dotenv/config';
import axios from 'axios';
import { scanDataFiles } from '../utils/fileScanner.js';
import { readAllDocuments } from './readers.js';
import { chunkText } from '../config/llamaindex.js';
import { getCollection, resetCollection } from '../config/chroma.js';

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const EMBED_MODEL = 'all-minilm';
const BATCH_SIZE = 50;

async function generateEmbedding(text) {
  const response = await axios.post(`${OLLAMA_URL}/api/embeddings`, {
    model: EMBED_MODEL,
    prompt: text,
  });
  return response.data.embedding;
}

function buildChunkId(sourceId, chunkIndex) {
  return `${sourceId}_chunk_${chunkIndex}`;
}

export async function runIngestionPipeline(reset = false) {
  console.log('[loader] Starting ingestion pipeline...');

  const collection = reset ? await resetCollection() : await getCollection();

  console.log('[loader] Scanning data files...');
  const filePaths = await scanDataFiles();
  console.log(`[loader] Found ${filePaths.length} files`);

  console.log('[loader] Reading documents...');
  const documents = await readAllDocuments(filePaths);
  console.log(`[loader] Read ${documents.length} documents`);

  const allIds = [];
  const allEmbeddings = [];
  const allDocuments = [];
  const allMetadatas = [];

  let totalChunks = 0;
  let failedFiles = 0;

  for (const doc of documents) {
    try {
      const chunks = chunkText(doc.text);
      console.log(`[loader] ${doc.metadata.source_id}: ${chunks.length} chunks`);

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        if (!chunk || chunk.trim().length === 0) continue;

        try {
          const embedding = await generateEmbedding(chunk);
          const id = buildChunkId(doc.metadata.source_id, i);

          allIds.push(id);
          allEmbeddings.push(embedding);
          allDocuments.push(chunk);
          allMetadatas.push({ ...doc.metadata, chunk_index: i });

          totalChunks++;

          if (allIds.length >= BATCH_SIZE) {
            await collection.add({
              ids: [...allIds],
              embeddings: [...allEmbeddings],
              documents: [...allDocuments],
              metadatas: [...allMetadatas],
            });
            console.log(`[loader] Batch inserted ${allIds.length} chunks`);
            allIds.length = 0;
            allEmbeddings.length = 0;
            allDocuments.length = 0;
            allMetadatas.length = 0;
          }
        } catch (embErr) {
          console.error(`[loader] Embedding failed for chunk ${i} of ${doc.metadata.source_id}: ${embErr.message}`);
        }
      }
    } catch (err) {
      console.error(`[loader] Failed to process ${doc.metadata.source_id}: ${err.message}`);
      failedFiles++;
    }
  }

  if (allIds.length > 0) {
    await collection.add({
      ids: allIds,
      embeddings: allEmbeddings,
      documents: allDocuments,
      metadatas: allMetadatas,
    });
    console.log(`[loader] Final batch inserted ${allIds.length} chunks`);
  }

  console.log(`[loader] Ingestion complete. Total chunks: ${totalChunks}, Failed files: ${failedFiles}`);
  return { totalChunks, failedFiles };
}

if (process.argv[1] && process.argv[1].endsWith('loader.js')) {
  const reset = process.argv.includes('--reset');
  runIngestionPipeline(reset)
    .then(({ totalChunks, failedFiles }) => {
      console.log(`[loader] Done. ${totalChunks} chunks indexed, ${failedFiles} files failed.`);
      process.exit(0);
    })
    .catch((err) => {
      console.error('[loader] Fatal error:', err);
      process.exit(1);
    });
}
