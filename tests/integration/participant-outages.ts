import assert from 'node:assert/strict';
import {spawn,spawnSync} from 'node:child_process';
import {createServer} from 'node:net';
import {randomUUID} from 'node:crypto';
import {participantFixtures} from './participant-fixtures';
const f=await participantFixtures(),origin='http://127.0.0.1:3100';
const probe=createServer();await new Promise<void>((resolve,reject)=>{probe.once('error',reject);probe.listen(3100,'127.0.0.1',()=>probe.close(()=>resolve()));});
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3100'],{env:{...process.env,GHIDAI_AUTH_ENV:'test'},windowsHide:true,stdio:'ignore'});
let paused=false;
function docker(action:string){assert.equal(spawnSync('docker',[action,'ghidai-p1-local-postgres-test-1'],{windowsHide:true,stdio:'ignore'}).status,0);}
try{
 let ready=false;for(let i=0;i<100;i++){try{if((await fetch(origin+'/api/health',{signal:AbortSignal.timeout(1000)})).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,300));}assert(ready);
 let cookie=`ghidai_session=${f.a.token}`;const csrfResponse=await fetch(origin+'/api/v1/auth/csrf',{headers:{Cookie:cookie}});cookie+='; '+csrfResponse.headers.get('set-cookie')!.split(';')[0];const csrf=(await csrfResponse.json()).data.csrfToken;
 const headers={Cookie:cookie,Origin:origin,'X-CSRF-Token':csrf,'Content-Type':'application/json','Idempotency-Key':randomUUID()},body=JSON.stringify({amountMl:123,occurredAt:new Date().toISOString()});
 docker('pause');paused=true;
 const failed=await fetch(origin+'/api/v1/logs/water',{method:'POST',headers,body,signal:AbortSignal.timeout(25000)});assert.equal(failed.status,503);const message=await failed.text();assert(!message.includes('postgresql://'));assert(!message.includes('passwordHash'));assert(!message.includes('تم حفظ'));
 console.log('PASS participant actual PostgreSQL outage: mutation fails safely, no false success or secret.');
 docker('unpause');paused=false;
 assert.equal((await f.owner.query('SELECT id FROM "WaterLog" WHERE "userId"=$1',[f.a.id])).rowCount,0);
 const recovered=await fetch(origin+'/api/v1/logs/water',{method:'POST',headers,body,signal:AbortSignal.timeout(25000)});assert.equal(recovered.status,200);
 const replay=await fetch(origin+'/api/v1/logs/water',{method:'POST',headers,body,signal:AbortSignal.timeout(25000)});assert.equal(replay.status,200);assert.equal((await f.owner.query('SELECT id FROM "WaterLog" WHERE "userId"=$1',[f.a.id])).rowCount,1);
 console.log('PASS participant recovery and retry: one durable log, same receipt, preserved schemas.');
}finally{if(paused)docker('unpause');server.kill();await f.close();}
