import { readdirSync, lstatSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { localPool } from './p2-database';
const root=resolve('.');
function size(path:string):number { const stat=lstatSync(path); if(stat.isSymbolicLink())return 0; if(!stat.isDirectory())return stat.size; return readdirSync(path).reduce((total,name)=>total+size(join(path,name)),0); }
const directories=readdirSync(root).filter(name=>!name.startsWith('.env')).map(name=>({name,bytes:size(join(root,name))}));
const {pool}=await localPool('test');
try {
 const schemas=(await pool.query(`SELECT n.nspname AS schema, count(c.oid)::int AS relations, coalesce(sum(pg_total_relation_size(c.oid)),0)::text AS bytes FROM pg_namespace n LEFT JOIN pg_class c ON c.relnamespace=n.oid AND c.relkind IN('r','m') WHERE n.nspname='public' OR n.nspname ~ '^p[239]_' GROUP BY n.nspname ORDER BY n.nspname`)).rows;
 const docker=(...args:string[])=>execFileSync('docker',args,{encoding:'utf8',windowsHide:true});
 const containers=docker('ps','-a','--format','{{.Names}}|{{.Image}}|{{.Status}}');
 const volumes=docker('volume','ls','--format','{{.Name}}');
 const usage=docker('system','df');
 writeFileSync('.npm-cache/p12-r1/storage-inventory.json',JSON.stringify({root,generatedAt:new Date().toISOString(),directories,schemas,containers,volumes,usage,deleted:false},null,2));
 console.log(JSON.stringify({directories,schemas:schemas.length,deleted:false}));
} finally {await pool.end();}
