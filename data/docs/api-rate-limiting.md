---
access:
  department: engineering
  projects: [payments, infra]
  min_clearance: 2
  sensitivity: internal
---
# API Rate Limiting

**Related:** NEX-231, NEX-233, email_04, email_09, email_10, PR #47

## Implementation
Express middleware. Composite key uses X-Forwarded-For + user id (Kenji's review, email_09, NEX-233). 429 responses include Retry-After.

## Stripe Webhook Exception
The /webhooks/stripe endpoint is exempt from IP rate limiting; authenticity is enforced via Stripe HMAC signature (Option 2, email_10, NEX-240) rather than IP whitelisting.

## Security note
The HMAC verification MUST be enforced before the endpoint is exposed. A premature rollout is a forged-request risk.
