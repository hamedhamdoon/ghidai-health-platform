# P12 — Local security, runtime and recovery acceptance

Acceptance began2026-10-15; final local review2026-10-18, Asia/Muscat. Synthetic local review only; no independent penetration test or production certification. Application baseline is approved P11 `e12066f66b28a4e8220e6fd097e8115222752b30`. Final executed commands/results are in [regression](P12-REGRESSION-TEST-RESULTS.md). No historical migration or AGENTS change.

Continuation2026-10-18: official PostgreSQL versioning, Node24.22.0 release and braces advisory were rechecked. The17.x table still lists17.11; the braces advisory remains without a patched version. Test tmpfs data did not survive the observed external container stop; see storage/regression. Historical restore PASS is evidence of that immediate rehearsal only, not retained-key disaster recovery. Fresh continuation results are reported separately.

| Boundary | Executed acceptance evidence / limitation |
|---|---|
| Browser → authenticated API | p3 browser/native verifies real login/reset/TOTP/recovery, cookies and actual revoked sessions, CSRF/Origin/body/unknown-field rejection; local HTTP cookie policy does not prove production Secure/TLS |
| API → database | p2–p9 native and browser exercises actor-scoped services, non-owner/non-BYPASS app roles, pooled transaction context, USER A/B isolation, direct RLS denial and constraints |
| COACH / ADMIN | p4/p8 tests independent qualifications/current MFA, last-admin protection, metadata-only administration, explicit READ/NOTE assignment/consent, expiry, immediate withdrawal and replay denial |
| Exports / temporary data | p9 owner/fresh-auth/TTL/private encrypted JSON/CSV download; no public file links or plaintext application export files; artifacts bounded in database. Scanner evidence stays ignored locally |
| Replay / concurrent writes | p3/p4/p5/p6/p9 tests single-use/recovery races, optimistic conflict, idempotent retry after committed response loss, deduplicated outbox/inbox; no raised rate budget |
| Invalid data / rendering | DTO allowlists, body cap, invalid goal/date/units/schema/owner rejection; React-escaped notes, Arabic failure states; no diagnosis from logs |
| Connection failure | Actual separate P3 and participant outage scripts pause/unpause identified local services with finally recovery; see final regression for executed counts |
| Cache / PWA | p10 browser plus 13 worker unit cases: public asset allowlist only; API/auth/health/pages/RSC excluded; offline mutation cannot report saved; successful real logout revokes session/purges cache |
| Logging / secrets | Safe error/telemetry tests and final scoped secret scan. Telemetry contains status/duration only. Tests sample safe audit metadata; this is not forensic proof of every OS/framework log or every crash dump |
| Independent security review | NOT TESTED; required before production and separate from the local test suite |

## npm and official version review

Fresh `npm audit --json`: **FAIL security-clean criterion, 5 High / 0 Critical**. `npm audit --omit=dev --json`: PASS registry check, **0 known runtime vulnerabilities**. `npm outdated --json` is an inventory, not proof of vulnerability. No dependency downgrade, warning suppression or unofficial package patch was used.

The reviewed [braces advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) still lists affected versions through 3.0.3 and no patched release when rechecked for P12. The five findings are the braces/micromatch/fast-glob/Next ESLint development chain; repository-controlled patterns constrain current exposure, but the vulnerability remains unfixed. Untrusted patterns/PR build tooling must be isolated. No browser health field is intentionally passed to a glob compiler. Routine major/RC upgrades do not constitute an accepted fix. Next/eslint-config-next16.4.1, React pair19.3.1 and Nodemailer10.1.1 remain pinned with the P11 lockfile.

