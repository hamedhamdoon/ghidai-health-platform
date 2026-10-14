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
- Final deletion is blocked. A deletion request remains PENDING and does not deactivate the account or remove records. A separate non-routed PostgreSQL rehearsal creates a new uniquely named synthetic schema, deletes only its subject/log/session rows, preserves the other subject and a hashed ledger, and leaves the schema intact.

## Technical local test values, not approved production policies

Notification consent lasts 30 days under `synthetic-local-p3-v1`, inherited from P3. Local reminders expire after 15 minutes and stop after five processing attempts; retry delay starts at 30 seconds and doubles to a 15-minute cap. These values implement a bounded local experiment; RV-12 remains blocked for production lag/coalescing/scheduler/provider decisions. Only an explicit browser-triggered local tick runs; closing the browser does not promise delivery.

Export expiry restricts retrieval; it does not purge the encrypted artifact. No production retention period, key rotation, backup cutoff, restoration suppression or deletion ledger retention was approved. RV-11 is technically improved by encrypted bounded exports, owner/fresh-auth access and isolated relational deletion evidence; production storage, retention, backup/restore and full-schema purge remain gated by A-07/A-08. The rehearsal tests the mechanism on three synthetic relational tables, not the complete production graph.

Web Push remains visibly unavailable because no local compatible push transport/VAPID route was established. No implicit consent, universal health target, medical policy or real account elevation was introduced.

## Files and verification commands

- `src/server/notifications/{service,rules}.ts`
- `src/server/privacy/{service,rules,deletion-rehearsal}.ts`
- `src/components/{notifications-panel,privacy-panel}.tsx`, `/notifications`, `/privacy`
- `tests/unit/p9-rules.test.ts`
- `tests/integration/p9-privacy-notifications.ts`, `tests/integration/p9-deletion.ts`
- `tests/e2e/p9-privacy-notifications.spec.ts`

Run integration only after the root integration owner applies the additive P9 migration in a new isolated test schema. Commands: `npm exec vitest -- run tests/unit/p9-rules.test.ts`; `npm exec tsx -- tests/integration/p9-privacy-notifications.ts`; `npm exec tsx -- tests/integration/p9-deletion.ts`; `npm exec playwright -- test p9-privacy-notifications.spec.ts`. The latter requires the root-built test server and isolated schema. Evidence is recorded in P9-TEST-RESULTS.
