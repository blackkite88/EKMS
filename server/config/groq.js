import { Groq } from 'groq-sdk';
import dotenv from 'dotenv';

dotenv.config();

let groqClient = null;

export const getGroqClient = () => {
    if (!groqClient) {
        if (!process.env.GROQ_API_KEY) {
            console.warn('WARNING: GROQ_API_KEY is not set in .env');
        }
        groqClient = new Groq({
            apiKey: process.env.GROQ_API_KEY || 'dummy_key'
        });
    }
    return groqClient;
};

export const GROQ_MODEL = 'llama-3.3-70b-versatile';
