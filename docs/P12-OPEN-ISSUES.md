# P12 — Open issues and release gates

Acceptance began2026-10-15; final local review2026-10-18, Asia/Muscat. No A-01–A-12 decision is changed. Status vocabulary: PASS / FAIL / BLOCKED / NOT TESTED applies to tests; OPEN describes an unapproved decision. This phase approves no medical, legal, commercial or production policy.

| Gate | Status / reason still open | Authority / required evidence | Impact: local or production |
|---|---|---|---|
| A-01 | OPEN: source content, identity/claims and DIF unresolved | Qualified health reviewer + owner; signed versioned content/conflict resolution | Real publication only; synthetic engine can be tested |
| A-02 | OPEN: audience/eligibility/guardian terms | Owner + legal; approved audiences and consent text | Real-user registration |
| A-03 | OPEN: correction window/late entries/streak | Owner; examples and versioned policy | Real correction policy; synthetic calculation test allowed |
| A-04 | OPEN: award/certificate meaning/threshold/regrant | Owner; auditable approved rules | Real awards only |
| A-05 | OPEN: personalized goals/portions/conversions | Health professional + owner; safe approved templates | Real health defaults/content |
| A-06 | OPEN: commercial use/provider suitability | Owner/operator; free/no-card/no-overage/region/domain contracts | Production resource selection |
| A-07 | OPEN: law, privacy, sensitive processing/transfers | Qualified legal adviser + owner; Oman applicability, lawful basis, contracts and policies | All real data and production |
| A-08 | OPEN: retention/recovery/key custody/RPO/RTO | Owner/legal/security/operator; durable keys, independent restore, deletion replay and incident ownership | Operational recovery and real purge; local rehearsals allowed |
| A-09 | OPEN: sender/scheduler/delivery/retention | Owner/legal/operator; verified free delivery, failure/retry limits and secure scheduler | External sending/jobs |
| A-10 | OPEN: owner assets/content rights | Owner/rightsholder; asset/version license receipt | Distribution of unlicensed source assets |
| A-11 | OPEN: real coach access and correction/cohort scopes | Owner/legal; exact consent, assignment and limits | Real health access/admin reports |
| A-12 | OPEN: named admin/reviewer and recovery authority | Owner/security/qualification verifier; secure handover and independent reviewer | Production administration/publication |

The P11 local L-01..L-09 approvals remain historical scoped evidence, not automatic P12 approval:

| P11 gate | P12 disposition and required evidence | Authority / impact |
|---|---|---|
| L-01 / R-12 | PASS: owner explicitly authorized P12 local acceptance in this chat; previous P12-start block superseded only for this scope | Owner; local scope authorized, publication excluded |
| L-02 | PASS: clean exact approved SHA; P12 branch created; P8–P10 receipt divergence inspected without merge/rebase/cherry-pick | Engineering; local baseline |
| L-03 | PASS local configuration rejection/security units; production adapter disabled | Engineering; target TLS/cookie/provider proof still production BLOCKED |
| L-04 | PASS bounded encrypted restore to new patched cluster; independent operational backup BLOCKED | Engineering for local test; owner/operator A-08 for real backup |
| L-05 | PASS11controlled outage/recovery groups; monitor retains real storage/backup alerts | Engineering local; operator approval for production monitoring |
| L-06 | FAIL clean-security criterion:5High npm findings and adverse image scans; OS review NOT TESTED | Security/owner; independent risk/exposure treatment required before production |
| L-07 | PASS123units/151native/147browser +7/9deletion groups; unimplemented requirement coverage remains FAIL/NOT TESTED | Engineering; existing suite pass is not unconditional full local acceptance |
| L-08 | FAIL21LCP budgets in60visits; corrected standard CLS probe stopped at5/60,55NOT TESTED; successful capacity samples plus initial timeout retained | Engineering; repair recurrent navigation failures and complete standard metrics/repeated representative budget evidence |
| L-09 | Final diff/secret scan and branch-only receipt required | Engineering; no launch authority |
| R-01 | BLOCKED A-01/05/10/12 | Reviewer/owner; real health/rights release |
| R-02 | BLOCKED A-02/03/04/07/08/11 | Owner/legal; real policies/audience/access |
| R-03 | BLOCKED no approved complete zero-cost provider combination | Owner/operator/legal; production hosting |
| R-04 | BLOCKED real email/scheduler unimplemented/unverified | Operator/owner; external sending and scheduling |
| R-05 | BLOCKED independent storage/key custody and real disaster restore absent | Operator/security/owner; production recovery |
| R-06 | BLOCKED full patched target/host security acceptance absent; isolated tests have bounded scope | Security/owner; production runtime |
| R-07 | NOT TESTED physical devices/practical screen reader/native zoom | QA/user accessibility reviewer; full device acceptance |
| R-08 | NOT TESTED two independent physical devices/accounts over public HTTPS | QA + owner separately authorizing deployment; production acceptance |
| R-09 | OPEN named operator, incident contact and approved recovery duties | Owner/operator; operational handover |
| R-10 | BLOCKED explicit public publication authority not granted | Owner; public launch prohibited |
| R-11 | BLOCKED independent review and main-merge permission absent | Reviewer + owner; main merge prohibited |

