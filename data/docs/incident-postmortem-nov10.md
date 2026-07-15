---
access:
  department: engineering
  projects: [payments, infra]
  min_clearance: 2
  sensitivity: internal
---
# Incident Post-Mortem — Search Degradation (Nov 10)

**Severity:** P1. **Related:** NEX-244, email_08, incident_review_01, PR #52

## Root Cause
The NEX-189 migration cleanup script caught and swallowed a lock-timeout error, so idx_documents_created_at was never recreated. Undetected 7 days -> full scans on 180M rows -> timeouts.

## Hotfix
PR #52 created the index concurrently; restored at 15:45 IST.

## Preventive Actions
1. Index verification in runbook — Diana — Nov 19
2. Automated index health checks — Kenji — Nov 22 (NEX-250)

## Lesson
Never swallow exceptions in migration scripts.
