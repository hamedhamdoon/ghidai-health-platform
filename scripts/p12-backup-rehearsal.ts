import { spawnSync } from 'node:child_process';
import { randomBytes,randomUUID,createHash } from 'node:crypto';
import { mkdirSync, writeFileSync,readFileSync,readdirSync } from 'node:fs';
import assert from 'node:assert/strict';
import { Pool } from 'pg';
import { localPool } from './p2-database';
import { backupDigest,decryptBackup,encryptBackup,restoreDatabaseName } from '../src/server/operations/backup';
import {participantFixtures} from '../tests/integration/participant-fixtures';
import {TrackingService} from '../src/server/tracking/service';
import {AnalyticsService} from '../src/server/analytics/service';
import {AuthService} from '../src/server/auth/service';
import {passwordHash} from '../src/server/auth/crypto';
import {PrismaPg} from '@prisma/adapter-pg';
import {PrismaClient} from '../src/generated/prisma/client';

// Explicit invocation only. Fixed local test source. No DROP, --clean or pointer changes.
const started=Date.now(), target=restoreDatabaseName(`ghidai_p11_restore_${Date.now()}_${randomBytes(4).toString('hex')}`);
function docker(args:string[],input?:Buffer){const r=spawnSync('docker',args,{input,windowsHide:true,maxBuffer:128*1024*1024,timeout:120000});if(r.status!==0)throw new Error('LOCAL_DOCKER_OPERATION_FAILED');return r.stdout;}
const {pool,url}=await localPool('test');
// New cluster only: source URL, existing containers and their data remain untouched.
const destinationUrl=new URL(url);destinationUrl.port='55434';destinationUrl.pathname='/ghidai_test';
const destination=new Pool({connectionString:destinationUrl.toString(),max:2});
let restored:Pool|undefined;
const key=randomBytes(32);
let fixture:Awaited<ReturnType<typeof participantFixtures>>|undefined;
let stage='preflight';
try{
 const destinationIdentity=(await destination.query('SELECT current_database() db,current_user usr')).rows[0];
 assert.equal(destinationIdentity.db,'ghidai_test');assert.equal(destinationIdentity.usr,'ghidai_test');
 assert((await destination.query('SHOW server_version')).rows[0].server_version.startsWith('17.11'));
 const containerPorts=docker(['inspect','--format','{{json .NetworkSettings.Ports}}','ghidai-p12-postgres-1711']).toString();
 assert(containerPorts.includes('"HostIp":"127.0.0.1","HostPort":"55434"'),'NEW_LOOPBACK_CONTAINER_REQUIRED');
 const schema=`p3_test_${Date.now()}`,q=`"${schema}"`;
 const migrationManifest=readdirSync('prisma/migrations').filter(n=>(/^202610\d+_p[2-9]_/.test(n)||/^202610(?:18001[89]|1[89]0020)_p12r1_/.test(n))).sort().map(name=>({name,sha256:createHash('sha256').update(readFileSync(`prisma/migrations/${name}/migration.sql`)).digest('hex')}));
 if(migrationManifest.length!==29)throw new Error('MIGRATION_MANIFEST_MISMATCH');
 stage='migration-ledger-preflight';
 // Read only the canonical public ledger; only the new isolated mirror is writable here.
 const ledgerFilter='finished_at IS NOT NULL AND rolled_back_at IS NULL';
 const canonicalLedger=(await pool.query(`SELECT * FROM public._prisma_migrations WHERE ${ledgerFilter} ORDER BY migration_name,id`)).rows;
 // Preserve failed/rolled-back historical evidence in public; mirror only the active canonical baseline.
 const publicLedgerCounts=(await pool.query('SELECT count(*)::int total,count(*) FILTER(WHERE rolled_back_at IS NOT NULL)::int rolled_back,count(*) FILTER(WHERE finished_at IS NULL AND rolled_back_at IS NULL)::int unresolved FROM public._prisma_migrations')).rows[0];
 if(publicLedgerCounts.unresolved!==0)throw new Error('MIGRATION_LEDGER_UNRESOLVED');
 if(canonicalLedger.length!==migrationManifest.length)throw new Error('MIGRATION_LEDGER_COUNT_MISMATCH');
 for(const entry of canonicalLedger){const file=migrationManifest.find(m=>m.name===entry.migration_name);if(!file||file.sha256!==entry.checksum||!entry.finished_at||entry.rolled_back_at!==null)throw new Error('MIGRATION_LEDGER_CHECKSUM_MISMATCH');}
 if(new Set(canonicalLedger.map(entry=>entry.migration_name)).size!==migrationManifest.length)throw new Error('MIGRATION_LEDGER_DUPLICATE');
 stage='schema';
 await pool.query(`CREATE SCHEMA ${q} AUTHORIZATION ghidai_owner; GRANT USAGE ON SCHEMA ${q} TO ghidai_app,ghidai_policy,ghidai_auth`);
 const schemaClient=await pool.connect();try{await schemaClient.query(`SET search_path=${q},public`);for(const migration of readdirSync('prisma/migrations').filter(n=>(/^202610\d+_p[2-9]_/.test(n)||/^202610(?:18001[89]|1[89]0020)_p12r1_/.test(n))).sort())await schemaClient.query(readFileSync(`prisma/migrations/${migration}/migration.sql`,'utf8').replaceAll('public',schema));
  await schemaClient.query('BEGIN ISOLATION LEVEL REPEATABLE READ');
  try{
   // LIKE preserves ledger shape/indexes without touching the existing public object.
   const latest=(await schemaClient.query(`SELECT * FROM public._prisma_migrations WHERE ${ledgerFilter} ORDER BY migration_name,id`)).rows;
   if(JSON.stringify(latest)!==JSON.stringify(canonicalLedger))throw new Error('MIGRATION_LEDGER_CHANGED');
   await schemaClient.query(`CREATE TABLE ${q}._prisma_migrations (LIKE public._prisma_migrations INCLUDING ALL)`);
   await schemaClient.query(`INSERT INTO ${q}._prisma_migrations SELECT * FROM public._prisma_migrations WHERE ${ledgerFilter}`);
   assert.deepEqual((await schemaClient.query(`SELECT * FROM ${q}._prisma_migrations ORDER BY migration_name,id`)).rows,canonicalLedger);
   await schemaClient.query('COMMIT');
  }catch(error){await schemaClient.query('ROLLBACK');throw error;}
 }finally{schemaClient.release();}
 fixture=await participantFixtures(schema);
 // User.passwordHash is the actual credential model; no separate PasswordCredential table exists.
 const syntheticPassword=`P11!${randomBytes(24).toString('base64url')}9a`;
 await fixture.owner.query('UPDATE "User" SET "passwordHash"=$2 WHERE id=$1',[fixture.a.id,await passwordHash(syntheticPassword)]);
 const tracking=new TrackingService(fixture.auth);
 const water=await tracking.execute('logs/water','POST',{amountMl:321,occurredAt:new Date().toISOString()},fixture.a.token,null,randomUUID(),null);
 assert(water.body);
 await tracking.execute('logs/water','POST',{amountMl:222,occurredAt:new Date().toISOString()},fixture.b.token,null,randomUUID(),null);
 const expected=await new AnalyticsService(fixture.auth).execute('analytics','GET',{},fixture.a.token,null,null,new URLSearchParams());
 stage='container';
 const id=docker(['inspect','--format','{{.Id}}','ghidai-p12-postgres-1711']).toString().trim();
 if(!/^[a-f0-9]{12,64}$/.test(id))throw new Error('DEDICATED_CONTAINER_REQUIRED');
 const version=docker(['exec',id,'pg_dump','--version']).toString().trim();
 const server=(await pool.query('SHOW server_version')).rows[0].server_version;
 if(!version.match(/\b17\.11\b/)||!server.startsWith('17.6'))throw new Error('BACKUP_VERSION_MISMATCH');
 const destinationServer=(await destination.query('SHOW server_version')).rows[0].server_version;
 assert(destinationServer.startsWith('17.11'),'PATCHED_SERVER_REQUIRED');
 // Fresh role provisioning; no global-role dump or credential logging.
 await destination.query(`DO $$ BEGIN
  IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='ghidai_owner') THEN CREATE ROLE ghidai_owner NOLOGIN NOSUPERUSER NOBYPASSRLS; END IF;
  IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='ghidai_policy') THEN CREATE ROLE ghidai_policy NOLOGIN NOSUPERUSER BYPASSRLS; END IF;
  IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='ghidai_app') THEN CREATE ROLE ghidai_app LOGIN NOSUPERUSER NOBYPASSRLS; END IF;
  IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='ghidai_auth') THEN CREATE ROLE ghidai_auth LOGIN NOSUPERUSER NOBYPASSRLS; END IF;
 END $$;`);
 for(const role of (await destination.query("SELECT rolname,rolsuper,rolcanlogin,rolbypassrls FROM pg_roles WHERE rolname IN ('ghidai_owner','ghidai_policy','ghidai_app','ghidai_auth')")).rows){
  assert.equal(role.rolsuper,false);assert.equal(role.rolcanlogin,['ghidai_app','ghidai_auth'].includes(role.rolname));assert.equal(role.rolbypassrls,role.rolname==='ghidai_policy');
 }
 for(const [role,connection] of [['ghidai_app',fixture.runtime.app.options.connectionString],['ghidai_auth',fixture.runtime.auth.options.connectionString]]){
  const password=new URL(connection!).password;if(!/^[a-f0-9]{64}$/.test(password))throw Error('LOCAL_SECRET_FORMAT_REJECTED');
  await destination.query(`ALTER ROLE ${role} PASSWORD '${password}'`);
 }
 stage='dump';
 const plain=docker(['exec',id,'sh','-c',`PGPASSWORD="$POSTGRES_PASSWORD" exec pg_dump -h postgres-test -U ghidai_test -d ghidai_test --schema=${schema} --format=custom`]);
 const encrypted=encryptBackup(plain,key),decoded=decryptBackup(encrypted,key);
 if(!plain.equals(decoded))throw new Error('BACKUP_INTEGRITY_FAILED');
 const corrupted=Buffer.from(encrypted);corrupted[corrupted.length-1]^=1;
 let corruptionRejected=false;try{decryptBackup(corrupted,key);}catch{corruptionRejected=true;}
 if(!corruptionRejected)throw new Error('CORRUPTION_NOT_REJECTED');
 stage='restore';await destination.query(`CREATE DATABASE "${target}" TEMPLATE template0`);
 await destination.query(`REVOKE CONNECT ON DATABASE "${target}" FROM PUBLIC`);
 const targetUrl=new URL(destinationUrl);targetUrl.pathname=`/${target}`;
 restored=new Pool({connectionString:targetUrl.toString(),options:`-c search_path=${schema},public`,max:1,connectionTimeoutMillis:5000});
 const restoredIdentity=(await restored.query('SELECT current_database() AS db,current_user AS usr,inet_server_port() AS port')).rows[0];
 assert.equal(restoredIdentity.db,target,'ISOLATED_RESTORE_IDENTITY_REQUIRED');
 assert.equal(restoredIdentity.usr,'ghidai_test','RESTORE_OPERATOR_REQUIRED');
 assert.equal(restoredIdentity.port,5432,'RESTORE_SERVER_PORT_REQUIRED');
 // Selective schema dumps intentionally omit global/public extension definitions.
 await restored.query('CREATE EXTENSION btree_gist WITH SCHEMA public');
 // Retains original ownership, grants and security definer owners; same-cluster roles preexist.
 docker(['exec','-i',id,'pg_restore','-U','ghidai_test','-d',target,'--exit-on-error','--single-transaction'],decoded);
 stage='verify';
 const tables=(await pool.query('SELECT tablename FROM pg_tables WHERE schemaname=$1 ORDER BY tablename',[schema])).rows.map(r=>String(r.tablename));
 let rows=0;
 for(const table of tables){if(!/^[A-Za-z0-9_]+$/.test(table))throw new Error('TABLE_NAME_REJECTED');const sql=`SELECT count(*)::int n FROM ${q}."${table}"`;const a=(await pool.query(sql)).rows[0].n,b=(await restored.query(sql)).rows[0].n;if(a!==b)throw new Error('RESTORE_ROW_COUNT_MISMATCH');rows+=a;}
 const restoredLedger=(await restored.query(`SELECT * FROM ${q}._prisma_migrations ORDER BY migration_name,id`)).rows;
 assert.deepEqual(restoredLedger,canonicalLedger);
 for(const entry of restoredLedger)assert.equal(entry.checksum,migrationManifest.find(m=>m.name===entry.migration_name)?.sha256);
 const checks=[`SELECT tablename,tableowner,rowsecurity FROM pg_tables WHERE schemaname='${schema}' ORDER BY tablename`,`SELECT c.relname,c.relrowsecurity,c.relforcerowsecurity FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='${schema}' ORDER BY c.relname`,`SELECT c.conname,c.contype,pg_get_constraintdef(c.oid) definition FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='${schema}' ORDER BY c.conname,definition`,`SELECT schemaname,tablename,policyname,roles,cmd,qual,with_check FROM pg_policies WHERE schemaname='${schema}' ORDER BY tablename,policyname`,`SELECT p.proname,r.rolname,p.prosecdef FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace JOIN pg_roles r ON r.oid=p.proowner WHERE n.nspname='${schema}' ORDER BY p.proname,p.oid::regprocedure::text`];
 for(const [index,sql] of checks.entries())if(JSON.stringify((await pool.query(sql)).rows)!==JSON.stringify((await restored.query(sql)).rows))throw new Error(`RESTORE_METADATA_MISMATCH_${index}`);
 stage='application';
 const options=`-c search_path=${schema},public`,appUrl=new URL(fixture.runtime.app.options.connectionString!),authUrl=new URL(fixture.runtime.auth.options.connectionString!);appUrl.pathname=`/${target}`;authUrl.pathname=`/${target}`;appUrl.port='55434';authUrl.port='55434';
 // This isolated database is closed to public CONNECT; explicitly admit app/auth for the probe only.
 await destination.query(`GRANT CONNECT ON DATABASE "${target}" TO ghidai_app,ghidai_auth`);
 const app=new Pool({connectionString:appUrl.toString(),options}),auth=new Pool({connectionString:authUrl.toString(),options}),prisma=new PrismaClient({adapter:new PrismaPg({connectionString:appUrl.toString(),options},{schema})});
 try{const service=new AuthService(auth,app,fixture.runtime.key,prisma);
  await service.transaction(async c=>assert.equal((await service.resolve(c,fixture!.a.token)).actor.id,fixture!.a.id));
  const login=await service.execute('auth/login','POST',{email:`${fixture.a.id}@ghidai.test`,password:syntheticPassword},'','','http://127.0.0.1:3100',null);
  assert(login.session,'RESTORED_PASSWORD_LOGIN_SESSION_REQUIRED');
  const freshToken=login.session;
  assert.notEqual(freshToken,fixture.a.token);
  await service.transaction(async c=>assert.equal((await service.resolve(c,freshToken)).actor.id,fixture!.a.id));
  const actual=await new AnalyticsService(service).execute('analytics','GET',{},freshToken,null,null,new URLSearchParams());assert.deepEqual(actual,expected);const client=await app.connect();try{await client.query('BEGIN');await client.query("SELECT set_config('app.user_id',$1,true)",[fixture.b.id]);assert.equal((await client.query('SELECT id FROM "WaterLog" WHERE "userId"=$1',[fixture.a.id])).rowCount,0);assert.equal((await client.query('SELECT count(*)::int n FROM "WaterLog"')).rows[0].n,1);}finally{await client.query('ROLLBACK');client.release();}}finally{await Promise.all([app.end(),auth.end(),prisma.$disconnect()]);}
 const evidence={phase:'P12-R1',syntheticOnly:true,targetContainer:'ghidai-p12-postgres-1711',destinationServer,targetDatabase:target,schema,version,server,tables:tables.length,rows,encryptedBytes:encrypted.length,sha256:backupDigest(encrypted),authenticatedCorruptionRejected:true,ownersPoliciesAndSchemaMatch:true,sourceMigrationManifest:migrationManifest,publicLedgerCounts,restoredMigrationLedger:true,migrationLedgerScope:'verified 29 canonical completed rows mirrored into new synthetic schema; historical source unchanged',restoredSession:true,restoredPasswordLogin:true,restoredRlsIsolation:true,restoredAnalyticsMatch:true,durationMs:Date.now()-started,productionRpoApproved:false,productionRtoApproved:false,keyPersisted:false,independentStorageTested:false};
 mkdirSync('.npm-cache/p12-r1',{recursive:true});
 writeFileSync(`.npm-cache/p12-r1/${target}.aesgcm`,encrypted,{flag:'wx'});
 writeFileSync('.npm-cache/p12-r1/backup-evidence.json',JSON.stringify(evidence,null,2));
 console.log(JSON.stringify(evidence));
}catch(error){const safeCode=error instanceof Error&&/^[A-Z0-9_]+$/.test(error.message)?error.message:'OPERATION_REJECTED';console.error(`FAIL P12_BACKUP_REHEARSAL stage=${stage} code=${safeCode}: no credentials or dump payload logged; any newly created isolated DB retained for inspection.`);process.exitCode=1;}
finally{key.fill(0);await fixture?.close();await restored?.end();await pool.end();await destination.end();}
