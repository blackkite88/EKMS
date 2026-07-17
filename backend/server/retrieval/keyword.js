// Lightweight in-process BM25 keyword search. Complements vector search by
// catching exact-token matches (e.g. ticket IDs like "NEX-231") that dense
// embeddings blur together. The corpus is pulled once from ChromaDB and cached;
// call invalidateKeywordIndex() after re-ingesting.
import { getCollection } from '../config/chroma.js';

const K1 = 1.5;
const B = 0.75;

let index = null; // { docs, df, avgdl, N }

function tokenize(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\-_.]+/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

function rehydrateAccess(meta) {
  return {
    department: meta.access_department || 'general',
    projects: meta.access_projects ? String(meta.access_projects).split(',').filter(Boolean) : [],
    min_clearance: typeof meta.access_min_clearance === 'number' ? meta.access_min_clearance : 1,
    sensitivity: meta.access_sensitivity || 'public',
  };
}

async function buildIndex() {
  const collection = await getCollection();
  const all = await collection.get({ include: ['documents', 'metadatas'] });
  const documents = all.documents || [];
  const metadatas = all.metadatas || [];
  const ids = all.ids || [];

  const docs = [];
  const df = new Map();
  let totalLen = 0;

  for (let i = 0; i < documents.length; i++) {
    const tokens = tokenize(documents[i]);
    const tf = new Map();
    for (const t of tokens) tf.set(t, (tf.get(t) || 0) + 1);
    for (const t of tf.keys()) df.set(t, (df.get(t) || 0) + 1);
    totalLen += tokens.length;
    docs.push({
      id: ids[i],
      content: documents[i],
      metadata: metadatas[i] || {},
      access: rehydrateAccess(metadatas[i] || {}),
      tf,
      len: tokens.length,
    });
  }

  index = { docs, df, avgdl: docs.length ? totalLen / docs.length : 0, N: docs.length };
  return index;
}

async function getIndex() {
  if (!index) await buildIndex();
  return index;
}

export function invalidateKeywordIndex() {
  index = null;
}

export async function keywordSearch(query, topK = 15) {
  const idx = await getIndex();
  if (idx.N === 0) return [];
  const qTokens = [...new Set(tokenize(query))];

  const scored = idx.docs.map((doc) => {
    let score = 0;
    for (const term of qTokens) {
      const f = doc.tf.get(term);
      if (!f) continue;
      const n = idx.df.get(term) || 0;
      const idf = Math.log(1 + (idx.N - n + 0.5) / (n + 0.5));
      const denom = f + K1 * (1 - B + (B * doc.len) / (idx.avgdl || 1));
      score += idf * ((f * (K1 + 1)) / denom);
    }
    return { doc, score };
  });

  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map((s) => ({
      content: s.doc.content,
      metadata: s.doc.metadata,
      access: s.doc.access,
      score: s.score,
      source: 'keyword',
    }));
}
