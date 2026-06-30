# Payments Service Architecture

**Last Updated:** 2024-11-05  
**Author:** Arjun Mehta  
**Reviewed By:** Kenji Nakamura, Diana Chen, Priya Sharma  
**Related:** NEX-204, architecture_review_01, email_04

## Overview

The Payments service is implemented as a standalone microservice within the Nexora platform, responsible for processing all monetary transactions via Stripe. This document describes the architecture decisions made during the architecture review on November 5, 2024.

## Service Topology

```
Internet
  │
  ▼
Load Balancer (HTTPS only)
  │
  ▼
Application Layer (10.0.0.0/24)
  │
  ▼  [HTTPS only, port 443]
Payments Service (10.0.4.0/24)  ← dedicated VPC subnet (NEX-218)
  │                │
  ▼                ▼
Stripe API     payment_audit_log (PostgreSQL payments schema)
```

The dedicated VPC subnet (10.0.4.0/24) satisfies PCI-DSS Level 1 network segmentation requirement identified in NEX-217. See email_02 for the original compliance gap identification.

## API Endpoints

### POST /payments/charge
Accepts: `amount`, `currency`, `payment_method_id`, `customer_id`  
Implemented in NEX-212, PR #55.

### POST /payments/refund
Accepts: `payment_intent_id`, `amount` (optional for full refund)  
Implemented in NEX-215, PR #53.

### POST /webhooks/stripe
Dedicated webhook endpoint with HMAC signature verification.  
Bypasses IP rate limiter (NEX-231 decision, email_12).  
Implemented in NEX-240, PR #56.

## Rate Limiting

Public payment endpoints use the standard IP-based rate limiter (PR #47, NEX-231) with the X-Forwarded-For composite key fix applied (NEX-233, email_09).

The `/webhooks/stripe` endpoint is exempt from IP rate limiting. Instead, authenticity is enforced via Stripe's HMAC webhook signature (`Stripe-Signature` header). This was the approved approach from email_12 — more secure than IP whitelisting because Stripe's IP ranges can change.

## Audit Logging (PCI-DSS Requirement)

All payment events are written to `payment_audit_log` BEFORE business logic executes. The table is append-only (row-level security, no UPDATE/DELETE). See NEX-219 for implementation details.

## Card Data Handling

Nexora never stores raw card data. All cardholder data is tokenized via Stripe. Nexora stores only:
- Stripe customer IDs
- Stripe payment method IDs (tokens)
- Payment intent IDs
- Transaction metadata (amount, currency, status)

This approach, combined with network segmentation (NEX-218), satisfies PCI-DSS tokenization requirements.

## Technology Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Payment processor | Stripe | Best developer experience, PCI-DSS compliant |
| Webhook auth | HMAC signature | More secure than IP whitelist (email_12) |
| Async processing | Bull/Redis queue | Decouple webhook receipt from processing |
| Database | Partitioned payments schema | Reuse partitioning pattern from NEX-189 |
| Network | Dedicated VPC subnet | PCI-DSS Level 1 requirement (NEX-218) |

## Related Documents

- [Database Migration Plan](database-migration-plan.md) — partitioning approach
- [API Rate Limiting](api-rate-limiting.md) — rate limiting architecture
- [Incident Post-Mortem Nov 10](incident-postmortem-nov10.md) — database lessons applied here
