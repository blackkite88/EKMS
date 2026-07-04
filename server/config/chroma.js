import { ChromaClient } from 'chromadb';
import dotenv from 'dotenv';

dotenv.config();

const CHROMA_URL = process.env.CHROMA_URL || 'http://localhost:8000';
const COLLECTION_NAME = 'knowledge';

let chromaClient = null;
let knowledgeCollection = null;

export const getChromaClient = () => {
    if (!chromaClient) {
        chromaClient = new ChromaClient({ path: CHROMA_URL });
    }
    return chromaClient;
};

export const getCollection = async () => {
    if (knowledgeCollection) {
        return knowledgeCollection;
    }
    const client = getChromaClient();
    try {
        knowledgeCollection = await client.getOrCreateCollection({
            name: COLLECTION_NAME
        });
        return knowledgeCollection;
    } catch (error) {
        console.error('Error connecting to ChromaDB. Ensure it is running at', CHROMA_URL);
        throw error;
    }
};
