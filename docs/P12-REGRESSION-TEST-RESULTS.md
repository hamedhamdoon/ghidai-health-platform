# P12 — Executed regression results

Acceptance began2026-10-15; final local review2026-10-18, Asia/Muscat. Approved baseline `e12066f66b28a4e8220e6fd097e8115222752b30`, branch `feature/ghidai-p12-final-acceptance`; Windows11, PostgreSQL17.6 existing synthetic test cluster, Mailpit and Chromium156/Playwright1.64.0. Explicit isolated Node24.22.0 and PostgreSQL17.11 experiments are identified separately. No production connection or historic schema/volume deletion.

## Final execution ledger

| Group / command | Status | Executed count and evidence |
|---|---|---|
| Original runtime `npm run check` | PASS | TypeScript/Lint,123/123 unit tests in15files and Next16.4.1 build; `.npm-cache/p12/check-authorized.log` |
| Isolated Node24.22.0 `npm run check` | PASS with lint observation | TypeScript,123/123 units and build; one pre-existing ignored P11 scratch-script unused-import warning, not an application error; `.npm-cache/p12/node2422-check.log`. Final lint disposition follows below |
| Original runtime native regression | PASS |151groups:42+23+20+12+10+12+14+18;7basic deletion assertions and9full-graph deletion groups; `.npm-cache/p12/native.log` |
| Browser final isolated-runtime replay | PASS147/147 on2026-10-18 after prefetch improvement |60+12+27+48; `.npm-cache/p12/oct18-e2e.log`; preserved `.npm-cache/p12/browser-1792305005463/wave-1..4`; earlier pre-improvement147 pass is historical |
| Isolated Node24.22 native regression | PASS |151groups +7basic assertions +9full-graph groups; `.npm-cache/p12/operations-1792052328584/native.log`;26historical migrations replayed |
| Actual outages/recovery on isolated Node | PASS7+4groups | Auth/Mailpit/DB/readiness7; participant/reminder4; separate logs in same operations directory; existing services unpaused |
| Cross-cluster encrypted restore | PASS1rehearsal |17.6 source/new17.11 target;72tables/82rows;17364ms;580478encrypted bytes; no operational RPO/RTO approval |
| Expanded browser performance | FAIL initial execution, partial samples retained | Navigation timeout at coach/participants768; stopped operations runner before capacity. Resume evidence is reported separately below |
| Full npm audit | FAIL clean-audit criterion |5High,0Critical; `.npm-cache/p12/audit.json` |
| Runtime-only npm audit | PASS registry check |0vulnerabilities; `.npm-cache/p12/audit-runtime.json` |
| New17.11 image Scout | FAIL clean-image criterion |66packages indexed;60CVE records:4Critical/29High/22Medium/5Low;3Go package identifiers; raw SARIF and safe summary under `.npm-cache/p12` |
| Physical screen reader/native zoom/two independent devices/production HTTPS | NOT TESTED / public action BLOCKED | No matching execution evidence; automated Chromium is not substituted |

The completed18October ledger below supersedes interrupted attempts for current execution counts. Historical rows remain explicitly dated; adverse findings are not converted to passes. [Final report](P12-FINAL-ACCEPTANCE-REPORT.md) uses these scoped results.

## Completed continuation checks — 2026-10-18

TypeScript and ESLint PASS exit0 (`oct18-typecheck.log`, `oct18-lint.log`);123/123 units PASS (`oct18-unit.log`). Final application build after the prefetch change already passed on15October in `final-check.log`; no application source changed afterward. Measurement-runner metadata changes do not imply another app build. Prisma validation passed against unchanged schema.

Fresh source test DB initialization applied26 unchanged migrations/checksums (`oct18-test-setup.log`). Complete native replay on isolated Node24.22.0 PASS151groups plus7basic deletion assertions and9full-graph groups; actual outage/recovery PASS7auth/mail/DB/readiness +4participant/reminder. Evidence: `.npm-cache/p12/operations-1792305440262/{native,auth-outages,participant-outages}.log`. These replace earlier runs for final continuation counts; totals are not doubled.

New cross-cluster rehearsal PASS to `ghidai_p11_restore_1792305628959_fd510ed2`, schema `p3_test_1792305629401`, on new17.11 cluster:72tables,82rows,577098encrypted bytes,13329ms. Digest `fe9400758dd09ccf30aef0e66eb0b5d9005f1076f95df75bcd02138350f9bd50`. All26 ledger entries, owner/policy/schema metadata, restored old session/new password login, Analytics/RLS A/B and tamper rejection passed. Source ledger now has26completed/0rolled-back/0unresolved rows in the reinitialized test tmpfs; no recovery of the former27-row historical test ledger is claimed. Key is ephemeral; independent operational recovery remains blocked.

Refreshed npm audit on18October: full5High/0Critical, runtime0; both fresh JSON reports retained. Full audit is still adverse, never PASS. Source/runtime/migrations were not downgraded or operationally upgraded.

