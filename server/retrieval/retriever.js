import { getCollection } from '../config/chroma.js';
import { getEmbedModel } from '../config/llamaindex.js';

export const search = async (query) => {
    try {
        const collection = await getCollection();
        const embedModel = getEmbedModel();
        
        // Generate query embedding
        const queryEmbedding = await embedModel.getTextEmbedding(query);
        
        // Retrieve top 8 nodes
        const results = await collection.query({
            queryEmbeddings: [queryEmbedding],
            nResults: 8
        });
        
        // Return structured content
        const documents = results.documents[0] || [];
        const metadatas = results.metadatas[0] || [];
        const distances = results.distances[0] || [];
        
        return documents.map((doc, idx) => {
            return {
                content: doc,
                metadata: metadatas[idx],
                score: distances[idx] // Chroma returns distance, lower is better
            };
        });
    } catch (error) {
        console.error('Error during retrieval:', error);
        throw error;
    }
};
