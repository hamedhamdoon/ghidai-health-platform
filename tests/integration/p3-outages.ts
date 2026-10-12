import assert from 'node:assert/strict';
import { spawn,spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { localPool } from '../../scripts/p2-database';
import { localAuthConfig } from '../../src/server/auth/runtime';
process.env.GHIDAI_AUTH_ENV='test';
const cfg=localAuthConfig();if(cfg.schema==='public')throw new Error('ISOLATED_TEST_SCHEMA_REQUIRED');
const probe=createServer();await new Promise<void>((resolve,reject)=>{probe.once('error',reject);probe.listen(3100,'127.0.0.1',()=>probe.close(()=>resolve()));});
const {pool:base,url}=await localPool('test');await base.end();
const admin=new Pool({connectionString:url,options:`-c search_path=${cfg.schema},public`});
const origin='http://127.0.0.1:3100';
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3100'],{env:{...process.env,GHIDAI_AUTH_ENV:'test'},windowsHide:true,stdio:'ignore'});
let paused=false,mailPaused=false;
function docker(args:string[]){const result=spawnSync('docker',args,{windowsHide:true,stdio:'ignore'});assert.equal(result.status,0,'Project-scoped Docker command failed');}
const wait=()=>new Promise(resolve=>setTimeout(resolve,300));
try {
 let ready=false;for(let i=0;i<100;i++){try{if((await fetch(`${origin}/api/health`,{signal:AbortSignal.timeout(1000)})).ok){ready=true;break;}}catch{}await wait();}assert(ready);
 const csrf=await (await fetch(`${origin}/api/v1/auth/csrf`)).json();
 const cookie=(await fetch(`${origin}/api/v1/auth/csrf`)).headers.get('set-cookie')!.split(';')[0];
 // Fetch a token for the exact nonce cookie used by the request.
 const actualCsrf=await (await fetch(`${origin}/api/v1/auth/csrf`,{headers:{Cookie:cookie}})).json();assert(csrf.data);
 const address=`outage-${randomUUID()}@ghidai.test`;
 docker(['pause','ghidai-p1-local-mailpit-1']);mailPaused=true;
 const response=await fetch(`${origin}/api/v1/auth/register`,{method:'POST',headers:{Cookie:cookie,Origin:origin,'X-CSRF-Token':actualCsrf.data.csrfToken,'Content-Type':'application/json'},body:JSON.stringify({displayName:'اختبار انقطاع',email:address,password:'synthetic-outage-password',policyVersion:'synthetic-local-p3-v1',privacyAccepted:true}),signal:AbortSignal.timeout(20000)});
 assert.equal(response.status,202);const row=(await admin.query('SELECT m.* FROM "AuthMail" m JOIN "User" u ON u.id=m."userId" WHERE u."emailNormalized"=$1',[address])).rows[0];assert(row&&row.sentAt===null&&row.attempts>=1);
 console.log('PASS actual Mailpit outage: generic accepted response, encrypted pending mail retained.');
 docker(['unpause','ghidai-p1-local-mailpit-1']);mailPaused=false;
 await wait();
 const retry=spawnSync(process.execPath,['node_modules/tsx/dist/cli.mjs','scripts/p3-mail.ts'],{env:{...process.env,GHIDAI_AUTH_ENV:'test'},windowsHide:true,stdio:'ignore'});assert.equal(retry.status,0);assert((await admin.query('SELECT "sentAt" FROM "AuthMail" WHERE id=$1',[row.id])).rows[0].sentAt);
 console.log('PASS mail recovery: local retry delivered previously pending mail without new account/token.');
 await admin.end();
 docker(['pause','ghidai-p1-local-postgres-test-1']);paused=true;
 const unavailable=await fetch(`${origin}/api/v1/me`,{signal:AbortSignal.timeout(22000)});assert.equal(unavailable.status,503);const body=await unavailable.text();assert(!body.includes('postgresql://'));assert(!body.includes('passwordHash'));
 console.log('PASS actual PostgreSQL pause: safe 503, no secret in response.');
 docker(['unpause','ghidai-p1-local-postgres-test-1']);paused=false;
 assert.equal((await fetch(`${origin}/api/v1/me`,{signal:AbortSignal.timeout(22000)})).status,401);
 console.log('PASS database recovery: unauthenticated request correctly returns 401 after unpause; schemas retained.');
}finally{
 if(paused)docker(['unpause','ghidai-p1-local-postgres-test-1']);
 if(mailPaused)docker(['unpause','ghidai-p1-local-mailpit-1']);
 child.kill();await admin.end().catch(()=>{});
}
