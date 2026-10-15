import { statfsSync,statSync,readFileSync } from 'node:fs';
import { localPool } from './p2-database';
import { operationalAlerts } from '../src/server/operations/monitor';
import { summarizeHttpMetrics } from '../src/server/operations/telemetry';
const environment=process.argv[2];if(environment!=='test'&&environment!=='development')throw new Error('LOCAL_ENVIRONMENT_REQUIRED');
const schema=process.argv[3]??'public';if(schema!=='public'&&!/^p3_test_\d+$/.test(schema))throw new Error('LOCAL_SCHEMA_REQUIRED');
const disk=statfsSync('.');
const snapshot={databaseAvailable:false,failedJobs:0,overdueJobs:0,failedMail:0,backupAgeHours:null as number|null,diskFreeRatio:disk.bavail/disk.blocks,errorRate:null as number|null};
let jobTelemetryAvailable=false;
try{const {pool}=await localPool(environment);snapshot.databaseAvailable=true;try{const r=(await pool.query(`SELECT (SELECT count(*)::int FROM "${schema}"."OutboxJob" WHERE status='FAILED') failed_jobs,(SELECT count(*)::int FROM "${schema}"."OutboxJob" WHERE status='PENDING' AND "dueAt"<now()-interval '15 minutes') overdue_jobs,(SELECT count(*)::int FROM "${schema}"."AuthMail" WHERE "sentAt" IS NULL AND attempts>0 AND "expiresAt">now()) failed_mail`)).rows[0];snapshot.failedJobs=r.failed_jobs;snapshot.overdueJobs=r.overdue_jobs;snapshot.failedMail=r.failed_mail;jobTelemetryAvailable=true;}finally{await pool.end();}}catch{/* Only fixed status codes leave this process. */}
// Ephemeral-key rehearsal evidence is never treated as a usable operational backup.
let httpSummary:ReturnType<typeof summarizeHttpMetrics>|null=null;
try{const metricPath='.npm-cache/p11-http-metrics.jsonl',stat=statSync(metricPath);if(environment==='test'&&stat.size<=2_000_000&&Date.now()-stat.mtimeMs>=0&&Date.now()-stat.mtimeMs<=900000){httpSummary=summarizeHttpMetrics(readFileSync(metricPath,'utf8'));snapshot.errorRate=httpSummary.errorRate;}}catch{/* Missing/stale evidence stays unknown. */}
const alerts=operationalAlerts(snapshot);
if(!jobTelemetryAvailable)alerts.push('JOB_TELEMETRY_UNAVAILABLE');
console.log(JSON.stringify({phase:'P11',environment,schema,snapshot,httpSummary,storage:{availableBytes:disk.bavail*disk.bsize,totalBytes:disk.blocks*disk.bsize},jobTelemetryAvailable,alerts,process:{rssBytes:process.memoryUsage().rss},sampledAt:new Date().toISOString(),continuousScheduler:false}));
if(!snapshot.databaseAvailable||alerts.some(a=>!['ERROR_RATE_NOT_MEASURED','BACKUP_NOT_VERIFIED'].includes(a)))process.exitCode=1;
