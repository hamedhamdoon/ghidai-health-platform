import { spawnSync } from 'node:child_process';
import { mkdirSync, openSync, closeSync, writeFileSync } from 'node:fs';

// Explicit sequential local acceptance; never run alongside E2E or a build.
// The patched-cluster backup requires separately provisioned P12 container 55434.
const directory = `.npm-cache/p12/operations-${Date.now()}`;
mkdirSync(directory, { recursive: true });
const results = [];
const tasks = [
  ['native', 'scripts/platform-regression.mjs'],
  ['auth-outages', 'tests/integration/p3-outages.ts'],
  ['participant-outages', 'tests/integration/participant-outages.ts'],
  ['cross-cluster-backup', 'scripts/p12-backup-rehearsal.ts'],
  ['complete-schema', 'scripts/platform-test-schema.ts', '9'],
  ['browser-performance', 'scripts/p12-browser-performance.ts'],
  ['capacity', 'scripts/p12-capacity.ts'],
  ['capacity-multiuser', 'scripts/p12-capacity.ts', 'multiuser'],
];
for (const [name, file, ...args] of tasks) {
  const startedAt = new Date().toISOString(), log = `${directory}/${name}.log`;
  const descriptor = openSync(log, 'wx');
  let result;
  try {
    result = spawnSync(process.execPath, [
      ...(file.endsWith('.ts') ? ['node_modules/tsx/dist/cli.mjs'] : []), file, ...args,
    ], { env: process.env, stdio: ['ignore', descriptor, descriptor], windowsHide: true });
  } finally { closeSync(descriptor); }
  results.push({ name, startedAt, finishedAt: new Date().toISOString(), exitCode: result.status, log });
  writeFileSync(`${directory}/results.json`, JSON.stringify({ node: process.version, results }, null, 2));
  console.log(JSON.stringify(results.at(-1)));
  // A failed assertion is retained. Stop rather than report downstream unexecuted work as PASS.
  if (result.status !== 0) process.exit(result.status ?? 1);
}
