# P11 — Release gate matrix

2026-10-15, Asia/Muscat. Scope: local operational engineering only, starting from `79752ab2487168fcc4f5141e3e0b290b2f91f718`. This register preserves [DECISION-REGISTER](DECISION-REGISTER.md); no owner, qualified health professional or legal decision is closed by implementation. P12 and public deployment are not authorized. Historical P1–P10 reports are evidence of their runs, not a substitute for P11 regression.

Statuses: **APPROVED** = explicit scoped authority/evidence; **OPEN** = decision/evidence still required; **BLOCKED** = dependent launch action cannot proceed; **NOT TESTED** = no executed applicable acceptance evidence. A technical local test never changes an A-series approval.

## Authority decisions A-01–A-12

| Gate | Status | Decision/evidence needed | Authority and blocked action |
|---|---|---|---|
| A-01 health content and identity | OPEN | Final versioned names/claims, all source conflicts DIF-01..17, qualified independent review of every meal/alternative and withdrawal criteria | Qualified health reviewer + owner; blocks real content publication |
| A-02 audience and eligibility | OPEN | Ages, countries, exclusions, guardian requirements if applicable, approved eligibility/consent text | Owner + legal; blocks real-user registration acceptance |
| A-03 corrections and missed days | OPEN | Edit window, late-entry exceptions, streak/recalculation examples, timezone handling policy | Owner; blocks acceptance of real correction policy |
| A-04 awards/certificates | OPEN | Auditable thresholds, regrant/revocation and certificate meaning | Owner; blocks actual awards/certificates |
| A-05 health targets/units | OPEN | Qualified target personalization, portions, cup/spoon conversions, contraindications and safe template limits | Health reviewer + owner; blocks published health defaults/templates |
| A-06 use and hosting | OPEN | Personal/non-commercial versus commercial/institutional purpose; approved Free provider, domain, region, quota and no-card/no-overage evidence | Owner + operator; blocks selection/activation; Vercel Hobby unsuitable for commercial use |
| A-07 privacy and law | OPEN | Oman applicability, lawful basis for sensitive data, transfer approvals/contracts, rights handling, breach process, processor/subprocessor review | Qualified legal adviser + owner; blocks real data/production |
| A-08 retention/security/continuity | OPEN | Session/idle/export/audit/backup retention, deletion ledger replay, approved recovery custody; measured recovery and agreed RPO/RTO | Owner/legal/security/operator by scope; local rehearsal does not approve production targets/purge |
| A-09 mail/jobs/delivery | OPEN | Sender rights, no-card quota, verify/reset inbox delivery, legal processor review, scheduling lag/expiry/coalescing and retry policy | Owner/legal/operator; blocks external mail/scheduled reminders |
| A-10 asset rights | OPEN | Image/logo/font/message license and distribution rights recorded by asset/version | Owner/rightsholder; blocks distribution of unlicensed reference assets |
| A-11 coach/admin access | OPEN | Explicit scopes, consent text/duration/revocation, assignment, correction authority and safe cohort limits | Owner/legal; synthetic grants do not authorize real coach health access |
| A-12 administrator and reviewer authority | OPEN | Named initial administrator, qualification verifier, secure role handover, MFA recovery without backdoor and independent reviewer | Owner/security/qualified verifier; blocks real administration/bootstrap/content qualification |

## Local P11 and launch gates

