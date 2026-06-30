# Q4 2024 Engineering Roadmap — Nexora Inc.

**Last Updated:** 2024-11-15  
**Author:** Raj Patel, Priya Sharma  
**Related:** email_10, all_hands_q4, NEX-204, NEX-189, NEX-198, NEX-231, NEX-210

## Vision

Q4 is Nexora's monetization and scale quarter. We are shipping the Payments feature to unlock the Enterprise tier, completing critical infrastructure upgrades, and improving performance to support our growing customer base.

## Initiative Summary

### 1. Payments Feature (NEX-204) — DELAYED
**Owner:** Priya Sharma (EM), Arjun Mehta (tech lead)  
**Original Target:** December 15, 2024  
**Revised Target:** January 20, 2025  
**Delay Reason:** PCI-DSS Level 1 compliance gaps (NEX-217) and Stripe webhook rate limiting conflict (NEX-231). Full context: email_03, standup_03.  
**Revenue Impact:** $2.1M ARR in Q1 2025 upon launch.  
**Status:** Core APIs done (NEX-212, NEX-215). Compliance work in progress (NEX-217, NEX-218, NEX-219, NEX-220). Pen test scheduled Nov 25.

### 2. Database Migration (NEX-189) — DONE ✓
**Owner:** Diana Chen  
**Completed:** November 3, 2024  
**Outcome:** PostgreSQL 13 → 16, events table partitioned, 40% query improvement. Minor incident (NEX-244) resolved Nov 10.

### 3. Search Performance (NEX-198) — IN PROGRESS
**Owner:** Riya Desai  
**Target:** P95 < 200ms by end of Sprint 23  
**Current:** 210ms P95 (was 380ms baseline)  
**Approach:** See search-optimization-plan.md

### 4. API Rate Limiting (NEX-231) — IN REVIEW
**Owner:** Arjun Mehta  
**Target:** Merged before Payments go-live  
**Status:** PR #47 security review complete (email_09). Stripe webhook exception implemented (NEX-240, PR #56).

### 5. Mobile SDK v2 (NEX-210) — IN PROGRESS
**Owner:** Mobile Team  
**Target:** December 31, 2024  
**Note:** Parallel track. No shared backend engineers.

## Q4 Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Pen test findings require additional work | Medium | High | Started pen test Nov 25 — 6 weeks before Jan 20 target |
| Search P95 misses 200ms target | Low | Medium | Multiple optimization levers still available |
| Payments scope creep (Adyen failover) | Low | Medium | Adyen explicitly deferred to Phase 2 (architecture_review_01) |
| Staff availability over holiday period | Medium | Medium | Avoid critical launches Dec 20 - Jan 5 |

## Key Dates

| Date | Event |
|------|-------|
| Nov 3 | Database migration — DONE |
| Nov 10 | Search incident — RESOLVED |
| Nov 25 - Dec 6 | Pen test window |
| Dec 15 | Original Payments target (MISSED) |
| Jan 20, 2025 | Revised Payments target |
