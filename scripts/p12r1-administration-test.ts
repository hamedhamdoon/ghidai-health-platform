import {readFileSync,readdirSync} from 'node:fs';
import {localPool} from './p2-database';
const {pool}=await localPool('test');const schema=`p3_test_${Date.now()}`;
try{await pool.query(`CREATE SCHEMA "${schema}" AUTHORIZATION ghidai_owner; GRANT USAGE ON SCHEMA "${schema}" TO ghidai_app,ghidai_policy,ghidai_auth`);const db=await pool.connect();try{await db.query(`SET search_path="${schema}",public`);for(const migration of readdirSync('prisma/migrations').filter(n=>/^202610\d+_p[2-9]_/.test(n)||/^2026101800(?:18|19|20)_p12r1_/.test(n)).sort())await db.query(readFileSync(`prisma/migrations/${migration}/migration.sql`,'utf8').replaceAll('public',schema));}finally{db.release();}process.env.P12R1_TEST_SCHEMA=schema;console.log(`P12R1 administration isolated schema preserved ${schema}`);await import('../tests/integration/p12r1-administration');}finally{await pool.end();}

