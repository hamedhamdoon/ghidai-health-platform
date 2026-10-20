# P12-R1 security and operational review

Final evidence addendum,20October2026: registry audits last actually refreshed19October (`audit-final-full.json`, `audit-final-runtime.json`, `audit-final-exits.json`) retained5High full/0runtime findings; full audit exit1 remains adverse. Including the isolated1.31.6 candidate, deduplication spans195 advisory IDs/193 CVEs and261 advisory-component-version pairs;259 above is the three original-image scope. Candidate compatibility does not waive its High finding.

The final frozen regression completed19October: encrypted fresh-cluster restore of73tables/85rows and29canonical migration ledger rows in14,019ms, with authenticated-corruption rejection, schema/owner/policy equivalence, restored session and password login, RLS isolation and analytics comparison. Evidence: `.npm-cache/p12-r1/backup-evidence.json` and `regression-1792385690605/restore.log`. Key persistence and independent storage are explicitly false. This bounded synthetic rehearsal neither recovers the lost earlier tmpfs history nor establishes production backup readiness.

Delivery byte integrity: new migrations018/020 were tested/applied with CRLF bytes. Explicit per-file `-text` attributes preserve those exact bytes in Git instead of silently normalizing their checksums. All29 indexed migration hashes are compared with the final restore manifest. Baseline migrations and AGENTS remain untouched. Cosmetic blank-at-EOF warnings in new files are retained to avoid changing frozen, deployed migration bytes; the separate whitespace check excludes only that cosmetic rule and recognizes CRLF line endings.

Continuation19October: the test container was observed Exited255 after host restart. Starting the existing container initialized empty tmpfs; former live test schemas were not recovered. Saved source/log/SARIF files remain. New guarded additive initialization and fresh test replay are required; this is not a recovery of historical data. No deletion/reset was issued.

2026-10-18, Asia/Muscat. Local synthetic scope; A-01..A-12 remain OPEN. Application control evidence is reported separately from dependency/image acceptance. No independent security approval is inferred.

## Actual refreshed inventory

Original P12 reports and raw files remain intact. R1 raw audit/SARIF/logs live in `.npm-cache/p12-r1`; `scripts/p12-r1-security-summary.mjs` emits auditable CVE/component/version/image rows in `security-deduplicated.json`. Initial sandbox audit failed DNS; authorized retry completed. Failure artifacts remain distinct.

| Current component | Result |
|---|---|
| npm full | FAIL clean criterion: 5 High package findings, 0 Critical, one unique advisory chain |
| npm runtime (`--omit=dev`) | PASS registry check: 0 known findings; not a penetration test |
| postgres:17.6-alpine | 135 unique CVEs /135 CVE-component pairs; 8 Critical,63 High,50 Medium,14 Low pairs |
| postgres:17.11-alpine | 72 unique CVEs /72 pairs; 4 Critical,32 High,29 Medium,7 Low pairs |
| axllent/mailpit:v1.27.4 | 169 CVEs plus2 other advisory IDs /178 advisory-component pairs; 17 Critical,81 High,67 Medium,13 Low pairs |
| Cross-image deduplication | 193 CVEs plus GHSA-259r-337f-4rfw and GO-2026-5932 =195 unique advisory IDs,259 advisory/component-version pairs. Image totals must not be added as unique risks |

Mailpit's pair counts differ from its 171 advisory-rule count because one CVE can affect multiple package identifiers. No suppression/VEX/force downgrade/unofficial patch is used. Scanner exit0 means execution succeeded, not security PASS. Logs retain four scanner exceptions reported for PostgreSQL.

The [braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), rechecked18October, affects≤3.0.3 and lists no patched version. The five npm findings represent braces→micromatch→fast-glob→Next ESLint tooling; these are development dependencies. Repository-controlled patterns constrain exposure, but untrusted patterns/source tooling can cause stack exhaustion. No known participant input is routed to this glob compiler. npm's suggested eslint-config-next14.2.35 downgrade conflicts with the Next16 toolchain and is not adopted. This remains an adverse unresolved development-chain risk requiring independent disposition.

