---
access:
  department: engineering
  projects: [search]
  min_clearance: 1
  sensitivity: public
---
# Security Policy — Nexora Inc.

## PR Review
All auth, rate-limiting, and payment endpoints require a security-review sign-off from the Security Lead before merge. Public webhook endpoints must enforce signature verification before exposure.

## Incident Response
Suspected incidents are reported to the Security Lead immediately and tracked as restricted INC-xxx tickets. Regulator notification within 72 hours where required.

## Access Control
Attribute-based: clearance level + department + project scope. Sensitive material is restricted to cleared personnel.
