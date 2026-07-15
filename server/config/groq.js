// Singleton Groq client. All chat completions use the configured model.
import Groq from 'groq-sdk';
import { env } from './env.js';

let client = null;

export function getGroqClient() {
  if (!client) {
    client = new Groq({ apiKey: env.groqApiKey });
  }
  return client;
}

export const GROQ_MODEL = env.groqModel;

export default getGroqClient;
