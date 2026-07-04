import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

export const getEmbedModel = () => {
    return {
        getTextEmbeddingsBatch: async (texts) => {
            const embeddings = [];
            for (const text of texts) {
                const response = await axios.post(`${OLLAMA_URL}/api/embeddings`, {
                    model: 'all-minilm',
                    prompt: text
                });
                embeddings.push(response.data.embedding);
            }
            return embeddings;
        },
        getTextEmbedding: async (text) => {
            const response = await axios.post(`${OLLAMA_URL}/api/embeddings`, {
                model: 'all-minilm',
                prompt: text
            });
            return response.data.embedding;
        }
    };
};
