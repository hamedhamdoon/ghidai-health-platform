import {localPool} from './p2-database';
import {spawnSync} from 'node:child_process';
const environment=process.argv[2];if(!['development','test'].includes(environment))throw new Error('LOCAL_ENV_REQUIRED');
const {pool,url}=await localPool(environment as 'development'|'test');
try {
 const ledger=(await pool.query("SELECT to_regclass('public._prisma_migrations') present")).rows[0].present;
 if(ledger){const failed=(await pool.query('SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL')).rows;
  if(failed.length){if(failed.length!==1||failed[0].migration_name!=='202610120004_p4_authoring'||(await pool.query('SELECT to_regclass(\'public."P4LocalCapability"\') present')).rows[0].present||(await pool.query('SELECT 1 FROM information_schema.columns WHERE table_schema=\'public\' AND table_name=\'ContentRevision\' AND column_name=\'syntheticOnly\'')).rowCount)throw new Error('FAILED_MIGRATION_REQUIRES_REVIEW');
   const r=spawnSync(process.execPath,['node_modules/prisma/build/index.js','migrate','resolve','--rolled-back',failed[0].migration_name],{env:{...process.env,DATABASE_URL:url,GHIDAI_ENV:environment},stdio:'inherit'});if(r.status!==0)throw new Error('RESOLVE_FAILED');console.log('PASS verified P4 transaction rollback; no tables/data deleted.');
  }
 }
 const r=spawnSync(process.execPath,['node_modules/tsx/dist/cli.mjs','scripts/p3-setup.ts',environment],{env:process.env,stdio:'inherit'});if(r.status!==0)throw new Error('P4_SETUP_FAILED');
}finally{await pool.end();}
