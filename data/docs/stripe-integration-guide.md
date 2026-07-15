---
access:
  department: engineering
  projects: [payments, infra]
  min_clearance: 2
  sensitivity: internal
---
# Stripe Integration Guide

**Related:** NEX-204, NEX-212, NEX-215, NEX-240, email_04, email_10

## Keys
AWS Secrets Manager: /nexora/dev/stripe (NEX-207).

## Charge Flow
Write to payment_audit_log (NEX-219) BEFORE calling stripe.paymentIntents.create.

## Webhooks
Dedicated /webhooks/stripe verifies the Stripe-Signature header via HMAC (email_10, NEX-240). Return 200 immediately, process async. Signature verification MUST be enforced before exposing the endpoint.
