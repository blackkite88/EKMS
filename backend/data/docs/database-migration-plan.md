---
access:
  department: engineering
  projects: [infra]
  min_clearance: 2
  sensitivity: internal
---
# Database Migration Plan — PostgreSQL 13 to 16

**Approved:** Raj Patel (email_06), Priya Sharma (email_07). **Related:** NEX-189, NEX-244.

## Outcome
Completed Nov 3 in 3h43m (email_11). Events table partitioned, ~40% improvement.

## Index Verification Checklist (added post NEX-244)
After post-migration scripts, verify indexes exist before re-enabling the app. The NEX-244 incident occurred because this was absent (email_08). Check idx_documents_created_at, idx_documents_content_gin, idx_events_created_at. If missing, CREATE INDEX CONCURRENTLY.

## Rollback
Logical replication standby stays live 72 hours (Raj's condition, email_06).
