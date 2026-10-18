# P12 — User journey validation

Acceptance began2026-10-15; final local review2026-10-18, Asia/Muscat. Local synthetic fixtures, actual PostgreSQL, loopback Next production build and Chromium. Mail is received by local Mailpit only. No external recipients or real health records. [Regression](P12-REGRESSION-TEST-RESULTS.md) determines final executed results; historical P1–P11 success is not counted as a P12 run.

| Journey / use case | Executable evidence | Scope and outstanding acceptance |
|---|---|---|
| Registration → received verification → login (UC-01) | `p3-auth.spec.ts`, `p3-auth.ts` | Actual forms, received Mailpit link and stored verified identity; external mail BLOCKED |
| Login → forgot → received reset → password change | Same suites | Generic responses, single-use/expiry and old session denial; no production inbox claim |
| TOTP → recovery → reauthentication | Same suites | Setup codes displayed once, live MFA requirement and recovery race; real admin recovery A-12 |
| Profile → timezone/goals → optional consents | Same suites | Save/reload and owner isolation; optional data can be omitted |
| Published synthetic program → join (UC-02) | p4/p5 native and browser | Version snapshots, goals, 7/15/21 days, repeat/race and withdrawal |
| Today → next task → complete → undo (UC-03) | p5 native/browser | Commit/replay, stale conflict and required/optional distinction |
| Water → steps → exercise → sleep → habit (UC-04) | p6 native/browser | Actual DB-backed records, edit/delete and safe retry after committed response loss |
| Daily review → date switch → reload (UC-05) | p6 native/browser | Versioned dimensions/answers and optional weight; incomplete draft cannot crash renderer |
| Statistics → award → correction → entitlement withdrawal (UC-06) | p7 native/browser | Source data, filtered table/chart, private JSON certificate and revoked download denial |
| Participant consent → coach note → scope withdrawal (UC-08) | p8 native/browser | Separate READ/NOTE, immediate next-request denial, A/B and ADMIN health isolation |
| Notifications → preferences → tick → read | p9 native/browser | Real in-app item and outbox; no permanent scheduler/Web Push |
| Fresh authentication → export request → owner download (UC-07) | p9 native/browser | Encrypted JSON/CSV, actual subject rows, TTL and foreign/expired denial |
| Deletion request → cancel; isolated synthetic purge | p9 native/browser/basic/full deletion | Policy-gated request and separately marked new schema deletion; no deletion of prior schemas/volumes/logs |
| Author → independent reviewer → publish → withdraw (UC-08/09/10) | p4 native/browser | Actual program/content/meal/alternative forms; synthetic publication only |
| Participant meal detail → choose approved alternative → reload | NOT TESTED; FAIL completeness review P12-F01 | Admin food tests do not exercise participant selection. Corresponding participant dispatch/service/UI is absent; no claim of completed nutrition journey |
| Logout → revoked session → cache removal | p3/p10 native/browser | Failed offline logout shows error and preserves session; online success revokes actual session and clears allowed asset cache |

The journey coverage is split between browser and native acceptance. A service-only assertion does not prove a browser action, and a rendered shell does not prove persistence. Browser tests query or reload stored outcomes and exercise negative saves. The suites inspect real controls in the tested panels; this is not a proof of every possible button/state combination. Proposed dedicated routes such as `/corrections` are not advertised as completed merely because the specification lists them. Consolidated `/my-programs`, `/logs`, `/progress`, `/privacy`, `/admin` and content panels host implemented actions.

Physical independent devices, practical Arabic assistive technology, external mail, installed PWA across operating systems, public HTTPS and real-user policy acceptance remain NOT TESTED/BLOCKED. [Requirements](P12-REQUIREMENTS-ACCEPTANCE.md) retains partial workflows and A-series dependencies.
