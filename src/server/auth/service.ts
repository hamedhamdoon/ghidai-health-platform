import { randomBytes, randomUUID } from 'node:crypto';
import type { Pool, PoolClient } from 'pg';
import { withActor, type VerifiedActor } from '../db/context';
import { object, revision, uuid } from '../contracts/p2';
import { AuthError, text, password, email, registerInput, profilePatch, goalInput, goalPatch, policy, invalid } from './contracts';
import { opaque, digest, sign, passwordHash, passwordMatches, encrypt, decrypt, base32, matchTotp } from './crypto';
import type { PrismaClient } from '../../generated/prisma/client';

type SessionActor={actor:VerifiedActor;sessionId:string;reauthenticatedAt:Date|null;mfaVerifiedAt:Date|null};
type Output={status?:number;body?:unknown;session?:string;preauth?:string;clear?:boolean};
export class AuthService {
 constructor(readonly auth:Pool,readonly app:Pool,readonly key:Buffer,readonly prisma:PrismaClient){}
 async profile(actor:VerifiedActor){return this.prisma.$transaction(async tx=>{const roles=await tx.$queryRaw<{name:string;rolsuper:boolean;rolbypassrls:boolean}[]>`SELECT current_user AS name,rolsuper,rolbypassrls FROM pg_roles WHERE rolname=current_user`;if(roles[0].name!=='ghidai_app'||roles[0].rolsuper||roles[0].rolbypassrls)throw new Error('APP_ROLE_REQUIRED');await tx.$executeRaw`SELECT set_config('app.user_id',${actor.id},true)`;return tx.profile.findUnique({where:{userId:actor.id},select:{displayName:true,timezone:true,locale:true,cupMl:true,preferences:true,revision:true}});});}
 async transaction<T>(work:(c:PoolClient)=>Promise<T>):Promise<T>{const c=await this.auth.connect();try{await c.query('BEGIN');const result=await work(c);await c.query('COMMIT');return result;}catch(e){await c.query('ROLLBACK');throw e;}finally{c.release();}}
 async audit(c:PoolClient,userId:string,action:string){await c.query('INSERT INTO "AuditLog"("actorId",action,"targetType","targetId","requestId","occurredAt") VALUES($1,$2,\'User\',$1,$3,now())',[userId,action,randomUUID()]);}
 async rate(key:string,limit=5){const window=new Date(Math.floor(Date.now()/900000)*900000);const r=await this.auth.query('INSERT INTO "RateLimitBucket"("keyHash","window",count,"expiresAt") VALUES($1,$2,1,$2::timestamptz+interval \'15 minutes\') ON CONFLICT("keyHash","window") DO UPDATE SET count="RateLimitBucket".count+1 RETURNING count',[digest(sign(this.key,key)),window]);if(r.rows[0].count>limit)throw new AuthError('RATE_LIMITED',429);}
 async queue(c:PoolClient,userId:string,kind:string,to:string,origin:string){const token=opaque();const minutes=kind==='RESET'?15:1440;
  await c.query('UPDATE "AuthToken" SET "usedAt"=now() WHERE "userId"=$1 AND kind=$2 AND "usedAt" IS NULL',[userId,kind]);
  const tokenId=(await c.query('INSERT INTO "AuthToken"("userId",kind,"tokenHash","expiresAt","candidateEmail") VALUES($1,$2,$3,now()+$4*interval \'1 minute\',$5) RETURNING id',[userId,kind,digest(token),minutes,kind==='EMAIL_CHANGE'?to:null])).rows[0].id;
  const path=kind==='RESET'?'reset-password':'verify';
  const payload=encrypt(JSON.stringify({to,subject:kind==='RESET'?'GHIDAI — استعادة كلمة المرور':'GHIDAI — تحقق من البريد',text:`اختبار محلي ببيانات اصطناعية فقط.\n${origin}/${path}#token=${token}&kind=${kind}`}),this.key);
  await c.query('INSERT INTO "AuthMail"("userId","tokenId","payloadEncrypted","expiresAt") VALUES($1,$2,$3,now()+$4*interval \'1 minute\')',[userId,tokenId,payload,minutes]);
 }
 async lockUser(c:PoolClient,userId:string){return (await c.query('SELECT * FROM "User" WHERE id=$1 FOR NO KEY UPDATE',[userId])).rows[0];}
 async session(c:PoolClient,userId:string,mfa=false):Promise<string>{const token=opaque();await c.query('INSERT INTO "Session"("userId","tokenHash","expiresAt","lastSeenAt","mfaVerifiedAt") VALUES($1,$2,now()+interval \'7 days\',now(),CASE WHEN $3 THEN now() ELSE NULL END)',[userId,digest(token),mfa]);return token;}
 async resolve(c:PoolClient,token:string):Promise<SessionActor>{const found=(await c.query('SELECT "userId" FROM "Session" WHERE "tokenHash"=$1',[digest(token)])).rows[0];if(!found)throw new AuthError('UNAUTHENTICATED',401);
  const user=await this.lockUser(c,found.userId);if(user.status!=='ACTIVE')throw new AuthError('UNAUTHENTICATED',401);
  const s=(await c.query('UPDATE "Session" SET "lastSeenAt"=now() WHERE "tokenHash"=$1 AND "revokedAt" IS NULL AND "expiresAt">now() AND "lastSeenAt">now()-interval \'24 hours\' RETURNING *',[digest(token)])).rows[0];if(!s)throw new AuthError('UNAUTHENTICATED',401);
  return {actor:{id:s.userId} as VerifiedActor,sessionId:s.id,reauthenticatedAt:s.reauthenticatedAt,mfaVerifiedAt:s.mfaVerifiedAt};
 }
 fresh(actor:SessionActor){if(!actor.reauthenticatedAt||Date.now()-actor.reauthenticatedAt.getTime()>600000)throw new AuthError('REAUTH_REQUIRED',403);}
 async mfa(c:PoolClient,userId:string,code:unknown,recovery:unknown):Promise<boolean>{
  const m=(await c.query('SELECT * FROM "MfaCredential" WHERE "userId"=$1 AND "enabledAt" IS NOT NULL FOR UPDATE',[userId])).rows[0];if(!m)return false;
  if(typeof recovery==='string'&&code===undefined){const hashes=m.recoveryHashes as string[],hash=digest(recovery);if(!hashes.includes(hash))return false;await c.query('UPDATE "MfaCredential" SET "recoveryHashes"=$2 WHERE id=$1',[m.id,JSON.stringify(hashes.filter(h=>h!==hash))]);await this.audit(c,userId,'MFA_RECOVERY_USED');return true;}
  if(typeof code!=='string'||recovery!==undefined)return false;const step=matchTotp(Buffer.from(decrypt(m.secretEncrypted,this.key),'hex'),code,Number(m.lastStep));if(step===null)return false;
  await c.query('UPDATE "MfaCredential" SET "lastStep"=$2 WHERE id=$1',[m.id,step]);return true;
 }
 async execute(path:string,method:string,input:unknown,sessionToken:string,preauthToken:string,origin:string,ifMatch:string|null):Promise<Output>{
  if(path==='auth/register'&&method==='POST'){
   const d=registerInput(input);await this.rate(`register:${d.email}`);const hash=await passwordHash(d.password);
   await this.transaction(async c=>{const user=(await c.query('INSERT INTO "User"("emailNormalized","passwordHash",status) VALUES($1,$2,\'PENDING\') ON CONFLICT("emailNormalized") DO NOTHING RETURNING id',[d.email,hash])).rows[0];if(!user)return;
    await c.query('INSERT INTO "Profile"("userId","displayName",timezone,locale) VALUES($1,$2,\'Asia/Muscat\',\'ar\')',[user.id,d.displayName]);
    await c.query('INSERT INTO "Consent"("userId",kind,"policyVersion","scopeKey",scope,"grantedAt","expiresAt") VALUES($1,\'PRIVACY\',$2,\'local\',\'{"localSynthetic":true}\',now(),now()+interval \'30 days\')',[user.id,policy]);
    await this.queue(c,user.id,'VERIFY',d.email,origin);await this.audit(c,user.id,'REGISTER');});return {status:202,body:{message:'إذا قُبل الطلب ستصلك رسالة إلى البريد المحلي.'}};
  }
  if(['auth/password/forgot','auth/verify/resend'].includes(path)&&method==='POST'){
   const d=object(input,['email']),address=email(d.email);await this.rate(`mail:${address}`);
   await this.transaction(async c=>{const u=(await c.query('SELECT * FROM "User" WHERE "emailNormalized"=$1 FOR UPDATE',[address])).rows[0];if(u&&((path.endsWith('forgot')&&u.status==='ACTIVE')||(path.endsWith('resend')&&u.status==='PENDING')))await this.queue(c,u.id,path.endsWith('forgot')?'RESET':'VERIFY',address,origin);});return {status:202,body:{message:'إذا قُبل الطلب ستصلك رسالة إلى البريد المحلي.'}};
  }
  if(['auth/verify','auth/password/reset','auth/email/confirm'].includes(path)&&method==='POST'){
   const reset=path.endsWith('reset'),d=object(input,reset?['token','newPassword']:['token']),token=text(d.token,40,128),kind=reset?'RESET':path==='auth/email/confirm'?'EMAIL_CHANGE':'VERIFY';
   const hash=reset?await passwordHash(password(d.newPassword)):null;
   return this.transaction(async c=>{const found=(await c.query('SELECT "userId" FROM "AuthToken" WHERE "tokenHash"=$1',[digest(token)])).rows[0];if(!found)throw new AuthError('TOKEN_INVALID',400);const user=await this.lockUser(c,found.userId);
    const t=(await c.query('UPDATE "AuthToken" SET "usedAt"=now() WHERE "tokenHash"=$1 AND kind=$2 AND "usedAt" IS NULL AND "expiresAt">now() RETURNING *',[digest(token),kind])).rows[0];if(!t||!['PENDING','ACTIVE'].includes(user.status))throw new AuthError('TOKEN_INVALID',400);
    if(reset){await c.query('UPDATE "User" SET "passwordHash"=$2 WHERE id=$1',[user.id,hash]);}
    else if(kind==='EMAIL_CHANGE'){await c.query('UPDATE "User" SET "emailNormalized"=$2,"verifiedAt"=now() WHERE id=$1',[user.id,t.candidateEmail]);}
    else {await c.query('UPDATE "User" SET status=\'ACTIVE\',"verifiedAt"=now() WHERE id=$1',[user.id]);}
    if(reset||kind==='EMAIL_CHANGE'){await c.query('UPDATE "Session" SET "revokedAt"=now() WHERE "userId"=$1 AND "revokedAt" IS NULL',[user.id]);await c.query('UPDATE "AuthChallenge" SET "usedAt"=now() WHERE "userId"=$1',[user.id]);await c.query('UPDATE "AuthToken" SET "usedAt"=now() WHERE "userId"=$1 AND "usedAt" IS NULL',[user.id]);}
    await this.audit(c,user.id,kind);return {body:{message:'تم الحفظ. يمكنك تسجيل الدخول.'},clear:reset||kind==='EMAIL_CHANGE'};});
  }
  if(path==='auth/login'&&method==='POST'){
   const d=object(input,['email','password']),address=email(d.email),pw=password(d.password);await this.rate(`login:${address}`);
   const dummy=await passwordHash('synthetic-dummy-password');
   const result=await this.transaction(async c=>{const user=(await c.query('SELECT * FROM "User" WHERE "emailNormalized"=$1 FOR UPDATE',[address])).rows[0];const valid=await passwordMatches(user?.passwordHash??dummy,pw);if(!user||!valid||user.status!=='ACTIVE')return new AuthError('CREDENTIALS_INVALID',401);
    const m=(await c.query('SELECT id FROM "MfaCredential" WHERE "userId"=$1 AND "enabledAt" IS NOT NULL',[user.id])).rows[0];
    if(m){const token=opaque();await c.query('UPDATE "AuthChallenge" SET "usedAt"=now() WHERE "userId"=$1 AND "usedAt" IS NULL',[user.id]);await c.query('INSERT INTO "AuthChallenge"("userId","tokenHash","expiresAt") VALUES($1,$2,now()+interval \'5 minutes\')',[user.id,digest(token)]);return {preauth:token,body:{needsMfa:true}};}
    await this.audit(c,user.id,'LOGIN');return {session:await this.session(c,user.id),body:{needsMfa:false}};});if(result instanceof AuthError)throw result;return result;
  }
  if(path==='auth/mfa/challenge'&&method==='POST'){
   const d=object(input,['code','recoveryCode']);await this.rate(`challenge:${digest(preauthToken)}`);
   const result=await this.transaction(async c=>{const found=(await c.query('SELECT "userId" FROM "AuthChallenge" WHERE "tokenHash"=$1',[digest(preauthToken)])).rows[0];if(!found)return new AuthError('MFA_INVALID',401);const user=await this.lockUser(c,found.userId);
    const challenge=(await c.query('UPDATE "AuthChallenge" SET attempts=attempts+1 WHERE "tokenHash"=$1 AND "usedAt" IS NULL AND "expiresAt">now() AND attempts<5 RETURNING *',[digest(preauthToken)])).rows[0];if(!challenge||user.status!=='ACTIVE'||!await this.mfa(c,user.id,d.code,d.recoveryCode))return new AuthError('MFA_INVALID',401);
    await c.query('UPDATE "AuthChallenge" SET "usedAt"=now() WHERE id=$1',[challenge.id]);await this.audit(c,user.id,'MFA_LOGIN');return {session:await this.session(c,user.id,true),body:{needsMfa:false}};});if(result instanceof AuthError)throw result;return result;
  }
  return this.transaction(async c=>{
   const actor=await this.resolve(c,sessionToken),id=actor.actor.id;
   if(path==='auth/logout'&&method==='POST'){object(input,[]);await c.query('UPDATE "Session" SET "revokedAt"=now() WHERE id=$1',[actor.sessionId]);await this.audit(c,id,'LOGOUT');return {status:204,clear:true};}
   if(path==='auth/reauth'&&method==='POST'){
    const d=object(input,['password','totp','recoveryCode']);await this.rate(`reauth:${id}`);const u=await this.lockUser(c,id),m=(await c.query('SELECT id FROM "MfaCredential" WHERE "userId"=$1 AND "enabledAt" IS NOT NULL',[id])).rows[0];
    if(!await passwordMatches(u.passwordHash,password(d.password))||(m&&!await this.mfa(c,id,d.totp,d.recoveryCode)))throw new AuthError('CREDENTIALS_INVALID',401);
    await c.query('UPDATE "Session" SET "reauthenticatedAt"=now(),"mfaVerifiedAt"=CASE WHEN $2 THEN now() ELSE "mfaVerifiedAt" END WHERE id=$1',[actor.sessionId,!!m]);await this.audit(c,id,'REAUTH');return {body:{message:'تم تأكيد الهوية.'}};
   }
   if(path==='me/password'&&method==='PUT'){
    this.fresh(actor);const d=object(input,['currentPassword','newPassword']),u=await this.lockUser(c,id);if(!await passwordMatches(u.passwordHash,password(d.currentPassword)))throw new AuthError('CREDENTIALS_INVALID',401);
    await c.query('UPDATE "User" SET "passwordHash"=$2 WHERE id=$1',[id,await passwordHash(password(d.newPassword))]);await c.query('UPDATE "Session" SET "revokedAt"=now() WHERE "userId"=$1',[id]);await c.query('UPDATE "AuthChallenge" SET "usedAt"=now() WHERE "userId"=$1',[id]);await c.query('UPDATE "AuthToken" SET "usedAt"=now() WHERE "userId"=$1 AND "usedAt" IS NULL',[id]);await this.audit(c,id,'PASSWORD_CHANGED');return {session:await this.session(c,id,!!actor.mfaVerifiedAt),body:{message:'تم تغيير كلمة المرور وإبطال الجلسات الأخرى.'}};
   }
   if(path==='auth/email/change'&&method==='POST'){this.fresh(actor);const d=object(input,['email']),address=email(d.email);await this.rate(`emailchange:${id}`);await this.queue(c,id,'EMAIL_CHANGE',address,origin);await this.audit(c,id,'EMAIL_CHANGE_REQUEST');return {status:202,body:{message:'تحقق من البريد الجديد. يبقى البريد الحالي حتى التأكيد.'}};}
   if(path==='me/sessions'&&method==='GET'){const rows=(await c.query('SELECT id,"lastSeenAt","expiresAt",revision,(id=$2) AS current FROM "Session" WHERE "userId"=$1 AND "revokedAt" IS NULL',[id,actor.sessionId])).rows;return {body:rows};}
   if((path==='me/sessions/revoke-all'&&method==='POST')||(path.startsWith('me/sessions/')&&method==='DELETE')){this.fresh(actor);object(input,[]);const target=path.endsWith('revoke-all')?null:uuid(path.split('/')[2]);const result=await c.query('UPDATE "Session" SET "revokedAt"=now() WHERE "userId"=$1 AND "revokedAt" IS NULL AND ($2::uuid IS NULL OR id=$2)',[id,target]);if(!result.rowCount)throw new AuthError('NOT_FOUND',404);await this.audit(c,id,'SESSION_REVOKED');return {status:204,clear:!target||target===actor.sessionId};}
   if(path==='auth/mfa/setup'&&method==='POST'){this.fresh(actor);const d=object(input,['password']),u=await this.lockUser(c,id);if(!await passwordMatches(u.passwordHash,password(d.password)))throw new AuthError('CREDENTIALS_INVALID',401);if((await c.query('SELECT id FROM "MfaCredential" WHERE "userId"=$1 AND "enabledAt" IS NOT NULL',[id])).rowCount)throw new AuthError('MFA_ALREADY_ENABLED',409);
    const secret=randomBytes(20);await c.query('INSERT INTO "MfaCredential"("userId","secretEncrypted","recoveryHashes","setupExpiresAt") VALUES($1,$2,\'[]\',now()+interval \'10 minutes\') ON CONFLICT("userId") DO UPDATE SET "secretEncrypted"=EXCLUDED."secretEncrypted","setupExpiresAt"=EXCLUDED."setupExpiresAt","lastStep"=-1',[id,encrypt(secret.toString('hex'),this.key)]);return {body:{secret:base32(secret),uri:`otpauth://totp/GHIDAI:${encodeURIComponent(u.emailNormalized)}?secret=${base32(secret)}&issuer=GHIDAI&algorithm=SHA1&digits=6&period=30`}};
   }
   if(path==='auth/mfa/confirm'&&method==='POST'){this.fresh(actor);const d=object(input,['code']),m=(await c.query('SELECT * FROM "MfaCredential" WHERE "userId"=$1 AND "enabledAt" IS NULL AND "setupExpiresAt">now() FOR UPDATE',[id])).rows[0];if(!m)throw new AuthError('MFA_INVALID',400);const step=matchTotp(Buffer.from(decrypt(m.secretEncrypted,this.key),'hex'),text(d.code,6,6),-1);if(step===null)throw new AuthError('MFA_INVALID',400);
    const codes=Array.from({length:10},()=>randomBytes(16).toString('hex'));await c.query('UPDATE "MfaCredential" SET "enabledAt"=now(),"lastStep"=$2,"recoveryHashes"=$3 WHERE id=$1',[m.id,step,JSON.stringify(codes.map(digest))]);await c.query('UPDATE "Session" SET "revokedAt"=now() WHERE "userId"=$1 AND id<>$2',[id,actor.sessionId]);await c.query('UPDATE "Session" SET "mfaVerifiedAt"=now() WHERE id=$1',[actor.sessionId]);await this.audit(c,id,'MFA_ENABLED');return {body:{recoveryCodes:codes}};
   }
   if(path==='auth/mfa'&&method==='DELETE'){this.fresh(actor);object(input,[]);if(!actor.mfaVerifiedAt||Date.now()-actor.mfaVerifiedAt.getTime()>600000)throw new AuthError('REAUTH_REQUIRED',403);await c.query('DELETE FROM "MfaCredential" WHERE "userId"=$1',[id]);await c.query('UPDATE "AuthChallenge" SET "usedAt"=now() WHERE "userId"=$1',[id]);await c.query('UPDATE "Session" SET "revokedAt"=now() WHERE "userId"=$1 AND id<>$2',[id,actor.sessionId]);await this.audit(c,id,'MFA_DISABLED');return {status:204};}
   return withActor(this.app,actor.actor,async db=>{
    if(path==='me'&&method==='GET'){const u=(await db.query('SELECT role,status,"emailNormalized" FROM "User" WHERE id=$1',[id])).rows[0],profile=await this.profile(actor.actor);return {body:{...u,profile,mfaEnabled:!!(await c.query('SELECT id FROM "MfaCredential" WHERE "userId"=$1 AND "enabledAt" IS NOT NULL',[id])).rowCount}};}
    if(path==='me/profile'&&method==='PATCH'){const expected=revision(ifMatch),d=profilePatch(input),keys=Object.keys(d),values=keys.map(k=>k==='preferences'?JSON.stringify(d[k]):d[k]);const result=await db.query(`UPDATE "Profile" SET ${keys.map((k,i)=>`"${k}"=$${i+3}`).join(',')},revision=revision+1,"updatedAt"=now() WHERE "userId"=$1 AND revision=$2 RETURNING "displayName",timezone,locale,"cupMl",preferences,revision`,[id,expected,...values]);if(!result.rowCount)throw new AuthError('REVISION_CONFLICT',409);return {body:result.rows[0]};}
    if(path==='me/goals'&&method==='GET')return {body:(await db.query('SELECT id,metric,value,"effectiveDate"::text,"endDate"::text,revision FROM "UserGoal" WHERE "userId"=$1 ORDER BY "effectiveDate"',[id])).rows};
    if((path==='me/goals'&&method==='POST')||(path.startsWith('me/goals/')&&method==='PATCH')){
     const target=method==='PATCH'?uuid(path.split('/')[2]):null;
     const previous=target?(await db.query('SELECT metric,value::text,"effectiveDate"::text,"endDate"::text,revision FROM "UserGoal" WHERE "userId"=$1 AND id=$2 FOR UPDATE',[id,target])).rows[0]:null;
     if(target&&!previous)throw new AuthError('NOT_FOUND',404);
     const d=method==='PATCH'?goalPatch(input,{metric:previous.metric,value:Number(previous.value),effectiveDate:previous.effectiveDate,endDate:previous.endDate}):goalInput(input);const today=(await db.query('SELECT (now() AT TIME ZONE timezone)::date::text AS day FROM "Profile" WHERE "userId"=$1',[id])).rows[0].day;if(d.effectiveDate<=today||d.endDate&&d.endDate<d.effectiveDate)return invalid();
     if(method==='POST'){const row=(await db.query('INSERT INTO "UserGoal"("userId",metric,value,"effectiveDate","endDate") VALUES($1,$2,$3,$4,$5) RETURNING id,metric,value,"effectiveDate"::text,"endDate"::text,revision',[id,d.metric,d.value,d.effectiveDate,d.endDate])).rows[0];return {status:201,body:row};}
     const expected=revision(ifMatch),row=(await db.query('UPDATE "UserGoal" SET metric=$4,value=$5,"effectiveDate"=$6,"endDate"=$7,revision=revision+1 WHERE "userId"=$1 AND id=$2 AND revision=$3 AND "effectiveDate">$8::date RETURNING id,metric,value,"effectiveDate"::text,"endDate"::text,revision',[id,target,expected,d.metric,d.value,d.effectiveDate,d.endDate,today])).rows[0];if(!row)throw new AuthError('REVISION_CONFLICT',409);return {body:row};
    }
    if(path.startsWith('me/goals/')&&method==='DELETE'){const target=uuid(path.split('/')[2]),expected=revision(ifMatch);if(!(await db.query('SELECT id FROM "UserGoal" WHERE "userId"=$1 AND id=$2',[id,target])).rowCount)throw new AuthError('NOT_FOUND',404);const result=await db.query('DELETE FROM "UserGoal" WHERE "userId"=$1 AND id=$2 AND revision=$3 AND "effectiveDate">(SELECT (now() AT TIME ZONE timezone)::date FROM "Profile" WHERE "userId"=$1)',[id,target,expected]);if(!result.rowCount)throw new AuthError('REVISION_CONFLICT',409);return {status:204};}
    if(path==='me/consents'&&method==='GET')return {body:(await db.query('SELECT id,kind,"policyVersion","scopeKey",scope,"grantedAt","expiresAt","revokedAt",revision FROM "Consent" WHERE "userId"=$1 ORDER BY "grantedAt" DESC',[id])).rows};
    if(path==='me/consents'&&method==='POST'){const d=object(input,['kind','policyVersion','scope']);if(!['PRIVACY','NOTIFICATIONS'].includes(String(d.kind))||d.policyVersion!==policy)return invalid();const scope=object(d.scope,['localSynthetic']);if(scope.localSynthetic!==true)return invalid();const row=(await db.query('INSERT INTO "Consent"("userId",kind,"policyVersion","scopeKey",scope,"grantedAt","expiresAt") VALUES($1,$2,$3,\'local\',$4,now(),now()+interval \'30 days\') RETURNING id,kind,revision',[id,d.kind,policy,JSON.stringify(scope)])).rows[0];return {status:201,body:row};}
    if(path.startsWith('me/consents/')&&method==='DELETE'){const target=uuid(path.split('/')[2]),expected=revision(ifMatch);object(input,[]);if(!(await db.query('SELECT id FROM "Consent" WHERE "userId"=$1 AND id=$2',[id,target])).rowCount)throw new AuthError('NOT_FOUND',404);const result=await db.query('UPDATE "Consent" SET "revokedAt"=now(),revision=revision+1 WHERE "userId"=$1 AND id=$2 AND revision=$3 AND "revokedAt" IS NULL',[id,target,expected]);if(!result.rowCount)throw new AuthError('REVISION_CONFLICT',409);return {status:204};}
    throw new AuthError('NOT_FOUND',404);
   });
  });
 }
}
