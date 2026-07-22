// Loads and validates environment configuration. Fails fast with a clear
// message if a required variable is missing, so misconfiguration surfaces at
// boot rather than as a mysterious crash mid-request.
import dotenv from 'dotenv';
import { createLogger } from '../utils/logger.js';

dotenv.config();

const log = createLogger('env');

function required(name) {
  const value = process.env[name];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name, fallback = '') {
  const value = process.env[name];
  return value && value.trim() !== '' ? value : fallback;
}

const embeddingProvider = optional('EMBEDDING_PROVIDER', 'ollama').toLowerCase();

export const env = {
  // Groq
  groqApiKey: required('GROQ_API_KEY'),
  groqModel: optional('GROQ_MODEL', 'llama-3.3-70b-versatile'),

  // Embeddings
  embeddingProvider,
  ollamaUrl: optional('OLLAMA_URL', 'http://localhost:11434'),
  ollamaEmbedModel: optional('OLLAMA_EMBED_MODEL', 'all-minilm'),
  jinaApiKey: optional('JINA_API_KEY'),
  jinaEmbedModel: optional('JINA_EMBED_MODEL', 'jina-embeddings-v2-base-en'),
  jinaRerankModel: optional('JINA_RERANK_MODEL', 'jina-reranker-v2-base-multilingual'),

  // Vector store
  chromaUrl: optional('CHROMA_URL', 'http://localhost:8000'),

  // Graph store
  neo4jUri: optional('NEO4J_URI', 'bolt://localhost:7687'),
  neo4jUser: optional('NEO4J_USER', 'neo4j'),
  neo4jPassword: optional('NEO4J_PASSWORD', 'nexorapass'),

  // Postgres
  postgresUrl: optional('POSTGRES_URL', 'postgres://nexora:nexorapass@localhost:5432/nexora'),

  // Auth
  jwtSecret: optional('JWT_SECRET', 'nexora_dev_secret_change_me'),
  jwtExpiresIn: optional('JWT_EXPIRES_IN', '12h'),

  // MCP — Jira
  jira: {
    baseUrl: optional('JIRA_BASE_URL'),
    email: optional('JIRA_EMAIL'),
    apiToken: optional('JIRA_API_TOKEN'),
    projectKey: optional('JIRA_PROJECT_KEY', 'NEX'),
  },
  // MCP — Gmail
  gmail: {
    clientId: optional('GMAIL_CLIENT_ID'),
    clientSecret: optional('GMAIL_CLIENT_SECRET'),
    refreshToken: optional('GMAIL_REFRESH_TOKEN'),
    user: optional('GMAIL_USER', 'me'),
  },

  // Server
  port: parseInt(optional('PORT', '3001'), 10),
};

// Validate embedding provider selection early.
if (!['ollama', 'jina'].includes(env.embeddingProvider)) {
  throw new Error(`EMBEDDING_PROVIDER must be "ollama" or "jina", got "${env.embeddingProvider}"`);
}
if (env.embeddingProvider === 'jina' && !env.jinaApiKey) {
  throw new Error('EMBEDDING_PROVIDER=jina requires JINA_API_KEY to be set');
}

export function jiraConfigured() {
  return Boolean(env.jira.baseUrl && env.jira.email && env.jira.apiToken);
}

export function gmailConfigured() {
  return Boolean(env.gmail.clientId && env.gmail.clientSecret && env.gmail.refreshToken);
}

log.info(`Environment loaded (embeddings: ${env.embeddingProvider}, model: ${env.groqModel})`);

export default env;
