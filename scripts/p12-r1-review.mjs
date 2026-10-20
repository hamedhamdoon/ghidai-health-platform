import {execFileSync} from 'node:child_process';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import assert from 'node:assert/strict';
const baseline='4976b0df4657fdacf29c620a7453fb2b268b8587';
const git=(...args)=>execFileSync('git',args,{encoding:'utf8',windowsHide:true}).trim();
assert.equal(git('branch','--show-current'),'feature/ghidai-p12-r1-remediation');
assert.equal(git('merge-base','HEAD',baseline),baseline);
assert.equal(git('diff',baseline,'--','AGENTS.md','compose.yaml','.github/workflows'),'');
const historical=git('ls-tree','-r','--name-only',baseline,'prisma/migrations').split('\n').filter(Boolean);
for(const file of historical)assert.equal(git('diff',baseline,'--',file),'',`HISTORICAL_MIGRATION_CHANGED ${file}`);
const reports=['REMEDIATION-PLAN','FUNCTIONAL-RESULTS','PERFORMANCE-RESULTS','SECURITY-REVIEW','REGRESSION-RESULTS','FINAL-HANDOFF'];
let links=0;
for(const name of reports){const path=`docs/P12-R1-${name}.md`;for(const match of readFileSync(path,'utf8').matchAll(/\]\(([^)]+)\)/g)){const target=match[1].split('#')[0];if(!target||/^[a-z]+:/i.test(target))continue;assert(existsSync(resolve(dirname(path),target)),`MISSING_LINK ${path} ${target}`);links++;}}
for(const issue of ['P12-F01','P12-F02','P12-F03','P12-F04'])assert(readFileSync('docs/P12-R1-FUNCTIONAL-RESULTS.md','utf8').includes(issue));
console.log(`PASS R1 review: ${reports.length} reports, ${links} local links, ${historical.length} historical migration files and protected paths unchanged.`);
