import {spawnSync} from 'node:child_process';
import {readdirSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {localPool} from './p2-database';
const environment=process.argv[2];if(!['development','test'].includes(environment))throw new Error('LOCAL_ENVIRONMENT_REQUIRED');
const result=spawnSync(process.execPath,['node_modules/tsx/dist/cli.mjs','scripts/p3-setup.ts',environment],{env:process.env,stdio:'inherit',windowsHide:true});if(result.status!==0)throw new Error('ADDITIVE_SETUP_FAILED');
const {pool}=await localPool(environment as 'development'|'test');
try{
 const expected=readdirSync('prisma/migrations').filter(name=>/^202610\d+_p[2-7]_/.test(name)),applied=(await pool.query('SELECT migration_name,checksum FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL')).rows;
 if(applied.length!==expected.length)throw new Error('MIGRATION_BASELINE_MISMATCH');
 for(const row of applied)if(!expected.includes(row.migration_name)||createHash('sha256').update(readFileSync(`prisma/migrations/${row.migration_name}/migration.sql`)).digest('hex')!==row.checksum)throw new Error('MIGRATION_CHECKSUM_MISMATCH');
 console.log(`PASS participant ${environment}: ${applied.length} additive migrations, canonical checksums; no schemas or data deleted.`);
}finally{await pool.end();}
