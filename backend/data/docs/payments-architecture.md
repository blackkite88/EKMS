---
access:
  department: engineering
  projects: [payments, infra]
  min_clearance: 2
  sensitivity: internal
---
# Payments Service Architecture

**Related:** NEX-204, architecture_review_01, email_04

## Topology
Standalone microservice in a dedicated VPC subnet (10.0.4.0/24, NEX-218) for PCI-DSS network segmentation — the gap from email_02.

## Endpoints
- POST /payments/charge (NEX-212, PR #55)
- POST /payments/refund (NEX-215, PR #53)
- POST /webhooks/stripe — HMAC verification, bypasses IP limiter (NEX-240, email_10)

## Audit Logging
All payment events write to an immutable payment_audit_log before business logic (NEX-219, PCI-DSS 10.2).

## Card Data
Nexora never stores card data; Stripe tokenization only. See docs/stripe-integration-guide.md, docs/api-rate-limiting.md, docs/pci-dss-compliance.md.
