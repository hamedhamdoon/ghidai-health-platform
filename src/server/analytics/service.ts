import {randomUUID} from 'node:crypto';
import type {PoolClient} from 'pg';
import {AuthService} from '../auth/service';
import {AuthError} from '../auth/contracts';
import {withActor} from '../db/context';
import {date,uuid,object} from '../contracts/p2';
import {summarizeDays,ruleEligible,type DaySource} from './calculations';
const missing=():never=>{throw new AuthError('NOT_FOUND',404);};
function localDate(timezone:string,now=new Date()){return new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).format(now);}
export async function enrollmentSummary(db:PoolClient,actorId:string,enrollmentId:string){
 const e=(await db.query('SELECT e.*,v.title,p."streakRule",p."certificateThreshold"::float8 FROM "Enrollment" e JOIN "ProgramVersion" v ON v.id=e."versionId" JOIN "PolicyVersion" p ON p.id=e."policyVersionId" WHERE e.id=$1 AND e."userId"=$2 FOR UPDATE OF e',[enrollmentId,actorId])).rows[0];if(!e)missing();
 const rows=(await db.query(`SELECT d."localDate"::text AS date,d.state,o.id,o."requiredSnapshot" AS required,c.id IS NOT NULL AS completed,x.id IS NOT NULL AS excluded FROM "EnrollmentDay" d LEFT JOIN "TaskOccurrence" o ON o."dayId"=d.id AND o."userId"=$2 LEFT JOIN "TaskCompletion" c ON c."occurrenceId"=o.id AND c."userId"=$2 LEFT JOIN "TaskExclusion" x ON x."occurrenceId"=o.id AND x."userId"=$2 WHERE d."enrollmentId"=$1 AND d."userId"=$2 ORDER BY d."localDate",o."orderSnapshot"`,[enrollmentId,actorId])).rows;
 const grouped=new Map<string,DaySource>();for(const row of rows){const day:DaySource=grouped.get(row.date)??{date:row.date,state:row.state,tasks:[]};if(row.id)day.tasks.push({id:row.id,required:row.required,completed:row.completed,excluded:row.excluded});grouped.set(row.date,day);}
 const today=localDate(e.timezoneSnapshot);return {enrollment:e,today,...summarizeDays([...grouped.values()],today)};
}
export async function reconcileEnrollmentAwards(db:PoolClient,actorId:string,enrollmentId:string){
 const summary=await enrollmentSummary(db,actorId,enrollmentId);
 const local=(await db.query("SELECT current_database() IN ('ghidai_development','ghidai_test') AS allowed")).rows[0].allowed;
 const visible=(await db.query('SELECT p4_visible_version($1) AND NOT EXISTS(SELECT 1 FROM "ProgramWithdrawal" WHERE "versionId"=$1 AND "effectiveAt"<=now()) AS allowed',[summary.enrollment.versionId])).rows[0].allowed;
 const rules=(await db.query(`SELECT r.*,c.title,c.status AS "contentStatus",c."syntheticOnly" FROM "ProgramAchievementRule" p JOIN "AchievementRuleVersion" r ON r.id=p."ruleVersionId" JOIN "ContentRevision" c ON c.id=r."contentRevisionId" WHERE p."versionId"=$1`,[summary.enrollment.versionId])).rows;
 const active=local&&visible&&summary.enrollment.streakRule?.syntheticOnly===true&&summary.enrollment.status!=='WITHDRAWN';
 const linked=new Set(rules.map(rule=>rule.id));
 const existing=(await db.query('SELECT id,"ruleVersionId" FROM "AchievementAward" WHERE "userId"=$1 AND "enrollmentId"=$2 AND status=\'GRANTED\'',[actorId,enrollmentId])).rows;
 for(const award of existing)if(!linked.has(award.ruleVersionId)){
  await db.query('UPDATE "AchievementAward" SET status=\'REVOKED\',"revokedAt"=now(),"aggregateRevision"=$3,evidence=evidence||jsonb_build_object(\'sourceRevision\',$3::integer),revision=revision+1,"updatedAt"=now() WHERE id=$1 AND "userId"=$2',[award.id,actorId,summary.enrollment.revision]);
  await db.query('UPDATE "Certificate" SET status=\'REVOKED\',revision=revision+1,"updatedAt"=now() WHERE "awardId"=$1 AND "userId"=$2 AND status=\'VALID\'',[award.id,actorId]);
  await db.query(`INSERT INTO "AuditLog"("actorId",action,"targetType","targetId","requestId","occurredAt","safeMetadata") VALUES($1,'SYNTHETIC_AWARD_REVOKED','AchievementAward',$2,$3,now(),'{"reason":"SOURCE_UNAVAILABLE"}'::jsonb)`,[actorId,award.id,randomUUID()]);
 }
 for(const rule of rules){
  const eligible=rule.status==='PUBLISHED'&&rule.contentStatus==='APPROVED'&&rule.syntheticOnly===true&&ruleEligible(rule.type,rule.config,summary,active);
  const old=(await db.query('SELECT * FROM "AchievementAward" WHERE "userId"=$1 AND "enrollmentId"=$2 AND "ruleVersionId"=$3 FOR UPDATE',[actorId,enrollmentId,rule.id])).rows[0];
  if(!old&&!eligible)continue;
  const status=eligible?'GRANTED':'REVOKED';
  const evidence=JSON.stringify({syntheticOnly:true,sourceRevision:summary.enrollment.revision,completed:summary.final.completed,required:summary.final.required,percentage:summary.final.percentage,streak:summary.streak.longest,ruleVersion:rule.version});
  const award=(await db.query(`INSERT INTO "AchievementAward"("userId","enrollmentId","ruleVersionId",status,"grantedAt","revokedAt",evidence,"aggregateRevision") VALUES($1,$2,$3,$4,now(),CASE WHEN $4='REVOKED' THEN now() END,$5::jsonb,$6) ON CONFLICT("userId","enrollmentId","ruleVersionId") DO UPDATE SET status=EXCLUDED.status,"revokedAt"=CASE WHEN EXCLUDED.status='REVOKED' THEN COALESCE("AchievementAward"."revokedAt",now()) ELSE NULL END,evidence=EXCLUDED.evidence,"aggregateRevision"=EXCLUDED."aggregateRevision",revision="AchievementAward".revision+1,"updatedAt"=now() WHERE "AchievementAward".status IS DISTINCT FROM EXCLUDED.status OR "AchievementAward"."aggregateRevision"<>EXCLUDED."aggregateRevision" RETURNING *`,[actorId,enrollmentId,rule.id,status,evidence,summary.enrollment.revision])).rows[0]??old;
  if(rule.type==='COMPLETION'&&eligible&&summary.ended&&summary.final.percentage!==null&&summary.final.percentage>=Number(summary.enrollment.certificateThreshold)){
   await db.query(`INSERT INTO "Certificate"("userId","awardId",serial,"issuedAt",status) VALUES($1,$2,$3,now(),'VALID') ON CONFLICT("awardId") DO UPDATE SET status='VALID',revision="Certificate".revision+1,"updatedAt"=now() WHERE "Certificate".status<>'VALID'`,[actorId,award.id,`TEST-${randomUUID()}`]);
  }else await db.query(`UPDATE "Certificate" SET status='REVOKED',revision=revision+1,"updatedAt"=now() WHERE "userId"=$1 AND "awardId"=$2 AND status='VALID'`,[actorId,award.id]);
  if(!old||old.status!==status)await db.query(`INSERT INTO "AuditLog"("actorId",action,"targetType","targetId","requestId","occurredAt","safeMetadata") VALUES($1,$2,'AchievementAward',$3,$4,now(),$5::jsonb)`,[actorId,eligible?'SYNTHETIC_AWARD_GRANTED':'SYNTHETIC_AWARD_REVOKED',award.id,randomUUID(),JSON.stringify({enrollmentId,sourceRevision:summary.enrollment.revision})]);
 }
 return summary;
}
export class AnalyticsService{
 constructor(readonly auth:AuthService){}
 async execute(path:string,method:string,input:unknown,token:string,_match:string|null,_key:string|null,query=new URLSearchParams()){
  if(method!=='GET')throw new AuthError('NOT_FOUND',404);object(input??{},[]);
  return this.auth.transaction(async authDb=>{const session=await this.auth.resolve(authDb,token);const result=await withActor(this.auth.app,session.actor,async db=>{
   const actor=session.actor.id;await db.query("SELECT pg_advisory_xact_lock(hashtextextended($1,0))",[`participant:${actor}`]);
   if(path==='analytics'){
    for(const key of query.keys())if(!['from','to','enrollmentId'].includes(key)||query.getAll(key).length!==1)throw new AuthError('VALIDATION_FAILED',422);
    const profile=(await db.query('SELECT timezone FROM "Profile" WHERE "userId"=$1',[actor])).rows[0];const today=localDate(profile?.timezone??'Asia/Muscat');
    const to=query.has('to')?date(query.get('to')):today;const start=new Date(`${to}T00:00:00Z`);start.setUTCDate(start.getUTCDate()-6);const from=query.has('from')?date(query.get('from')):start.toISOString().slice(0,10);
    if(from>to||(Date.parse(to)-Date.parse(from))/86400000>365)throw new AuthError('VALIDATION_FAILED',422);
    const ids=query.has('enrollmentId')?[uuid(query.get('enrollmentId'))]:(await db.query('SELECT id FROM "Enrollment" WHERE "userId"=$1 ORDER BY id',[actor])).rows.map(row=>row.id);
    const enrollments=[];for(const id of ids){const s=await reconcileEnrollmentAwards(db,actor,id);enrollments.push({id,title:s.enrollment.title,revision:s.enrollment.revision,timezone:s.enrollment.timezoneSnapshot,status:s.enrollment.status,daily:s.daily.filter(day=>day.date>=from&&day.date<=to),due:s.due,final:s.final,weekly:s.weekly,streak:s.streak,ended:s.ended,elapsedDays:s.elapsedDays,durationDays:s.durationDays});}
    const water=(await db.query('SELECT "localDate"::text AS date,sum("amountMl")::int AS value FROM "WaterLog" WHERE "userId"=$1 AND "deletedAt" IS NULL AND "localDate" BETWEEN $2::date AND $3::date GROUP BY "localDate"',[actor,from,to])).rows;
    const steps=(await db.query('SELECT "localDate"::text AS date,"totalSteps" AS value FROM "StepDayLog" WHERE "userId"=$1 AND "deletedAt" IS NULL AND "localDate" BETWEEN $2::date AND $3::date',[actor,from,to])).rows;
    const exercise=(await db.query('SELECT "localDate"::text AS date,sum("durationMin")::int AS value FROM "ExerciseLog" WHERE "userId"=$1 AND "deletedAt" IS NULL AND "localDate" BETWEEN $2::date AND $3::date GROUP BY "localDate"',[actor,from,to])).rows;
    const sleep=(await db.query('SELECT "wakeDate"::text AS date,sum(extract(epoch FROM ("endsAt"-"startsAt"))/60)::float8 AS value FROM "SleepLog" WHERE "userId"=$1 AND "deletedAt" IS NULL AND "wakeDate" BETWEEN $2::date AND $3::date GROUP BY "wakeDate"',[actor,from,to])).rows;
    const reviews=(await db.query(`SELECT r."localDate"::text AS date,r."schemaVersionId",d.key,d.label,o.value,o.label AS "optionLabel" FROM "DailyReview" r JOIN "ReviewAnswer" a ON a."reviewId"=r.id AND a."userId"=$1 JOIN "ReviewDimension" d ON d.id=a."dimensionId" JOIN "ReviewOption" o ON o.id=a."optionId" WHERE r."userId"=$1 AND r."localDate" BETWEEN $2::date AND $3::date ORDER BY r."localDate",d."order"`,[actor,from,to])).rows;
    const dates=[];for(let time=Date.parse(from);time<=Date.parse(to);time+=86400000){const d=new Date(time).toISOString().slice(0,10);dates.push({date:d,waterMl:water.find(row=>row.date===d)?.value??null,steps:steps.find(row=>row.date===d)?.value??null,exerciseMin:exercise.find(row=>row.date===d)?.value??null,sleepMin:sleep.find(row=>row.date===d)?.value??null,reviewDimensions:reviews.filter(row=>row.date===d)});}
    return {from,to,enrollments,metrics:dates,syntheticPolicyNotice:'سياسات الاستمرارية والاستحقاق اختبارية؛ A-03 وA-04 لم تعتمدا.'};
   }
   if(path==='achievements'){
    const ids=(await db.query('SELECT id FROM "Enrollment" WHERE "userId"=$1 ORDER BY id',[actor])).rows;for(const e of ids)await reconcileEnrollmentAwards(db,actor,e.id);
    return {awards:(await db.query(`SELECT a.id,a."enrollmentId",a.status,a."grantedAt",a."revokedAt",a.evidence,a."aggregateRevision",r.code,COALESCE(r.version,(a.evidence->>'ruleVersion')::int) AS version,r.type,COALESCE(c.title,'شارة اختبار سحب مصدرها') AS title,cert.id AS "certificateId",cert.status AS "certificateStatus" FROM "AchievementAward" a LEFT JOIN "AchievementRuleVersion" r ON r.id=a."ruleVersionId" LEFT JOIN "ContentRevision" c ON c.id=r."contentRevisionId" AND c.status='APPROVED' LEFT JOIN "Certificate" cert ON cert."awardId"=a.id AND cert."userId"=$1 WHERE a."userId"=$1 ORDER BY a."grantedAt" DESC`,[actor])).rows,syntheticOnly:true};
   }
   const match=/^certificates\/([^/]+)$/.exec(path);if(match){const id=uuid(match[1]);const cert=(await db.query('SELECT c.*,a."enrollmentId" FROM "Certificate" c JOIN "AchievementAward" a ON a.id=c."awardId" AND a."userId"=c."userId" WHERE c.id=$1 AND c."userId"=$2',[id,actor])).rows[0];if(!cert)missing();const summary=await reconcileEnrollmentAwards(db,actor,cert.enrollmentId);
    const valid=(await db.query(`SELECT c.id,c.serial,c."issuedAt",c.status,a."aggregateRevision",a.evidence FROM "Certificate" c JOIN "AchievementAward" a ON a.id=c."awardId" AND a."userId"=c."userId" WHERE c.id=$1 AND c."userId"=$2 AND c.status='VALID' AND a.status='GRANTED' AND a."aggregateRevision"=$3`,[id,actor,summary.enrollment.revision])).rows[0];if(!valid)return {certificateRevoked:true};
    return {...valid,syntheticOnly:true,watermark:'شهادة اختبار اصطناعية — غير نهائية',verification:{private:true,sourceRevision:summary.enrollment.revision,checkedAt:new Date().toISOString()}};
   }return missing();
  });if('certificateRevoked' in result)throw new AuthError('CERTIFICATE_REVOKED',409);return result;});
 }
}
