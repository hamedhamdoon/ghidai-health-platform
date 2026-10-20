# P12-R1 regression results

Approved baseline: `4976b0df4657fdacf29c620a7453fb2b268b8587`; branch `feature/ghidai-p12-r1-remediation`. Local synthetic execution only. The final frozen replay completed on 19 October 2026, Asia/Muscat; this ledger was finalized on 20 October. Earlier P12 results are comparison counts, not imported R1 passes.

## Final frozen-source evidence

Evidence manifest: `.npm-cache/p12-r1/regression-1792385690605/results.json`. All 12 recorded tasks exited 0. It identifies each task's start/end and separate raw log. Source checks are in `.npm-cache/p12-r1/frozen-source-check.log`; Prisma evidence is in `frozen-prisma-validate.log` and `frozen-prisma-generate.log` beside it.

| Check | P12 comparison | Final P12-R1 result | Evidence |
|---|---:|---:|---|
| Prisma validate / generate | Required | PASS / PASS | Frozen Prisma logs; client 7.10.0 generated |
| TypeScript / ESLint / production build | Required | PASS / PASS / PASS | frozen-source-check.log |
| Unit cases | 123 | **135 PASS**, 17 files | 123 original + 2 nutrition + 10 administration |
| PostgreSQL groups | 151 | **172 PASS** | native-original.log:151; native-nutrition-new.log:8; native-administration-new.log:13 |
| Relational deletion assertions | 7 | **7 PASS** | native-original.log; separate from PostgreSQL group total |
| Full-graph deletion groups | 9 | **9 PASS** | native-original.log; separate from PostgreSQL group total |
| Browser cases | 147 | **162 PASS** | browser.log:147 original + 15 new |
| Actual outage/recovery groups | 11 | **11 PASS** | auth-outages.log + participant-outages.log |
| Canonical setup / restricted DB probe | Required | PASS / PASS | canonical-test-setup.log + database-probe.log |

The 15 new browser cases are five scenarios across 360/768/1280px: one participant nutrition cycle and four administration/correction scenarios. They exercise real UI/API/PostgreSQL persistence and reload, independent review, schema and rule publication/withdrawal, owner request/cancel, access denial, keyboard use, Arabic RTL, Axe, reduced motion and P10-style CSS 200% zoom/reflow. CSS layout emulation does not establish physical browser zoom, actual screen-reader use or two independent physical devices; those remain NOT TESTED. Repeated targeted/full passes are not added as additional unique coverage.

## Restore and bounded capacity evidence

`restore.log` records an encrypted cross-cluster synthetic restore from PostgreSQL 17.6 to the isolated 17.11 candidate: **73 tables, 85 rows, 29 completed canonical migration-ledger entries, 0 unresolved/rolled-back entries**, in **14,019 ms**. Owner/policy/schema equivalence, corruption rejection, restored session and password login, RLS isolation and analytics comparison passed. Historical migration checksums remained unchanged. This verifies the bounded synthetic snapshot; it does not establish independent production backup storage, persisted encryption-key custody, approved RPO/RTO, full production history or a production deletion-log retention service. The evidence explicitly records `keyPersisted=false` and `independentStorageTested=false`.

`capacity-single.log` records **75 measured authenticated HTTP reads, 0 failures**, one session, with aggregate HTTP p95 502 ms. `capacity-multiuser.log` records 20 independent synthetic sessions: **20 warmups + 180 measured reads, 0 failures**; total telemetry is 200 requests including warmups, p95 179 ms. Direct-service seed writes are reported separately and are not HTTP throughput. These bounded local read-load checks do not certify production scale or independent physical-device acceptance.

## Earlier failed or interrupted attempts retained

The first integrated source check failed TypeScript in new performance instrumentation; it was corrected before the frozen source replay. Administration development runs exposed a reviewer-capability RLS denial, reviewed-graph binding gaps, SQL JSON alias collision and a missing narrow participant correction-audit policy. Fixes were followed by native negative tests; failing runs were never counted as passed suites. Invalid backdated API/owner fixtures were correctly rejected by enrollment guards and replaced by a legitimate current enrollment/withdrawal fixture. No trigger was disabled to manufacture historical completion.

An earlier browser wave under `browser-1792384962395` timed out in new schema/correction tests: exact wrapping-label locators included textarea/select descendants. Precise accessible-role selectors fixed the test discovery issue; no timeout, assertion or acceptance budget was relaxed. The earlier wave's original 147 passes did not substitute for the final replay. A targeted new-case replay passed 15/15, followed by the final unified 162/162 above.

Sandbox EACCES and a host/container interruption caused unsuccessful execution attempts, including ECONNREFUSED. The test tmpfs was observed empty after the host restart on 19 October; fresh initialization did not recover previously held schemas. Test runners otherwise preserve isolated schemas and do not reset/drop existing resources. The historical 26-migration deletion rehearsal and the new 29-entry restore-ledger test have distinct scopes and are not conflated.

## Remaining acceptance boundaries

F02 remains PARTIAL: request intake is optional, not a mandatory approval gate or historical-log freeze. Completed-enrollment intake has no direct historical fixture and remains NOT TESTED; withdrawn-enrollment intake/cancel is directly exercised. Exceptional correction approval/rejection/application/recalculation stays blocked by A-03/A-11. Sensitive health reports remain BLOCKED by A-11/legal review. Real authoring-policy adoption remains blocked by A-03/A-04 despite local technical authoring passes.

LCP/CLS/INP and other performance budgets are evaluated separately in P12-R1-PERFORMANCE-RESULTS. Security, storage and independent production-backup gaps remain governed by P12-R1-SECURITY-REVIEW and the final handoff. Test success does not approve public deployment, close owner decisions, accept remaining security risk or authorize a merge to main. Final secret/protected-file/Git-delivery checks belong to the integration handoff and are not inferred from this test manifest.
