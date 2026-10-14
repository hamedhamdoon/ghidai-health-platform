import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { localPool } from '../../scripts/p2-database';
import { rehearseSyntheticDeletion } from '../../src/server/privacy/deletion-rehearsal';
const {pool}=await localPool('test'),schema='p9_deletion_'+randomUUID().replaceAll('-',''),q='"'+schema+'"',a=randomUUID(),b=randomUUID();const db=await pool.connect();
try{
 await db.query(`CREATE SCHEMA ${q}`);await db.query(`CREATE TABLE ${q}."RehearsalMarker"(id integer PRIMARY KEY,"syntheticOnly" boolean NOT NULL);INSERT INTO ${q}."RehearsalMarker" VALUES(1,true);CREATE TABLE ${q}."Subject"(id uuid PRIMARY KEY);CREATE TABLE ${q}."HealthLog"(id uuid PRIMARY KEY,"userId" uuid NOT NULL REFERENCES ${q}."Subject"(id));CREATE TABLE ${q}."Session"(id uuid PRIMARY KEY,"userId" uuid NOT NULL REFERENCES ${q}."Subject"(id));CREATE TABLE ${q}."DeletionLedger"("subjectHash" text PRIMARY KEY,"completedAt" timestamptz NOT NULL)`);
 await db.query(`INSERT INTO ${q}."Subject" VALUES($1),($2)`,[a,b]);for(const t of ['HealthLog','Session'])await db.query(`INSERT INTO ${q}."${t}" VALUES($1,$2),($3,$4)`,[randomUUID(),a,randomUUID(),b]);
 await assert.rejects(()=>rehearseSyntheticDeletion(db,'public',a));await rehearseSyntheticDeletion(db,schema,a);
 assert.equal((await db.query(`SELECT count(*)::integer count FROM ${q}."Subject" WHERE id=$1`,[a])).rows[0].count,0);assert.equal((await db.query(`SELECT count(*)::integer count FROM ${q}."HealthLog" WHERE "userId"=$1`,[a])).rows[0].count,0);assert.equal((await db.query(`SELECT count(*)::integer count FROM ${q}."Session" WHERE "userId"=$1`,[a])).rows[0].count,0);
 assert.equal((await db.query(`SELECT count(*)::integer count FROM ${q}."HealthLog" WHERE "userId"=$1`,[b])).rows[0].count,1);assert.equal((await db.query(`SELECT count(*)::integer count FROM ${q}."DeletionLedger"`)).rows[0].count,1);await assert.rejects(()=>rehearseSyntheticDeletion(db,schema,b.replace(/.$/,'x')));
 console.log('PASS P9 deletion: 7 assertions; isolated synthetic PostgreSQL subject/log/session removal, other subject and hashed ledger retained. Schema preserved: '+schema);
}finally{db.release();await pool.end();}
