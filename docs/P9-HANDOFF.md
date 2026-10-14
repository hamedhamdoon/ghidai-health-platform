# P9 — Notifications & Privacy handoff

Local synthetic implementation only. A-01–A-12 retain their existing approval status. No production purge, external storage, cloud provider, push delivery or continuous scheduler was enabled.

## Delivered

- `/notifications`: real in-app notification center, read state, allowed daily check-in/review types, user-controlled times, IANA timezone, paired quiet hours, explicit opt-in reference and clear empty/error/loading/success states.
- `P9Service` resolves the session into VerifiedActor, uses ghidai_app RLS, own-subject filters, local rate limits, transaction advisory locks, revision preconditions, encrypted durable idempotency receipts and safe audit metadata. The shared HTTP integration supplies CSRF and safe errors.
- Explicit notification consent is a separate fresh-authenticated privacy command. Withdrawal immediately invalidates future delivery; consent and preference revisions are checked at the local delivery transaction. Coaching consent is displayed and can be withdrawn; P8 RLS checks the consent each time.
- Encrypted `OutboxJob` payload, versioned queue keys and stable rule/day delivery keys, stale cancellation, temporal consent recheck, quiet-hour retry and transactional atomic delivery. A settings/rule edit can replace a stale queue entry without sending a second notification for a rule already delivered that local day. In-app delivery uses no external transport; database failures roll back and the next explicit local tick can retry. Schedule or timezone changes cancel pending jobs.
- DST gap uses the first valid wall minute (search bounded to three hours on the same local day); fold uses the first occurrence. Quiet start is inclusive and end exclusive, including overnight intervals.
- `/privacy`: own consents, retained-data categories, fresh reauthentication form, own JSON and CSV export request/download, deletion request and cancellation. Exports use explicit DTO field allowlists, decrypt own health revision history, exclude passwords/session tokens/push credentials/encrypted internal payloads and enforce RLS, ownership and expiry at download.
- Export artifacts are AES-GCM encrypted with the existing project key in `PrivacyRequest.resultLocationEncrypted`; local bounded limit is 1 MiB and 1,000 rows per collection, failing without silent truncation. Local download expires after 15 minutes. CSV fields are quoted and formula-leading cells neutralized. Downloads and requests are audited with safe metadata. Scoped AccessGrant and task exclusions are included; review labels and option values are joined only from own answers so exported assessments remain interpretable. Session/authentication/MFA/rate/audit security categories are disclosed as retained categories without exporting secrets.
- Final deletion is blocked. A deletion request remains PENDING and does not deactivate the account or remove records. A separate non-routed full GHIDAI PostgreSQL rehearsal replays all 26 P2–P9 migrations in a new independent synthetic schema, removes only a marker-bound synthetic participant graph and leaves a DELETED account tombstone for append-only audit foreign keys. The other participant, shared content/programs and existing audit records remain intact. It records a hashed ledger and one safe deletion audit entry and preserves the schema. The earlier three-table rehearsal remains separately documented as an initial mechanism test.

## Technical local test values, not approved production policies

Notification consent lasts 30 days under `synthetic-local-p3-v1`, inherited from P3. Local reminders expire after 15 minutes and stop after five processing attempts; retry delay starts at 30 seconds and doubles to a 15-minute cap. These values implement a bounded local experiment; RV-12 remains blocked for production lag/coalescing/scheduler/provider decisions. Only an explicit browser-triggered local tick runs; closing the browser does not promise delivery. Editing one reminder cancels only that rule's pending queue entries; independent reminders remain pending and can retry. Preference changes or invalid consent cancel all pending local reminders.

Export expiry restricts retrieval; it does not purge the encrypted artifact. No production retention period, key rotation, backup cutoff, restoration suppression or deletion ledger retention was approved. RV-11 is technically improved by encrypted bounded exports, owner/fresh-auth access and full participant-graph synthetic deletion evidence; production storage, retention and backup/restore remain gated by A-07/A-08. The full rehearsal accepts explicit synthetic ledger retention/cutoff parameters and rejects the public schema, old schemas, non-owner roles, missing/invalid target markers, other subjects, non-fixture identity or staff/shared-author graphs. Only `LogRevision.log_revision_immutable` and `TaskCompletion.p5_completion_guard` are disabled and restored within the deletion transaction in the newly marked schema; foreign keys and audit immutability remain active. A forced late failure proves rollback restores the entire participant graph and both triggers. Repeating a successful rehearsal returns the same ledger without a second purge/audit. This participant-only mechanism is not a production retention policy or a general deletion flow for staff-authored shared content.

Web Push remains visibly unavailable because no local compatible push transport/VAPID route was established. No implicit consent, universal health target, medical policy or real account elevation was introduced.

## Files and verification commands

- `src/server/notifications/{service,rules}.ts`
- `src/server/privacy/{service,rules,deletion-rehearsal}.ts`
- `src/server/privacy/full-deletion-rehearsal.ts` — no route or production caller
- `src/components/{notifications-panel,privacy-panel}.tsx`, `/notifications`, `/privacy`
- `tests/unit/p9-rules.test.ts`
- `tests/integration/p9-privacy-notifications.ts`, `tests/integration/p9-deletion.ts`
- `tests/integration/p9-full-deletion.ts` — full isolated participant graph, no `.env` pointer changes
- `tests/e2e/p9-privacy-notifications.spec.ts`

Run integration only after the root integration owner applies the additive P9 migration in a new isolated test schema. Commands: `npm exec vitest -- run tests/unit/p9-rules.test.ts`; `npm exec tsx -- tests/integration/p9-privacy-notifications.ts`; `npm exec tsx -- tests/integration/p9-deletion.ts`; `npm exec playwright -- test p9-privacy-notifications.spec.ts`. The latter requires the root-built test server and isolated schema. Evidence is recorded in P9-TEST-RESULTS.
