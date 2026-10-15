/** Provider-neutral contract only: validation does not enable a production adapter. */
export type OperationEnvironment = 'development' | 'test' | 'production';
type Environment = Record<string, string | undefined>;
function reject(): never { throw new Error('GHIDAI_CONFIGURATION_REJECTED'); }
export function operationEnvironment(env: Environment = process.env): OperationEnvironment {
 const value=env.GHIDAI_RUNTIME_ENV??env.GHIDAI_AUTH_ENV??'development';
 if(!['development','test','production'].includes(value))return reject();
 if(env.GHIDAI_AUTH_ENV&&env.GHIDAI_AUTH_ENV!==value)return reject();
 return value as OperationEnvironment;
}
export function assertLocalRuntime(env: Environment = process.env): void {
 if(operationEnvironment(env)==='production')throw new Error('PRODUCTION_ADAPTER_NOT_ENABLED');
}
export function validateProductionContract(env: Environment) {
 if(env.GHIDAI_RUNTIME_ENV!=='production'||env.NODE_ENV!=='production')return reject();
 let origin:URL,app:URL,auth:URL;
 try {origin=new URL(env.GHIDAI_TRUSTED_ORIGIN??'');app=new URL(env.GHIDAI_APP_DATABASE_URL??'');auth=new URL(env.GHIDAI_AUTH_DATABASE_URL??'');}catch{return reject();}
 if(origin.protocol!=='https:'||origin.origin!==env.GHIDAI_TRUSTED_ORIGIN||origin.username||origin.password||['localhost','127.0.0.1','[::1]'].includes(origin.hostname))return reject();
 for(const [url,role] of [[app,'ghidai_app'],[auth,'ghidai_auth']] as const){
  if(url.protocol!=='postgresql:'||url.username!==role||!url.password||url.pathname==='/'||!url.hostname||['localhost','127.0.0.1','[::1]'].includes(url.hostname)||url.hash)return reject();
  if(url.searchParams.getAll('sslmode').length!==1||url.searchParams.get('sslmode')!=='verify-full'||[...url.searchParams.keys()].some(key=>key!=='sslmode'))return reject();
 }
 if(app.host!==auth.host||app.pathname!==auth.pathname)return reject();
 if(!/^[a-f0-9]{64}$/.test(env.GHIDAI_DATA_KEY??'')||new Set(env.GHIDAI_DATA_KEY).size<8)return reject();
 if(!/^[A-Za-z0-9_-]{1,64}$/.test(env.GHIDAI_DATA_KEY_ID??''))return reject();
 // A deployment must implement certificate verification, scoped roles and secret rotation;
 // no credentials are returned so accidental serialization cannot disclose them.
 return Object.freeze({environment:'production' as const,origin:origin.origin,secureCookies:true as const,keyId:env.GHIDAI_DATA_KEY_ID});
}
