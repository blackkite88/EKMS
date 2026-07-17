// Dataset generator for Nexora Knowledge Brain.
// Produces ~75 cross-referenced files across 4 storylines with ABAC attributes.
// Run: node gen-dataset.mjs /path/to/data
import fs from 'fs';
import path from 'path';

const OUT = process.argv[2];
if (!OUT) { console.error('usage: node gen-dataset.mjs <dataDir>'); process.exit(1); }

const dirs = ['emails', 'meetings', 'tickets', 'docs', 'github'];
for (const d of dirs) fs.mkdirSync(path.join(OUT, d), { recursive: true });

const w = (sub, name, content) =>
  fs.writeFileSync(path.join(OUT, sub, name), typeof content === 'string' ? content : JSON.stringify(content, null, 2));

// ABAC presets
const AC = {
  pubEng:   { department: 'engineering', projects: ['search'],   min_clearance: 1, sensitivity: 'public' },
  intEng:   { department: 'engineering', projects: ['payments','infra'], min_clearance: 2, sensitivity: 'internal' },
  payConf:  { department: 'engineering', projects: ['payments'], min_clearance: 4, sensitivity: 'confidential' },
  infra:    { department: 'engineering', projects: ['infra'],    min_clearance: 2, sensitivity: 'internal' },
  search:   { department: 'engineering', projects: ['search'],   min_clearance: 1, sensitivity: 'public' },
  secRestr: { department: 'security',    projects: ['security'], min_clearance: 5, sensitivity: 'restricted' },
  execRestr:{ department: 'executive',   projects: ['security'], min_clearance: 5, sensitivity: 'restricted' },
};

