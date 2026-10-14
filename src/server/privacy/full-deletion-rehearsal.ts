import type { PoolClient } from 'pg';
import { randomUUID } from 'node:crypto';
import { digest } from '../auth/crypto';
import { uuid,instant } from '../contracts/p2';

export const participantDeletionOrder=[
 'AuthMail','AuthChallenge','AuthToken','MfaCredential','Session',
 'Certificate','AchievementAward','TaskExclusion','TaskCompletion','MealSelection',
 'ReminderRule','TaskOccurrence','EnrollmentDay','Enrollment',
 'ReviewAnswer','CorrectionRequest','LogRevision','DailyReview','WaterLog','StepDayLog','ExerciseLog','SleepLog','HealthRecord',
 'HabitLog','HabitDefinition','CoachNote','CoachAssignment',
 'NotificationPreference','PushSubscription','Notification','OutboxJob','PrivacyRequest','IdempotencyRecord','Consent','UserGoal','Profile',
] as const;
type SyntheticPolicy={syntheticOnly:true;retainUntil:string;backupCutoff:string};
const permittedTriggerOverrides=[['LogRevision','log_revision_immutable'],['TaskCompletion','p5_completion_guard']] as const;

// No route, worker or production caller exists. The owner must create a NEW full
// test schema and a target-bound synthetic marker before this can do any write.
export async function rehearseFullParticipantDeletion(db:PoolClient,schema:string,subject:string,policy:SyntheticPolicy){
 const stamp=/^p3_test_(\d{13})$/.exec(schema)?.[1],age=stamp?Date.now()-Number(stamp):Infinity;
 if(age<0||age>3600000)throw new Error('NEW_RECENT_TEST_SCHEMA_REQUIRED');uuid(subject);
 if(policy.syntheticOnly!==true)throw new Error('SYNTHETIC_POLICY_REQUIRED');const retainUntil=instant(policy.retainUntil),backupCutoff=instant(policy.backupCutoff);if(Date.parse(retainUntil)<=Date.now()||Date.parse(backupCutoff)>Date.now())throw new Error('EXPLICIT_SYNTHETIC_LEDGER_BOUNDARIES_REQUIRED');
 const identity=(await db.query('SELECT current_database() AS db,current_user AS usr')).rows[0];if(identity.db!=='ghidai_test'||identity.usr!=='ghidai_test')throw new Error('TEST_DATABASE_OWNER_REQUIRED');
 const q='"'+schema+'"',hash=digest(schema+':'+subject),tombstone=`deleted-${hash.slice(0,32)}@ghidai.test`;
 await db.query('BEGIN');try{
  await db.query(`SET LOCAL search_path=${q},public`);await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',['synthetic-purge:'+schema+':'+subject]);
  const marker=(await db.query(`SELECT * FROM ${q}."P9DeletionRehearsalMarker" WHERE id=1 FOR UPDATE`)).rows[0];
  if(!marker||marker.syntheticOnly!==true||marker.schemaName!==schema||marker.targetUserId!==subject||marker.subjectHash!==hash||Math.abs(new Date(marker.createdAt).getTime()-Number(stamp))>60000)throw new Error('TARGET_BOUND_SYNTHETIC_MARKER_REQUIRED');
  const user=(await db.query(`SELECT id,role,status,"emailNormalized" FROM ${q}."User" WHERE id=$1 FOR UPDATE`,[subject])).rows[0];if(!user||user.role!=='USER')throw new Error('SYNTHETIC_PARTICIPANT_REQUIRED');
  const ledger=(await db.query(`SELECT id FROM ${q}."DeletionLedger" WHERE "subjectKeyHash"=$1`,[hash])).rows[0];
  if(ledger&&user.status==='DELETED'&&user.emailNormalized===tombstone){await db.query('COMMIT');return {deleted:true,repeated:true,ledgerId:ledger.id,schema,syntheticOnly:true};}
  if(user.status!=='ACTIVE'||user.emailNormalized!==`${subject}@ghidai.test`)throw new Error('SYNTHETIC_PARTICIPANT_REQUIRED');
  // Refuse staff/authored shared-resource graphs; this mechanism targets only the
  // participant graph and cannot erase someone else's content or coaching role.
  const forbidden:[string,string][]=[['ContentRevision','authorId'],['Program','ownerId'],['ContentReview','reviewerId'],['ReviewerQualification','reviewerId'],['ReviewerQualification','verifiedBy'],['CoachAssignment','coachId'],['CoachNote','coachId'],['AccessGrant','subjectId'],['ProgramWithdrawal','authorizedBy'],['ContentWithdrawal','authorizedBy'],['OperationsReport','performedBy']];
  for(const [table,column] of forbidden)if((await db.query(`SELECT 1 FROM ${q}."${table}" WHERE "${column}"=$1 LIMIT 1`,[subject])).rowCount)throw new Error('SHARED_OR_STAFF_GRAPH_REJECTED');
  if((await db.query(`SELECT 1 FROM ${q}."AccessGrant" WHERE "grantedBy"=$1 AND "scopeUserId"<>$1 LIMIT 1`,[subject])).rowCount)throw new Error('SHARED_OR_STAFF_GRAPH_REJECTED');
  for(const [table,trigger] of permittedTriggerOverrides){const found=(await db.query('SELECT t.tgenabled FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=$1 AND c.relname=$2 AND t.tgname=$3 AND NOT t.tgisinternal',[schema,table,trigger])).rows[0];if(found?.tgenabled!=='O')throw new Error('EXPECTED_IMMUTABILITY_TRIGGER_REQUIRED');}
  // These two DDL changes are transactional. FK triggers and every other trigger,
  // including audit immutability, stay active. ROLLBACK restores them on failure.
  for(const [table,trigger] of permittedTriggerOverrides)await db.query(`ALTER TABLE ${q}."${table}" DISABLE TRIGGER "${trigger}"`);
  await db.query(`UPDATE ${q}."User" SET status='DELETED',"emailNormalized"=$2,"passwordHash"=NULL,"verifiedAt"=NULL,revision=revision+1,"updatedAt"=now() WHERE id=$1`,[subject,tombstone]);
  await db.query(`DELETE FROM ${q}."AccessGrant" WHERE "scopeUserId"=$1`,[subject]);
  const counts:Record<string,number>={};for(const table of participantDeletionOrder)counts[table]=(await db.query(`DELETE FROM ${q}."${table}" WHERE "userId"=$1`,[subject])).rowCount??0;
  for(const [table,trigger] of permittedTriggerOverrides)await db.query(`ALTER TABLE ${q}."${table}" ENABLE TRIGGER "${trigger}"`);
  const result=(await db.query(`INSERT INTO ${q}."DeletionLedger"("subjectKeyHash","completedAt","retainUntil","backupCutoff") VALUES($1,now(),$2,$3) RETURNING id`,[hash,retainUntil,backupCutoff])).rows[0];
  await db.query(`INSERT INTO ${q}."AuditLog"("actorId",action,"targetType","targetId","requestId","occurredAt","safeMetadata") VALUES(NULL,'P9_SYNTHETIC_GRAPH_DELETE','SyntheticParticipant',$1,$2,now(),$3)`,[subject,randomUUID(),JSON.stringify({syntheticOnly:true,subjectHash:hash})]);
  await db.query(`UPDATE ${q}."P9DeletionRehearsalMarker" SET "completedAt"=now() WHERE id=1`);
  await db.query('COMMIT');return {deleted:true,repeated:false,ledgerId:result.id,counts,schema,syntheticOnly:true};
 }catch(e){await db.query('ROLLBACK');throw e;}
}
