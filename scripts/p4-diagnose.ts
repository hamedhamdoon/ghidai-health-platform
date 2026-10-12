import {localPool} from './p2-database';
const {pool}=await localPool('test');
try {console.log((await pool.query('SELECT migration_name,logs FROM _prisma_migrations WHERE finished_at IS NULL AND rolled_back_at IS NULL')).rows);console.log((await pool.query('SELECT to_regclass(\'public."P4LocalCapability"\') present')).rows);}finally{await pool.end();}