// ─────────────────────────────────────────────────────────────────────────────
// EMAILS (18)
// ─────────────────────────────────────────────────────────────────────────────
const emails = [
  // A — Payments (already wrote email_01 by hand; regenerate all for consistency)
  { id:'email_01', access:AC.intEng, from:'priya.sharma@nexora.com', to:['engineering@nexora.com'],
    subject:'Payments Feature — Sprint Kickoff', date:'2024-11-04T09:15:00Z',
    body:'Hi team,\n\nKicking off the Payments feature sprint. Per the Q4 roadmap we are targeting a December 15, 2024 release.\n\nDeliverables:\n- Stripe payment gateway integration — Arjun Mehta\n- PCI-DSS compliance audit — Kenji Nakamura\n- Charge/refund backend API — Riya Desai\n\nPlease review ticket NEX-204 (Payments epic). The PCI-DSS requirement is a go-live blocker, so Kenji flag issues early.\n\nBest,\nPriya Sharma, Engineering Manager',
    linked_tickets:['NEX-204'], linked_meetings:['standup_01'] },

  { id:'email_02', access:AC.intEng, from:'kenji.nakamura@nexora.com', to:['priya.sharma@nexora.com'], cc:['engineering@nexora.com'],
    subject:'RE: Payments — PCI-DSS Compliance Blocker', date:'2024-11-08T14:32:00Z',
    body:'Hi Priya,\n\nMy PCI-DSS audit found a critical blocker: our infrastructure does not meet PCI-DSS Level 1 for cardholder data.\n\nGaps:\n1. No network segmentation between payments and the general app layer.\n2. Card transaction audit logging not implemented.\n3. A third-party penetration test is required before certification.\n\nThe pen test alone has a 3-4 week lead time. December 15 is no longer achievable. I raised this in NEX-217 and we discussed it in standup_03. Targeting mid-January at the earliest.\n\nKenji Nakamura, Security Lead',
    linked_tickets:['NEX-217','NEX-204'], linked_meetings:['standup_03'] },

  { id:'email_03', access:AC.payConf, from:'priya.sharma@nexora.com', to:['raj.patel@nexora.com'],
    subject:'Payments Delay — Executive Summary', date:'2024-11-09T10:00:00Z',
    body:'Hi Raj,\n\nHeads-up before the board call: Payments will slip from December 15 to approximately January 20, 2025.\n\nRoot cause: PCI-DSS Level 1 compliance gaps found by Kenji (email_02) require infrastructure changes and a mandatory third-party pen test (3-4 weeks). Secondary factor: the API rate limiter conflicts with Stripe webhooks (NEX-231, PR #47). We also underestimated compliance scope.\n\nJanuary 20 is achievable if the pen-test vendor is contracted this week.\n\nPriya',
    linked_tickets:['NEX-204','NEX-231','NEX-217'], linked_emails:['email_02'], linked_prs:['pr_47'] },

  { id:'email_04', access:AC.intEng, from:'arjun.mehta@nexora.com', to:['priya.sharma@nexora.com'],
    subject:'API Rate Limiting — Stripe Webhook Conflict', date:'2024-11-06T16:45:00Z',
    body:'Hi Priya,\n\nStripe integration issue: our API rate limiter (PR #47, branch feature/api-rate-limiting) throttles Stripe webhook retries under load. Stripe retries 3-5x per failed webhook from a small IP range, so it consistently hits our 100 req/min per-IP limit.\n\nOptions:\n1. Whitelist Stripe IP ranges in the limiter.\n2. A dedicated /webhooks endpoint bypassing rate limiting, with HMAC signature verification.\n\nI prefer option 2 for security. Documented both in docs/api-rate-limiting.md. NEX-231 tracks this — need your decision to unblock the sprint.\n\nArjun',
    linked_tickets:['NEX-231'], linked_prs:['pr_47'], linked_docs:['api-rate-limiting'] },

  { id:'email_05', access:AC.infra, from:'diana.chen@nexora.com', to:['engineering@nexora.com'],
    subject:'Database Migration — Approval Required', date:'2024-10-21T11:00:00Z',
    body:'Hi all,\n\nRequesting formal approval for the PostgreSQL migration in NEX-189, documented in docs/database-migration-plan.md.\n\n- PostgreSQL 13 -> 16\n- Partition the events table (180M rows)\n- 4-hour maintenance window, Sunday Nov 3, 02:00 IST\n- Rollback: logical replication standby kept live post-migration\n\nApprovals needed from Raj Patel (CTO) and Priya Sharma (EM). Reply by Oct 28.\n\nDiana Chen, Database Architect',
    linked_tickets:['NEX-189'], linked_docs:['database-migration-plan'] },

  { id:'email_06', access:AC.infra, from:'raj.patel@nexora.com', to:['diana.chen@nexora.com'], cc:['priya.sharma@nexora.com'],
    subject:'RE: Database Migration — Approved', date:'2024-10-23T09:30:00Z',
    body:'Hi Diana,\n\nReviewed docs/database-migration-plan.md and NEX-189. Approved from my side as CTO, with conditions:\n1. Keep the logical replication standby live for 72 hours (not 48).\n2. Confirm on-call is briefed for the full window.\n3. Company-wide maintenance notice 48h ahead.\n\nGreen light for November 3.\n\nRaj Patel, CTO',
    linked_tickets:['NEX-189'], linked_emails:['email_05'], linked_docs:['database-migration-plan'] },

  { id:'email_07', access:AC.infra, from:'priya.sharma@nexora.com', to:['diana.chen@nexora.com'],
    subject:'RE: Database Migration — Team Coordination Approved', date:'2024-10-24T08:15:00Z',
    body:'Hi Diana,\n\nApproved from the EM side. On-call rota: Arjun primary, Riya backup. I sent the maintenance notice to all@nexora.com per Raj.\n\nPlease update the runbook (docs/database-migration-plan.md) with the 72-hour rollback window Raj specified.\n\nPriya',
    linked_tickets:['NEX-189'], linked_emails:['email_06'], linked_docs:['database-migration-plan'] },

  { id:'email_08', access:AC.intEng, from:'riya.desai@nexora.com', to:['engineering@nexora.com'],
    subject:'Search Performance Incident — Post-Mortem', date:'2024-11-12T13:00:00Z',
    body:'Hi team,\n\nPost-mortem for the Nov 10 search degradation.\n\nTimeline:\n- 14:30 users report search timeouts\n- 14:45 on-call (me) alerted\n- 15:10 root cause: missing index on documents.created_at\n- 15:45 hotfix applied (NEX-244), index rebuilt, restored\n\nRoot cause: the Nov 3 migration (NEX-189) post-migration script silently dropped and failed to recreate the created_at index. See PR #52. Full write-up in docs/incident-postmortem-nov10.md.\n\nAction items:\n1. Index verification step in runbook — Diana — Nov 19\n2. Automated index health checks — Kenji — Nov 22\n\nRiya Desai',
    linked_tickets:['NEX-244','NEX-189'], linked_prs:['pr_52'], linked_docs:['incident-postmortem-nov10','database-migration-plan'] },

  { id:'email_09', access:AC.intEng, from:'kenji.nakamura@nexora.com', to:['arjun.mehta@nexora.com'],
    subject:'Security Review — PR #47 API Rate Limiter', date:'2024-11-07T11:20:00Z',
    body:'Hi Arjun,\n\nReviewed PR #47. Two blockers:\n1. The limiter keys on direct IP only. Behind a load balancer/NAT this throttles multiple legit users sharing an egress IP. Check X-Forwarded-For and use a composite key.\n2. No protection against rotating-IP attacks. Add a per-user token bucket.\n\nNon-blocking: add a Retry-After header; log throttled requests to the security audit trail. Context in docs/api-rate-limiting.md. Required before NEX-231 closes.\n\nKenji',
    linked_tickets:['NEX-231','NEX-233'], linked_prs:['pr_47'], linked_docs:['api-rate-limiting'] },

  { id:'email_10', access:AC.intEng, from:'priya.sharma@nexora.com', to:['arjun.mehta@nexora.com'],
    subject:'Decision: Rate Limiter Approach for Stripe Webhooks', date:'2024-11-10T09:00:00Z',
    body:'Hi Arjun,\n\nApproving Option 2: a dedicated /webhooks endpoint with HMAC verification, bypassing the IP limiter. It is more secure than IP whitelisting and Stripe IPs change. Also fix Kenji\'s X-Forwarded-For and Retry-After points in PR #47 (email_09) before merge.\n\nThis unblocks NEX-231 and the Payments sprint.\n\nPriya',
    linked_tickets:['NEX-231','NEX-240','NEX-233'], linked_emails:['email_04','email_09'], linked_prs:['pr_47'] },

  { id:'email_11', access:AC.infra, from:'diana.chen@nexora.com', to:['engineering@nexora.com'],
    subject:'Database Migration — Post-Migration Report', date:'2024-11-04T06:00:00Z',
    body:'Hi team,\n\nThe PostgreSQL migration (NEX-189) completed overnight.\n\n- Start 02:05, end 05:48 IST (under the 4h window)\n- PG 13.12 -> 16.1, events table partitioned, ~40% query improvement\n- Standby live until Nov 6 (72h); zero data loss verified\n\nKnown issue: the post-migration index rebuild warned on documents.created_at. Opened NEX-244 — see email_08 for the incident that followed.\n\nThanks Arjun (primary on-call) and Riya (backup).\n\nDiana',
    linked_tickets:['NEX-189','NEX-244'], linked_emails:['email_08'], linked_docs:['database-migration-plan'] },

  { id:'email_12', access:AC.pubEng, from:'raj.patel@nexora.com', to:['all@nexora.com'],
    subject:'Q4 Engineering Priorities — All-Hands Recap', date:'2024-11-01T17:00:00Z',
    body:'Team,\n\nQ4 priorities:\n1. Payments (NEX-204) — flagship, target Dec 15, Priya leading.\n2. Database Migration (NEX-189) — Nov 3 window, Diana.\n3. Search Performance (NEX-198) — P95 < 200ms, Riya.\n4. API Rate Limiting (NEX-231) — required for Payments, Arjun.\n5. Mobile SDK v2 (NEX-210) — mobile team.\n\nPayments is highest priority; escalate blockers immediately.\n\nRaj Patel, CTO',
    linked_tickets:['NEX-204','NEX-189','NEX-198','NEX-231','NEX-210'], linked_meetings:['all_hands_q4'] },

  // B — Security breach (RESTRICTED)
  { id:'email_13', access:AC.secRestr, from:'kenji.nakamura@nexora.com', to:['raj.patel@nexora.com'], cc:['security@nexora.com'],
    subject:'[RESTRICTED] Security Incident — Unauthorized Access Detected', date:'2024-12-02T22:40:00Z',
    body:'Raj,\n\nRESTRICTED — do not forward.\n\nAt 21:10 IST our WAF flagged anomalous traffic against the payments service. Investigation confirms an attacker exploited the very rate-limiter webhook gap discussed in NEX-231 / email_04: the /webhooks endpoint (NEX-240) shipped before HMAC verification was fully enforced, allowing forged webhook calls that leaked internal payment metadata for ~90 minutes.\n\nNo cardholder data was exposed (Stripe tokenization held), but internal customer IDs and transaction amounts were accessed. This is a reportable incident. Tracking as INC-001 (NEX-260).\n\nConvening the incident response bridge now. Kenji',
    linked_tickets:['NEX-260','NEX-240','NEX-231'], linked_emails:['email_04'] },

  { id:'email_14', access:AC.execRestr, from:'raj.patel@nexora.com', to:['kenji.nakamura@nexora.com','priya.sharma@nexora.com'],
    subject:'[RESTRICTED] RE: Security Incident — Disclosure Plan', date:'2024-12-03T08:00:00Z',
    body:'Kenji, Priya,\n\nRESTRICTED. Contain first, then we plan disclosure. Legal and I will handle regulator notification within the 72-hour window. Do NOT communicate outside this thread.\n\nActions:\n1. Kenji: full forensic timeline for INC-001 (NEX-260) by EOD.\n2. Priya: expedite the HMAC verification fix (NEX-240) — this is now P0.\n3. Prepare a customer disclosure draft; I approve before anything ships.\n\nThe root cause is the premature /webhooks rollout — the exact risk flagged in Kenji\'s review (email_09). We will cover process failures in the post-mortem (doc: security-incident-postmortem).\n\nRaj',
    linked_tickets:['NEX-260','NEX-240'], linked_emails:['email_13','email_09'], linked_docs:['security-incident-postmortem'] },

  { id:'email_15', access:AC.secRestr, from:'kenji.nakamura@nexora.com', to:['security@nexora.com'],
    subject:'[RESTRICTED] INC-001 Forensic Timeline', date:'2024-12-03T18:30:00Z',
    body:'Team,\n\nRESTRICTED. INC-001 (NEX-260) forensic timeline:\n- Dec 2 21:10 — first forged webhook call accepted (missing HMAC check, NEX-240)\n- 21:12-22:40 — attacker enumerated payment metadata via replayed webhook events\n- 22:40 — WAF anomaly alert, endpoint disabled\n- 23:05 — HMAC verification hotfix deployed (PR #61)\n\nExposure: internal customer IDs, transaction amounts. No card data (Stripe tokenization). Entry vector traces to the rate-limiter webhook gap first raised in NEX-231 and email_04, and to the review comments in email_09 that were not fully addressed before rollout. Full write-up: docs/security-incident-postmortem.md.\n\nKenji',
    linked_tickets:['NEX-260','NEX-240','NEX-231'], linked_emails:['email_13','email_09','email_04'], linked_prs:['pr_61'], linked_docs:['security-incident-postmortem'] },

  // C/D — normal threads
  { id:'email_16', access:AC.search, from:'riya.desai@nexora.com', to:['engineering@nexora.com'],
    subject:'Search Optimization — Progress Update', date:'2024-11-15T10:00:00Z',
    body:'Hi all,\n\nSearch P95 is down to 210ms from a 380ms baseline (NEX-198). Done: GIN index (PR #48), query caching (PR #49), rebuilt created_at index post-incident (PR #52). Remaining: connection pool tuning. Details in docs/search-optimization-plan.md.\n\nRiya',
    linked_tickets:['NEX-198'], linked_prs:['pr_48','pr_49','pr_52'], linked_docs:['search-optimization-plan'] },

  { id:'email_17', access:AC.pubEng, from:'diana.chen@nexora.com', to:['engineering@nexora.com'],
    subject:'Engineering Onboarding — New Hires', date:'2024-11-18T09:00:00Z',
    body:'Welcome new engineers! Start with docs/engineering-onboarding.md and docs/engineering-runbook.md. Key people: Raj Patel (CTO), Priya Sharma (EM), Kenji Nakamura (Security), Diana Chen (DB), Arjun Mehta (Payments), Riya Desai (Search). Ask in #engineering.\n\nDiana',
    linked_docs:['engineering-onboarding','engineering-runbook'] },

  { id:'email_18', access:AC.intEng, from:'arjun.mehta@nexora.com', to:['priya.sharma@nexora.com'],
    subject:'Payments — Charge & Refund Endpoints Done', date:'2024-11-15T17:30:00Z',
    body:'Hi Priya,\n\nCharge (NEX-212, PR #55) and refund (NEX-215, PR #53) endpoints are merged with full tests. Both write to the payment_audit_log before processing per the PCI design (NEX-219). The /webhooks endpoint (NEX-240) is in progress. Architecture is in docs/payments-architecture.md and docs/stripe-integration-guide.md.\n\nArjun',
    linked_tickets:['NEX-212','NEX-215','NEX-219','NEX-240'], linked_prs:['pr_55','pr_53'], linked_docs:['payments-architecture','stripe-integration-guide'] },
];
for (const e of emails) w('emails', `${e.id}.json`, e);

