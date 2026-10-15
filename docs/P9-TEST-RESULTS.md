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
| Final integration correction: independent reminder cancellation | PASS 18/18 native groups | Current preserved isolated schema `p3_test_1791952391868`; exit 0, 7.89 s. Editing queued rule A cancels only A, keeps B pending, and B later delivers once |
| Final correction scoped unit suite | PASS 11/11 | Vitest run duration 1.02 s |
| Full GHIDAI participant-graph deletion rehearsal | PASS 9/9 groups | Fresh preserved schema `p3_test_1791971785365`; all 26 P2–P9 migrations replayed; historical migrations unchanged; global environment pointer unchanged |

The unit cases cover quiet-hour pairing and timezone validation, overnight and daytime boundaries, DST gap first-valid minute and fold first occurrence, consent/revision/quiet/expiry delivery eligibility, bounded exponential retry, CSV quoting/formula neutralization, Arabic Unicode/record boundaries, synthetic-only deletion isolation/refusal and every explicit export DTO field against the actual Prisma schema.

## Native coverage and browser verification

`tests/integration/p9-privacy-notifications.ts` executed and passed all 17 assertion groups for anonymous and untrusted actor denial; explicit consent and receipt replay/conflict; revision/setting/type validation; delivery deduplication and read concurrency; same-day stable delivery after preference/rule revisions; B/admin/coach isolation; real own water log/history and manual task evidence in encrypted JSON and CSV exports; owner/fresh-auth/expiry denial; exact download route and future-granted consent denial; policy-gated deletion requests and cancellation; withdrawal suppression; quiet retry and changed-schedule cancellation; stale/expired jobs; negative RLS; safe audit entries.

`tests/integration/p9-deletion.ts` performs 7 direct PostgreSQL checks in a freshly created `p9_deletion_<UUID>` schema: reject public schema; remove subject A and its health/session rows; preserve B; retain a hashed ledger; reject invalid subject. It never drops schemas, resets development, or removes volumes. The schema is preserved and its name printed for the report. This is a relational rehearsal, not full production-schema purge acceptance.

`tests/integration/p9-full-deletion.ts` then verifies the actual GHIDAI participant graph in a separate new schema without modifying `.env.p3.test.local`. All nine groups passed: A/B enrollments and real water/steps/exercise/sleep/review/habit/completion/history; explicit coaching consent/grants/note; real notification/export/deletion requests; auth token/mail/challenge/disabled MFA/session/push/correction records; public/old/future/missing-marker/wrong-subject/application-role/non-fixture identity rejection; forced final-stage rollback; target graph removal and identity tombstone; B/shared programs/content/prior audit preservation; exact hashed ledger and restored immutable triggers; repeat safety and revoked-session/login denial; exactly one safe append-only deletion audit; preserved schema/global pointer. The exact trigger overrides are limited to two named triggers inside the marked new synthetic schema transaction. No foreign-key/audit trigger, permission, historical migration or old schema was changed. Explicit ledger retention/cutoff parameters are test values only.

Two initial full-test fixture attempts failed before deletion because the test supplied an unsupported null habit end date and then omitted the coach-note assignment revision. Those fixtures were corrected to the existing contracts; their schemas were preserved. The complete test subsequently passed twice, including final missing-marker/application-role/non-fixture guards. The earlier successful full graph schema `p3_test_1791953608192` and final schema `p3_test_1791971785365` are both retained. Production deletion remains disabled.

`tests/e2e/p9-privacy-notifications.spec.ts` executed two scenarios at 360/768/1280: real consent, export download and subject identity, deletion request/cancellation, reminder settings/type/tick/read, account switch isolation, axe/overflow checks, and outage without false success. All six project cases passed. Screenshots `test-results/p9-notifications-{360px,768px,1280px}.png` were generated. Automated axe success does not establish practical screen-reader acceptance; no human screen-reader test is claimed.

Root integration report must append exact execution totals and results, including final TypeScript/lint/build, negative RLS, outages/recovery, secret scan, all P1–P7 regressions, accessibility and production-browser checks. Human assistive-technology and production policies remain separate acceptance tasks.

The P9 checkpoint contains the 17-group native result above. The subsequent integration correction restricts rule edits to their own queue prefix while settings/consent changes cancel all pending jobs. Its new eighteenth regression group advances a synthetic tick beyond both the quiet end and retry due time. The first test iteration advanced before retry due and correctly delivered zero; correcting the fixture clock yielded all 18 groups passing. No schema was recreated for this fix. Final rebuilt browser verification is recorded by the integration lead.

Final sequential regression on 2026-10-14 passed P9 18/18 on `p3_test_1791971774530`, full graph deletion 9/9 on `p3_test_1791971785365` with all 26 migrations, and basic deletion 7 assertions on `p9_deletion_ec09e0dad93c4243abba342edfbf3ea6`. Every synthetic schema remains preserved. The graph run asserted 26 migrations and replayed them; its old summary text still printed “25”, corrected afterward as a reporting typo without changing assertions or migration execution.

Final rebuilt E2E replay on `p3_test_1791972140888` passed6/6 P9 cases across360/768/1280 within the48-case P8–P10 wave (1.3m).