The explicit-readiness LCP/transfer/cumulative-shift-sum matrix completed60/60 (42authenticated), with21LCP failures and0overflow/failed API samples. Its inherited sum-labelled`cls` field was discovered during final review to differ from standard maximum session-window CLS:20high sums are not20certified CLS failures. The corrected standard-CLS run FAILed navigation at `/reset-password`360 after5visits;55cells NOT TESTED. Its5recorded CLS values are≤0.1, with1additional LCP>2500ms. Both raw cohorts/logs and the corrected numeric shift events are retained; full standard-CLS acceptance is incomplete. Earlier networkidle failures/interrupted runs remain separate.

Single-session HTTP capacity PASS75timed reads,0non200. First multi-user attempt FAIL TimeoutError;27 completed handler records/1status≥400 retained, not a complete accepted workload. One unchanged-timeout retry PASS180timed reads +20warmups/0non200 with20independent identities and row-ownership assertions.120sequential direct-service writes are separate, not concurrent HTTP writes. No successful-read total includes failed-attempt traffic. Logs/JSON under `.npm-cache/p12/oct18-capacity*` and `capacity-*.json`.

Refreshed Scout scan execution3/3 PASS; clean-image criterion3/3 FAIL:17.6=135findings (8Critical/63High/50Medium/14Low),17.11=72 (4/32/29/7),Mailpit=171 (15/76/67/13). Findings overlap and are not summed as unique CVEs. OS/independent security review NOT TESTED. Final typecheck and ESLint PASS exit0 after runner changes, in `final-typecheck-oct18.log`/`final-lint-oct18.log`.

Final monitor returned ALERT exit1: database/job telemetry available,0failed/overdue jobs and0failed mail; disk6854062080/128340455424B free (5.3405%). Alerts BACKUP_NOT_VERIFIED,STORAGE_LOW,ERROR_RATE_NOT_MEASURED remain valid. It does not consume the separate P12 capacity stream or invent a healthy permanent error-rate feed. `oct18-monitor.log`; monitoring is explicit, not scheduled.

## Failed and superseded attempts

Continuation on2026-10-18: the post-prefetch `final-e2e.log` run was interrupted in its third wave, retaining failed1280px cases and an unfinished summary. It is **not147/147 PASS**. The earlier147-case pass preceded the prefetch improvement. Docker's test and patched tmpfs containers were later observed stopped; startup found an empty source test DB. No old schema recovery is claimed. New Oct18 logs are separate, and final evidence after the UI change must come from a completed fresh replay.

1. First sandbox `npm run check` failed at Next SWC canonicalization with Windows access denied. The separately authorized local rerun passed; this is not a source-code failure or an initial PASS.
2. First browser attempt passed its60-case account wave, then the P4 preparation native command failed with PostgreSQL25P03 idle-in-transaction timeout. Isolated runtime source checks and Scout indexing overlapped that preparation; concurrency is a confounder, not a proven sole cause. The failure is preserved in `.npm-cache/p12/e2e.log`; no timeout/limiter/assertion was weakened. A fresh sequential full browser replay on the completed isolated-runtime build supersedes it only when successful.
3. First Scout call used unsupported `--format json`, producing help rather than a scan. Corrected SARIF scan completed with adverse findings. Its locked temporary-archive cleanup warning is retained; no manual deletion.
4. Initial directory inventory could not measure `.next` inside sandbox. Corrected elevated read-only filesystem measurement succeeded; unknown was never counted as zero.
5. Isolated-runtime lint initially reported one warning in ignored `.npm-cache/p11-final-review.mjs`. ESLint now excludes generated `.npm-cache/**` just like other build/evidence directories; versioned source/tests/scripts remain checked and npm audit findings remain fully visible. Final18October source lint passed exit0.
6. Legacy suites refresh fixed-name illustrative screenshots under `test-results`; initial P12 runs retained unique Playwright output directories but refreshed those names. The P12 runner now also snapshots the fixed-name directory before/after waves; original versions already refreshed cannot be claimed preserved. Playwright color-environment warnings, Vitest cache advice and Prisma's available8.0.0-rc.22 update notice remain in logs; no forced RC upgrade or warning suppression was used.

No failed mandatory assertion is relabelled PASS. Historical P1–P11 evidence is reviewed for scope/coverage but is not added to these P12 totals. Native groups contain multiple assertions; group counts are not test-case counts. Browser cases include each viewport project. Repeated runs and setup checks are reported separately, not inflated into unique coverage.

## Reproduction and evidence custody

Use existing ignored local secrets/containers; do not recreate test tmpfs or change P3_TEST_SCHEMA while a server is running. Run source/build, browser, then native/outage/restore/performance work sequentially. `scripts/p12-e2e.mjs` uses unique preserved wave paths. `scripts/p12-operations.mjs` records command timestamps/exit codes/logs and stops on failure. Native schemas and failed attempt artifacts remain available. No tests are claimed for GitHub CI, an unselected host, future runtime release, real external delivery or production infrastructure.

Final secret/diff/link/protected-file verification and branch receipt are documented after actual execution. Ignored evidence is local, not a recoverable independent backup or public artifact.

Final corrected CLS-runner `tsc --noEmit` and full source ESLint PASS exit0 after the session-window correction. Package check PASS8required reports/41local links/24R-T pairs/60baseline document hashes; scoped secret scan PASS281candidate files; diff/protected-path checks PASS. Standard CLS probe remains FAIL/incomplete5of60,55NOT TESTED; this is not overridden by source/static checks. No publication or main approval is inferred.
