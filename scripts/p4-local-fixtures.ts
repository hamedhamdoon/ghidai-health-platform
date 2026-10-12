import {randomUUID,randomBytes} from 'node:crypto';
import {writeFileSync,existsSync} from 'node:fs';
import {localPool} from './p2-database';
import {passwordHash} from '../src/server/auth/crypto';
const environment=process.argv[2];if(environment!=='development')throw new Error('DEVELOPMENT_FIXTURES_ONLY');
const path=`.env.p4.fixtures-${Date.now()}.local`;if(existsSync(path))throw new Error('REFUSE_SECRET_OVERWRITE');
const {pool}=await localPool('development');const users=[];
try {
 const client=await pool.connect();try{await client.query('BEGIN');for(const [role,displayName] of [['ADMIN','مدير اصطناعي مؤقت'],['COACH','مراجع اصطناعي مستقل']]){const id=randomUUID(),email=`p4-${id}@ghidai.test`,password=randomBytes(24).toString('base64url');await client.query('INSERT INTO "User"(id,"emailNormalized","passwordHash",role,status,"verifiedAt") VALUES($1,$2,$3,$4,\'ACTIVE\',now())',[id,email,await passwordHash(password),role]);await client.query('INSERT INTO "Profile"("userId","displayName",timezone,locale) VALUES($1,$2,\'Asia/Muscat\',\'ar\')',[id,displayName]);await client.query('INSERT INTO "P4LocalCapability"("userId","expiresAt",purpose) VALUES($1,now()+interval \'2 hours\',\'SYNTHETIC_LOCAL_ONLY\')',[id]);users.push({id,role,email,password});await client.query('INSERT INTO "AuditLog"("actorId",action,"targetType","targetId","requestId","occurredAt",reason,"safeMetadata") VALUES($1,\'P4_SYNTHETIC_FIXTURE\',\'User\',$1,$2,now(),\'Local-only capability expires in two hours; not production bootstrap\',\'{"syntheticOnly":true}\')',[id,randomUUID()]);}
  for(const scope of ['GUIDANCE','MEAL','MOTIVATION','CLAIM'])await client.query('INSERT INTO "ReviewerQualification"("reviewerId",scope,"evidenceReference","verifiedBy","validUntil",status) VALUES($1,$2,\'synthetic-local:manual-review-test-only\',$3,now()+interval \'2 hours\',\'ACTIVE\')',[users[1].id,scope,users[0].id]);
  await client.query('INSERT INTO "PolicyVersion"(version,"lateWindowDays","dayBoundary","streakRule","certificateThreshold") SELECT coalesce(max(version),0)+1,0,\'00:00\',\'{"syntheticOnly":true,"disabledAwards":true}\',0 FROM "PolicyVersion"');await client.query('INSERT INTO "ReviewSchemaVersion"(version,name) VALUES(1,$1)',[`synthetic-local-p4-${Date.now()}`]);
  writeFileSync(path,JSON.stringify({purpose:'SYNTHETIC_LOCAL_ONLY',expiresAt:new Date(Date.now()+7200000).toISOString(),users},null,2),{flag:'wx'});await client.query('COMMIT');console.log(`PASS temporary local fixtures. Credentials saved only in ignored ${path}; enable MFA through P3 UI before publishing. No production privileges.`);
 }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}finally{await pool.end();}
