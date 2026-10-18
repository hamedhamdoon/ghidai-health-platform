import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';

const baseline = 'e12066f66b28a4e8220e6fd097e8115222752b30';
const git = (...args) => execFileSync('git', args, { encoding: 'utf8', windowsHide: true }).trim();
assert.equal(git('branch', '--show-current'), 'feature/ghidai-p12-final-acceptance');
assert.equal(git('merge-base', 'HEAD', baseline), baseline);
assert.equal(git('diff', baseline, '--', 'AGENTS.md', 'prisma/migrations', 'compose.yaml', '.github/workflows'), '');
const reports = [
  'REQUIREMENTS-ACCEPTANCE', 'USER-JOURNEY-VALIDATION', 'SECURITY-ACCEPTANCE',
  'PERFORMANCE-ACCESSIBILITY', 'REGRESSION-TEST-RESULTS', 'OPEN-ISSUES',
  'RELEASE-CANDIDATE', 'FINAL-ACCEPTANCE-REPORT',
].map(name => `docs/P12-${name}.md`);
let links = 0;
for (const path of [...reports, 'docs/P12-STORAGE-CLEANUP-PLAN.md']) {
  const content = readFileSync(path, 'utf8');
  for (const match of content.matchAll(/\]\(([^)]+)\)/g)) {
    const target = match[1].split('#')[0];
    if (!target || /^[a-z]+:/i.test(target)) continue;
    assert(existsSync(resolve(dirname(path), target)), `MISSING_LINK ${path} ${target}`);
    links++;
  }
}
const matrix = readFileSync(reports[0], 'utf8');
for (let id = 1; id <= 24; id++) {
  const number = String(id).padStart(2, '0');
  assert(matrix.includes(`| ${number} / ${number} |`), `MISSING_R_T_${number}`);
}
// Source provenance only; hashes identify the reviewed historical document corpus.
const files = git('ls-tree', '-r', '--name-only', baseline).split('\n')
  .filter(path => path.endsWith('.md'))
  .map(path => {
    const bytes = execFileSync('git', ['show', `${baseline}:${path}`], { windowsHide: true });
    return { path, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
  });
writeFileSync('docs/P12-REVIEW-INPUTS.json', JSON.stringify({ baseline, files }, null, 2) + '\n');
console.log(`PASS P12 review: ${reports.length} required reports; ${links} local links; 24 R/T pairs; ${files.length} baseline Markdown inputs; protected paths unchanged.`);
