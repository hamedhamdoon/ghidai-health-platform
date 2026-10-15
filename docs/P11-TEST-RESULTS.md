# P11 — Final local test results

2026-10-15, Asia/Muscat. Exact baseline `79752ab2487168fcc4f5141e3e0b290b2f91f718`; branch `feature/ghidai-p11-production-readiness`. Synthetic local data only; no production connection, deployment or external activation.

## Final verification

| Check | Executed result | Evidence and scope |
|---|---|---|
| npm run check | PASS exit0 | TypeScript, ESLint without warnings/errors,123/123unit cases in15files, optimized Next16.4.1 build; .npm-cache/p11-check-final.log |
| Final manual-script TypeScript / ESLint | PASS exit0 | Repeated after enhanced backup and write timing additions; p11-typecheck-final.log,p11-lint-final.log |
| PostgreSQL native regression | PASS exit0 |151groups:42+23+20+12+10+12+14+18; basic deletion7 and full participant graph deletion9;26canonical migrations; p11-native-regression.log |
| Prisma schema validation | PASS exit0 | p11-prisma-validate.log; no production database |
| Browser E2E | PASS147/147 | Four suites60+12+27+48; final lockfile; p11-e2e.log |
| Auth/mail/DB outages and readiness | PASS7groups | Identified GHIDAI test services pause/unpause; ready200→503→200 while liveness stays200; p11-auth-outages.log |
| Participant/reminder outage/recovery | PASS4groups | No false success; recovery/replay exactly once; p11-participant-outages.log |
| Encrypted logical backup/restore | PASS exit0 | New target only;72tables/82rows; restored active migration ledger,fresh password login/session,old session,metadata/RLS/Analytics,integrity/tamper rejection; p11/backup-evidence.json |
| Final browser measurement | PASS execution12samples |360/768/1280widths,4routes; target deviations retained, not all-route performance acceptance; p11-browser-performance.json |
| Final same-session HTTP sample | PASS75reads |1/2/4/8concurrency;0non200;100direct-service writes separately timed; p11-capacity.json |
| Final independent-session HTTP sample | PASS180timed+20warmup |20synthetic users at1/5/10/20concurrency;0non200; each returned row checked against actual user; p11-multiuser-capacity.json |
| Manual monitor | ALERT exit1 | Storage5.0524%free,DB/job telemetry available,0/75HTTP5xx; BACKUP_NOT_VERIFIED and STORAGE_LOW; p11-monitor-final.log |
| Full npm audit | Exit1:5High,0Critical | Development braces/micromatch/fast-glob/Next ESLint chain unresolved; not suppressed |
| Runtime npm audit | PASS exit0:0vulnerabilities | p11-audit-runtime.json; advisory snapshot, not OS/engine security certification |

Evidence paths above are under ignored `.npm-cache/`. Final exact application patches: Next/eslint-config-next16.4.1,React/react-dom19.3.1,Nodemailer10.1.1. Operations5,security18,telemetry4 focused cases are included in123units. Final secret/link/Git checks and delivery receipt are recorded in [handoff](P11-HANDOFF.md).

## Backup evidence and failed attempts

Final new target `ghidai_p11_restore_1792050051032_89dfa2e2`,source schema `p3_test_1792050051085`;578878encryptedbytes,15402ms, SHA256 `b6b65da8ae68f1f8f810e8817446c0bffe6e266528723f87f0d9624a455787c8`. Duration is a synthetic local rehearsal, not approved RTO/RPO. The ephemeral exercise key is wiped; this artifact is not an operational recoverable backup. Independent storage,retained-key custody,cross-cluster global-role provisioning remain NOT TESTED.

Initial bounded full-database dump failed; selective isolated-schema restore exposed missing btree_gist, corrected only in the new destination. Enhanced ledger preflight first rejected27public rows:26completed active migrations plus1historical rolled-back row,no unresolved entry. Only26canonical completed rows with matching file SHA were mirrored into the new schema and restored. Public ledger/history remained untouched. Earlier71table/56row success is preserved as backup-evidence-before-ledger-login.json; final enhanced evidence supersedes it.

Sandbox attempts encountered Windows native SWC,Docker/API and audit DNS restrictions; authorized local execution passed. A browser measurement attempted while capacity owned3100 rejected EADDRINUSE; it subsequently passed after that server exited. No existing process/database was killed to bypass the guard.

## Performance and operational limits

The final12sample matrix and earlier17samples are retained in [performance](P11-PERFORMANCE-CAPACITY.md), including every recorded LCP outlier. Today encoded external script transfer fell151226→144253B (4.61%); independent gzip,INP,Lighthouse and authenticated browser performance remain NOT TESTED. One machine and small fixtures do not prove cloud capacity,physical-device acceptance or production error rates.

Deliberate outage telemetry:6responses,1server5xx,1client4xx;1/6server-error fraction is fault-injection evidence, not normal reliability. Final monitoring observed0server errors in75bounded responses. Disk is actually low; no files,schemas or volumes were removed to clear it. Retained synthetic schemas contribute to growth without implying any approved retention policy.

## Acceptance disposition

Required local functional,build,unit,integration,RLS,E2E,outage and encrypted restore checks pass. Measurement and security reviews are delivered with adverse findings retained. P11 is **local operational engineering preparation with open findings**, not unconditional production readiness or universal performance/security acceptance. Full audit is not clean,disk is low,PostgreSQL17.6/Node24.20.0 production patch acceptance remains open/blocked,and independent recoverable backups are not operating. No failed check is relabelled PASS.

A-01–A-12,medical/legal/owner choices,hosting,email/scheduling,physical devices,production TLS/keys/roles,container/OS scans and final publication remain governed by [release gates](P11-RELEASE-GATES.md). P12 is not started or automatically approved.
