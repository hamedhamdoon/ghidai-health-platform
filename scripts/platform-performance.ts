import {performance} from 'node:perf_hooks';
import {writeFileSync,mkdirSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {participantFixtures} from '../tests/integration/participant-fixtures';
import {P9Service} from '../src/server/notifications/service';
import {TrackingService} from '../src/server/tracking/service';
import {withActor} from '../src/server/db/context';
const f=await participantFixtures(),privacy=new P9Service(f.auth),tracking=new TrackingService(f.auth);
const samples:Record<string,number[]>={};
try{
 const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Muscat',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const routes={privacy:()=>privacy.execute('privacy','GET',{},f.a.token,null,null),inbox:()=>privacy.execute('notifications','GET',{},f.a.token,null,null),logs:()=>tracking.execute('logs','GET',{from:day,to:day},f.a.token,null,null,null)};
 for(const [name,work] of Object.entries(routes)){await work();samples[name]=[];for(let i=0;i<20;i++){const start=performance.now();await work();samples[name].push(performance.now()-start);}}
 samples.waterWrite=[];for(let i=0;i<10;i++){const start=performance.now();await tracking.execute('logs/water','POST',{amountMl:1,occurredAt:new Date().toISOString()},f.a.token,null,randomUUID(),null);samples.waterWrite.push(performance.now()-start);}
 const memory=process.memoryUsage(),summaries=Object.fromEntries(Object.entries(samples).map(([name,values])=>{const sorted=[...values].sort((a,b)=>a-b);return [name,{count:values.length,minMs:sorted[0],medianMs:sorted[Math.floor(sorted.length/2)],p95Ms:sorted[Math.ceil(sorted.length*.95)-1],maxMs:sorted.at(-1)}];}));
 const plan=await f.auth.transaction(async c=>{const s=await f.auth.resolve(c,f.a.token);return withActor(f.runtime.app,s.actor,async db=>(await db.query('EXPLAIN (ANALYZE,BUFFERS,FORMAT JSON) SELECT id FROM "Notification" WHERE "userId"=$1 ORDER BY "createdAt" DESC LIMIT 100',[f.a.id])).rows[0]['QUERY PLAN']);});
 const report={measuredAt:new Date().toISOString(),environment:'isolated ghidai_test synthetic schema, Node24 local direct services, warm sequential sessions; not HTTP/20-user concurrent load',dataset:'2 participant fixture users + synthetic staff, empty inbox, ten water writes, current fixture schema',summaries,memory,notificationQueryPlan:plan};mkdirSync('test-results',{recursive:true});writeFileSync('test-results/platform-performance.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}finally{await f.close();}
