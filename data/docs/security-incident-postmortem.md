---
access:
  department: security
  projects: [security]
  min_clearance: 5
  sensitivity: restricted
---
# [RESTRICTED] Security Incident Post-Mortem — INC-001

**RESTRICTED. Related:** NEX-260, NEX-261, email_13, email_14, email_15, incident_bridge_01, security_postmortem_01

## Summary
On Dec 2, 2024 an attacker forged Stripe webhook calls to /webhooks (NEX-240) before HMAC verification was fully enforced, accessing internal customer IDs and transaction amounts for ~90 minutes. No cardholder data (Stripe tokenization).

## Root Cause
Premature rollout of the /webhooks endpoint without enforced HMAC verification — exactly the risk in Kenji's PR #47 review (email_09). The entry vector is the rate-limiter webhook gap first raised in NEX-231 and email_04. Contributing factor: schedule pressure from the Payments delay (email_03).

## Remediation
HMAC enforced + replay protection (PR #61, NEX-261). Security-review sign-off is now a hard merge gate for payment endpoints.

## Disclosure
Regulators notified within 72h; customer disclosure approved by the CTO (email_14).
