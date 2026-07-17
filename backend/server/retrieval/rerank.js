// Cross-encoder reranking via the Jina rerank API. Unlike the bi-encoder used
// for vector search (query and doc embedded separately), a cross-encoder scores
// the query and each candidate TOGETHER, giving much more accurate relevance —
// at a cost that's only affordable because we run it on a small candidate set.
//
// Falls back to the candidates' existing order if the API is unavailable, so
// reranking never breaks retrieval.
import axios from 'axios';
import { env } from '../config/env.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('rerank');
const JINA_RERANK_ENDPOINT = 'https://api.jina.ai/v1/rerank';

export async function rerank(query, candidates, topK = 8) {
  if (candidates.length === 0) return [];
  if (!env.jinaApiKey) {
    return candidates.slice(0, topK);
  }

  try {
    const { data } = await axios.post(
      JINA_RERANK_ENDPOINT,
      {
        model: env.jinaRerankModel,
        query,
        documents: candidates.map((c) => c.content),
        top_n: Math.min(topK, candidates.length),
      },
      { headers: { Authorization: `Bearer ${env.jinaApiKey}` }, timeout: 15000 }
    );

    // data.results: [{ index, relevance_score }]
    return data.results.map((r) => ({
      ...candidates[r.index],
      rerank_score: r.relevance_score,
    }));
  } catch (err) {
    log.warn(`Rerank failed, using pre-rerank order: ${err.message}`);
    return candidates.slice(0, topK);
  }
}
