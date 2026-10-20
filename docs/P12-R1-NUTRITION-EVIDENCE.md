# P12-R1 participant nutrition implementation evidence

Implementation: `src/server/participation/nutrition.ts`, `src/components/participant-meal.tsx`, participant service dispatch and Today integration; additive migration `202610180018_p12r1_meal_selection`.

Contract: authenticated participant `GET/PUT occurrences/:id/meal`; PUT accepts exactly `{alternativeMealId: UUID|null}`, requires occurrence `If-Match` and the existing participation idempotency receipt. Owner comes from the session. References come from the enrolled version and linked plan only. Published synthetic P4 graph and save-window/exclusion gates apply; share locks serialize withdrawal. PostgreSQL validates owner, scope, window and immutable relationship. Meal preferences remain separate from manual consumption/task completion under the existing P5 contract. Changing a preference increments selection, occurrence, day and enrollment revisions. Existing participation audit and encrypted receipts cover writes. Mutation receipts contain saved identifiers/revisions only, without meal body/ingredients.

Executed during implementation:

- Elevated direct TypeScript compiler: PASS (before final regression integration).
- `vitest run tests/unit/p12r1-nutrition.test.ts`: 2 PASS.
- `tsx scripts/p12r1-nutrition-test.ts`: 8 PostgreSQL groups PASS; isolated preserved schema `p3_test_1792317886833`.
- Initial sandbox TypeScript/DB attempts failed with Windows canonicalization/connect EACCES; elevated execution was required. An initial acceptance attempt exposed missing participant nutrition RLS; fixed in the new migration and retested.

The 8 groups cover enrolled-version ingredient quantities, PostgreSQL persistence and exact receipt replay, owner injection/isolation and stale writes, concurrent single winner and separation from completion, native RLS, a real foreign-version alternative, missing precondition/changed receipt payload, and withdrawn content read/write denial.

Browser test added: `tests/e2e/p12r1-nutrition.spec.ts` performs UI alternative selection, quantity display, deliberately lost committed response, identical key/body retry, direct PostgreSQL verification, reload, actual logout/password re-login, UI change back to primary with PostgreSQL revision verification, keyboard focus and Axe. Browser results must be supplied by the final execution; creation of the test is not a PASS. This is a single browser context; independent-device testing is not covered.

The isolated test runner never changes `.env.p3.test.local` or the shared active schema pointer and never drops schemas. Earlier attempts also preserved schemas `p3_test_1792317560032` and `p3_test_1792317844063`; a failed migration-definition attempt preserved a further timestamped schema. Inventory these as synthetic GHIDAI test resources; removal needs separate owner approval.

All implementation-time results require the root's final post-edit regression before acceptance. Actual screen-reader, independent-device and public HTTPS testing remain outside this evidence.

## P12-R1 final integrated replay — 2026-10-19 (Asia/Muscat)

P12-F01 is **RESOLVED for local synthetic acceptance**. The final replay in `.npm-cache/p12-r1/regression-1792385690605` reran the 8 nutrition PostgreSQL groups and participant browser journey at 360/768/1280. The journey passed UI → API → PostgreSQL, lost committed response with identical idempotency retry, reload, actual logout/password re-login, alternative-to-primary change and singleton revision verification. Keyboard, Arabic RTL, Axe, reduced motion and CSS 200% zoom/reflow were exercised. CSS emulation does not establish native browser zoom or actual screen-reader acceptance.

The unified executed totals are 135 unit tests, 172 PostgreSQL groups (151 original + 8 nutrition + 13 administration), 7 relational deletion assertions, 9 full-graph deletion groups, 162 E2E cases (147 original + 15 new), and 11 outage/recovery groups. Repeated targeted runs are not additional unique coverage. The final native nutrition and browser logs supersede implementation-only evidence above; original and failed intermediate evidence remains preserved.

This result accepts the participant preference workflow on published synthetic P4 content only. It does not approve real dietary content, auto-complete consumption, close A-01..A-12, authorize public deployment/main merge, certify independent physical devices or actual screen readers, or resolve High/Critical security risks. P12-P01 is PARTIAL: the final matrix has 60/60 valid visits, 6 LCP measurements above 2500 ms, zero session-window CLS measurements above 0.1 and zero NOT TESTED visits. The LCP budget remains unchanged. See [functional results](P12-R1-FUNCTIONAL-RESULTS.md), [regression results](P12-R1-REGRESSION-RESULTS.md) and [final handoff](P12-R1-FINAL-HANDOFF.md).