| Gate | Current evidence status (scoped) | Acceptance evidence and owner |
|---|---|---|
| L-01 P11 local preparation authorization | APPROVED | Owner's P11 instruction; synthetic local preparation only; no P12, cloud activation, main merge or deployment |
| L-02 approved baseline/branch | APPROVED | Integrator records exact baseline, clean status/diff and `feature/ghidai-p11-production-readiness` in [P11 handoff](P11-HANDOFF.md) |
| L-03 production configuration contracts | APPROVED | Fail-closed env, HTTPS/secure cookies/trusted origins/TLS DB/non-owner role, safe health/logging/rate limits; executed checks in [test report](P11-TEST-RESULTS.md) |
| L-04 backup/restore rehearsal | APPROVED | Fresh isolated synthetic database, encrypted pg_dump, authenticated integrity, wrong key/tampering/failure behavior, row/schema/RLS verification, compatibility and timings in [backup report](P11-BACKUP-RESTORE.md); no overwrite |
| L-05 outage/monitor/recovery | APPROVED | Explicit local monitor/tick, app/DB/job/mail/backup failures, safe bounded retry, storage/resource thresholds and runbooks in [monitoring](P11-MONITORING-RUNBOOK.md) |
| L-06 dependencies and exposure | APPROVED | Actual audit/version checks including five known High findings, compatible fixes and residual exploitability; secret scan/auth/RLS/public route/download checks in [security review](P11-SECURITY-REVIEW.md) |
| L-07 regression | APPROVED | Final integrator-confirmed local replay: TypeScript/ESLint/build PASS;123 unit cases;151 PostgreSQL/RLS groups plus7 basic and9 full-graph deletion groups;147 E2E cases;7 auth/mail/DB and4 participant/reminder outage groups. Scope is this synthetic local branch, not production/device/provider acceptance; full commands/lockfile/evidence in [test report](P11-TEST-RESULTS.md) |
| L-08 measured local performance | APPROVED | LCP/CLS/JS/page transfer,/today budget,API/query/index/resource/concurrency samples and methods/limits in [capacity](P11-PERFORMANCE-CAPACITY.md) |
| L-09 safe delivery | APPROVED | Scoped secret scan265files, clean staged diff, protected AGENTS/migrations/workflows unchanged; tested implementation5bc3b92153c733e3ab7ecbf8a0f7c67f412820ff pushed to P11 only and remote SHA matched; receipt in handoff. No launch/main approval implied |
| R-01 health and rights release | BLOCKED | A-01/A-05/A-10/A-12; signed/versioned professional and owner approvals |
| R-02 audience/legal/retention/coach release | BLOCKED | A-02/A-03/A-04/A-07/A-08/A-11; final public policies and actual authority evidence |
| R-03 provider selection and zero-cost whole system | BLOCKED | A-06/A-07/A-08/A-09; [hosting assessment](P11-HOSTING-ASSESSMENT.md). No complete approved zero-cost combination demonstrated |
| R-04 real external email and scheduler | BLOCKED | Provider adapter, sender DNS, delivery/bounce/rate/failure evidence, secure authenticated scheduler; cron-job.org static bearer rejected under documented TLS non-verification |
| R-05 independent production backups | BLOCKED | Approved independent physical/storage failure domain, separated key custody, real operating responsibility, retention/deletion replay and restoration evidence; no inferred RPO/RTO |
| R-06 production security acceptance | BLOCKED | Local PostgreSQL17.6 is behind security-fixed17.11 (including RLS/client fixes); Node24.20.0 is behind24.22.0 and the announced Oct21 HIGH release needs a fresh review. Existing containers/runtime are preserved. Require isolated patched-engine/client/runtime rehearsal, plus L-03/L-06/L-07 and target-host threat/exposure review and owner/security acceptance; local tests cannot certify untested cloud platform |
| R-07 devices/accessibility | NOT TESTED | Physical independent devices and browsers,keyboard/screen reader,RTL360/768/1280; P11 automated Chromium regression is executed, but does not substitute for physical independent-device or actual screen-reader acceptance |
| R-08 HTTPS two-user separation | NOT TESTED | After separately authorized public deployment: two independent devices/accounts; no cross-user view/edit/export/download; public HTTPS verified |
| R-09 operational handover | OPEN | Named operator/on-call contact, recovery/MFA responsibility, incident notification and approved RPO/RTO; drills and quota response accepted |
| R-10 final publication authorization | BLOCKED | Explicit owner permission after all applicable gates; P11 instruction explicitly forbids deployment |
| R-11 main merge | BLOCKED | Independent review and explicit owner merge permission; P11 push permission is branch-only |
| R-12 P12 start | BLOCKED | New owner instruction specifying scope after P11 evidence review; no automatic transition |

APPROVED local rows certify the executed engineering preparation/check only, not an approved production adapter, healthy disk, independent backup, universal performance target or launch. Remaining proposed LCP targets exceed2.5s in four final samples and three earlier samples (preserved separately); independent gzip/INP/Lighthouse and physical-device acceptance remain OPEN/NOT TESTED. Final detailed evidence is maintained in [P11-TEST-RESULTS](P11-TEST-RESULTS.md) and [P11-HANDOFF](P11-HANDOFF.md); this matrix must not imply they passed merely because a document exists. These two evidence reports determine whether local P11 can be accepted. All A-series and launch statuses remain unchanged unless their named authority supplies evidence.

## Closure protocol

Record gate ID, scope/version, choice and alternatives, approving person/qualification, dated approval artifact, commands/test environment/commit and remaining limitations. The integrator may certify an executed local engineering check; cannot certify medical/legal/owner decisions. Keep failed and superseded evidence. A gate requiring multiple authorities closes only after all approvals. Do not replace OPEN with APPROVED because a fixture value was implemented or because a free pricing page exists.

P11 engineering readiness and launch readiness are separate decisions: even a fully green local regression leaves public launch blocked by the decisions above. Missing provider evidence is documented without spending money or weakening security. Changes to target platform, audience or content require re-evaluating relevant gates.
