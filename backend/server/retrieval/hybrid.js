// Hybrid retrieval pipeline:
//
//   vector (top 15) ┐
//                    ├─▶ merge + dedupe ─▶ 🔒 ABAC filter ─▶ rerank ─▶ top 8
//   keyword (top 15)┘
//
// The ABAC filter sits BETWEEN retrieval and rerank on purpose: we over-fetch,
// drop everything the user can't access, then rerank only the survivors — so
// restricted content never reaches the reranker or the LLM, and we still have
// enough candidates left after filtering.
import { vectorSearch } from './vector.js';
import { keywordSearch } from './keyword.js';
import { rerank } from './rerank.js';
import { partitionByAccess } from '../auth/policy.js';
import { createLogger } from '../utils/logger.js';

const log = createLogger('hybrid');

// Merge two result lists, de-duplicating by (source_id, chunk_index).
function mergeAndDedupe(...lists) {
  const seen = new Map();
  for (const list of lists) {
    for (const item of list) {
      const key = `${item.metadata.source_id}#${item.metadata.chunk_index}`;
      if (!seen.has(key)) {
        seen.set(key, item);
      } else {
        // Keep whichever has the better (higher) score signal available.
        const existing = seen.get(key);
        existing.source = 'hybrid';
      }
    }
  }
  return [...seen.values()];
}

/**
 * @param {string} query
 * @param {object} user  ABAC attributes
 * @returns {Promise<{results, deniedCount, candidateCount}>}
 */
export async function hybridSearch(query, user, { topK = 8, fetchK = 15 } = {}) {
  const [vec, kw] = await Promise.all([
    vectorSearch(query, fetchK),
    keywordSearch(query, fetchK),
  ]);

  const merged = mergeAndDedupe(vec, kw);

  // 🔒 ABAC filter — the security boundary.
  const { allowed, denied } = partitionByAccess(user, merged, (i) => i.access);
  if (denied.length) {
    log.info(`ABAC filtered ${denied.length}/${merged.length} candidates for ${user.email}`);
  }

  const ranked = await rerank(query, allowed, topK);

  return {
    results: ranked,
    deniedCount: denied.length,
    candidateCount: merged.length,
  };
}
