# GHIDAI — Local release candidate 0.1.0-rc.1

Acceptance began2026-10-15; final local review2026-10-18, Asia/Muscat. **LOCAL RELEASE CANDIDATE — PUBLIC LAUNCH BLOCKED**. This is a local review identifier for the private application (npm package remains0.1.0), not a published package, GitHub Release, public deployment or unconditional acceptance of every requirement. [Final acceptance](P12-FINAL-ACCEPTANCE-REPORT.md) determines which local acceptance conditions remain unresolved.

Source baseline: approved P11 checkpoint `e12066f66b28a4e8220e6fd097e8115222752b30`; work branch `feature/ghidai-p12-final-acceptance`. Final tested commit and branch delivery receipt are supplied after actual Git verification. No tag is created: an additional release trigger is unnecessary while findings/approvals remain open. Existing `.github/workflows/p1-ci.yml` is manual `workflow_dispatch`, without push/tag/deploy triggers; it is unchanged.

## Review package

- [Requirements/T-01–T-24 acceptance](P12-REQUIREMENTS-ACCEPTANCE.md), [journeys](P12-USER-JOURNEY-VALIDATION.md), [traceability](REQUIREMENTS-TRACEABILITY.md), [function inventory](FEATURES.md).
- [Regression commands/results](P12-REGRESSION-TEST-RESULTS.md), [security/runtime/restore review](P12-SECURITY-ACCEPTANCE.md), [performance/accessibility](P12-PERFORMANCE-ACCESSIBILITY.md).
- [Risk/authority/release gates](P12-OPEN-ISSUES.md), [storage inventory/proposed cleanup](P12-STORAGE-CLEANUP-PLAN.md), [changelog](../CHANGELOG.md).
- [Local operation](LOCAL-DEVELOPMENT.md), [P11 recovery procedure](P11-BACKUP-RESTORE.md), [monitor/incident runbooks](P11-MONITORING-RUNBOOK.md), [deployment boundary](DEPLOYMENT.md).

The package includes executable P12 evidence runners. Ignored local artifacts contain test logs/screenshots, official runtime download, raw audit/SARIF, encrypted ephemeral-key rehearsal archive and aggregate measurements. They are not pushed to GitHub and are not production backups. A copy of the application must remain in the owner-approved project path; no second checkout is created.

The application change in P12 disables automatic Next prefetch for primary navigation and header help to reduce unrelated downloads on limited connections. The five real destinations and link actions are retained. ESLint excludes generated ignored evidence/runtime files; checked source/tests remain in scope. No backend authorization, medical content, historical schema or production activation is changed.

## Run locally

Use the existing GHIDAI containers and local ignored secrets; never recreate the test tmpfs to reset tests. Verify Git branch/status, free disk, Docker service ownership and vacant loopback app port first. No production URL, real data, public tunnel or cloud adapter is allowed.

```powershell
npm run db:validate
npm run typecheck
npm run lint
npm test
# If source/build changes, build before starting browser/server work:
npm run build
# Existing development connection and synthetic data only:
npm run dev
```

App listens at `http://127.0.0.1:3000`; test scripts use3100; Mailpit is local8025. Registration creates USER only. No default admin password or production bootstrap is provided. Existing machine Node24.20.0 and PostgreSQL17.6 remain operational baseline; Node24.22.0/Pg17.11 results are isolated experiments with the limits in the security report, not authority to update existing infrastructure.

P12 browser rerun (unique preserved output directories, fresh schemas per wave): `node scripts/p12-e2e.mjs`. It uses the runtime invoking the script through `process.execPath`; invoke the explicit validated isolated node.exe to repeat that runtime's results. Do not build, run capacity/scanners or change schema pointers during browser waves. `scripts/p12-operations.mjs` runs native/outage/cross-cluster restore/measurements sequentially and stops on the first failed command. It requires the independently provisioned new P12 container and fails rather than replacing it. Review the script and reports before re-executing; repeated runs create new retained test data. It is not a cleanup or deployment command.

## Recovery and rollback

For current local service failure, follow the P11 runbook: identify only GHIDAI services, inspect safe readiness/status and disk, preserve evidence, recover existing service without resetting volumes, then repeat login/persistence/isolation. Do not stop a tmpfs database to clear it. Code rollback and database recovery are separate operations.

For a real future disaster: select an independently stored approved encrypted backup with an available matching key; verify digest/GCM, provision a new cluster and global roles/extensions, restore atomically, apply approved deletion ledger, verify migration checksums/counts/FKs/login/RLS/aggregates/export, obtain incident approval before connection switching. Those operational prerequisites remain unproven; the P12 ephemeral-key archive cannot perform this recovery after the test process exits.

The isolated patched cluster has no production/development connection switch, so rollback consists of retaining original connections/runtime unchanged. In-place upgrade/rollback, independent-key disaster recovery and target-provider recovery are NOT TESTED. No original database/container/volume is deleted or replaced.

## Publication boundary

All A-01–A-12 and applicable P11 launch gates stay open as enumerated in P12-OPEN-ISSUES. Independent security review, acceptable patched image/host, complete performance/device/accessibility acceptance, approved real health/privacy policies, free provider/mail/jobs, independent recoverable backups, operator handover and explicit owner publication approval are required. Main merge needs separate permission and review. No public GitHub Release, paid upgrade, public hosting, production environment or external data transfer is part of this candidate.
