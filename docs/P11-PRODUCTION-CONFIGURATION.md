# P11 — Production configuration contract

2026-10-15, Asia/Muscat. Engineering preparation only; no production adapter, deployment or cloud connection is enabled.

## Environment boundary

`src/server/operations/config.ts` separates `GHIDAI_RUNTIME_ENV=development|test|production` from Next's `NODE_ENV`. A local optimized `next build/start` has `NODE_ENV=production` but remains a loopback development rehearsal. Existing `GHIDAI_AUTH_ENV=test` is supported. Conflicting environment selectors fail closed; selecting production causes `localAuthConfig` to throw `PRODUCTION_ADAPTER_NOT_ENABLED` before loading local secrets or opening pools. Unknown values fail closed. Local test/dev DB names, ports, users, schema restrictions and Mailpit sink remain enforced. Production validation is a pure contract and opens no connections.

| Future server-only variable | Validation / custody contract |
|---|---|
| `GHIDAI_RUNTIME_ENV` | Explicit `production`; no automatic activation based on build mode |
| `NODE_ENV` | `production` for future production contract |
| `GHIDAI_TRUSTED_ORIGIN` | One exact HTTPS origin without credentials, slash/path/query, or loopback; no wildcard or forwarded-host trust |
| `GHIDAI_APP_DATABASE_URL` | `postgresql`, role `ghidai_app`, password, nonlocal host, named DB, only `sslmode=verify-full` |
| `GHIDAI_AUTH_DATABASE_URL` | Same host/database, dedicated `ghidai_auth`; same TLS requirement |
| `GHIDAI_DATA_KEY` | 32-byte hex key; obvious repeated placeholder rejected; generate with CSPRNG outside Git |
| `GHIDAI_DATA_KEY_ID` | Version label, required for key custody/rotation planning |

The blank `config/production.env.example` is a reviewable contract template, not an auto-loaded runtime file. `npx tsx scripts/p11-config-check.ts` validates only an injected environment and opens no connection; without the required values it intentionally exits 1 without printing secrets. Do not put real values in documentation, shell command arguments, `NEXT_PUBLIC_*`, build output, logs or GitHub. The validator returns origin/secure-cookie intent/key ID only, never database URLs or key material. The format check does not prove entropy, key custody, certificate validation or server role grants. A deployment adapter must implement and test those contracts before production is enabled.

Future secrets are provisioned through an approved runtime secret store, separately for preview/test/production. Migration and backup credentials must be separate and never loaded by the web process. Backup encryption keys belong to independent custody from backup artifacts; application data key and backup key must differ. Rotation requires retained decrypt-only key versions, re-encryption rehearsal, session revocation where applicable and audited rollback; no automatic destructive key deletion. Current encryption still uses one local P3 key, so production key rotation remains OPEN.

## HTTP and database controls

The current cookie `Secure=false` is valid only behind the enforced HTTP loopback origins `127.0.0.1:3000/3100`. No production cookie path exists. A future adapter must use `HttpOnly; Secure; SameSite=Strict; Path=/`, HTTPS-only origin checks and explicit proxy trust; no fallback to loopback origin. The production contract fixes `secureCookies=true`; it does not implement the adapter. Do not publish the existing local server behind a tunnel/reverse proxy.

Existing writes require same-origin Host/Origin, session-bound expiring CSRF token, JSON content type, bounded streaming body (32KiB) and persistent database rate budgets. User identity comes from server-resolved opaque session hashes, never request userId. App-role transactions reject superuser/BYPASSRLS, set transaction-local actor and apply RLS. Production certificate verification, pool compatibility, role ownership/FORCE RLS and separate migration credentials must be tested against the chosen provider with synthetic data first. `sslmode=verify-full` in a URL is not sufficient evidence of an actual verified TLS connection.

`next.config.ts` retains nosniff/frame denial/referrer/permissions headers and adds CSP `base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'` plus same-origin opener policy. This CSP is deliberately a baseline, not proof of script-source XSS containment: Next inline hydration needs nonce/hash integration before a strict `script-src` policy can be claimed. HSTS must be enabled only after approved HTTPS deployment is verified. Text output remains React-escaped; no raw HTML rendering was found in the application source scan.

`GET /api/health` remains the backward-compatible liveness endpoint (`database:not-checked`); it does not query PostgreSQL. `GET /api/ready` dynamically queries both restricted pools and returns only `ready`/200 or `unavailable`/503, always no-store. Query/connection timeouts remain bounded by existing pools. No emails, SQL errors, database names, keys, stack traces or health payloads are returned. Readiness proves connectivity at that instant, not successful migrations, correct grants, mail delivery, release acceptance or production availability. Use a low-frequency private/local probe to avoid free-tier wakeups and pool exhaustion.

## Remaining activation requirements

Local HTTP aggregates are opt-in through `GHIDAI_LOCAL_METRICS=true` and explicitly disabled in production/invalid environments. The auth HTTP wrapper emits only `{event:'ghidai_http',status,durationMs}` as bounded JSON lines; it never accepts or logs path, body, cookies, email, user IDs or request IDs. There is no timer, file writer or external sink. Sink failures cannot change the request response. `summarizeHttpMetrics` accepts only the strict three-field format, bounds processing to the last 2 million characters and at most 10,000 lines (default 1,000), and reports valid count, 5xx count, 4xx count, 5xx/sample rate and p95 duration. Empty evidence yields null rate/p95, never a false zero-error claim. The integrator's local capacity harness may capture stdout in ignored `.npm-cache` evidence. This is a bounded local observation window, not a durable production monitoring backend or all-server lifetime counter.

Production remains BLOCKED until approved host/origin/regions, verified TLS adapter, secure-cookie integration, production role audit, protected jobs/mail adapter, key rotation, strict CSP acceptance and release gates are resolved. No `.env.production` with credentials, host manifest or deploy trigger was created. Current CI remains manual. A push must not initiate hosting or external services. See [release gates](P11-RELEASE-GATES.md), [security review](P11-SECURITY-REVIEW.md) and [test evidence](P11-TEST-RESULTS.md).

Local unit evidence: `tests/unit/p11-security.test.ts`, 18/18 passed on 2026-10-15 before final integration, including invalid HTTPS/origin/TLS/roles/duplicate query values/key inputs, environment rejection, liveness independence and readiness success/failure redaction. Scoped ESLint for config/runtime/health/readiness/unit/Next config passed exit 0. Running `scripts/p11-config-check.ts` without an injected production contract intentionally exited 1 with only a generic rejection; this is expected fail-closed behavior, not a successful production configuration. Final combined TypeScript/lint/build/regression evidence belongs to P11-TEST-RESULTS.
