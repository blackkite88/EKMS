# Search Performance Optimization Plan

**Last Updated:** 2024-11-15  
**Author:** Riya Desai  
**Related:** NEX-198, email_08, email_10, sprint_review_01

## Goal

Reduce search P95 latency from 380ms (baseline) to under 200ms. Current state (Nov 15): 210ms.

## Completed Optimizations

### 1. GIN Index for Full-Text Search (PR #48)
Added a GIN (Generalized Inverted Index) on `documents.content` for PostgreSQL full-text search. Reduced average query time by ~45% for text-heavy searches.

```sql
CREATE INDEX CONCURRENTLY idx_documents_content_gin ON documents USING gin(to_tsvector('english', content));
```

### 2. Query Result Caching (PR #49)
Implemented a 60-second TTL cache for search results using Redis. Cache key is a normalized hash of the query + filter parameters. Cache hit rate is currently 34%.

### 3. Index Rebuild Post-Incident (PR #52)
After the NEX-244 incident, the `documents.created_at` index was rebuilt. This index is critical for date-range filtered searches. See incident-postmortem-nov10.md.

## Remaining Work

### Connection Pool Tuning
Current pool size: 10. Under high concurrency the pool exhausts, causing queue wait time.  
Plan: Increase pool to 25, add connection timeout monitoring.

### Edge Case Query Analysis
Five query patterns identified with P95 > 500ms:
1. Searches with more than 5 active filter parameters
2. Searches against the unpartitioned legacy `documents_archive` table
3. Full wildcard searches (`search=*`)
4. Cross-tenant searches (admin use case)
5. Searches during report generation (resource contention)

Each pattern needs individual optimization. Tickets to be created in Sprint 23.

## Metrics

| Date | P50 | P95 | P99 |
|------|-----|-----|-----|
| Oct 1 (baseline) | 120ms | 380ms | 890ms |
| Nov 1 | 95ms | 310ms | 720ms |
| Nov 15 | 68ms | 210ms | 450ms |
| Target | <50ms | <200ms | <400ms |

## Related Documents

- [Incident Post-Mortem Nov 10](incident-postmortem-nov10.md) — index rebuild context
- [Database Migration Plan](database-migration-plan.md) — partitioning benefits for search
