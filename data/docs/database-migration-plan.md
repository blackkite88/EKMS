# Database Migration Plan — PostgreSQL 13 to 16

**Last Updated:** 2024-11-19 (updated with post-migration learnings)  
**Author:** Diana Chen  
**Approved By:** Raj Patel (email_06, Oct 23), Priya Sharma (email_07, Oct 24)  
**Related:** NEX-189, NEX-244, email_05, email_06, email_07, email_11

## Summary

Migration of Nexora's production database from PostgreSQL 13.12 to PostgreSQL 16.1, including table partitioning of the high-volume `events` and `documents` tables.

## Outcome

Migration completed successfully on November 3, 2024 in 3 hours 43 minutes (target: 4 hours). See email_11 for post-migration report.

**Follow-up incident:** NEX-244 — missing index on `documents.created_at` caused search degradation on November 10. See incident-postmortem-nov10.md. Runbook updated (this document) with index verification steps as a result.

## Pre-Migration Checklist

- [ ] CTO approval obtained (Raj Patel, email_06)
- [ ] Engineering Manager approval obtained (Priya Sharma, email_07)
- [ ] Legal/compliance data residency confirmation
- [ ] On-call rota set (Primary: Arjun Mehta, Backup: Riya Desai)
- [ ] Company-wide maintenance notification sent 48h in advance
- [ ] Logical replication standby configured and verified
- [ ] Dry run completed in staging environment

## Migration Steps

1. Create logical replication standby on PostgreSQL 16 cluster
2. Verify replication lag < 1 second before maintenance window
3. Begin maintenance window — set application to maintenance mode
4. Stop writes to primary
5. Final sync of logical replication
6. Promote standby to primary
7. Run post-migration scripts (partition setup, index creation)
8. **Run index verification checklist (see below — added post NEX-244)**
9. Verify row counts on all critical tables
10. Run smoke test suite
11. Re-enable application
12. Monitor for 30 minutes before declaring success

## ⚠️ Index Verification Checklist (Added Post NEX-244)

After running post-migration scripts, verify the following indexes exist before re-enabling the application. The NEX-244 incident occurred because this check was absent.

```sql
-- Run these queries. Each should return the index name. If NULL, the index is missing.
SELECT indexname FROM pg_indexes WHERE tablename = 'documents' AND indexname = 'idx_documents_created_at';
SELECT indexname FROM pg_indexes WHERE tablename = 'documents' AND indexname = 'idx_documents_content_gin';
SELECT indexname FROM pg_indexes WHERE tablename = 'events' AND indexname = 'idx_events_user_id';
SELECT indexname FROM pg_indexes WHERE tablename = 'events' AND indexname = 'idx_events_created_at';
SELECT indexname FROM pg_indexes WHERE tablename = 'payment_audit_log' AND indexname = 'idx_payment_audit_log_stripe_event';
```

If any index is missing, DO NOT re-enable the application. Create the index concurrently:
```sql
CREATE INDEX CONCURRENTLY idx_documents_created_at ON documents(created_at);
```

## Rollback Plan

Logical replication standby remains live for **72 hours** post-migration (condition set by Raj Patel in email_06, extended from original 48h proposal).

To rollback: promote old primary, update DNS/connection strings, notify team.

## Contacts

- Migration Lead: Diana Chen (diana.chen@nexora.com)
- On-Call Primary: Arjun Mehta
- On-Call Backup: Riya Desai
- CTO Escalation: Raj Patel