// ─────────────────────────────────────────────────────────────────────────────
// MEETINGS (12) — TXT with YAML frontmatter for access
// ─────────────────────────────────────────────────────────────────────────────
const fm = (access) =>
  `---\naccess:\n  department: ${access.department}\n  projects: [${access.projects.join(', ')}]\n  min_clearance: ${access.min_clearance}\n  sensitivity: ${access.sensitivity}\n---\n`;

const meetings = [
  { id:'standup_01', access:AC.intEng, body:`Meeting: Engineering Standup\nDate: 2024-11-04\nAttendees: Priya Sharma, Arjun Mehta, Riya Desai, Kenji Nakamura, Diana Chen\n\nPRIYA: Sent Payments kickoff (email_01). Reviewing NEX-204.\nARJUN: Starting Stripe integration for NEX-204. Waiting on API keys (NEX-207).\nRIYA: Reviewing payments API spec, drafting refund tests.\nKENJI: Starting PCI-DSS compliance assessment.\nDIANA: Finalized migration plan NEX-189, sending approval (email_05).\n\nACTION ITEMS:\n- Arjun: follow up on Stripe keys NEX-207\n- Kenji: PCI-DSS findings by Nov 8` },
  { id:'standup_03', access:AC.intEng, body:`Meeting: Engineering Standup\nDate: 2024-11-08\nAttendees: Priya, Arjun, Riya, Kenji, Diana\n\nKEY DISCUSSION — Payments Timeline:\nPriya announced Payments (NEX-204) slips from Dec 15 to ~Jan 20, 2025.\nReasons:\n1. PCI-DSS gaps need a 3-4 week pen test + infra changes (Kenji, email_02, NEX-217)\n2. API rate limiter conflicts with Stripe webhooks (Arjun, NEX-231)\n3. Compliance scope underestimated\nTeam agreed Jan 20 is achievable if the pen-test vendor is contracted by Nov 12. PR #47 review (email_09) must be resolved before NEX-231 closes.\n\nACTION ITEMS:\n- Priya: exec summary to Raj (done, email_03)\n- Kenji: contract pen-test vendor by Nov 12\n- Arjun: address PR #47 review (email_09)` },
  { id:'standup_04', access:AC.intEng, body:`Meeting: Engineering Standup\nDate: 2024-11-11\nAttendees: Priya, Arjun, Riya, Kenji, Diana\n\nARJUN: Addressed Kenji's PR #47 comments. Starting /webhooks endpoint per email_10 decision (NEX-240).\nRIYA: Wrote Nov 10 incident post-mortem (email_08). Monitoring search.\nKENJI: Contracted pen-test vendor, scheduled Nov 25 - Dec 6.\nDIANA: Root-caused NEX-244, updating runbook index checklist.\n\nACTION ITEMS:\n- Arjun: /webhooks PR by Nov 15\n- Diana: runbook index checklist by Nov 19` },
  { id:'sprint_review_01', access:AC.intEng, body:`Meeting: Sprint Review — Sprint 22\nDate: 2024-11-15\nAttendees: Priya, Arjun, Riya, Kenji, Diana, Raj Patel\n\nCOMPLETED:\n- NEX-189 PostgreSQL migration (email_11)\n- NEX-231 rate limiter PR #47 (pending merge)\n- NEX-244 search index hotfix PR #52\n- NEX-212 charge / NEX-215 refund endpoints\nDELAYED:\n- NEX-204 Payments -> Jan 20 (email_03)\n- NEX-217 PCI infra -> pen test Nov 25\n\nRAJ: Wants daily pen-test updates Nov 25 - Dec 6. Confirms Jan 20 acceptable.\n\nACTION ITEMS:\n- Kenji: daily pen-test updates from Nov 25\n- Arjun: merge /webhooks PR by Nov 18` },
  { id:'architecture_review_01', access:AC.intEng, body:`Meeting: Architecture Review — Payments Service\nDate: 2024-11-05\nAttendees: Priya, Arjun, Diana, Kenji\n\nDECISIONS:\n1. Network isolation: payments in a dedicated VPC subnet (PCI-DSS, NEX-218) — the gap from email_02.\n2. Audit logging: all payment events to an immutable audit log before business logic (NEX-219).\n3. Encryption: Stripe tokenization only; no card data stored at Nexora.\n4. Webhooks: dedicated /webhooks endpoint with HMAC verification (Option 2 from email_04, confirmed email_10, NEX-240).\n\nSecurity note (Kenji): pen test is a prerequisite for the QSA audit. Details in docs/payments-architecture.md and docs/pci-dss-compliance.md.\n\nACTION ITEMS:\n- Arjun: request review on PR #45\n- Kenji: PCI training schedule` },
  { id:'incident_review_01', access:AC.intEng, body:`Meeting: Incident Review — Search Degradation (Nov 10)\nDate: 2024-11-13\nAttendees: Priya, Riya, Diana, Kenji\n\nROOT CAUSE: The Nov 3 migration (NEX-189) post-cleanup script caught and swallowed a lock-timeout error, so the documents.created_at index was never recreated. Undetected 7 days -> full table scans on 180M rows -> timeouts.\nHOTFIX: PR #52 created the index concurrently.\nPREVENTIVE (email_08): runbook index verification (Diana, Nov 19); automated index health checks (Kenji, Nov 22).\nLESSON: never swallow errors in migration scripts. Docs: docs/incident-postmortem-nov10.md.` },
  { id:'all_hands_q4', access:AC.pubEng, body:`Meeting: Q4 All-Hands — Engineering\nDate: 2024-11-01\nAttendees: All Engineering, Raj Patel (CTO), Priya Sharma, Maya Iyer (Product)\n\nRAJ — Q4 priorities (recap in email_12):\n1. Payments (NEX-204) — Dec 15, Priya\n2. Database Migration (NEX-189) — Nov 3, Diana\n3. Search Performance (NEX-198) — P95 200ms, Riya\n4. API Rate Limiting (NEX-231) — Arjun\n5. Mobile SDK v2 (NEX-210)\n\nMAYA: Payments unlocks Enterprise tier, ~$2.1M ARR in Q1 2025.\nPRIYA: PCI-DSS is not optional; flagged timeline risk.` },
  { id:'standup_05', access:AC.search, body:`Meeting: Engineering Standup\nDate: 2024-11-14\nAttendees: Priya, Riya, Diana\n\nRIYA: Search P95 at 210ms (NEX-198). Working connection pool tuning.\nDIANA: Migration runbook updated with index verification checklist.\nPRIYA: Prepping sprint review.\n\nACTION ITEMS:\n- Riya: pool tuning results by sprint review` },
  { id:'product_sync_01', access:AC.pubEng, body:`Meeting: Product Sync\nDate: 2024-11-07\nAttendees: Maya Iyer (Product), Priya Sharma, Sarah Kim (Design)\n\nMAYA: Payments checkout UI designs handed off (Sarah). Waiting on final backend API spec.\nPRIYA: Flagged Payments may slip due to compliance; will confirm timeline this week.\nSARAH: Checkout flow ready; needs the charge/refund contract from NEX-212/NEX-215.` },
  // B — restricted meetings
  { id:'incident_bridge_01', access:AC.secRestr, body:`Meeting: [RESTRICTED] Incident Response Bridge — INC-001\nDate: 2024-12-02\nAttendees: Kenji Nakamura, Raj Patel, Priya Sharma\n\nRESTRICTED.\nKENJI: Unauthorized access via forged webhook calls to /webhooks (NEX-240) — HMAC verification was not fully enforced at rollout. Entry vector is the rate-limiter webhook gap from NEX-231 / email_04. Internal customer IDs and transaction amounts exposed for ~90 min. No card data. Tracking INC-001 (NEX-260).\nRAJ: Contain now, disclosure plan to follow (email_14). HMAC fix is P0.\nPRIYA: Expediting NEX-240 HMAC hotfix (PR #61).\n\nACTION ITEMS:\n- Kenji: forensic timeline (email_15) by EOD\n- Priya: deploy HMAC hotfix PR #61\n- Raj: regulator notification within 72h` },
  { id:'security_postmortem_01', access:AC.secRestr, body:`Meeting: [RESTRICTED] Security Post-Mortem — INC-001\nDate: 2024-12-08\nAttendees: Kenji, Raj, Priya, Diana\n\nRESTRICTED.\nSUMMARY: The breach (NEX-260) exploited the premature /webhooks rollout (NEX-240) that shipped before HMAC verification was enforced — exactly the risk in Kenji's PR #47 review (email_09). Contributing factor: schedule pressure from the Payments delay (email_03).\nFIXES: HMAC now enforced (PR #61); webhook endpoint gated behind signature check; added replay protection; security regression tests.\nPROCESS: security-review sign-off is now a hard merge gate for payment endpoints. Full doc: docs/security-incident-postmortem.md.` },
  { id:'board_security_brief', access:AC.execRestr, body:`Meeting: [RESTRICTED] Board Security Brief\nDate: 2024-12-10\nAttendees: Raj Patel (CTO), Board Members\n\nRESTRICTED — EXECUTIVE ONLY.\nRAJ: Briefed the board on INC-001 (NEX-260). Internal customer metadata exposed ~90 min via forged webhooks; no cardholder data. Regulators notified within 72h. Root cause: premature /webhooks rollout (NEX-240) under Payments schedule pressure. Remediation complete (PR #61); external QSA audit accelerated. Recommending a security-review merge gate and a hiring plan for the security team. Reference: docs/security-incident-postmortem.md.` },
];
for (const m of meetings) w('meetings', `${m.id}.txt`, fm(m.access) + m.body + '\n');

