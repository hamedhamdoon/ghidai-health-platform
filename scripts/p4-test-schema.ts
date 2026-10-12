import { readFileSync,readdirSync,writeFileSync,appendFileSync } from 'node:fs';
import { localPool } from './p2-database';
const {pool}=await localPool('test');
const schema=`p3_test_${Date.now()}`;
try {
 await pool.query(`CREATE SCHEMA "${schema}" AUTHORIZATION ghidai_owner; GRANT USAGE ON SCHEMA "${schema}" TO ghidai_app,ghidai_policy,ghidai_auth`);
 const client=await pool.connect();
 try {await client.query(`SET search_path="${schema}",public`);for(const migration of readdirSync('prisma/migrations').filter(n=>/^202610\d+_p[234]_/.test(n)).sort())await client.query(readFileSync(`prisma/migrations/${migration}/migration.sql`,'utf8').replaceAll('public',schema));}finally{client.release();}
 const path='.env.p3.test.local';writeFileSync(path,readFileSync(path,'utf8').replace(/^P3_TEST_SCHEMA=.*\r?\n/gm,''));appendFileSync(path,`P3_TEST_SCHEMA=${schema}\n`);
 console.log(`PASS preserved isolated P4 schema: ${schema}`);
}finally{await pool.end();}
