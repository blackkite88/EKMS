---
access:
  department: engineering
  projects: [payments]
  min_clearance: 4
  sensitivity: confidential
---
# PCI-DSS Level 1 Compliance — Nexora Payments

**Related:** NEX-217, NEX-218, NEX-219, NEX-220, email_02, email_03

## Gaps (Nov 8)
1. Network segmentation (NEX-218) — dedicated payments VPC
2. Audit logging (NEX-219) — immutable payment_audit_log
3. Penetration test (NEX-220) — SecureForge, Nov 25 - Dec 6

The pen test's 3-4 week lead time is the primary cause of the Dec 15 -> Jan 20 slip (email_02, email_03).

## Card Data
Stripe tokenization only. QSA audit follows a clean pen test.
