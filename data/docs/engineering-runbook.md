# Engineering Runbook — Nexora Backend

**Last Updated:** 2024-11-15  
**Author:** Priya Sharma  
**Related:** engineering-onboarding.md, incident-postmortem-nov10.md

## On-Call Procedures

### Alert Triage Priority

| Severity | Response Time | Examples |
|----------|--------------|---------|
| P1 | < 15 min | Search down, Payments failing, DB unreachable |
| P2 | < 1 hour | Elevated error rate, P95 > 2x normal |
| P3 | Business hours | Single endpoint degraded, non-critical timeouts |

### Escalation Path

1. On-call engineer (PagerDuty)
2. Engineering Manager: Priya Sharma
3. CTO: Raj Patel (P1 only, or if >30 min unresolved)

## Common Runbooks

### Search Degradation (ref: incident-postmortem-nov10.md)

1. Check Grafana search latency dashboard
2. Check `pg_indexes` for missing indexes:
   ```sql
   SELECT indexname FROM pg_indexes WHERE tablename = 'documents';
   ```
3. If index missing, create concurrently:
   ```sql
   CREATE INDEX CONCURRENTLY idx_documents_created_at ON documents(created_at);
   ```
4. Monitor P95 recovery

### Rate Limiter Firing Unexpectedly (ref: api-rate-limiting.md)

1. Check logs for throttled IP + user combinations
2. Verify `X-Forwarded-For` is being parsed correctly behind load balancer
3. If legitimate traffic is being throttled, temporarily increase limit via env var `RATE_LIMIT_MAX`
4. Do NOT disable rate limiting entirely — escalate to Kenji Nakamura first

### Database Maintenance Window (ref: database-migration-plan.md)

1. Confirm CTO approval (email from Raj Patel required)
2. Confirm Engineering Manager approval (Priya Sharma)
3. Set on-call rota (primary + backup)
4. Send company-wide notification 48h in advance
5. Follow migration runbook in database-migration-plan.md step by step
6. Run index verification checklist before re-enabling application

## Deployment Checklist

- [ ] All CI checks passing
- [ ] PR reviewed by minimum 1 engineer (2 for security PRs)
- [ ] Kenji Nakamura reviewed if PR touches auth, rate limiting, or payments
- [ ] Feature flags set correctly for staged rollout
- [ ] Rollback procedure documented in PR description
- [ ] Monitoring dashboard checked 30 min post-deploy

## Contacts

| Role | Name | Contact |
|------|------|---------|
| Engineering Manager | Priya Sharma | priya.sharma@nexora.com |
| CTO | Raj Patel | raj.patel@nexora.com |
| Security Lead | Kenji Nakamura | kenji.nakamura@nexora.com |
| Database Architect | Diana Chen | diana.chen@nexora.com |
| PagerDuty | Engineering On-Call | pagerduty.com/nexora |