console.log('emails + meetings written');

// ─────────────────────────────────────────────────────────────────────────────
// TICKETS (20)
// ─────────────────────────────────────────────────────────────────────────────
const tickets = [
  { id:'ticket_NEX-204', access:AC.intEng, key:'NEX-204', title:'Payments Feature — Epic', type:'Epic', status:'In Progress', priority:'Critical', assignee:'Priya Sharma', reporter:'Raj Patel', created:'2024-10-15', updated:'2024-11-09', target_date:'2025-01-20', original_target:'2024-12-15',
    description:'Epic for the Payments feature (Stripe direct billing, Enterprise tier). Delayed due to PCI-DSS gaps (NEX-217) and the rate-limiter/Stripe webhook conflict (NEX-231). Context: email_03, standup_03.',
    linked_tickets:['NEX-217','NEX-231','NEX-212','NEX-215','NEX-240'], linked_emails:['email_01','email_02','email_03'], linked_meetings:['standup_03','architecture_review_01'], linked_prs:['pr_45','pr_47'] },
  { id:'ticket_NEX-217', access:AC.intEng, key:'NEX-217', title:'PCI-DSS Level 1 — Infrastructure Gaps', type:'Task', status:'In Progress', priority:'Critical', assignee:'Kenji Nakamura', reporter:'Kenji Nakamura', created:'2024-11-08', updated:'2024-11-12',
    description:'Three PCI-DSS Level 1 gaps for Payments (NEX-204): network segmentation (NEX-218), audit logging (NEX-219), pen test (NEX-220). Blocker for NEX-204. See email_02, standup_03.',
    linked_tickets:['NEX-204','NEX-218','NEX-219','NEX-220'], linked_emails:['email_02'], linked_meetings:['standup_03'], linked_docs:['pci-dss-compliance'] },
  { id:'ticket_NEX-231', access:AC.intEng, key:'NEX-231', title:'API Rate Limiting — Stripe Webhook Conflict', type:'Bug', status:'In Review', priority:'High', assignee:'Arjun Mehta', reporter:'Arjun Mehta', created:'2024-11-06', updated:'2024-11-12',
    description:'IP-based rate limiter (PR #47) throttles Stripe webhook retries. Approved fix (email_10): dedicated /webhooks endpoint with HMAC (NEX-240). Kenji review (email_09) also requires X-Forwarded-For fix (NEX-233). Blocker for NEX-204. NOTE: the webhook gap here was later exploited in the security incident.',
    linked_tickets:['NEX-204','NEX-240','NEX-233'], linked_emails:['email_04','email_09','email_10'], linked_prs:['pr_47'], linked_docs:['api-rate-limiting'] },
  { id:'ticket_NEX-189', access:AC.infra, key:'NEX-189', title:'Database Migration — PostgreSQL 13 to 16', type:'Task', status:'Done', priority:'High', assignee:'Diana Chen', reporter:'Diana Chen', created:'2024-10-10', updated:'2024-11-04',
    description:'Migrate PG 13.12 -> 16.1, partition events table. Approved by Raj (email_06) and Priya (email_07). Completed Nov 3 (email_11). Follow-up: NEX-244. Runbook: docs/database-migration-plan.md.',
    linked_tickets:['NEX-244'], linked_emails:['email_05','email_06','email_07','email_11'], linked_meetings:['incident_review_01'], linked_prs:['pr_50'], linked_docs:['database-migration-plan'] },
  { id:'ticket_NEX-244', access:AC.intEng, key:'NEX-244', title:'Missing Index on documents.created_at Post-Migration', type:'Bug', status:'Done', priority:'Critical', assignee:'Riya Desai', reporter:'Riya Desai', created:'2024-11-10', updated:'2024-11-11',
    description:'The created_at index was dropped during NEX-189 and not recreated (swallowed lock-timeout error). Caused Nov 10 search timeouts. Hotfix PR #52. Post-mortem: email_08, docs/incident-postmortem-nov10.md.',
    linked_tickets:['NEX-189','NEX-198'], linked_emails:['email_08'], linked_meetings:['incident_review_01'], linked_prs:['pr_52'], linked_docs:['incident-postmortem-nov10'] },
  { id:'ticket_NEX-198', access:AC.search, key:'NEX-198', title:'Search Performance — P95 < 200ms', type:'Task', status:'In Progress', priority:'High', assignee:'Riya Desai', reporter:'Raj Patel', created:'2024-10-12', updated:'2024-11-15',
    description:'Reduce search P95 from 380ms to <200ms (now 210ms). GIN index (PR #48), caching (PR #49), created_at rebuild (PR #52). Plan: docs/search-optimization-plan.md.',
    linked_tickets:['NEX-244'], linked_emails:['email_16'], linked_prs:['pr_48','pr_49','pr_52'], linked_docs:['search-optimization-plan'] },
  { id:'ticket_NEX-207', access:AC.intEng, key:'NEX-207', title:'Provision Stripe API Keys (Dev)', type:'Task', status:'Done', priority:'High', assignee:'DevOps', reporter:'Arjun Mehta', created:'2024-11-04', updated:'2024-11-06',
    description:'Provision Stripe test keys in dev secrets. Raised in standup_01, resolved Nov 6.', linked_tickets:['NEX-204'], linked_meetings:['standup_01'] },
  { id:'ticket_NEX-218', access:AC.payConf, key:'NEX-218', title:'PCI-DSS: Network Segmentation — Payments VPC', type:'Task', status:'In Progress', priority:'Critical', assignee:'Kenji Nakamura', reporter:'Kenji Nakamura', created:'2024-11-08', updated:'2024-11-12',
    description:'Dedicated VPC subnet 10.0.4.0/24 for payments, isolated from the app layer (PCI-DSS, NEX-217). Design agreed in architecture_review_01.',
    linked_tickets:['NEX-217','NEX-204'], linked_meetings:['architecture_review_01'], linked_docs:['payments-architecture','pci-dss-compliance'] },
  { id:'ticket_NEX-219', access:AC.payConf, key:'NEX-219', title:'PCI-DSS: Immutable Payment Audit Log', type:'Task', status:'In Progress', priority:'Critical', assignee:'Arjun Mehta', reporter:'Kenji Nakamura', created:'2024-11-08', updated:'2024-11-12',
    description:'Append-only payment_audit_log written before business logic (PCI-DSS 10.2, NEX-217). Partitioned like NEX-189. PR #46.',
    linked_tickets:['NEX-217','NEX-204'], linked_meetings:['architecture_review_01'], linked_prs:['pr_46'], linked_docs:['payments-architecture'] },
  { id:'ticket_NEX-220', access:AC.payConf, key:'NEX-220', title:'PCI-DSS: Third-Party Penetration Test', type:'Task', status:'Scheduled', priority:'Critical', assignee:'Kenji Nakamura', reporter:'Kenji Nakamura', created:'2024-11-08', updated:'2024-11-12',
    description:'Mandatory external pen test (SecureForge Ltd), Nov 25 - Dec 6. The 3-4 week lead time is the primary cause of the Dec 15 slip (email_02, email_03). Scope includes /webhooks (NEX-240).',
    linked_tickets:['NEX-217','NEX-204','NEX-240'], linked_emails:['email_02','email_03'], linked_meetings:['standup_03','sprint_review_01'] },
  { id:'ticket_NEX-212', access:AC.intEng, key:'NEX-212', title:'Payments — Stripe Charge Endpoint', type:'Story', status:'Done', priority:'High', assignee:'Arjun Mehta', reporter:'Priya Sharma', created:'2024-11-04', updated:'2024-11-15',
    description:'POST /payments/charge via Stripe PaymentIntents. Writes to payment_audit_log (NEX-219). PR #55.',
    linked_tickets:['NEX-204','NEX-219'], linked_emails:['email_18'], linked_prs:['pr_55'] },
  { id:'ticket_NEX-215', access:AC.intEng, key:'NEX-215', title:'Payments — Refund Endpoint', type:'Story', status:'Done', priority:'High', assignee:'Riya Desai', reporter:'Priya Sharma', created:'2024-11-04', updated:'2024-11-11',
    description:'POST /payments/refund, full + partial refunds. Writes to payment_audit_log (NEX-219). PR #53.',
    linked_tickets:['NEX-204','NEX-219'], linked_emails:['email_18'], linked_prs:['pr_53'] },
  { id:'ticket_NEX-210', access:AC.pubEng, key:'NEX-210', title:'Mobile SDK v2 — Offline Support', type:'Epic', status:'In Progress', priority:'Medium', assignee:'Mobile Team', reporter:'Raj Patel', created:'2024-10-15', updated:'2024-11-01',
    description:'Next-gen mobile SDK with offline-first sync. Parallel track (email_12, all_hands_q4).',
    linked_emails:['email_12'], linked_meetings:['all_hands_q4'] },
  { id:'ticket_NEX-233', access:AC.intEng, key:'NEX-233', title:'Rate Limiter: X-Forwarded-For Support', type:'Bug', status:'Done', priority:'High', assignee:'Arjun Mehta', reporter:'Kenji Nakamura', created:'2024-11-07', updated:'2024-11-12',
    description:'Per Kenji review (email_09): use X-Forwarded-For composite key, add Retry-After. Fixed in PR #47.',
    linked_tickets:['NEX-231'], linked_emails:['email_09','email_10'], linked_prs:['pr_47'], linked_docs:['api-rate-limiting'] },
  { id:'ticket_NEX-240', access:AC.intEng, key:'NEX-240', title:'Payments — Stripe Webhook Endpoint (HMAC)', type:'Story', status:'In Progress', priority:'High', assignee:'Arjun Mehta', reporter:'Arjun Mehta', created:'2024-11-10', updated:'2024-11-15',
    description:'Dedicated POST /webhooks/stripe with HMAC signature verification, bypassing the IP limiter (email_10). Handles payment_intent.succeeded/failed, charge.refunded. PR #56. IMPORTANT: an early rollout before HMAC was fully enforced became the entry vector for the security incident (NEX-260).',
    linked_tickets:['NEX-231','NEX-204','NEX-219','NEX-260'], linked_emails:['email_04','email_10'], linked_prs:['pr_56'], linked_docs:['api-rate-limiting','payments-architecture'] },
  { id:'ticket_NEX-208', access:AC.search, key:'NEX-208', title:'Search — Query Result Caching', type:'Story', status:'Done', priority:'Medium', assignee:'Riya Desai', reporter:'Riya Desai', created:'2024-10-28', updated:'2024-11-05',
    description:'Redis query cache, 60s TTL (NEX-198). PR #49.', linked_tickets:['NEX-198'], linked_prs:['pr_49'], linked_docs:['search-optimization-plan'] },
  { id:'ticket_NEX-250', access:AC.infra, key:'NEX-250', title:'Add Automated Index Health Checks', type:'Task', status:'In Progress', priority:'High', assignee:'Kenji Nakamura', reporter:'Riya Desai', created:'2024-11-12', updated:'2024-11-14',
    description:'Automated monitoring for missing/invalid indexes, from the Nov 10 post-mortem (email_08, NEX-244). Due Nov 22.',
    linked_tickets:['NEX-244'], linked_emails:['email_08'], linked_meetings:['incident_review_01'], linked_docs:['incident-postmortem-nov10'] },
  // B — restricted tickets
  { id:'ticket_NEX-260', access:AC.secRestr, key:'NEX-260', title:'[RESTRICTED] INC-001 — Unauthorized Payment Metadata Access', type:'Incident', status:'Resolved', priority:'Critical', assignee:'Kenji Nakamura', reporter:'Kenji Nakamura', created:'2024-12-02', updated:'2024-12-08',
    description:'RESTRICTED. Security incident INC-001. Attacker forged webhook calls to /webhooks (NEX-240) before HMAC verification was enforced, accessing internal customer IDs and transaction amounts for ~90 min. No cardholder data (Stripe tokenization). Entry vector = the rate-limiter webhook gap (NEX-231, email_04). Remediated by PR #61. Post-mortem: docs/security-incident-postmortem.md.',
    linked_tickets:['NEX-240','NEX-231','NEX-261'], linked_emails:['email_13','email_14','email_15'], linked_meetings:['incident_bridge_01','security_postmortem_01'], linked_prs:['pr_61'], linked_docs:['security-incident-postmortem'] },
  { id:'ticket_NEX-261', access:AC.secRestr, key:'NEX-261', title:'[RESTRICTED] Enforce HMAC + Replay Protection on Webhooks', type:'Task', status:'Done', priority:'Critical', assignee:'Arjun Mehta', reporter:'Kenji Nakamura', created:'2024-12-03', updated:'2024-12-03',
    description:'RESTRICTED. P0 remediation for INC-001 (NEX-260): enforce Stripe HMAC verification on all webhook calls, add replay/nonce protection, security regression tests. PR #61.',
    linked_tickets:['NEX-260','NEX-240'], linked_emails:['email_14','email_15'], linked_prs:['pr_61'], linked_docs:['security-incident-postmortem'] },
];
for (const t of tickets) w('tickets', `${t.id}.json`, t);
console.log('tickets written');

