import {readFileSync,writeFileSync} from 'node:fs';
import {createHash,randomUUID} from 'node:crypto';
import {localPool} from './p2-database';
// Before P4's first commit only: the same SQL had CRLF locally while the
// repository's existing .gitattributes stores SQL as LF. Exact hashes prevent
// this local repair from accepting any statement/content change or old phase.
const name='202610120004_p4_authoring',path=`prisma/migrations/${name}/migration.sql`;
const original='ad9c90957e1d2005ba391abfd5046b47b8c4b290fdabb9cbef191309a3fb80b9';
const canonical='71ecb515b0f82114f3c6dbed8c9f292545dcffdc43b75939f945d00100095cc6';
const data=readFileSync(path,'utf8'),normalized=data.replaceAll('\r\n','\n');
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
if(![original,canonical].includes(hash(data))||hash(normalized)!==canonical)throw new Error('UNEXPECTED_MIGRATION_CONTENT');
for(const environment of ['development','test'] as const){
 const {pool}=await localPool(environment);const client=await pool.connect();
 try {await client.query('BEGIN');const rows=(await client.query('SELECT id,checksum FROM _prisma_migrations WHERE migration_name=$1 AND finished_at IS NOT NULL AND rolled_back_at IS NULL FOR UPDATE',[name])).rows;
  if(rows.length!==1||![original,canonical].includes(rows[0].checksum))throw new Error('UNEXPECTED_MIGRATION_LEDGER');
  if(rows[0].checksum===original){await client.query('UPDATE _prisma_migrations SET checksum=$2 WHERE id=$1',[rows[0].id,canonical]);await client.query('INSERT INTO "AuditLog"(action,"targetType","requestId","occurredAt","safeMetadata") VALUES(\'P4_MIGRATION_EOL_CANONICALIZED\',\'Migration\',$1,now(),$2)',[randomUUID(),JSON.stringify({migration:name,originalChecksum:original,canonicalChecksum:canonical,sqlUnchanged:true})]);}
  await client.query('COMMIT');console.log(`PASS ${environment}: exact P4-only LF ledger normalization; SQL unchanged, no schema/data deletion.`);
 }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();await pool.end();}
}
writeFileSync(path,normalized);
console.log('PASS P4 migration working file matches Git LF bytes. Historical P2/P3 migrations untouched.');
