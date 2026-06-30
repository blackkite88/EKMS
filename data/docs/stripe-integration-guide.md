# Stripe Integration Guide — Nexora Payments

**Last Updated:** 2024-11-15  
**Author:** Arjun Mehta  
**Related:** NEX-204, NEX-212, NEX-215, NEX-240, NEX-231, email_04, email_12, payments-architecture.md

## Overview

This guide covers the Stripe integration for Nexora's Payments feature. Stripe is the primary payment processor. Integration uses Stripe PaymentIntents API for charges and Stripe Refunds API for refunds.

## API Keys

Stripe API keys are stored in AWS Secrets Manager:
- Development: `/nexora/dev/stripe` (provisioned in NEX-207)
- Staging: `/nexora/staging/stripe`
- Production: `/nexora/prod/stripe` (to be provisioned before January 20 launch)

Never hardcode API keys. Never commit API keys. Use `aws secretsmanager get-secret-value` or the application's secrets loader.

## Charge Flow

```
Client → POST /payments/charge
  │
  ▼
Write to payment_audit_log (BEFORE processing) ← PCI-DSS requirement NEX-219
  │
  ▼
stripe.paymentIntents.create({ amount, currency, payment_method, confirm: true })
  │
  ▼
Handle result:
  ├── succeeded → return { payment_intent_id, status: 'succeeded', amount }
  ├── requires_action → return { client_secret } for 3DS authentication
  └── error → return appropriate error code
```

## Refund Flow

```
Client → POST /payments/refund
  │
  ▼
Validate: refund amount ≤ original charge amount (partial refund edge case — NEX-215)
  │
  ▼
Write to payment_audit_log
  │
  ▼
stripe.refunds.create({ payment_intent: id, amount: amountOrUndefined })
  │
  ▼
Return { refund_id, status, refunded_amount }
```

## Webhook Handling

Stripe sends webhook events for asynchronous payment status updates. As documented in email_04, Stripe retries webhooks 3-5 times per failure using a small IP range, which conflicted with the original rate limiter.

**Solution (email_12, NEX-240):** Dedicated `/webhooks/stripe` endpoint:
1. Verify `Stripe-Signature` header using `stripe.webhooks.constructEvent()`
2. Return 200 immediately
3. Process event asynchronously via Bull queue

Events handled:
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.refunded`
- `charge.dispute.created`

## Error Handling

| Stripe Error | HTTP Status | User Message |
|-------------|-------------|--------------|
| `card_declined` | 402 | Card declined. Please use a different payment method. |
| `insufficient_funds` | 402 | Insufficient funds. |
| `authentication_required` | 402 | Additional authentication required. |
| `rate_limit` | 429 | Payment processor busy. Retry in a moment. |
| Network timeout | 502 | Payment service temporarily unavailable. |

Always log the full Stripe error to the audit log. Never expose raw Stripe error objects to clients.

## Testing

Use Stripe test mode keys for development and staging. Test card numbers:
- Success: `4242 4242 4242 4242`
- Decline: `4000 0000 0000 0002`
- 3DS required: `4000 0027 6000 3184`

See Stripe documentation for full test card list.

## Related Documents

- [Payments Architecture](payments-architecture.md)
- [API Rate Limiting](api-rate-limiting.md) — webhook rate limit exception
- [PCI-DSS Compliance](pci-dss-compliance.md)