// ─────────────────────────────────────────────────────────────────────────────
// DOCS (14) — Markdown with YAML frontmatter for access
// ─────────────────────────────────────────────────────────────────────────────
const mdfm = (access) =>
  `---\naccess:\n  department: ${access.department}\n  projects: [${access.projects.join(', ')}]\n  min_clearance: ${access.min_clearance}\n  sensitivity: ${access.sensitivity}\n---\n`;

const docs = [
  { id:'payments-architecture', access:AC.intEng, body:`# Payments Service Architecture\n\n**Related:** NEX-204, architecture_review_01, email_04\n\n## Topology\nStandalone microservice in a dedicated VPC subnet (10.0.4.0/24, NEX-218) for PCI-DSS network segmentation — the gap from email_02.\n\n## Endpoints\n- POST /payments/charge (NEX-212, PR #55)\n- POST /payments/refund (NEX-215, PR #53)\n- POST /webhooks/stripe — HMAC verification, bypasses IP limiter (NEX-240, email_10)\n\n## Audit Logging\nAll payment events write to an immutable payment_audit_log before business logic (NEX-219, PCI-DSS 10.2).\n\n## Card Data\nNexora never stores card data; Stripe tokenization only. See docs/stripe-integration-guide.md, docs/api-rate-limiting.md, docs/pci-dss-compliance.md.` },
  { id:'database-migration-plan', access:AC.infra, body:`# Database Migration Plan — PostgreSQL 13 to 16\n\n**Approved:** Raj Patel (email_06), Priya Sharma (email_07). **Related:** NEX-189, NEX-244.\n\n## Outcome\nCompleted Nov 3 in 3h43m (email_11). Events table partitioned, ~40% improvement.\n\n## Index Verification Checklist (added post NEX-244)\nAfter post-migration scripts, verify indexes exist before re-enabling the app. The NEX-244 incident occurred because this was absent (email_08). Check idx_documents_created_at, idx_documents_content_gin, idx_events_created_at. If missing, CREATE INDEX CONCURRENTLY.\n\n## Rollback\nLogical replication standby stays live 72 hours (Raj's condition, email_06).` },
  { id:'api-rate-limiting', access:AC.intEng, body:`# API Rate Limiting\n\n**Related:** NEX-231, NEX-233, email_04, email_09, email_10, PR #47\n\n## Implementation\nExpress middleware. Composite key uses X-Forwarded-For + user id (Kenji's review, email_09, NEX-233). 429 responses include Retry-After.\n\n## Stripe Webhook Exception\nThe /webhooks/stripe endpoint is exempt from IP rate limiting; authenticity is enforced via Stripe HMAC signature (Option 2, email_10, NEX-240) rather than IP whitelisting.\n\n## Security note\nThe HMAC verification MUST be enforced before the endpoint is exposed. A premature rollout is a forged-request risk.` },
  { id:'incident-postmortem-nov10', access:AC.intEng, body:`# Incident Post-Mortem — Search Degradation (Nov 10)\n\n**Severity:** P1. **Related:** NEX-244, email_08, incident_review_01, PR #52\n\n## Root Cause\nThe NEX-189 migration cleanup script caught and swallowed a lock-timeout error, so idx_documents_created_at was never recreated. Undetected 7 days -> full scans on 180M rows -> timeouts.\n\n## Hotfix\nPR #52 created the index concurrently; restored at 15:45 IST.\n\n## Preventive Actions\n1. Index verification in runbook — Diana — Nov 19\n2. Automated index health checks — Kenji — Nov 22 (NEX-250)\n\n## Lesson\nNever swallow exceptions in migration scripts.` },
  { id:'search-optimization-plan', access:AC.search, body:`# Search Performance Optimization Plan\n\n**Related:** NEX-198, email_16\n\n## Goal\nP95 380ms -> <200ms (now 210ms).\n\n## Done\n- GIN index on documents.content (PR #48)\n- Redis query cache, 60s TTL (PR #49, NEX-208)\n- Rebuilt created_at index post-incident (PR #52)\n\n## Remaining\nConnection pool tuning; edge-case query analysis.` },
  { id:'engineering-onboarding', access:AC.pubEng, body:`# Engineering Onboarding — Nexora Inc.\n\n**Related:** email_17, all_hands_q4\n\n## Key People\n- Raj Patel — CTO (approves infra changes, e.g. email_06)\n- Priya Sharma — Engineering Manager\n- Kenji Nakamura — Security Lead (reviews security-touching PRs)\n- Diana Chen — Database Architect\n- Arjun Mehta — Payments lead\n- Riya Desai — Search owner\n\n## Workflow\nBranch from main, PR with 1+ reviewer (2 for security). Kenji reviews auth/rate-limiting/payments PRs. See docs/engineering-runbook.md.` },
  { id:'pci-dss-compliance', access:AC.payConf, body:`# PCI-DSS Level 1 Compliance — Nexora Payments\n\n**Related:** NEX-217, NEX-218, NEX-219, NEX-220, email_02, email_03\n\n## Gaps (Nov 8)\n1. Network segmentation (NEX-218) — dedicated payments VPC\n2. Audit logging (NEX-219) — immutable payment_audit_log\n3. Penetration test (NEX-220) — SecureForge, Nov 25 - Dec 6\n\nThe pen test's 3-4 week lead time is the primary cause of the Dec 15 -> Jan 20 slip (email_02, email_03).\n\n## Card Data\nStripe tokenization only. QSA audit follows a clean pen test.` },
  { id:'engineering-runbook', access:AC.pubEng, body:`# Engineering Runbook\n\n**Related:** engineering-onboarding, incident-postmortem-nov10\n\n## On-Call Severity\n- P1 <15min: search down, payments failing, DB unreachable\n- P2 <1h: elevated errors\n\n## Search Degradation\nCheck pg_indexes for missing indexes; CREATE INDEX CONCURRENTLY if absent (see incident-postmortem-nov10).\n\n## DB Maintenance\nRequire CTO + EM approval; on-call rota; 48h notice; follow database-migration-plan.md; run index verification before re-enabling.\n\n## Deploy\nKenji reviews auth/rate-limiting/payments PRs before merge.` },
  { id:'stripe-integration-guide', access:AC.intEng, body:`# Stripe Integration Guide\n\n**Related:** NEX-204, NEX-212, NEX-215, NEX-240, email_04, email_10\n\n## Keys\nAWS Secrets Manager: /nexora/dev/stripe (NEX-207).\n\n## Charge Flow\nWrite to payment_audit_log (NEX-219) BEFORE calling stripe.paymentIntents.create.\n\n## Webhooks\nDedicated /webhooks/stripe verifies the Stripe-Signature header via HMAC (email_10, NEX-240). Return 200 immediately, process async. Signature verification MUST be enforced before exposing the endpoint.` },
  { id:'q4-roadmap', access:AC.pubEng, body:`# Q4 2024 Engineering Roadmap\n\n**Related:** email_12, all_hands_q4\n\n1. Payments (NEX-204) — DELAYED Dec 15 -> Jan 20 (PCI gaps NEX-217, rate-limiter NEX-231). Context email_03.\n2. Database Migration (NEX-189) — DONE Nov 3.\n3. Search Performance (NEX-198) — 210ms, target <200ms.\n4. API Rate Limiting (NEX-231) — in review.\n5. Mobile SDK v2 (NEX-210).` },
  { id:'security-policy', access:AC.pubEng, body:`# Security Policy — Nexora Inc.\n\n## PR Review\nAll auth, rate-limiting, and payment endpoints require a security-review sign-off from the Security Lead before merge. Public webhook endpoints must enforce signature verification before exposure.\n\n## Incident Response\nSuspected incidents are reported to the Security Lead immediately and tracked as restricted INC-xxx tickets. Regulator notification within 72 hours where required.\n\n## Access Control\nAttribute-based: clearance level + department + project scope. Sensitive material is restricted to cleared personnel.` },
  { id:'team-directory', access:AC.pubEng, body:`# Team Directory — Nexora Inc.\n\n- Raj Patel — CTO — executive, clearance 5\n- Kenji Nakamura — Security Lead — security, clearance 5\n- Priya Sharma — Engineering Manager — engineering, clearance 4\n- Diana Chen — Database Architect — engineering, clearance 4\n- Arjun Mehta — Senior Backend Engineer (Payments) — engineering, clearance 3\n- Riya Desai — Software Engineer (Search) — engineering, clearance 3\n- Maya Iyer — Product Manager — product, clearance 3` },
  // B — restricted docs
  { id:'security-incident-postmortem', access:AC.secRestr, body:`# [RESTRICTED] Security Incident Post-Mortem — INC-001\n\n**RESTRICTED. Related:** NEX-260, NEX-261, email_13, email_14, email_15, incident_bridge_01, security_postmortem_01\n\n## Summary\nOn Dec 2, 2024 an attacker forged Stripe webhook calls to /webhooks (NEX-240) before HMAC verification was fully enforced, accessing internal customer IDs and transaction amounts for ~90 minutes. No cardholder data (Stripe tokenization).\n\n## Root Cause\nPremature rollout of the /webhooks endpoint without enforced HMAC verification — exactly the risk in Kenji's PR #47 review (email_09). The entry vector is the rate-limiter webhook gap first raised in NEX-231 and email_04. Contributing factor: schedule pressure from the Payments delay (email_03).\n\n## Remediation\nHMAC enforced + replay protection (PR #61, NEX-261). Security-review sign-off is now a hard merge gate for payment endpoints.\n\n## Disclosure\nRegulators notified within 72h; customer disclosure approved by the CTO (email_14).` },
  { id:'incident-response-plan', access:AC.secRestr, body:`# [RESTRICTED] Incident Response Plan\n\n**RESTRICTED.**\n\n## Phases\n1. Detect (WAF/alerts) 2. Contain (disable vector) 3. Eradicate (patch) 4. Recover 5. Post-mortem.\n\n## Roles\n- Security Lead: forensic timeline, containment.\n- CTO: disclosure decisions, regulator notification (72h).\n- Eng Manager: expedite P0 fixes.\n\nReference incident: INC-001 (NEX-260), see docs/security-incident-postmortem.md.` },
];
for (const d of docs) w('docs', `${d.id}.md`, mdfm(d.access) + d.body + '\n');
console.log('docs written');

