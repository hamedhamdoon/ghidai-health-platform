import { config } from 'dotenv';
import { Pool } from 'pg';
import { randomBytes,createHash } from 'node:crypto';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { assertLocalDatabase, assertLocalAppDatabase, type DatabaseEnvironment } from '../src/server/db/local-database';

export async function localPool(environment: DatabaseEnvironment) {
  const env = config({ path: `.env.${environment === 'test' ? 'test' : 'development'}.local`, quiet: true }).parsed;
  if (env?.GHIDAI_ENV !== environment) throw new Error('LOCAL_ENVIRONMENT_REQUIRED');
  const url = assertLocalDatabase(env[environment === 'test' ? 'TEST_DATABASE_URL' : 'DATABASE_URL'], environment);
  const pool = new Pool({ connectionString: url, max: 4, connectionTimeoutMillis: 5000 });
  const identity = (await pool.query('SELECT current_database() db,current_user usr,inet_server_port() port')).rows[0];
  if (identity.db !== (environment === 'test' ? 'ghidai_test' : 'ghidai_development') || identity.usr !== `ghidai_${environment === 'test' ? 'test' : 'dev'}` || identity.port !== 5432) {
    await pool.end(); throw new Error('DATABASE_IDENTITY_REJECTED');
  }
  return { pool, url };
}

export async function preflight(pool: Pool) {
  const tables = (await pool.query("SELECT tablename FROM pg_tables WHERE schemaname='public'")).rows.map(r => r.tablename);
  if (tables.length && !tables.includes('_prisma_migrations')) throw new Error('UNEXPECTED_DATABASE_CONTENT');
  const allowed = new Set([...readFileSync('prisma/migrations/202610110001_p2_foundation/migration.sql','utf8').matchAll(/CREATE TABLE "(\w+)"/g)].map(m=>m[1]));
  allowed.add('_prisma_migrations');
  allowed.add('AuthChallenge'); allowed.add('AuthMail');
  for (const table of tables) {
    if(!allowed.has(table)) throw new Error('UNEXPECTED_DATABASE_TABLE');
    if(table !== '_prisma_migrations' && (await pool.query(`SELECT EXISTS(SELECT 1 FROM "${table}" LIMIT 1) present`)).rows[0].present) throw new Error('NONEMPTY_DATABASE_REJECTED');
  }
  if(tables.includes('_prisma_migrations')) {
    const applied=(await pool.query('SELECT migration_name,checksum FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL')).rows;
    for(const record of applied) {
      if(!/^20261011000[1-9]_p2_[a-z_]+$/.test(record.migration_name)&&!/^20261012000[1-9]_p3_[a-z_]+$/.test(record.migration_name))throw new Error('UNEXPECTED_MIGRATION');
      const actual=createHash('sha256').update(readFileSync(`prisma/migrations/${record.migration_name}/migration.sql`)).digest('hex');
      if(actual!==record.checksum)throw new Error('MIGRATION_CHECKSUM_MISMATCH');
    }
  }
}

async function main() {
  const environment = process.argv[2];
  if (environment !== 'test' && environment !== 'development') throw new Error('LOCAL_ENVIRONMENT_REQUIRED');
  const { pool, url } = await localPool(environment);
  try {
    await preflight(pool);
    await pool.query(`DO $$ BEGIN
      IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='ghidai_owner') THEN CREATE ROLE ghidai_owner NOLOGIN NOSUPERUSER NOBYPASSRLS; END IF;
      IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='ghidai_policy') THEN CREATE ROLE ghidai_policy NOLOGIN NOSUPERUSER BYPASSRLS; END IF;
      IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='ghidai_app') THEN CREATE ROLE ghidai_app LOGIN NOSUPERUSER NOBYPASSRLS; END IF;
      IF NOT EXISTS(SELECT FROM pg_roles WHERE rolname='ghidai_auth') THEN CREATE ROLE ghidai_auth LOGIN NOSUPERUSER NOBYPASSRLS; END IF;
    END $$; REVOKE CREATE ON SCHEMA public FROM PUBLIC; GRANT CREATE,USAGE ON SCHEMA public TO ghidai_owner;`);
    const path = `.env.p2.${environment}.local`;
    let appUrl: string;
    if (existsSync(path)) {
      appUrl = assertLocalAppDatabase(readFileSync(path,'utf8').trim().replace('P2_APP_DATABASE_URL=',''),environment);
      const password=new URL(appUrl).password;
      if(!/^[a-f0-9]{64}$/.test(password))throw new Error('LOCAL_APP_SECRET_FORMAT_REJECTED');
      // Reprovisions only this project-local role after a new tmpfs test instance.
      await pool.query(`ALTER ROLE ghidai_app PASSWORD '${password}'`);
    }
    else {
      const password = randomBytes(32).toString('hex');
      await pool.query(`ALTER ROLE ghidai_app PASSWORD '${password}'`);
      const parsed = new URL(url); parsed.username = 'ghidai_app'; parsed.password = password;
      appUrl = parsed.toString(); writeFileSync(path,`P2_APP_DATABASE_URL=${appUrl}\n`,{flag:'wx'});
    }
    const migrated = spawnSync(process.execPath,['node_modules/prisma/build/index.js','migrate','deploy'], { env: {...process.env,DATABASE_URL:url,GHIDAI_ENV:environment}, encoding:'utf8' });
    if (migrated.status !== 0) {
      const diagnostic = `${migrated.stdout}\n${migrated.stderr}`.replaceAll(url,'[REDACTED]').replaceAll(appUrl,'[REDACTED]');
      console.error(diagnostic);
      throw new Error('MIGRATION_FAILED');
    }
    const app = new Pool({connectionString:assertLocalAppDatabase(appUrl,environment)});
    try {
      const role = (await app.query('SELECT rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user')).rows[0];
      const owned = (await app.query("SELECT count(*)::int n FROM pg_tables WHERE schemaname='public' AND tableowner=current_user")).rows[0].n;
      if(role.rolsuper || role.rolbypassrls || owned) throw new Error('APP_ROLE_UNSAFE');
      console.log(`PASS ${environment}: guarded migrations, non-owner application role.`);
    } finally { await app.end(); }
  } finally { await pool.end(); }
}
if (process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) main().catch((error: unknown) => {console.error('FAIL:', error instanceof Error ? error.message.replace(/postgresql:\/\/\S+/g,'[REDACTED]') : 'DATABASE_REJECTED');process.exitCode=1;});
