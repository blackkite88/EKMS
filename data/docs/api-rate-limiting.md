# API Rate Limiting — Architecture and Configuration

**Last Updated:** 2024-11-12  
**Author:** Arjun Mehta  
**Reviewed By:** Kenji Nakamura (email_09)  
**Related:** NEX-231, NEX-233, email_04, email_09, email_12, PR #47

## Overview

Nexora's API rate limiting implementation provides protection against abuse and ensures fair resource allocation. This document describes the architecture, configuration, and the Stripe webhook exception.

## Implementation

Rate limiting is implemented as Express middleware (PR #47, NEX-231). After security review by Kenji Nakamura (email_09), the following design was finalized:

### Key Selection

The rate limiter uses a composite key to avoid penalizing users behind shared NAT/load balancers:

```
key = X-Forwarded-For[0] || req.ip + ":" + (req.user?.id || "anonymous")
```

The `X-Forwarded-For` fix was identified as critical in email_09: "In environments behind a load balancer or NAT, this will incorrectly throttle multiple legitimate users sharing the same egress IP."

### Limits

| Endpoint Category | Limit | Window |
|-------------------|-------|--------|
| Public API | 100 req/min | per composite key |
| Authenticated API | 300 req/min | per user ID |
| /webhooks/stripe | Unlimited (HMAC auth) | N/A |
| /health | Unlimited | N/A |

### 429 Response Format

Per RFC 7231 (required by Kenji's review, email_09):
```json
{
  "error": "Rate limit exceeded",
  "retry_after": 45
}
```
`Retry-After` header is also set on all 429 responses.

## Stripe Webhook Exception

The `/webhooks/stripe` endpoint is **exempt from IP-based rate limiting**. This was decided in email_12 after evaluating two options:

**Option 1 (rejected):** Whitelist Stripe's published IP ranges  
- Risk: Stripe's IP ranges change; whitelist becomes stale  
- Operationally fragile

**Option 2 (approved):** Dedicated endpoint with HMAC signature verification  
- Verifies `Stripe-Signature` header using Stripe's webhook secret  
- Cryptographically guarantees authenticity regardless of IP  
- More secure and operationally simpler

Implementation in NEX-240, PR #56.

## Security Audit Logging

All rate-limited (throttled) requests are logged to the security audit trail with:
- Timestamp
- Key (IP + user ID)
- Endpoint
- Request count at time of throttle

This was a non-blocking suggestion from Kenji's review (email_09) that was implemented.

## Related Documents

- [Payments Architecture](payments-architecture.md) — how rate limiting integrates with Payments
- Ticket NEX-231 — original issue and Stripe conflict
- Ticket NEX-233 — X-Forwarded-For fix
- email_04 — original discovery of Stripe webhook conflict
- email_09 — Kenji's security review
- email_12 — Priya's decision to use HMAC approach
