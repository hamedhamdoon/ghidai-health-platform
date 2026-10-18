# P12 — Storage inventory and proposed cleanup

Acceptance began2026-10-15; final local review2026-10-18, Asia/Muscat. **Inventory/plan only: no cleanup authorized or performed.** Do not run broad prune/drop/reset commands. No schema, database, volume, existing test evidence, application log or important file is removed by this plan.

**2026-10-18 continuation:** both existing test tmpfs containers were observed stopped after the execution interruption. After starting those same containers, the original test DB had no migration ledger and zero `p3_test_*` schemas. Thus historical live test schemas/restore DBs below are inventory evidence from15October, not a claim they survived the external stop. No agent DROP/reset/recreate caused this continuation state. The development named-volume container remains separate. Empty test-only storage is initialized from unchanged migrations for fresh acceptance; no recovery of the lost tmpfs history is claimed. This directly demonstrates why tmpfs and ephemeral-key archives are not independent recoverable backups.

Initial C: free6.07GiB, later5.19GiB after isolated image/runtime/scanning work; low-space alert remains real. Final monitor/inventory belongs to [regression](P12-REGRESSION-TEST-RESULTS.md). Free bytes vary while tooling writes evidence. A healthy short test run does not resolve the alert.

| Item measured within GHIDAI | Observation | Safe disposition proposed for separate approval |
|---|---:|---|
| `node_modules` |839,548,201 B initial | Reproducible from lockfile but needed now; retain during acceptance. Do not remove to improve a test result |
| `.next` |119,711,750 B corrected elevated inventory | Build output only; candidate after successful handoff and stop of the exact owned app process; rebuild required |
| `.npm-cache` |147,669,869 B intermediate | Contains historical test evidence, encrypted rehearsal archives, runtime download/extraction, local secret env and reports; review individually, never blanket-delete |
| `test-results` |1,329,519 B intermediate | Legacy suites refresh fixed-name illustrative screenshots. P12 outputDir is unique; runner now also snapshots the fixed-name directory before/after waves. Initial P12 reruns refreshed those illustrative names before this safeguard was added; no claim of preserving every original screenshot version |
| `src` |8,280,448 B initial | Includes generated Prisma output; source remains protected; no proposed source cleanup |
| `.git` |2,364,244 B initial | Version history; retain, no Git object deletion/pruning |
| `references` |1,481,396 B initial | Source images; protected, retain |
| docs/tests/scripts/prisma | Smaller versioned engineering evidence | Retain; no deletion candidate |

The initial sandbox inventory reported `.next` size unknown and one traversal error; it is not treated as zero. The corrected read-only elevated Node filesystem walk measured the three directories above. New P12 artifacts created afterward increase totals. No file contents or secrets are included in the inventory.

Initial database inventory: `ghidai_test`888,335,507 B;142 synthetic `p2_test_*`, `p3_test_*` and `p9_deletion_*` schemas. Exact schema/table/byte list is retained locally in `.npm-cache/p12/schemas.tsv`. Existing restore databases are `ghidai_p11_restore_1792050051032_89dfa2e2`14,470,291 B, `ghidai_p11_restore_1792036969892_4b28629c`14,412,947 B, `ghidai_p11_restore_1792036842908_35b065eb`14,404,755 B and `ghidai_p11_restore_1792036645351_baf617ad`8,277,139 B. Sizes are snapshots, not row contents. All are retained. P12 creates additional fresh marked synthetic schemas/restore target; the final inventory must include them before any future approval.

Initial Docker storage:6 images1.923GB,7 containers9.069MB,3 volumes193.2MB,45 build-cache records2.217GB (reported reclaimable1.804GB). Volume breakdown: GHIDAI development71.7MB, `egos_postgres_data`69.79MB, `mihan_pgdata`51.71MB. Existing test database uses tmpfs, not the development named volume. Other-project images/containers/volumes are outside GHIDAI scope. The new17.11 image/container is additional; active17.6 must remain available as preserved baseline.

## Reviewable proposed actions; none executed

