import nodemailer from 'nodemailer';
import type { Pool } from 'pg';
import { decrypt } from './crypto';
export async function deliverMail(pool:Pool,key:Buffer):Promise<void> {
 const transport=nodemailer.createTransport({host:'127.0.0.1',port:1025,secure:false,ignoreTLS:true,connectionTimeout:2000,greetingTimeout:2000,socketTimeout:3000,disableFileAccess:true,disableUrlAccess:true});
 const client=await pool.connect();
 try {
  await client.query('BEGIN');
  const rows=(await client.query('SELECT m.* FROM "AuthMail" m JOIN "AuthToken" t ON t.id=m."tokenId" WHERE m."sentAt" IS NULL AND m."expiresAt">now() AND t."usedAt" IS NULL ORDER BY m."createdAt" FOR UPDATE OF m SKIP LOCKED LIMIT 10')).rows;
  for(const row of rows) {
   const payload=JSON.parse(decrypt(row.payloadEncrypted,key));
   try {await transport.sendMail({from:'GHIDAI <local@ghidai.test>',to:payload.to,subject:payload.subject,text:payload.text});await client.query('UPDATE "AuthMail" SET "sentAt"=now(),attempts=attempts+1 WHERE id=$1',[row.id]);}
   catch {await client.query('UPDATE "AuthMail" SET attempts=attempts+1 WHERE id=$1',[row.id]);}
  }
  await client.query('COMMIT');
 } catch(error){await client.query('ROLLBACK');throw error;}finally{client.release();transport.close();}
}
