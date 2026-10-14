import {readFileSync,readdirSync,writeFileSync,appendFileSync} from 'node:fs';
import {localPool} from './p2-database';
const phase=Number(process.argv[2]??9);if(![8,9].includes(phase))throw new Error('PHASE_REQUIRED');
const {pool}=await localPool('test');const schema=`p3_test_${Date.now()}`;
try {
 await pool.query(`CREATE SCHEMA "${schema}" AUTHORIZATION ghidai_owner; GRANT USAGE ON SCHEMA "${schema}" TO ghidai_app,ghidai_policy,ghidai_auth`);
 const db=await pool.connect();
 try {await db.query(`SET search_path="${schema}",public`);for(const migration of readdirSync('prisma/migrations').filter(n=>/^202610\d+_p[2-9]_/.test(n)&&Number(n.match(/_p(\d)_/)![1])<=phase).sort())await db.query(readFileSync(`prisma/migrations/${migration}/migration.sql`,'utf8').replaceAll('public',schema));}finally{db.release();}
 const path='.env.p3.test.local';writeFileSync(path,readFileSync(path,'utf8').replace(/^P3_TEST_SCHEMA=.*\r?\n/gm,''));appendFileSync(path,`P3_TEST_SCHEMA=${schema}\n`);
 console.log(`PASS isolated P${phase} schema preserved: ${schema}`);
}finally{await pool.end();}
