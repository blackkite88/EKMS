# Engineering Onboarding Guide — Nexora Inc.

**Last Updated:** 2024-11-01  
**Author:** Priya Sharma  
**Related:** email_10, all_hands_q4

## Welcome to Nexora Engineering

Nexora Inc. is an Enterprise SaaS company with 80 engineers across backend, frontend, mobile, data, and platform teams. This guide will get you productive in your first week.

## Team Structure

| Team | Lead | Focus |
|------|------|-------|
| Backend Platform | Priya Sharma | Core APIs, infrastructure |
| Security | Kenji Nakamura | Security, compliance, pen testing |
| Database | Diana Chen | PostgreSQL, migrations, performance |
| Mobile | Mobile Team Lead | iOS/Android SDK |
| Product Engineering | Riya Desai | User-facing features |

## Key People

- **Raj Patel** — CTO. Final decision-maker on infrastructure changes. Approves all maintenance windows (see email_06 for example).
- **Priya Sharma** — Engineering Manager, Backend. Day-to-day escalation point.
- **Kenji Nakamura** — Security Lead. Mandatory reviewer for all security-touching PRs.
- **Diana Chen** — Database Architect. Owns all PostgreSQL schema and migration changes.
- **Arjun Mehta** — Senior Backend Engineer. Payments feature lead.
- **Riya Desai** — Software Engineer. Search and refund feature owner.

## Development Workflow

1. Pick up a ticket from the current sprint in Jira (project: NEX)
2. Create a branch from `main`: `git checkout -b feature/NEX-XXX-short-description`
3. Submit a PR — minimum 1 reviewer required, 2 for security-touching changes
4. Kenji Nakamura must review any PR touching authentication, rate limiting, or payments
5. All CI checks must pass before merge

## Current Q4 Priorities

See email_10 and all_hands_q4 for full context:
1. NEX-204: Payments feature (highest priority)
2. NEX-189: Database migration (completed Nov 3)
3. NEX-198: Search performance
4. NEX-231: API rate limiting
5. NEX-210: Mobile SDK v2

## Infrastructure

- **Database:** PostgreSQL 16 (migrated Nov 3 — NEX-189, see database-migration-plan.md)
- **Cache:** Redis (used for search caching — NEX-198)
- **Payments:** Stripe (see payments-architecture.md)
- **Monitoring:** PagerDuty + Grafana
- **Secrets:** AWS Secrets Manager

## Communication Norms

- Daily standups at 10 AM IST — asynchronous update in Slack if you can't attend
- Escalate Payments blockers immediately to Priya Sharma
- Post-mortems are blameless — we fix processes, not people (see incident-postmortem-nov10.md)