[PostgreSQL official versioning](https://www.postgresql.org/support/versioning/) and [17.11 notes](https://www.postgresql.org/docs/release/17.11/) were rechecked: 17.11 is the current 17.x patch. Existing local17.6 stays untouched. The release includes role-sensitive cached-plan/RLS and client fixes; btree_gist index/configuration review is required. New-cluster restore constructs extension indexes using the new engine instead of reusing existing physical indexes; this is not an in-place upgrade test.

[Node24.22.0 official release](https://nodejs.org/en/blog/release/v24.22.0) and the [October21 security announcement](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases) were rechecked. Node24.22.0 Windows x64 was downloaded from nodejs.org, checked against the matching official SHA256 file, and extracted under ignored `.npm-cache/p12/runtime/`. It is invoked explicitly; machine Node24.20.0, PATH outside each child process, existing containers and Compose pins are unchanged. Published compatibility checks are not a claim that future October21 fixes already exist. Reassess on/after release before production.

## Patched-container scan

Isolated image `postgres:17.11-alpine`, immutable digest `sha256:b0f9560a2de083e2cc7382e75f808c7381a32852a7ec49117deedb300e552b24`. Docker Scout1.24.0 indexed66 packages and produced SARIF locally: **60 reported CVEs: 4 Critical, 29 High, 22 Medium, 5 Low**, spanning3 Go package identifiers (`stdlib@1.24.6`, `golang.org/x/sys@0.1.0`, `github.com/moby/sys/user@0.1.0`). These are inventory findings, not verified exploit paths or a zero-vulnerability database-server claim. Scanner log also reports4 exceptions; no additional GHIDAI exception or VEX was authored. Raw result interpretation and applicability need independent review.

Container `gosu --version` returned1.19/go1.24.6. The [official gosu release](https://github.com/tianon/gosu/releases/tag/1.19) names the matching build dependencies. This supports attribution to the privilege-switch helper; it does **not** establish that every flagged standard-library feature is reachable. No exploitability finding is waived because gosu is a short-lived helper. Critical IDs include CVE-2026-78663, CVE-2026-39821, CVE-2026-56857 and CVE-2025-68121; all60 raw scanner records remain in `.npm-cache/p12/container-cves.sarif.json`. Production image acceptance remains BLOCKED pending patched/reviewed image or justified independently approved disposition.

First Scout invocation used unsupported generic JSON formatting and did not perform a scan; corrected SARIF invocation completed. Scout reported failure to remove its own locked temporary image archive under the OS temp directory; no manual cleanup was attempted. Host Windows CVE coverage and Docker Desktop/WSL vulnerability acceptance remain **NOT TESTED**; a version/hotfix inventory is not an OS vulnerability scan. Scanning the new image does not scan the existing17.6 image, host, Mailpit, application Linux native binaries or a future hosting platform.

## Encrypted restore and rollback boundaries

`scripts/p12-backup-rehearsal.ts` is an explicit guarded cross-cluster extension of the P11 rehearsal. Source is a freshly created synthetic schema in existing loopback `ghidai_test`, with 26 canonical migration hashes and an isolated mirror of the completed migration ledger. It does not dump existing historical user schemas. Destination is newly created `ghidai-p12-postgres-1711` on loopback55434, with a separate tmpfs cluster and explicit new role provisioning; source databases, roles, env connection pointers and Compose stay intact. The historical `ghidai_p11_restore_*` target naming is retained to satisfy the existing strict restore-name validator; phase/container/evidence identify P12.

The new17.11 pg_dump client reads the synthetic source via the private local Docker network; credentials are read inside the container environment, not printed or interpolated into host command arguments. AES-256-GCM encryption/integrity happens in memory; authenticated tamper rejection precedes restore. pg_restore is single-transaction/exit-on-error to a fresh target; metadata/table counts/migration ledger, old session, new password login, Prisma-backed identity/analytics and non-owner RLS A/B checks compare source and destination. Final result/size/timing/hash are recorded in regression, not presumed from code.

Backup key is ephemeral and wiped; the saved encrypted artifact is **not recoverable after the process exits**. Application keys exist only in ignored local env files, not a proven disaster custody arrangement. Independent storage, retained versioned encryption keys, full historical database/global ledger recovery, deletion-ledger replay after disaster, operator handover and approved RPO/RTO remain BLOCKED/NOT TESTED. A second cluster on the same laptop is not independent storage. No production backup success is claimed.

Rollback evidence is preservation: application still points at original17.6 test/development ports and machine runtime remains24.20.0. New cluster is opt-in test-only. No in-place replacement or pointer switch was performed; reverting an operational upgrade was therefore NOT TESTED. Existing and new containers/schemas/volumes are retained; stopping a tmpfs cluster would lose its data and is not an automatic cleanup step. See [open gates](P12-OPEN-ISSUES.md).

The full151-group native and147-case browser suites run on the dedicated17.6 test service with isolated Node24.22.0. The17.11 experiment exercises cross-cluster schema/ledger/metadata restore, login/session, analytics and RLS probes; it is **not** the complete151/147 suite retargeted to17.11. Consequently full patched-infrastructure compatibility and actual operational upgrade/rollback remain unaccepted. No existing infrastructure is upgraded on the strength of this bounded rehearsal.

## Refreshed existing-container scans — 2026-10-18

Three explicit local-stock-image Scout scans completed exit0 and wrote SARIF; exit0 means scan execution, **not a clean-security result**. Counts below derive from each SARIF rule's numeric security-severity bands; findings overlap between images and must not be summed as distinct application vulnerabilities.

| Image | Findings / affected package identifiers | Critical /High /Medium /Low | Acceptance |
|---|---|---|---|
| Existing PostgreSQL17.6-alpine (dev/test pin unchanged) |135 /12|8 /63 /50 /14|FAIL clean-image criterion|
| Isolated PostgreSQL17.11-alpine (same tested digest) |72 /5|4 /32 /29 /7|FAIL clean-image criterion|
| Existing Mailpit1.27.4 (local test sink) |171 /14|15 /76 /67 /13|FAIL clean-image criterion|

Raw `oct18-{postgres176,postgres1711,mailpit}.sarif.json`, per-image logs, summary and exit receipts stay ignored in `.npm-cache/p12`. The17.11 count changed from60 in15October's scanner snapshot to72 in18October's refreshed result without replacing the image; both snapshots are retained. PostgreSQL scan logs report4scanner exceptions; no GHIDAI exception/VEX or risk approval was added. Scout again reported locked own temporary-archive cleanup issues; no manual cleanup occurred. These inventory findings require package/path/reachability and patched-image assessment before production; neither local synthetic isolation nor successful RLS tests waives them. The local sink is not an external mail provider.

Windows11Pro10.0.26300 version inventory is available; OS/WSL/Desktop CVE and application Linux-native-binary acceptance remain NOT TESTED. No suitable verified OS vulnerability scan was completed. Machine Node remains24.20.0; isolated24.22.0 source/runtime checks pass. Fresh npm full audit remains5High/0Critical, runtime0. Local application control tests do not override adverse infrastructure/dependency findings or replace independent security review.