| Priority / exact selection rule | Prerequisite and risk | Approval required |
|---|---|---|
| Retained Node zip `.npm-cache/p12/node-v24.22.0-win-x64.zip` only | Record checksum and validated extracted runtime first; later offline reinstall would need download | Owner separate file-cleanup approval |
| `.next` only | Confirm resolved absolute path is within GHIDAI; no active app/build; preserve final acceptance evidence separately; build needed again | Owner separate approval |
| Individually named screenshots/logs/archives under `.npm-cache/p12` or older P directories | Preserve reports, hashes and failed-attempt evidence; old encrypted ephemeral-key archives are not recovery backups; do not delete any local key/env or evidence without retention decision | Owner + operator retention decision |
| Explicit reviewed list from `schemas.tsv` plus final inventory | Verify synthetic-only markers/ownership, no current P3_TEST_SCHEMA/browser job/reference, dependency graph, reproducible fixture and evidence retention. Drop is destructive and NOT included in this phase | Separate owner approval naming each schema/DB |
| Four restore DB names above and new P12 restore target | Confirm no remaining audit/recovery review uses them; the ephemeral-key archive cannot substitute for retained DB evidence | Separate owner approval naming databases |
| Docker build-cache records belonging specifically to GHIDAI | Labels/usage must first prove project ownership; current45-record inventory includes unrelated work. No blanket `docker builder prune` | Separate approval for exact IDs after attribution |
| Docker image/container/volume | All current volumes active/linked;17.6 baseline and development data protected. No volume deletion proposed. Isolated new tmpfs cluster must not be stopped as cleanup until its evidence is accepted | Separate explicit owner approval |
| Scout locked archive in OS temp | Outside GHIDAI; tool reported its own cleanup failure. Exact path and owner/lock must be checked; no manual action here | Separate OS-temp cleanup authorization |

Dropping tmpfs schemas primarily reduces cluster memory; deleting Docker data does not automatically shrink a dynamically allocated VM disk. No promised C: recovery amount is inferred from logical PostgreSQL/Docker sizes. First preserve an independently recoverable backup with available keys before any important-data cleanup; this requirement is currently unmet. Repeat `Get-PSDrive C`, scoped filesystem sizes, read-only schema sizes and `docker system df -v` after an approved cleanup to verify actual benefit. Keep the existing low-space finding open until measured resolution.

## Final continuation inventory — 2026-10-18

Monitor free6854062080/128340455424B (5.3405%): STORAGE_LOW still open. Docker7images2.347GB,8containers10.49MB,3volumes193.2MB,45build-cache records2.217GB; no cleanup. Fresh source test DB112618643B,16synthetic schemas listed below. Separate17.11 cluster: `ghidai_test`7698099B; new restore target `ghidai_p11_restore_1792305628959_fd510ed2`14481075B. These are different from the historical15October test inventory, lost after the observed tmpfs stop; reduced source size is not credited as an agent cleanup or successful recovery.

All listed source schemas are retained; **the following is an inventory, not approval to remove them**. Exact source `.npm-cache/p12/oct18-schemas.tsv`; counts include fixture/helper tables and sizes include each table's associated indexes.

| Schema | Tables | Bytes |
|---|---:|---:|
|p3_test_1792305583464|72|5595136|
|p3_test_1792305233447|71|5586944|
|p3_test_1792305643304|71|4923392|
|p3_test_1792305572975|71|4751360|
|p3_test_1792305537316|71|4743168|
|p3_test_1792305517177|71|4734976|
|p2_test_1792305441490|68|4694016|
|p3_test_1792305113991|71|4628480|
|p3_test_1792305315946|71|4448256|
|p3_test_1792305467103|71|4399104|
|p3_test_1792305564330|71|4276224|
|p3_test_1792305491123|71|4235264|
|p3_test_1792305629401|72|3743744|
|p3_test_1792305006110|71|3530752|
|p3_test_1792305448679|70|3407872|
|p9_deletion_59f9875909d44376adf8ab6430288ffe|5|131072|