Additional engineering risks: five High npm development-chain findings without an official patched braces release; low disk; adverse image findings; sample LCP deviations and incomplete assisted/device/performance coverage; synthetic deletion only; no permanent mail retry/backoff acceptance, Web Push or continuous scheduler; no full historical backup/deletion replay after disaster. See [security](P12-SECURITY-ACCEPTANCE.md), [performance](P12-PERFORMANCE-ACCESSIBILITY.md) and [final report](P12-FINAL-ACCEPTANCE-REPORT.md). None is silently waived.

| Local scope gap | Evidence / classification | Required acceptance follow-up |
|---|---|---|
| P12-F01 participant nutrition | FAIL completeness review: admin meal/alternative creation exists, but participant `meals/:id` and occurrence meal-selection dispatch/service/UI are absent. T-07 participant selection is NOT TESTED, not covered by the passing admin food test | Implement authorized published-version meal view and revision/idempotency-safe selection with DB policies; test cross-version/owner/safety withdrawal and real browser save/reload |
| P12-F02 corrections | Partial: only within-window record edits exist; dedicated outside-window request/reviewer workflow absent | A-03/A-11 plus scoped request/decision/recalculation/isolation tests; do not invent a working `/corrections` screen |
| P12-F03 dynamic entitlement/policy authoring | Partial: fixture SQL supplies achievement rules/links and policy/review schema definitions; tested evaluation is not a complete administration editor | Review required admin authoring scope, implement safe versioned rule/schema workflow and test through UI; A-03/A-04 stay open |
| P12-F04 admin health reporting | Partial/policy-gated: existing administration is metadata/operations/audit, not the proposed sensitive cohort reporting | A-11-approved aggregation/suppression and negative disclosure tests |
| P12-P01 performance | FAIL21/60 LCP targets;20high cumulative shift sums were not standard CLS. Corrected CLS run failed after5/60,55NOT TESTED; full gzip/INP/Lighthouse/assisted/device acceptance unproven | Repair recurrent navigation failures; profile loading/layout and complete session-window CLS plus repeated representative measurements; no budget waiver |

Passing147 existing browser cases would establish their tested journeys, not fill these untested features. These findings prevent an unconditional claim of full functional completion and require explicit disposition before full P12 technical acceptance. No broad new feature is silently substituted for an acceptance review.

Local tests may proceed on synthetic data despite production gates. A failing mandatory local assertion must be fixed and re-executed or reported as a local acceptance blocker. Missing approval is not a test failure; unavailable testing is NOT TESTED, never PASS.
