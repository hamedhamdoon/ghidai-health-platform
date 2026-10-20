# P12-R1 — administration and correction evidence

This document covers track B only. Final aggregate results and the local acceptance verdict belong in P12-R1-FUNCTIONAL-RESULTS and P12-R1-FINAL-HANDOFF.

## Implemented scope and boundaries

| Issue | Implemented | Remaining boundary |
|---|---|---|
| P12-F02 | Owner-authenticated correction intake/list/cancel; encrypted original snapshot, proposed typed values and original revision; single pending request per record; revision and idempotency controls; audit correlated to request ID; cross-user denial. Completed/withdrawn historical enrollment intake uses its own immutable policy/day. | **PARTIAL**. All administrator correction listing/decision operations fail closed. No exceptional write, recalculation, real reviewer grant, approval or rejection workflow is enabled before A-03/A-11. Participant UI currently supports water records only; API validators accept WATER/STEPS/EXERCISE/SLEEP/REVIEW. |
| P12-F03 | Persisted versioned synthetic drafts; incomplete drafts allowed but incomplete submission rejected; independent qualified local review, rejection, publication into real rule/schema tables and withdrawal; immutable reviewed graphs; live reviewer check; audited commands. | Local technical scope only; A-03/A-04 remain open. Thresholds/configuration remain explicitly synthetic. No production policy approved. **RESOLVED** for local synthetic technical authoring, supported by the final native and browser replay below. |
| P12-F04 | Explicit disabled contract; administrator and ordinary-user endpoint denial; pure aggregation suppression contract parameterized only by a supplied synthetic test policy, with no adopted production minimum. | **BLOCKED** by A-11/legal review. No health report or cohort data is returned. Unit suppression tests do not establish production anonymity. |

## Contracts and user interface

- `RemediationService.execute(path,method,input,token,match,key)` uses trusted P3 sessions and restricted app connections. Commands require existing CSRF at the HTTP layer, UUID idempotency receipts, and quoted If-Match where a resource already exists.
- `/corrections`: GET owner metadata and POST `{targetKind,targetId,proposedPatch,reason}`. POST precondition is the target log revision. Full existing typed input validators apply. A covering synthetic enrollment must have a closed day/window or completed/withdrawn status. `/corrections/:id/cancel` requires request revision and PENDING status. No record value changes.
- Participant `/corrections` uses a date/quantity selector for the owner's water records and quantity/reason fields. Database IDs, revision numbers and JSON are internal. The original occurrence time is preserved by this form.
- `/admin/authoring` and `/coach/authoring` support GET/POST, PATCH `/:id`, and POST `/:id/submit` and `/:id/review`. Only the admin route supports publish and withdraw. Authoring is a local technical definition editor; independent review requires a live synthetic GUIDANCE qualification from P4 and a different author.
- Review submission includes the exact content hash. Changes to reviewed content require a new version. Published IDs materialize existing `AchievementRuleVersion` or `ReviewSchemaVersion`/dimensions/options. SQL guards verify that materialized fields and complete graph equal the approved document; a false published pointer and a partially published schema are rejected.
- `/admin/reports` and `/admin/corrections*` fail with POLICY_NOT_APPROVED after live staff authorization. No role automatically grants exceptional access.

## Tests and run history

Added `tests/unit/p12r1-administration.test.ts` (10 cases), `tests/integration/p12r1-administration.ts` (13 direct PostgreSQL groups), and `tests/e2e/p12r1-administration.spec.ts` (4 scenarios, run by the three existing viewport projects: 12 browser cases).

The integration runner `scripts/p12r1-administration-test.ts` creates a new schema in the synthetic test database, applies canonical migrations plus additive 018/019/020, passes the schema directly to fixtures, and preserves it. It does not alter the shared P3 test-schema pointer or drop resources.

During development, the first isolated run exposed a legitimate RLS denial when publication tried to read another reviewer's capability row. A minimal boolean helper now checks live reviewer eligibility without exposing capability records. Another run exposed a fixture attempting backdated enrollment through an API that correctly rejects it; the final test instead creates a current enrollment and withdraws it through the real service. An attempted direct historical insert was also correctly rejected by the database enrollment guard; no trigger was disabled. These interrupted runs are not counted as passed suites. A later attempt failed ECONNREFUSED after the host/container interruption; it is not a product PASS.

The frozen root source check `.npm-cache/p12-r1/frozen-source-check.log` supersedes preliminary scoped checks: TypeScript, ESLint and build PASS, with 135/135 units (including these 10 B cases). Frozen Prisma validate/generate also PASS in their separate logs.

Final isolated integration: **13/13 PASS**, exit 0, preserved schema `p3_test_1792384701607`. The final run includes native SQL tampered rule/dimension and false published pointer attempts, which are rejected. Migration 020 fixes an observed SQL alias collision (`ReviewOption.value` versus reviewed JSON value) and adds a narrow owner-only correction audit policy; the failing pre-fix runs are not passes. Final frozen replay `.npm-cache/p12-r1/regression-1792385690605/results.json` records administration **13/13 PASS** in `native-administration-new.log` (schema `p3_test_1792386153244`), plus all **12/12 B browser cases PASS** in `browser.log`: separate schema and STREAK rule author/reviewer/publisher cycles, correction/report access boundaries, and water request/reload/cancel, each at 360/768/1280. The unified browser total is 162/162 including the original 147 and nutrition 3; do not add targeted repeats as extra cases. Reduced-motion, CSS 200% reflow, keyboard, RTL and Axe checks pass in the affected journeys. Actual screen reader use, two independent physical devices, completed-enrollment intake as a separate fixture, production correction authority and health-report disclosure remain untested/blocked. Withdrawn-enrollment intake is directly tested.


## Correction semantics and earlier browser failure

Intake is optional; it does not freeze personal historical records or force all owner edits through approval. Existing tracking window logic skips completed/withdrawn enrollments. Ordinary edits still use their own validation/revision/RLS rules and can reduce derived completion/awards. Consequently a pending request snapshot can become stale; no exceptional application is enabled to apply it. A-03/A-11 must settle that operational relationship. Completed-historical intake remains NOT TESTED; the legitimate withdrawn enrollment/intake/cancel path is tested without disabling any trigger.

Earlier new-browser schema/correction cases timed out on exact wrapping-label text locators. Snapshots showed the intended controls present; textarea initial text and select-option descendants affected label-text matching. Precise accessible-role selectors fixed test discovery without extending the 90-second test limits or weakening acceptance. The final frozen replay above passed all 12 B cases after that correction. Physical-device zoom, screen-reader operation and two-device isolation were not executed by these browser contexts.
