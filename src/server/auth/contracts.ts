import { ContractError, object, integer, timezone, date } from '../contracts/p2';
export class AuthError extends Error { constructor(public code:string,public status:number){super(code);} }
export const invalid=():never=>{throw new ContractError('VALIDATION_FAILED',422);};
export function text(value:unknown,min:number,max:number):string {if(typeof value!=='string'||value.length<min||value.length>max)return invalid();return value;}
export const password=(value:unknown)=>text(value,12,128);
export function email(value:unknown):string {const result=text(value,3,254).trim().toLowerCase(),local=result.split('@')[0];if(!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(result)||local.length>64||local.startsWith('.')||local.endsWith('.')||local.includes('..'))return invalid();return result;}
export const policy='synthetic-local-p3-v1';
export function registerInput(value:unknown){const d=object(value,['displayName','email','password','policyVersion','privacyAccepted']);if(d.policyVersion!==policy||d.privacyAccepted!==true)return invalid();return {displayName:text(d.displayName,1,80).trim()||invalid(),email:email(d.email),password:password(d.password)};}
export function profilePatch(value:unknown){const d=object(value,['displayName','timezone','locale','cupMl','preferences']);if(!Object.keys(d).length)return invalid();const out:Record<string,unknown>={};
 if(d.displayName!==undefined)out.displayName=text(d.displayName,1,80).trim()||invalid();
 if(d.timezone!==undefined)out.timezone=timezone(d.timezone);
 if(d.locale!==undefined){if(d.locale!=='ar')return invalid();out.locale=d.locale;}
 if(d.cupMl!==undefined)out.cupMl=d.cupMl===null?null:integer(d.cupMl,1,2000);
 if(d.preferences!==undefined){const p=object(d.preferences,['reducedMotion']);if(typeof p.reducedMotion!=='boolean')return invalid();out.preferences=p;}
 return out;
}
export function goalInput(value:unknown){const d=object(value,['metric','value','effectiveDate','endDate']);if(!['WATER_ML','STEPS','EXERCISE_MIN','SLEEP_MIN'].includes(String(d.metric)))return invalid();return {metric:String(d.metric),value:integer(d.value,1,d.metric==='STEPS'?200000:d.metric==='WATER_ML'?20000:1440),effectiveDate:date(d.effectiveDate),endDate:d.endDate===null||d.endDate===undefined?null:date(d.endDate)};}
export function goalPatch(value:unknown,previous:Record<string,unknown>){const d=object(value,['metric','value','effectiveDate','endDate']);if(!Object.keys(d).length)return invalid();return goalInput({...previous,...d});}