[PostgreSQL versioning](https://www.postgresql.org/support/versioning/) lists17.11 as current17.x patch; [17.11 release notes](https://www.postgresql.org/docs/release/17.11/) document fixes absent from17.6. The existing17.6 development services are preserved;17.11 is an isolated candidate, not a clean-image claim. [gosu1.19 build metadata](https://github.com/tianon/gosu/releases/tag/1.19) supports helper-component attribution for many Go findings, not blanket non-exploitability. Database role/session/RLS tests do not waive infrastructure CVEs. [Mailpit releases](https://github.com/axllent/mailpit/releases/tag/v1.31.6) identify1.31.6 as official latest candidate; isolated scan/compatibility results follow only after actual execution.

Existing services bind locally; Mailpit is a synthetic sink, not an external delivery provider. Go helper/server package reachability differs; scanner inventory alone proves neither exploitation nor absence of exploitation. High/Critical residuals keep clean-security acceptance FAIL and production security gate BLOCKED pending independent security treatment. Windows/WSL/Docker Desktop comprehensive CVE review remains NOT TESTED.

## Storage and cleanup proposal — no deletion authorized or executed

Read-only inventory `storage-inventory.json` records19 test/public schemas at10:04UTC, project files and Docker usage. Free C: space was6,779,396,096/128,340,455,424B (~5.28%); low-space risk persists. Counts/sizes change as new synthetic evidence is generated.

| Candidate / ownership | Measured potential bytes | Effect / recovery / other projects |
|---|---:|---|
| GHIDAI node_modules |839,548,388|Dependency removal breaks local execution until `npm ci`; lockfile restores packages subject to registry access; project only |
| GHIDAI .next |120,803,961|Removes current build; regenerate after source checks/build; project only |
| GHIDAI .npm-cache |164,397,167|Mixed retained scan/test/runtime/encrypted rehearsal evidence; NOT blanket safe cleanup. Evidence may be irreplaceable; independently archive/verify before any approved selected removal |
| GHIDAI test-results |2,291,803|Screenshots and test evidence; preserve acceptance artifacts before selected removal; no automatic cleanup |
| Docker build cache (shared host) |2.217GB total /1.804GB reclaimable reported|May include Mihan/other builds; ownership not proven GHIDAI-exclusive. Rebuild costs and cache loss across projects; not approved for cleanup |
| Docker volumes |193.2MB total across3 active volumes|GHIDAI development volume plus egos_postgres_data and mihan_pgdata. Other projects affected by global removal; prohibited |
| Synthetic schemas/new restore DBs |Per-schema sizes retained in JSON|Historical local evidence; removal destroys test history and cannot be inferred recoverable. All retained |

Images total2.347GB at initial inventory, all referenced; no globally safe image prune. Existing Mihan/egos containers/images/volumes are outside this project's cleanup scope. Existing test/patched clusters use tmpfs; stopping them can lose data and is not cleanup. Expected bytes are logical sizes, not guaranteed host-space recovery; Docker virtual-disk compaction is a separate unapproved operation. No deletion/reset/prune/volume replacement occurred.

## Backup limits

Final20October read-only refresh preserved `storage-inventory-before-final.json`. Current inventory:43 source test/public schemas; node_modules839,548,369B, .next70,730,437B, .npm-cache192,702,601B, test-results2,365,999B. Docker8/8 referenced images2.394GB,3active volumes193.3MB and shared cache2.217GB/1.804GB reported reclaimable. Monitor free6,198,947,840/128,340,455,424B (~4.83%) with STORAGE_LOW/BACKUP_NOT_VERIFIED/ERROR_RATE_NOT_MEASURED. Current GHIDAI services were observed running; other-project Mihan resources remain out of scope. Logical inventory is not deletion approval or guaranteed host-space recovery. No cleanup occurred.

Independent storage, durable separated backup/application keys, complete historical recovery and disaster deletion-ledger replay remain BLOCKED/NOT TESTED. R1 can repeat the bounded encrypted fresh-cluster synthetic rehearsal only. A same-laptop destination and ephemeral encryption key cannot establish an operational independent backup. Existing backup evidence and source schemas are preserved. Application connection pointers and Compose pins remain unchanged; actual production upgrade/rollback is NOT TESTED. New isolated-candidate compatibility and source preservation must be recorded separately from a claim of rollback after a real operational switch.

## Isolated Mailpit candidate —19October

Official1.31.6 was pulled and scanned separately; immutable local image identity remains available through Docker inspection. Scan reports2 advisory/package pairs: GO-2026-5932 at golang.org/x/crypto0.58.0 (score3.1), CVE-2023-42821 at gomarkdown/markdown0.0.0-20261006233006-5e92716d526e (High7.5). Both raw findings are retained, no suppression. [Go's official report](https://pkg.go.dev/vuln/GO-2026-5932) concerns deprecated openpgp subpackages, requiring reachability analysis rather than assuming every use of x/crypto is vulnerable. The [upstream markdown fix](https://github.com/gomarkdown/markdown/commit/14b16010c2ee7ff33a940a541d993bd043a88940) predates the candidate module pseudoversion; Scout reports an unrestricted affected range. Applicability needs exact build/source ancestry review; no automatic false-positive waiver is applied.

New `ghidai-p12r1-mailpit-1316` uses separate loopback8027/1027 ports. `scripts/p12-r1-mailpit.mjs` PASS health, SMTP acceptance and HTTP API retrieval of one synthetic message; `.npm-cache/p12-r1/mailpit-compatibility.json` records04:16:30UTC. Original Mailpit1.27.4 remains running on its original ports. Source/env pointers/Compose did not switch: rollback safety is preservation, not a tested in-place downgrade. Candidate clean-security remains FAIL due retained High finding; full original auth/outage suite still targets original sink. No real recipient/external delivery tested. Automatic approval review initially failed on18October due account usage limit before the candidate-start action executed;19October authorized continuation successfully ran the isolated action.
