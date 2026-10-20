import { spawnSync } from 'node:child_process';
import { mkdirSync, cpSync, existsSync } from 'node:fs';

// Explicit local invocation. Preserve previous Playwright outputs and test schemas.
const evidence = `.npm-cache/p12-r1/browser-${Date.now()}`;
mkdirSync(evidence, { recursive: true });
// Legacy suites also write fixed-name illustrative screenshots outside outputDir.
if (existsSync('test-results')) cpSync('test-results', `${evidence}/fixed-screenshots-before`, { recursive: true, errorOnExist: true, force: false });
function run(args) {
  const result = spawnSync(process.execPath, args, {
    env: { ...process.env, GHIDAI_E2E_PORT: '3100' },
    stdio: 'inherit', windowsHide: true,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
const waves = [
  ['foundation.spec.ts', 'p3-auth.spec.ts'],
  ['p4-programs.spec.ts'],
  ['p5-participant.spec.ts', 'p6-tracking.spec.ts', 'p7-analytics.spec.ts'],
  ['p8-administration.spec.ts', 'p9-privacy-notifications.spec.ts', 'p10-pwa.spec.ts'],
  ['p12r1-nutrition.spec.ts','p12r1-administration.spec.ts'],
];
for (const [index, files] of waves.entries()) {
  run(['node_modules/tsx/dist/cli.mjs', 'scripts/platform-test-schema.ts', '9']);
  if (index === 1) run(['node_modules/tsx/dist/cli.mjs', 'tests/integration/p4-programs.ts']);
  run(['node_modules/@playwright/test/cli.js', 'test', ...files, '--output', `${evidence}/wave-${index + 1}`]);
  if (existsSync('test-results')) cpSync('test-results', `${evidence}/fixed-screenshots-after-${index + 1}`, { recursive: true, errorOnExist: true, force: false });
}
console.log(`P12_R1_BROWSER_EVIDENCE=${evidence}`);
