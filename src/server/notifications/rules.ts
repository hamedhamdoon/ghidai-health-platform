import { AuthError } from '../auth/contracts';
import { object, timezone } from '../contracts/p2';
import { localInstant } from '../participation/rules';

export function clock(value:unknown):string {if(typeof value!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(value))throw new AuthError('VALIDATION_FAILED',422);return value;}
export function preferenceInput(input:unknown){const d=object(input,['enabledInApp','timezone','quietStart','quietEnd']);if(typeof d.enabledInApp!=='boolean')throw new AuthError('VALIDATION_FAILED',422);const quietStart=d.quietStart===null?null:clock(d.quietStart),quietEnd=d.quietEnd===null?null:clock(d.quietEnd);if((quietStart===null)!==(quietEnd===null)||quietStart!==null&&quietStart===quietEnd)throw new AuthError('VALIDATION_FAILED',422);return {enabledInApp:d.enabledInApp,timezone:timezone(d.timezone),quietStart,quietEnd};}
export function quietAt(at:Date,zone:string,start:string|null,end:string|null){if(!start||!end)return false;const time=new Intl.DateTimeFormat('en-GB',{timeZone:zone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(at);return start<end?time>=start&&time<end:time>=start||time<end;}
// Gap: first valid wall minute on this day. Fold: earlier instant once.
export function reminderInstant(day:string,time:string,zone:string):Date|null {const [h,m]=clock(time).split(':').map(Number);for(let delta=0;delta<=180;delta++){const minute=h*60+m+delta;if(minute>=1440)return null;try{return localInstant(day,`${String(Math.floor(minute/60)).padStart(2,'0')}:${String(minute%60).padStart(2,'0')}:00`,zone);}catch(e){if(!(e instanceof AuthError&&e.code==='INVALID_LOCAL_TIME'))throw e;}}return null;}
export function retryDue(now:Date,attempt:number){return new Date(now.getTime()+Math.min(900,30*2**Math.max(0,attempt-1))*1000);}
export function deliveryEligible(now:Date,expiresAt:Date,consent:boolean,sameRevision:boolean,quiet:boolean){return consent&&sameRevision&&!quiet&&now<expiresAt;}
