import {randomUUID} from 'node:crypto';
import type {PoolClient} from 'pg';
import {AuthService} from '../auth/service';
import {AuthError} from '../auth/contracts';
import {encrypt,decrypt,digest} from '../auth/crypto';
import {withActor} from '../db/context';
import {object,uuid,revision,assertRevision,idempotency,assertReplay} from '../contracts/p2';
import {localDate} from '../participation/rules';
import {authoringInput,correctionInput,documentInput,reviewDecision,text,recordTables,type RuleDocument,type SchemaDocument} from './contracts';
const missing=():never=>{throw new AuthError('NOT_FOUND',404);};
const blocked=():never=>{throw new AuthError('POLICY_NOT_APPROVED',403);};
export class RemediationService {
 constructor(readonly auth:AuthService){}
 async execute(path:string,method:string,input:unknown,token:string,match:string|null,key:string|null){await this.auth.rate(`p12r1:${digest(token)}`,100);return this.auth.transaction(async authDb=>{
  const session=await this.auth.resolve(authDb,token);return withActor(this.auth.app,session.actor,async db=>{
   const actor=session.actor.id,staffPath=/^(admin|coach)\//.test(path);
   if(staffPath){const flags=(await db.query('SELECT p4_staff() staff,p4_admin() admin')).rows[0];if(!flags.staff||path.startsWith('admin/')&&!flags.admin)throw new AuthError('FORBIDDEN',403);}
   // Check live authorization before looking up any replay receipt.
   if(path==='admin/reports'||path.startsWith('admin/corrections'))return blocked();
   if(method!=='GET'&&staffPath){this.auth.fresh(session);if(path.startsWith('admin/')){const m=(await authDb.query('SELECT "enabledAt" FROM "MfaCredential" WHERE "userId"=$1 AND "enabledAt" IS NOT NULL',[actor])).rows[0];if(!m||!session.mfaVerifiedAt||session.mfaVerifiedAt<m.enabledAt)throw new AuthError('MFA_REQUIRED',403);}}
   await db.query('SELECT pg_advisory_xact_lock(hashtextextended($1,0))',[path.startsWith('corrections')?`participant:${actor}`:'p12r1:authoring']);
   const receipt=method==='GET'?null:idempotency(key,'remediation.command',{path,method,input,match});
   if(receipt){const old=(await db.query('SELECT * FROM "IdempotencyRecord" WHERE "userId"=$1 AND action=$2 AND key=$3',[actor,receipt.action,receipt.key])).rows[0];if(old){assertReplay(old.requestHash,receipt.requestHash);return JSON.parse(decrypt(old.responseEncrypted,this.auth.key));}}
   const body=path.startsWith('corrections')?await this.corrections(db,actor,path,method,input,match):await this.authoring(db,actor,path,method,input,match);
   const result={body};if(receipt){await db.query('INSERT INTO "IdempotencyRecord"("userId",action,key,"requestHash","responseEncrypted","expiresAt") VALUES($1,$2,$3,$4,$5,now()+interval \'24 hours\')',[actor,receipt.action,receipt.key,receipt.requestHash,encrypt(JSON.stringify(result),this.auth.key)]);await db.query('INSERT INTO "AuditLog"("actorId",action,"targetType","targetId","requestId","occurredAt","safeMetadata") VALUES($1,$2,\'Remediation\',$3,$4,now(),\'{}\')',[actor,`P12R1_${method}_${path.split('/').at(-1)}`,body&&typeof body==='object'&&'id' in body?String(body.id):null,randomUUID()]);}return result;
  });
 });}
 async corrections(db:PoolClient,actor:string,path:string,method:string,input:unknown,match:string|null):Promise<unknown>{
  if(path==='corrections'&&method==='GET')return (await db.query('SELECT id,"recordId",reason,status,revision,"createdAt","updatedAt","reviewedAt" FROM "CorrectionRequest" WHERE "userId"=$1 ORDER BY "createdAt" DESC LIMIT 100',[actor])).rows;
  if(path==='corrections'&&method==='POST'){
   const d=correctionInput(input),before=(await db.query(`SELECT * FROM "${recordTables[d.kind]}" WHERE id=$1 AND "userId"=$2 FOR UPDATE`,[d.targetId,actor])).rows[0];if(!before||before.deletedAt)missing();assertRevision(revision(match),before.revision);
   const profile=(await db.query('SELECT timezone FROM "Profile" WHERE "userId"=$1',[actor])).rows[0];if(!profile)missing();const at=before.occurredAt??before.endsAt??before.startsAt??before.recordedForTime??`${String(before.localDate instanceof Date?before.localDate.toISOString().slice(0,10):before.localDate)}T00:00:00Z`;
   const covering=(await db.query('SELECT e.status,e."timezoneSnapshot",p."streakRule",p."lateWindowDays",d.state FROM "Enrollment" e JOIN "PolicyVersion" p ON p.id=e."policyVersionId" JOIN "EnrollmentDay" d ON d."enrollmentId"=e.id AND d."localDate"=($2::timestamptz AT TIME ZONE e."timezoneSnapshot")::date WHERE e."userId"=$1',[actor,new Date(at).toISOString()])).rows;
   let closed=false;for(const e of covering){if(e.streakRule?.syntheticOnly!==true)blocked();const day=localDate(new Date(at),e.timezoneSnapshot),today=localDate(new Date(),e.timezoneSnapshot);if(day>today)throw new AuthError('VALIDATION_FAILED',422);if(e.status!=='ACTIVE'||e.state!=='OPEN'||(Date.parse(today)-Date.parse(day))/86400000>e.lateWindowDays)closed=true;}if(!closed)throw new AuthError('SAVE_WINDOW_OPEN',409);
   if((await db.query('SELECT id FROM "CorrectionRequest" WHERE "userId"=$1 AND "recordId"=$2 AND status=\'PENDING\'',[actor,before.recordId])).rowCount)throw new AuthError('CORRECTION_PENDING',409);
   const payload={targetKind:d.kind,targetId:d.targetId,expectedRevision:before.revision,before,proposedPatch:d.proposedPatch};
   return (await db.query('INSERT INTO "CorrectionRequest"("userId","recordId","proposedPatchEncrypted",reason,status) VALUES($1,$2,$3,$4,\'PENDING\') RETURNING id,"recordId",reason,status,revision,"createdAt"',[actor,before.recordId,encrypt(JSON.stringify(payload),this.auth.key),d.reason])).rows[0];
  }
  if(/^corrections\/[\w-]+\/cancel$/.test(path)&&method==='POST'){object(input,[]);const row=(await db.query('SELECT * FROM "CorrectionRequest" WHERE id=$1 AND "userId"=$2 FOR UPDATE',[uuid(path.split('/')[1]),actor])).rows[0];if(!row)missing();assertRevision(revision(match),row.revision);if(row.status!=='PENDING')throw new AuthError('REVISION_CONFLICT',409);return (await db.query('UPDATE "CorrectionRequest" SET status=\'CANCELLED\',revision=revision+1,"updatedAt"=now() WHERE id=$1 RETURNING id,status,revision,"updatedAt"',[row.id])).rows[0];}
  return missing();
 }
 async authoring(db:PoolClient,actor:string,path:string,method:string,input:unknown,match:string|null):Promise<unknown>{
  const p=path.split('/');if(p[1]!=='authoring')return missing();
  if(p.length===2&&method==='GET')return (await db.query('SELECT * FROM "RemediationDraft" ORDER BY "createdAt" DESC LIMIT 100')).rows;
  if(p.length===2&&method==='POST'){const d=authoringInput(input),next=(await db.query('SELECT COALESCE(MAX(version),0)+1 n FROM "RemediationDraft" WHERE kind=$1 AND code=$2',[d.kind,d.code])).rows[0].n;return (await db.query('INSERT INTO "RemediationDraft"(kind,code,version,"authorId",document,"contentHash") VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[d.kind,d.code,next,actor,JSON.stringify(d.document),digest(JSON.stringify(d.document))])).rows[0];}
  const row=(await db.query('SELECT * FROM "RemediationDraft" WHERE id=$1 FOR UPDATE',[uuid(p[2])])).rows[0];if(!row)missing();if(method==='GET'&&p.length===3)return row;assertRevision(revision(match),row.revision);
  if(method==='PATCH'&&p.length===3){if(row.authorId!==actor||row.status!=='DRAFT')throw new AuthError('FORBIDDEN',403);const d=object(input,['document']),document=documentInput(row.kind,d.document,false);return (await db.query('UPDATE "RemediationDraft" SET document=$2,"contentHash"=$3,revision=revision+1,"updatedAt"=now() WHERE id=$1 RETURNING *',[row.id,JSON.stringify(document),digest(JSON.stringify(document))])).rows[0];}
  if(method!=='POST')return missing();
  if(p[3]==='submit'){object(input,[]);if(row.authorId!==actor||row.status!=='DRAFT')throw new AuthError('FORBIDDEN',403);documentInput(row.kind,row.document,true);return this.transition(db,row.id,'IN_REVIEW');}
  if(p[3]==='review'){const d=reviewDecision(input);if(row.authorId===actor||row.status!=='IN_REVIEW'||d.contentHash!==row.contentHash)throw new AuthError('FORBIDDEN',403);if(!(await db.query('SELECT id FROM "ReviewerQualification" WHERE "reviewerId"=$1 AND scope=\'GUIDANCE\' AND status=\'ACTIVE\' AND "validUntil">now() AND "evidenceReference" LIKE \'synthetic-local:%\' AND "verifiedBy"<>"reviewerId"',[actor])).rowCount)throw new AuthError('FORBIDDEN',403);return (await db.query('UPDATE "RemediationDraft" SET status=$2,"reviewerId"=$3,"reviewReason"=$4,"reviewedAt"=now(),revision=revision+1,"updatedAt"=now() WHERE id=$1 RETURNING *',[row.id,d.decision,actor,d.reason])).rows[0];}
  if(p[0]!=='admin')throw new AuthError('FORBIDDEN',403);
  if(p[3]==='publish'){object(input,[]);if(row.status!=='APPROVED')throw new AuthError('APPROVAL_REQUIRED',409);documentInput(row.kind,row.document,true);if(!(await db.query('SELECT p12r1_valid_reviewer($1) allowed',[row.reviewerId])).rows[0].allowed)throw new AuthError('APPROVAL_REQUIRED',409);
   let id:string;if(row.kind==='RULE'){const d=row.document as RuleDocument;const c=(await db.query('SELECT id FROM "ContentRevision" WHERE id=$1 AND status=\'APPROVED\' AND "syntheticOnly"',[d.contentRevisionId])).rows[0];if(!c)throw new AuthError('APPROVAL_REQUIRED',409);id=(await db.query('INSERT INTO "AchievementRuleVersion"(code,version,type,config,"contentRevisionId",status) VALUES($1,$2,$3,$4,$5,\'PUBLISHED\') RETURNING id',[row.code,row.version,d.type,JSON.stringify(d.config),d.contentRevisionId])).rows[0].id;}else{const d=row.document as SchemaDocument;id=(await db.query('INSERT INTO "ReviewSchemaVersion"(name,version) VALUES($1,$2) RETURNING id',[row.code,row.version])).rows[0].id;for(const [order,dimension] of d.dimensions.entries()){const dim=(await db.query('INSERT INTO "ReviewDimension"("schemaId",key,label,"order") VALUES($1,$2,$3,$4) RETURNING id',[id,dimension.key,dimension.label,order])).rows[0];for(const o of dimension.options)await db.query('INSERT INTO "ReviewOption"("dimensionId",value,label) VALUES($1,$2,$3)',[dim.id,o.value,o.label]);}await db.query('UPDATE "ReviewSchemaVersion" SET status=\'PUBLISHED\',revision=revision+1 WHERE id=$1',[id]);}
   return (await db.query('UPDATE "RemediationDraft" SET status=\'PUBLISHED\',"publishedId"=$2,revision=revision+1,"updatedAt"=now() WHERE id=$1 RETURNING *',[row.id,id])).rows[0];
  }
  if(p[3]==='withdraw'){const d=object(input,['reason']);text(d.reason);if(row.status!=='PUBLISHED')throw new AuthError('REVISION_CONFLICT',409);await db.query(`UPDATE "${row.kind==='RULE'?'AchievementRuleVersion':'ReviewSchemaVersion'}" SET status='WITHDRAWN',revision=revision+1,"updatedAt"=now() WHERE id=$1`,[row.publishedId]);return (await db.query('UPDATE "RemediationDraft" SET status=\'WITHDRAWN\',"withdrawReason"=$2,revision=revision+1,"updatedAt"=now() WHERE id=$1 RETURNING *',[row.id,d.reason])).rows[0];}
  return missing();
 }
 async transition(db:PoolClient,id:string,status:string){return (await db.query('UPDATE "RemediationDraft" SET status=$2,revision=revision+1,"updatedAt"=now() WHERE id=$1 RETURNING *',[id,status])).rows[0];}
}