// ─────────────────────────────────────────────────────────────────────────────
// GITHUB PRs (11)
// ─────────────────────────────────────────────────────────────────────────────
const prs = [
  { id:'pr_45', access:AC.intEng, number:45, title:'Payments service scaffold', author:'Arjun Mehta', status:'merged', branch:'feature/payments-service', created:'2024-11-05', merged:'2024-11-06',
    description:'Scaffolds the Payments microservice per architecture_review_01. VPC subnet topology (NEX-218). Related: NEX-204, docs/payments-architecture.md.',
    linked_tickets:['NEX-204','NEX-218'], linked_meetings:['architecture_review_01'], linked_docs:['payments-architecture'] },
  { id:'pr_46', access:AC.payConf, number:46, title:'Immutable payment audit log', author:'Arjun Mehta', status:'merged', branch:'feature/payment-audit-log', created:'2024-11-09', merged:'2024-11-12',
    description:'Append-only payment_audit_log, partitioned (NEX-219). Written before business logic per PCI-DSS.',
    linked_tickets:['NEX-219','NEX-217'], linked_docs:['payments-architecture'] },
  { id:'pr_47', access:AC.intEng, number:47, title:'API rate limiter with X-Forwarded-For', author:'Arjun Mehta', status:'merged', branch:'feature/api-rate-limiting', created:'2024-11-06', merged:'2024-11-12',
    description:'IP + user composite-key rate limiter. Addresses Kenji review (email_09): X-Forwarded-For, Retry-After (NEX-233). Related: NEX-231, docs/api-rate-limiting.md.',
    linked_tickets:['NEX-231','NEX-233'], linked_emails:['email_04','email_09','email_10'], linked_docs:['api-rate-limiting'] },
  { id:'pr_48', access:AC.search, number:48, title:'GIN index for full-text search', author:'Riya Desai', status:'merged', branch:'feature/search-gin-index', created:'2024-11-02', merged:'2024-11-03',
    description:'GIN index on documents.content, ~45% faster text search (NEX-198).', linked_tickets:['NEX-198'], linked_docs:['search-optimization-plan'] },
  { id:'pr_49', access:AC.search, number:49, title:'Query result caching (Redis, 60s TTL)', author:'Riya Desai', status:'merged', branch:'feature/search-cache', created:'2024-11-04', merged:'2024-11-05',
    description:'Redis cache for search results (NEX-208, NEX-198).', linked_tickets:['NEX-208','NEX-198'], linked_docs:['search-optimization-plan'] },
  { id:'pr_50', access:AC.infra, number:50, title:'PostgreSQL 16 migration scripts', author:'Diana Chen', status:'merged', branch:'feature/pg16-migration', created:'2024-10-30', merged:'2024-11-03',
    description:'Migration + partition scripts for NEX-189. NOTE: the post-migration cleanup swallowed a lock-timeout error, later causing NEX-244.',
    linked_tickets:['NEX-189','NEX-244'], linked_docs:['database-migration-plan'] },
  { id:'pr_52', access:AC.intEng, number:52, title:'Hotfix: rebuild documents.created_at index', author:'Riya Desai', status:'merged', branch:'hotfix/created-at-index', created:'2024-11-10', merged:'2024-11-10',
    description:'CREATE INDEX CONCURRENTLY for the missing created_at index (NEX-244). Restored search after the Nov 10 incident (email_08).',
    linked_tickets:['NEX-244','NEX-198'], linked_emails:['email_08'], linked_docs:['incident-postmortem-nov10'] },
  { id:'pr_53', access:AC.intEng, number:53, title:'Refund endpoint', author:'Riya Desai', status:'merged', branch:'feature/refund-endpoint', created:'2024-11-08', merged:'2024-11-11',
    description:'POST /payments/refund, full + partial (NEX-215). Writes payment_audit_log (NEX-219).',
    linked_tickets:['NEX-215','NEX-219'], linked_docs:['stripe-integration-guide'] },
  { id:'pr_55', access:AC.intEng, number:55, title:'Charge endpoint', author:'Arjun Mehta', status:'merged', branch:'feature/charge-endpoint', created:'2024-11-10', merged:'2024-11-14',
    description:'POST /payments/charge via Stripe PaymentIntents (NEX-212). Writes payment_audit_log (NEX-219).',
    linked_tickets:['NEX-212','NEX-219'], linked_docs:['stripe-integration-guide'] },
  { id:'pr_56', access:AC.intEng, number:56, title:'Stripe webhook endpoint (HMAC)', author:'Arjun Mehta', status:'open', branch:'feature/stripe-webhooks', created:'2024-11-12',
    description:'Dedicated /webhooks/stripe with HMAC verification (NEX-240, email_10). IMPORTANT: must not be exposed before HMAC is fully enforced — a premature rollout is a forged-request risk.',
    linked_tickets:['NEX-240','NEX-231'], linked_emails:['email_10'], linked_docs:['api-rate-limiting','stripe-integration-guide'] },
  // B — restricted PR
  { id:'pr_61', access:AC.secRestr, number:61, title:'[RESTRICTED] Enforce HMAC + replay protection on webhooks', author:'Arjun Mehta', status:'merged', branch:'hotfix/webhook-hmac-enforce', created:'2024-12-02', merged:'2024-12-03',
    description:'RESTRICTED. P0 remediation for INC-001 (NEX-260, NEX-261): enforce Stripe HMAC verification on all webhook calls, add nonce/replay protection and security regression tests. Closes the entry vector from NEX-240/NEX-231.',
    linked_tickets:['NEX-261','NEX-260','NEX-240'], linked_emails:['email_15'], linked_docs:['security-incident-postmortem'] },
];
for (const p of prs) w('github', `${p.id}.json`, p);
console.log('github PRs written');
console.log('DONE — dataset generated');
