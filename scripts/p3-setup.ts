import { config } from 'dotenv';
import { randomBytes, createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { localPool } from './p2-database';

const environment=process.argv[2];
if(environment!=='development'&&environment!=='test')throw new Error('LOCAL_ENVIRONMENT_REQUIRED');
const {pool,url}=await localPool(environment);
try {
 if(!(await pool.query("SELECT to_regclass('public._prisma_migrations') present")).rows[0].present){
  const foundation=spawnSync(process.execPath,['node_modules/tsx/dist/cli.mjs','scripts/p2-database.ts',environment],{env:process.env,encoding:'utf8'});
  if(foundation.status!==0)throw new Error('P2_FOUNDATION_SETUP_FAILED');
 }
 const applied=(await pool.query('SELECT migration_name,checksum FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL')).rows;
 for(const record of applied) {
  const path=`prisma/migrations/${record.migration_name}/migration.sql`;
  if(!readdirSync('prisma/migrations').includes(record.migration_name)||createHash('sha256').update(readFileSync(path)).digest('hex')!==record.checksum)throw new Error('CHECKSUM_MISMATCH');
 }
 await pool.query("DO $$ BEGIN IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='ghidai_auth') THEN CREATE ROLE ghidai_auth LOGIN NOSUPERUSER NOBYPASSRLS; END IF; END $$");
 const path=`.env.p3.${environment}.local`;
 if(!existsSync(path)) {
  const auth=new URL(url);auth.username='ghidai_auth';auth.password=randomBytes(32).toString('hex');
  writeFileSync(path,`P3_AUTH_DATABASE_URL=${auth}\nP3_KEY=${randomBytes(32).toString('hex')}\nP3_LOCAL_ONLY=true\n`,{flag:'wx'});
 }
 const env=config({path,quiet:true}).parsed!;
 const auth=new URL(env.P3_AUTH_DATABASE_URL);
 if(auth.hostname!=='127.0.0.1'||auth.pathname!==new URL(url).pathname||auth.port!==new URL(url).port||auth.username!=='ghidai_auth'||!/^[a-f0-9]{64}$/.test(auth.password))throw new Error('AUTH_CONFIG_REJECTED');
 await pool.query(`ALTER ROLE ghidai_auth PASSWORD '${auth.password}'`);
 const failed=(await pool.query('SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL')).rows;
 if(failed.length){
  if(failed.length!==1||failed[0].migration_name!=='202610120001_p3_auth'||(await pool.query("SELECT to_regclass('public.\"AuthChallenge\"') AS present")).rows[0].present)throw new Error('FAILED_MIGRATION_REQUIRES_REVIEW');
  const resolved=spawnSync(process.execPath,['node_modules/prisma/build/index.js','migrate','resolve','--rolled-back','202610120001_p3_auth'],{env:{...process.env,DATABASE_URL:url,GHIDAI_ENV:environment},encoding:'utf8'});
  if(resolved.status!==0)throw new Error('MIGRATION_RESOLVE_FAILED');
 }
 const result=spawnSync(process.execPath,['node_modules/prisma/build/index.js','migrate','deploy'],{env:{...process.env,DATABASE_URL:url,GHIDAI_ENV:environment},encoding:'utf8'});
 if(result.status!==0)throw new Error('P3_MIGRATION_FAILED');
 console.log(`PASS P3 ${environment}: additive migrations and local credential gateway.`);
} finally {await pool.end();}
