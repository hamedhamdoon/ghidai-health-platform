import { config } from 'dotenv';
import { Pool } from 'pg';
import { assertLocalAppDatabase } from '../db/local-database';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../../generated/prisma/client';
export function localAuthConfig() {
 if(process.env.GHIDAI_AUTH_ENV&&!['development','test'].includes(process.env.GHIDAI_AUTH_ENV))throw new Error('LOCAL_AUTH_ENV_REQUIRED');
 const environment=process.env.GHIDAI_AUTH_ENV==='test'?'test':'development';
 const secrets=config({path:`.env.p3.${environment}.local`,quiet:true}).parsed;
 const app=config({path:`.env.p2.${environment}.local`,quiet:true}).parsed;
 if(secrets?.P3_LOCAL_ONLY!=='true'||!/^[a-f0-9]{64}$/.test(secrets.P3_KEY)||!app)throw new Error('LOCAL_AUTH_REQUIRED');
 const url=new URL(secrets.P3_AUTH_DATABASE_URL);if(url.username!=='ghidai_auth')throw new Error('AUTH_ROLE_REQUIRED');
 const checked=new URL(url);checked.username='ghidai_app';assertLocalAppDatabase(checked.toString(),environment);
 const appUrl=assertLocalAppDatabase(app.P2_APP_DATABASE_URL,environment);
 const schema=environment==='test'?secrets.P3_TEST_SCHEMA??'public':'public';
 if(schema!=='public'&&!/^p3_test_\d+$/.test(schema))throw new Error('TEST_SCHEMA_REJECTED');
 return {environment,key:Buffer.from(secrets.P3_KEY,'hex'),authUrl:url.toString(),appUrl,schema};
}
let pools: {auth:Pool;app:Pool;key:Buffer;prisma:PrismaClient}|undefined;
export function authRuntime() {
 if(!pools){
  const c=localAuthConfig(),options=`-c search_path=${c.schema},public`;
  const timeouts={connectionTimeoutMillis:3000,query_timeout:5000,statement_timeout:5000,idle_in_transaction_session_timeout:15000};
  const connectionError=()=>console.error('GHIDAI_DATABASE_CONNECTION_UNAVAILABLE');
  const auth=new Pool({connectionString:c.authUrl,options,max:4,...timeouts}),app=new Pool({connectionString:c.appUrl,options,max:4,...timeouts});
  auth.on('error',connectionError);app.on('error',connectionError);
  pools={key:c.key,auth,app,prisma:new PrismaClient({adapter:new PrismaPg({connectionString:c.appUrl,options,max:2,...timeouts},{schema:c.schema,onPoolError:connectionError})})};
 }
 return pools;
}
