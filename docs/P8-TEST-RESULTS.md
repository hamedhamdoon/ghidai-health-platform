# P8 — Test results

2026-10-14, Asia/Muscat.

| Check | Executed result |
|---|---|
| Vitest `tests/unit/administration.test.ts` | 14/14 passed; explicit consent, unsafe/duplicate scopes, expiry, ownership injection, bounded notes and meaningful reasons |
| Native PostgreSQL `tests/integration/p8-administration.ts` | 11/11 passed on isolated synthetic p3_test schema; no schema/volume removal |
| E2E `tests/e2e/p8-administration.spec.ts` | 6/6 passed (31.3s), Chromium 360/768/1280; explicit grant, keyboard Enter submission, separate coach note, withdrawal, API denial, RTL, no horizontal overflow and zero axe WCAG violations |
| Scoped ESLint | Passed (exit 0) for P8 service/contracts/components/unit/native/E2E |
| Full typecheck/lint/build/regression | Integration owner runs once after shared integration and records final report |

Native checks cover anonymous/role isolation, narrow metadata projections, atomic scoped grants and retry replay, real required task progress, omitted unconsented health resources, A/B separation, note persistence and stale revisions, coach inability to modify participant water, wrong-owner withdrawal rejection, immediate subsequent-request denial after withdrawal, expired capability rejection, direct consent revocation, synthetic account updates, stale account revision, last-admin protection, operational and audit payload limits.

First native attempt passed 1 check then timed out on rate query held inside auth transaction. Rate now runs before session resolution and outer auth transaction. Second attempt passed 2 checks then PostgreSQL rejected a FOR SHARE read because app has no assignment UPDATE privilege; unnecessary read lock removed. Final rerun passed 11/11. No permission was broadened to hide those failures.

A separate deterministic last-admin test temporarily marks other synthetic admins suspended within a transaction, proves SQL error 23514 LAST_ADMIN_PROTECTED, and always rolls back. Self-account administrative updates fail fast 403 to avoid cross-connection user-lock waits. The first E2E run reached the final denial assertions but failed 6/6 because global alert locators also matched Next route announcer; locators now target main, pending rerun.

Corrected E2E rerun passed 6/6. Final native rerun on `p3_test_1791950751961` passed 11/11 including revoked-receipt protection and direct SQL denial after local capability expiry. No schema reset or historical fixture deletion occurred.

Practical screen reader testing, two independent physical devices and production policies are not certified by these automated checks. Pending A-11/A-12 are preserved.
