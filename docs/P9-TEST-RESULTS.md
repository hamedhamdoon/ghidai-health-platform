# P9 test results

## Executed by P9 implementation agent

| Check | Result | Evidence |
| --- | --- | --- |
| P9 unit suite including DTO/schema field review | PASS 11/11 | Vitest v5.0.3, `tests/unit/p9-rules.test.ts`, final scoped run duration 1.17 s |
| Initial TypeScript `tsc --noEmit` | PASS | Exit 0; new services and UI compiled |
| Scoped ESLint including P9 services/UI/unit/integration | PASS | Exit 0; run before final export allowlist expansion, comprehensive rerun owned by integration lead |
| PostgreSQL deletion rehearsal initial sandbox attempt | BLOCKED | `connect EACCES 127.0.0.1:55433`; did not reach a write or create a schema in that attempt |
| PostgreSQL deletion rehearsal integration-lead run | PASS 7 assertions | Schema `p9_deletion_e8f0799f2bcc4e8a93ec463894143b5a` preserved; reported by integration lead |
| P9 native PostgreSQL integration after security review | PASS 17/17 groups | New schema `p3_test_1791951033817`, elevated local Node execution, exit 0, 6.61 s |
| P9 Playwright browser E2E | PASS 6/6 | 360/768/1280 px; one worker; production Next build at loopback 3000 with same isolated schema; exit 0, 34.0 s |
| P9 axe and viewport overflow | PASS in 3 browser cases | Privacy and notifications WCAG2A/2AA/2.2AA axe scans zero violations; privacy viewport overflow check passed |

The unit cases cover quiet-hour pairing and timezone validation, overnight and daytime boundaries, DST gap first-valid minute and fold first occurrence, consent/revision/quiet/expiry delivery eligibility, bounded exponential retry, CSV quoting/formula neutralization, Arabic Unicode/record boundaries, synthetic-only deletion isolation/refusal and every explicit export DTO field against the actual Prisma schema.

## Native coverage and browser verification

`tests/integration/p9-privacy-notifications.ts` executed and passed all 17 assertion groups for anonymous and untrusted actor denial; explicit consent and receipt replay/conflict; revision/setting/type validation; delivery deduplication and read concurrency; same-day stable delivery after preference/rule revisions; B/admin/coach isolation; real own water log/history and manual task evidence in encrypted JSON and CSV exports; owner/fresh-auth/expiry denial; exact download route and future-granted consent denial; policy-gated deletion requests and cancellation; withdrawal suppression; quiet retry and changed-schedule cancellation; stale/expired jobs; negative RLS; safe audit entries.

`tests/integration/p9-deletion.ts` performs 7 direct PostgreSQL checks in a freshly created `p9_deletion_<UUID>` schema: reject public schema; remove subject A and its health/session rows; preserve B; retain a hashed ledger; reject invalid subject. It never drops schemas, resets development, or removes volumes. The schema is preserved and its name printed for the report. This is a relational rehearsal, not full production-schema purge acceptance.

`tests/e2e/p9-privacy-notifications.spec.ts` executed two scenarios at 360/768/1280: real consent, export download and subject identity, deletion request/cancellation, reminder settings/type/tick/read, account switch isolation, axe/overflow checks, and outage without false success. All six project cases passed. Screenshots `test-results/p9-notifications-{360px,768px,1280px}.png` were generated. Automated axe success does not establish practical screen-reader acceptance; no human screen-reader test is claimed.

Root integration report must append exact execution totals and results, including final TypeScript/lint/build, negative RLS, outages/recovery, secret scan, all P1–P7 regressions, accessibility and production-browser checks. Human assistive-technology and production policies remain separate acceptance tasks.
