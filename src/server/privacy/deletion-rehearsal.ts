import type { PoolClient } from 'pg';
import { digest } from '../auth/crypto';
import { uuid } from '../contracts/p2';

// Deliberately no application route. This rehearses relational deletion against
// newly created synthetic tables, not a production retention/purge policy.
export async function rehearseSyntheticDeletion(db:PoolClient,schema:string,subject:string){
 if(!/^p9_deletion_[a-f0-9]{32}$/.test(schema))throw new Error('NEW_ISOLATED_SCHEMA_REQUIRED');uuid(subject);
 const identity=(await db.query('SELECT current_database() AS db,current_user AS usr')).rows[0];if(identity.db!=='ghidai_test'||identity.usr!=='ghidai_test')throw new Error('TEST_DATABASE_IDENTITY_REQUIRED');
 const q='"'+schema+'"';const marker=(await db.query(`SELECT "syntheticOnly" FROM ${q}."RehearsalMarker" WHERE id=1`)).rows[0];if(marker?.syntheticOnly!==true)throw new Error('SYNTHETIC_MARKER_REQUIRED');
 await db.query('BEGIN');try{const found=(await db.query(`SELECT id FROM ${q}."Subject" WHERE id=$1 FOR UPDATE`,[subject])).rows[0];if(!found)throw new Error('SUBJECT_NOT_FOUND');
  await db.query(`DELETE FROM ${q}."HealthLog" WHERE "userId"=$1`,[subject]);await db.query(`DELETE FROM ${q}."Session" WHERE "userId"=$1`,[subject]);await db.query(`DELETE FROM ${q}."Subject" WHERE id=$1`,[subject]);
  await db.query(`INSERT INTO ${q}."DeletionLedger"("subjectHash","completedAt") VALUES($1,now())`,[digest(subject)]);await db.query('COMMIT');return {deleted:true,syntheticOnly:true};
 }catch(e){await db.query('ROLLBACK');throw e;}
}
