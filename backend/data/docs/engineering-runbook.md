---
access:
  department: engineering
  projects: [search]
  min_clearance: 1
  sensitivity: public
---
# Engineering Runbook

**Related:** engineering-onboarding, incident-postmortem-nov10

## On-Call Severity
- P1 <15min: search down, payments failing, DB unreachable
- P2 <1h: elevated errors

## Search Degradation
Check pg_indexes for missing indexes; CREATE INDEX CONCURRENTLY if absent (see incident-postmortem-nov10).

## DB Maintenance
Require CTO + EM approval; on-call rota; 48h notice; follow database-migration-plan.md; run index verification before re-enabling.

## Deploy
Kenji reviews auth/rate-limiting/payments PRs before merge.
