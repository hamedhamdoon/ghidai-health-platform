import {randomUUID} from 'node:crypto';
import type {PoolClient} from 'pg';
import {AuthService} from '../auth/service';
import {AuthError} from '../auth/contracts';
import {withActor} from '../db/context';
import {encrypt,decrypt,digest} from '../auth/crypto';
import {object,uuid,revision,assertRevision,idempotency,assertReplay} from '../contracts/p2';
import {assignmentInput,userInput,noteInput} from './contracts';
const missing=():never=>{throw new AuthError('NOT_FOUND',404);};
export class AdministrationService {
 constructor(readonly auth:AuthService){}
 async execute(path:string,method:string,input:unknown,token:string,match:string|null,key:string|null){await this.auth.rate(`p8:${digest(token)}`,100);return this.auth.transaction(async authDb=>{
  const session=await this.auth.resolve(authDb,token);
  return withActor(this.auth.app,session.actor,async db=>{
   const actor=session.actor.id,flags=(await db.query('SELECT p4_staff() staff,p4_admin() admin')).rows[0];
   if(path.startsWith('admin/')&&!flags.admin||path.startsWith('coach/')&&(!flags.staff||flags.admin))throw new AuthError('FORBIDDEN',403);
   if(method!=='GET'){this.auth.fresh(session);if(path.startsWith('admin/')){const m=(await authDb.query('SELECT "enabledAt" FROM "MfaCredential" WHERE "userId"=$1 AND "enabledAt" IS NOT NULL',[actor])).rows[0];if(!m||!session.mfaVerifiedAt||session.mfaVerifiedAt<m.enabledAt)throw new AuthError('MFA_REQUIRED',403);}}
   await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[`p8:${actor}`]);
   // A persisted receipt never overrides a withdrawn or expired consent.
   if(/^coach\/participants\/[\w-]+\/notes$/.test(path)){const user=uuid(path.split('/')[2]);if(!(await db.query('SELECT p8_can_note($1) allowed',[user])).rows[0].allowed)throw new AuthError('NOT_FOUND',404);}
   const receipt=method==='GET'?null:idempotency(key,'administration.command',{path,method,input,match});
   if(receipt){const old=(await db.query('SELECT * FROM "IdempotencyRecord" WHERE "userId"=$1 AND action=$2 AND key=$3',[actor,receipt.action,receipt.key])).rows[0];if(old){assertReplay(old.requestHash,receipt.requestHash);return JSON.parse(decrypt(old.responseEncrypted,this.auth.key));}}
   const body=await this.command(db,path,method,input,actor,match),result={body};
   if(receipt){await db.query('INSERT INTO "IdempotencyRecord"("userId",action,key,"requestHash","responseEncrypted","expiresAt") VALUES($1,$2,$3,$4,$5,now()+interval \'24 hours\')',[actor,receipt.action,receipt.key,receipt.requestHash,encrypt(JSON.stringify(result),this.auth.key)]);const reason=path.startsWith('admin/users/')?userInput(input).reason:null;await db.query('INSERT INTO "AuditLog"("actorId",action,"targetType","targetId","requestId","occurredAt",reason,"safeMetadata") VALUES($1,$2,\'Administration\',NULL,$3,now(),$4,\'{}\')',[actor,`P8_${method}_${path.split('/').at(-1)}`,randomUUID(),reason]);}
   return result;
  });
 });}
 async command(db:PoolClient,path:string,method:string,input:unknown,actor:string,match:string|null):Promise<unknown>{
  if(path==='coaching/assignments'&&method==='POST'){const d=assignmentInput(input);return (await db.query('SELECT p8_grant_assignment($1,$2,$3) result',[d.coachId,d.resources,d.expiresAt])).rows[0].result;}
  if(path==='coaching/assignments'&&method==='GET')return (await db.query('SELECT a.*,c.scope,c."revokedAt" AS "consentRevokedAt" FROM "CoachAssignment" a JOIN "Consent" c ON c.id=a."consentId" WHERE a."userId"=$1 ORDER BY a."createdAt" DESC LIMIT 100',[actor])).rows;
  if(/^coaching\/assignments\/[\w-]+\/revoke$/.test(path)&&method==='POST'){object(input,[]);return (await db.query('SELECT p8_revoke_assignment($1,$2) result',[uuid(path.split('/')[2]),revision(match)])).rows[0].result;}
  if(path==='admin/users'&&method==='GET')return (await db.query('SELECT * FROM p8_users()')).rows;
  if(/^admin\/users\/[\w-]+$/.test(path)&&method==='PATCH'){const d=userInput(input),target=uuid(path.split('/')[2]);if(target===actor)throw new AuthError('FORBIDDEN',403);return (await db.query('SELECT * FROM p8_update_user($1,$2,$3,$4)',[target,d.role,d.status,revision(match)])).rows[0]??missing();}
  if(path==='admin/assignments'&&method==='GET')return (await db.query('SELECT p8_assignments() result')).rows[0].result;
  if(/^admin\/assignments\/[\w-]+\/revoke$/.test(path)&&method==='POST'){object(input,[]);return (await db.query('SELECT p8_revoke_assignment($1,$2) result',[uuid(path.split('/')[2]),revision(match)])).rows[0].result;}
  if(path==='admin/operations'&&method==='GET')return (await db.query('SELECT p8_operations() result')).rows[0].result;
  if(path==='admin/audit'&&method==='GET')return (await db.query('SELECT * FROM p8_audit()')).rows;
  if(path==='coach/participants'&&method==='GET')return (await db.query('SELECT a.id,a."userId",a."startsAt",a."expiresAt",a.revision,c.scope FROM "CoachAssignment" a JOIN "Consent" c ON c.id=a."consentId" WHERE a."coachId"=$1 AND a."revokedAt" IS NULL AND a."startsAt"<=now() AND a."expiresAt">now() AND c."revokedAt" IS NULL AND c."grantedAt"<=now() AND c."expiresAt">now() ORDER BY a."createdAt" DESC LIMIT 100',[actor])).rows;
  if(/^coach\/participants\/[\w-]+(?:\/notes)?$/.test(path)){
   const parts=path.split('/'),user=uuid(parts[2]),assignment=(await db.query('SELECT a.*,c.scope FROM "CoachAssignment" a JOIN "Consent" c ON c.id=a."consentId" WHERE a."coachId"=$1 AND a."userId"=$2 AND a."revokedAt" IS NULL AND a."startsAt"<=now() AND a."expiresAt">now() AND c."revokedAt" IS NULL AND c."grantedAt"<=now() AND c."expiresAt">now() ORDER BY a."createdAt" DESC LIMIT 1',[actor,user])).rows[0];if(!assignment)missing();
   if(parts[3]==='notes'&&method==='POST'){const text=noteInput(input);assertRevision(revision(match),assignment.revision);if(!(await db.query('SELECT p8_can_note($1) allowed',[user])).rows[0].allowed)throw new AuthError('FORBIDDEN',403);return (await db.query('INSERT INTO "CoachNote"("userId","coachId","assignmentId","consentId",text) VALUES($1,$2,$3,$4,$5) RETURNING *',[user,actor,assignment.id,assignment.consentId,text])).rows[0];}
   if(method==='GET'&&!parts[3]){
    const result:Record<string,unknown>={assignmentId:assignment.id,revision:assignment.revision,userId:user,scope:assignment.scope,canAddNote:(await db.query('SELECT p8_can_note($1) allowed',[user])).rows[0].allowed};
    if((await db.query('SELECT can_read($1,\'Progress\') allowed',[user])).rows[0].allowed)result.progress=(await db.query('SELECT e.id,e.status,e."startDate"::text,COUNT(DISTINCT d.id)::int days,COUNT(o.id) FILTER(WHERE o."requiredSnapshot" AND x.id IS NULL)::int required,COUNT(done.id) FILTER(WHERE o."requiredSnapshot" AND x.id IS NULL)::int completed FROM "Enrollment" e LEFT JOIN "EnrollmentDay" d ON d."enrollmentId"=e.id LEFT JOIN "TaskOccurrence" o ON o."dayId"=d.id LEFT JOIN "TaskCompletion" done ON done."occurrenceId"=o.id LEFT JOIN "TaskExclusion" x ON x."occurrenceId"=o.id WHERE e."userId"=$1 GROUP BY e.id ORDER BY e."createdAt" DESC LIMIT 50',[user])).rows;
    const columns:Record<string,string>={WaterLog:'id,"amountMl","localDate"::text',StepDayLog:'id,"totalSteps","localDate"::text',ExerciseLog:'id,type,"durationMin","localDate"::text',SleepLog:'id,"startsAt","endsAt","wakeDate"::text',CoachNote:'id,text,"createdAt"'};
    for(const [resource,cols] of Object.entries(columns))if((await db.query('SELECT can_read($1,$2) allowed',[user,resource])).rows[0].allowed)result[resource]=(await db.query(`SELECT ${cols} FROM "${resource}" WHERE "userId"=$1 ${resource==='CoachNote'?'':'AND "deletedAt" IS NULL'} ORDER BY "createdAt" DESC LIMIT 100`,[user])).rows;
    return result;
   }
  }
  return missing();
 }
}
