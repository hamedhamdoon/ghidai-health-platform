import type { PoolClient } from 'pg';
import { localDate,saveAllowed } from '../participation/rules';
export async function recalculateDerived(db:PoolClient,actor:string){
 const occurrences=(await db.query(`SELECT o.*,d."localDate"::text AS "day",d.state "dayState",d.id "enrollmentDayId",e.id "enrollmentId",e."timezoneSnapshot",e.status "enrollmentStatus",p."lateWindowDays",p."streakRule",p4_visible_version(e."versionId") visible,t."completionMode",c.id "completionId",c."evidenceRevision" FROM "TaskOccurrence" o JOIN "EnrollmentDay" d ON d.id=o."dayId" JOIN "Enrollment" e ON e.id=d."enrollmentId" JOIN "PolicyVersion" p ON p.id=e."policyVersionId" JOIN "TaskDefinition" t ON t.id=o."definitionId" LEFT JOIN "TaskCompletion" c ON c."occurrenceId"=o.id WHERE o."userId"=$1 AND t."completionMode"='THRESHOLD' AND NOT EXISTS(SELECT 1 FROM "TaskExclusion" x WHERE x."occurrenceId"=o.id) ORDER BY e.id,d."dayIndex",o."orderSnapshot" FOR UPDATE OF o,d,e`,[actor])).rows;
 const changedDays=new Set<string>(),changedEnrollments=new Set<string>();
 for(const o of occurrences){
  if(o.streakRule?.syntheticOnly!==true)continue;
  const sources:Record<string,{table:string;at:string;expression:string}>={WATER_ML:{table:'WaterLog',at:'occurredAt',expression:'sum("amountMl")'},STEPS:{table:'StepDayLog',at:'recordedForTime',expression:'max("totalSteps")'},EXERCISE_MIN:{table:'ExerciseLog',at:'startsAt',expression:'sum("durationMin")'},SLEEP_MIN:{table:'SleepLog',at:'endsAt',expression:'sum(extract(epoch from ("endsAt"-"startsAt"))/60)'}};
  const source=sources[o.metric];if(!source)continue;
  const total=(await db.query(`SELECT coalesce(${source.expression},0) value,max("${source.at}") evidence FROM "${source.table}" WHERE "userId"=$1 AND "deletedAt" IS NULL AND "${source.at}"<=now() AND ("${source.at}" AT TIME ZONE $2)::date=$3::date`,[actor,o.timezoneSnapshot,o.day])).rows[0],value=Number(total.value);
  changedEnrollments.add(o.enrollmentId);
  const complete=Number(o.targetSnapshot)>0&&value>=Number(o.targetSnapshot);
  if(complete===Boolean(o.completionId))continue;
  if(complete){if(!total.evidence||!o.visible||!saveAllowed(o.day,localDate(new Date(),o.timezoneSnapshot),o.lateWindowDays,o.dayState,o.enrollmentStatus))continue;await db.query(`INSERT INTO "TaskCompletion"("userId","occurrenceId","completedAt","recordedAt","isLate",mode,"evidenceRevision") VALUES($1,$2,$6,now(),(now() AT TIME ZONE $3)::date>$4::date,'DERIVED',$5)`,[actor,o.id,o.timezoneSnapshot,o.day,o.revision+1,total.evidence]);}
  else await db.query('DELETE FROM "TaskCompletion" WHERE "occurrenceId"=$1 AND "userId"=$2 AND mode=\'DERIVED\'',[o.id,actor]);
  await db.query('UPDATE "TaskOccurrence" SET revision=revision+1,"updatedAt"=now() WHERE id=$1',[o.id]);changedDays.add(o.enrollmentDayId);changedEnrollments.add(o.enrollmentId);
 }
 for(const id of changedDays)await db.query('UPDATE "EnrollmentDay" SET revision=revision+1,"updatedAt"=now() WHERE id=$1',[id]);
 for(const id of changedEnrollments)await db.query('UPDATE "Enrollment" SET revision=revision+1,"updatedAt"=now() WHERE id=$1',[id]);
 return [...changedEnrollments];
}
