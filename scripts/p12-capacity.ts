import { performance } from 'node:perf_hooks';
import { mkdirSync, writeFileSync,openSync,closeSync,readFileSync } from 'node:fs';
import { spawn,execFileSync } from 'node:child_process';
import { createServer } from 'node:net';
import { participantFixtures } from '../tests/integration/participant-fixtures';
import { TrackingService } from '../src/server/tracking/service';
import { withActor } from '../src/server/db/context';
import { summarizeHttpMetrics } from '../src/server/operations/telemetry';
const multiuser=process.argv[2]==='multiuser';
if(process.argv[2]&&!multiuser)throw Error('UNSUPPORTED_LOCAL_MEASUREMENT');
const metricPath=multiuser?'.npm-cache/p12/capacity-multiuser-http-metrics.jsonl':'.npm-cache/p12/capacity-http-metrics.jsonl';
const probe=createServer();await new Promise<void>((resolve,reject)=>{probe.once('error',reject);probe.listen(3100,'127.0.0.1',()=>probe.close(()=>resolve()));});
const f=await participantFixtures();
mkdirSync('.npm-cache/p12',{recursive:true});
const metricLog=openSync(metricPath,'w');
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3100'],{env:{...process.env,GHIDAI_AUTH_ENV:'test',GHIDAI_LOCAL_METRICS:'true'},windowsHide:true,stdio:['ignore',metricLog,metricLog]});
let measurementStage='startup';
const completedTiers:Record<string,number>[]=[];
try{
 let ready=false;for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:3100/api/health',{signal:AbortSignal.timeout(1000)})).ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,300));}if(!ready)throw Error('LOCAL_SERVER_UNAVAILABLE');
 const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Muscat',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const tracking=new TrackingService(f.auth);
 measurementStage='fixtures';
 const actors=multiuser?await (async()=>{const users=[];for(let i=0;i<20;i++)users.push(await f.user());return users;})():[f.a];
 const directWriteTimes:number[]=[];
 for(let i=0;i<(multiuser?20:100);i++){const start=performance.now();await tracking.execute('logs/water','POST',{amountMl:1,occurredAt:new Date().toISOString()},actors[i%actors.length].token,null,crypto.randomUUID(),null);directWriteTimes.push(performance.now()-start);}
 measurementStage='warmup';
 if(multiuser)for(const actor of actors){const response=await fetch(`http://127.0.0.1:3100/api/v1/logs?from=${day}&to=${day}`,{headers:{Cookie:`ghidai_session=${actor.token}`}});if(response.status!==200)throw Error('WARMUP_FAILED');await response.arrayBuffer();}
 const rows=completedTiers;
 const serverResources=()=>JSON.parse(execFileSync('powershell.exe',['-NoProfile','-Command',`Get-Process -Id ${child.pid} | Select-Object CPU,WorkingSet64,PrivateMemorySize64 | ConvertTo-Json -Compress`],{encoding:'utf8',windowsHide:true}));
 const before=serverResources();
 for(const concurrency of (multiuser?[1,5,10,20]:[1,2,4,8])){
  measurementStage=`http-${concurrency}`;
  const latency:number[]=[];let failures=0;const start=performance.now();
  await Promise.all(Array.from({length:concurrency},async(_,worker)=>{for(let i=0;i<5;i++){const at=performance.now();const response=await fetch(`http://127.0.0.1:3100/api/v1/logs?from=${day}&to=${day}`,{headers:{Cookie:`ghidai_session=${actors[worker%actors.length].token}`},signal:AbortSignal.timeout(15000)});if(multiuser&&response.status===200){const body=await response.json() as {data?:{water?:{userId:string}[]}};if(!Array.isArray(body.data?.water)||body.data.water.length!==1||body.data.water.some(row=>row.userId!==actors[worker%actors.length].id))throw Error('CONCURRENT_ISOLATION_FAILED');}else await response.arrayBuffer();latency.push(performance.now()-at);if(response.status!==200)failures++;}}));
  const sorted=latency.sort((a,b)=>a-b);rows.push({concurrency,count:latency.length,failures,p50Ms:sorted[Math.floor(sorted.length*.5)],p95Ms:sorted[Math.ceil(sorted.length*.95)-1],durationMs:performance.now()-start});
 }
 measurementStage='query-and-resources';
 const plan=await f.auth.transaction(async c=>{const s=await f.auth.resolve(c,actors[0].token);return withActor(f.runtime.app,s.actor,async db=>(await db.query('EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) SELECT id FROM "WaterLog" WHERE "userId"=$1 ORDER BY "occurredAt" DESC LIMIT 100',[actors[0].id])).rows[0]['QUERY PLAN']);});
 const resources=(await f.owner.query('SELECT pg_database_size(current_database())::text bytes,(SELECT count(*)::int FROM pg_stat_activity WHERE datname=current_database()) connections')).rows[0];
 const indexes=(await f.owner.query("SELECT indexname,indexdef FROM pg_indexes WHERE schemaname=current_schema() AND tablename IN ('WaterLog','Notification','Session') ORDER BY tablename,indexname")).rows;
 const httpMetrics=summarizeHttpMetrics(readFileSync(metricPath,'utf8'));
 if(httpMetrics.total!==(multiuser?200:75))throw Error('HTTP_METRICS_SAMPLE_INCOMPLETE');
 directWriteTimes.sort((a,b)=>a-b);
 const directServiceWrites={scope:'sequential direct TrackingService calls, not HTTP',count:directWriteTimes.length,p50Ms:directWriteTimes[Math.floor(directWriteTimes.length*.5)],p95Ms:directWriteTimes[Math.ceil(directWriteTimes.length*.95)-1]};
 const report={measuredAt:new Date().toISOString(),scope:multiuser?'local synthetic HTTP authenticated reads; 20 independent sessions/1 water record each, 20 sequential warmups then 180 measured reads; not physical devices or production capacity':'local synthetic HTTP authenticated read load, 100 own water rows; 1 session, not independent users or production capacity',rows,httpMetrics,directServiceWrites,indexes,queryPlan:plan,database:resources,driverMemory:process.memoryUsage(),driverCpu:process.cpuUsage(),serverResources:{before,after:serverResources()},serverResourcesMeasured:true};
 mkdirSync('.npm-cache',{recursive:true});writeFileSync(multiuser?'.npm-cache/p12/capacity-multiuser-capacity.json':'.npm-cache/p12/capacity-capacity.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));if(rows.some(row=>row.failures))throw Error('HTTP_CAPACITY_SAMPLE_FAILED');
}catch(error){
 writeFileSync(`.npm-cache/p12/capacity-failure-${Date.now()}.json`,JSON.stringify({measuredAt:new Date().toISOString(),multiuser,measurementStage,completedTiers,errorType:error instanceof Error?error.name:'UNKNOWN'},null,2));
 throw Error('P12_CAPACITY_FAILED');
}finally{child.kill();closeSync(metricLog);await f.close();}
