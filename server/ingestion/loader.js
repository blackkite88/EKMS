import path from 'path';
import { fileURLToPath } from 'url';
import { scanFiles } from '../utils/fileScanner.js';
import { readDocument } from './readers.js';
import { getCollection } from '../config/chroma.js';
import { getEmbedModel } from '../config/llamaindex.js';
import { SentenceSplitter } from 'llamaindex';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, '../data');

export const runIngestion = async () => {
    console.log('Starting ingestion pipeline...');
    
    // 1. Scan files
    const files = await scanFiles(DATA_DIR);
    console.log(`Found ${files.length} files to ingest.`);

    // 2. Read documents
    const documents = [];
    for (const file of files) {
        try {
            const doc = await readDocument(file);
            if (doc) {
                documents.push(doc);
            }
        } catch (error) {
            console.error(`Skipping file due to error: ${file}`);
        }
    }
    console.log(`Successfully read ${documents.length} documents.`);

    // 3. Chunk Documents
    console.log('Chunking documents...');
    const nodeParser = new SentenceSplitter({ chunkSize: 512 });
    const nodes = nodeParser.getNodesFromDocuments(documents);
    console.log(`Generated ${nodes.length} chunks from documents.`);

    // 4. Generate embeddings and store in Chroma
    const collection = await getCollection();
    const embedModel = getEmbedModel();
    
    const BATCH_SIZE = 10;
    
    for (let i = 0; i < nodes.length; i += BATCH_SIZE) {
        const batch = nodes.slice(i, i + BATCH_SIZE);
        console.log(`Processing batch ${Math.floor(i / BATCH_SIZE) + 1} (${batch.length} chunks)...`);
        
        try {
            const texts = batch.map(n => n.text);
            const embeddings = await embedModel.getTextEmbeddingsBatch(texts);
            
            await collection.add({
                ids: batch.map(n => n.id_),
                embeddings: embeddings,
                metadatas: batch.map(n => n.metadata),
                documents: texts
            });
        } catch (error) {
            console.error('Error inserting batch into ChromaDB:', error);
        }
    }

    console.log('Ingestion pipeline completed successfully.');
};
