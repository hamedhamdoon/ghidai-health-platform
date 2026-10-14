import {object,uuid,instant,ContractError} from '../contracts/p2';
export const resources=['Progress','WaterLog','StepDayLog','ExerciseLog','SleepLog','CoachNote'] as const;
export function assignmentInput(value:unknown,now=Date.now()){
 const d=object(value,['coachId','resources','expiresAt','accepted']);
 if(d.accepted!==true||!Array.isArray(d.resources)||!d.resources.length||d.resources.length>resources.length||d.resources.some(r=>!resources.includes(r))||new Set(d.resources).size!==d.resources.length)throw new ContractError('VALIDATION_FAILED',422);
 const expiresAt=instant(d.expiresAt);if(Date.parse(expiresAt)<=now||Date.parse(expiresAt)>now+86400000)throw new ContractError('VALIDATION_FAILED',422);
 return {coachId:uuid(d.coachId),resources:d.resources as string[],expiresAt};
}
export function userInput(value:unknown){const d=object(value,['role','status','reason']);if(!['USER','COACH','ADMIN'].includes(String(d.role))||!['ACTIVE','SUSPENDED'].includes(String(d.status))||typeof d.reason!=='string'||!d.reason.trim()||d.reason.length>500)throw new ContractError('VALIDATION_FAILED',422);return {role:d.role,status:d.status,reason:d.reason.trim()};}
export function noteInput(value:unknown){const d=object(value,['text']);if(typeof d.text!=='string'||!d.text.trim()||d.text.length>2000)throw new ContractError('VALIDATION_FAILED',422);return d.text.trim();}
