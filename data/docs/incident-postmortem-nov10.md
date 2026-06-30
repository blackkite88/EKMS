# Incident Post-Mortem — Search Performance Degradation

**Incident Date:** November 10, 2024  
**Post-Mortem Date:** November 13, 2024  
**Severity:** P1 (35% of users affected)  
**Duration:** 1 hour 30 minutes  
**Author:** Riya Desai  
**Related:** NEX-244, email_08, incident_review_01, PR #52

## Executive Summary

On November 10, 2024, Nexora experienced search query timeouts affecting 35% of users for 1.5 hours. Root cause: missing database index on `documents.created_at` following the PostgreSQL migration (NEX-189) on November 3. The index was dropped during migration and silently failed to recreate due to a swallowed error in the cleanup script.

## Timeline

| Time (IST) | Event |
|------------|-------|
| 14:30 | First user reports of search timeout |
| 14:38 | PagerDuty alert fired (P95 latency > 2000ms threshold) |
| 14:45 | On-call Riya Desai acknowledged alert |
| 15:10 | Root cause identified: missing idx_documents_created_at |
| 15:20 | PR #52 created (hotfix) |
| 15:35 | PR #52 reviewed and approved by Arjun Mehta |
| 15:40 | Hotfix deployed — `CREATE INDEX CONCURRENTLY` initiated |
| 15:45 | Index build complete, performance restored |
| 16:00 | All clear declared |

## Root Cause

The PostgreSQL migration (NEX-189) cleanup script contained:

```python
try:
    cursor.execute("CREATE INDEX idx_documents_created_at ON documents(created_at)")
except Exception as e:
    logger.warning(f"Index creation warning: {e}")  # BUG: should be ERROR, should re-raise
```

A lock timeout error occurred during index creation (the table was briefly locked by another process). The error was caught and logged as a warning, not an error, and execution continued. The index was never created.

This bug went undetected for 7 days because:
1. No automated monitoring for index existence
2. Low document query load immediately post-migration
3. Migration script logs not actively monitored

## Detection Gap

There was no post-migration verification checklist. The database-migration-plan.md runbook did not include index verification steps.

## Hotfix

PR #52 applied `CREATE INDEX CONCURRENTLY idx_documents_created_at ON documents(created_at)`. Concurrent index build took approximately 5 minutes and did not require downtime.

## Preventive Actions

| Action | Owner | Due Date | Status |
|--------|-------|----------|--------|
| Add index verification checklist to migration runbook | Diana Chen | Nov 19 | Done |
| Add automated index health checks to monitoring | Kenji Nakamura | Nov 22 | In Progress |
| Review all migration scripts for swallowed errors | Arjun Mehta | Nov 20 | In Progress |

From email_08 (Riya Desai's post-mortem summary to engineering team).

## Lessons Learned

1. **Never swallow exceptions in migration scripts.** Any error during a migration should halt execution and alert the operator.
2. **Post-migration verification is mandatory.** Runbooks must include explicit verification steps for critical database objects.
3. **Index health should be monitored continuously.** Missing indexes on high-traffic tables is a P1 risk.

## Related

- database-migration-plan.md (updated with index checklist)
- NEX-189 (migration ticket)
- NEX-244 (this incident's ticket)
- incident_review_01 (meeting where this was reviewed with the team)
