import { createHash } from 'node:crypto';

export class ContractError extends Error {
  constructor(public readonly code: 'VALIDATION_FAILED'|'PRECONDITION_REQUIRED'|'REVISION_CONFLICT'|'NOT_FOUND'|'IDEMPOTENCY_CONFLICT', public readonly status: number) { super(code); }
}
const fail = (): never => { throw new ContractError('VALIDATION_FAILED',422); };
export function object(value: unknown, keys: readonly string[]): Record<string,unknown> {
  if (!value || typeof value!=='object' || Array.isArray(value) || Object.getPrototypeOf(value)!==Object.prototype) return fail();
  const data=value as Record<string,unknown>;
  if(Object.keys(data).some(key=>!keys.includes(key))) return fail();
  return data;
}
export function integer(value:unknown,min:number,max:number):number {
  if(typeof value!=='number'||!Number.isSafeInteger(value)||value<min||value>max) return fail(); return value;
}
export function uuid(value:unknown):string {
  if(typeof value!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) return fail(); return value;
}
export function instant(value:unknown):string {
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/.test(value)||!Number.isFinite(Date.parse(value))) return fail();
  if(Number(value.slice(11,13))>23||Number(value.slice(14,16))>59||Number(value.slice(17,19))>59)return fail();
  date(value.slice(0,10)); return new Date(value).toISOString();
}
export function date(value:unknown):string {
  if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value) return fail();return value;
}
export function timezone(value:unknown):string {
  if(typeof value!=='string')return fail();try{new Intl.DateTimeFormat('en',{timeZone:value});}catch{return fail();}return value;
}
function text(value:unknown,max:number):string {if(typeof value!=='string'||value.length>max)return fail();return value;}
export type WaterInput = Readonly<{amountMl:number;occurredAt:string;inputUnit:'ML'|'CUP';cupMlSnapshot:number|null}>;
export function waterInput(value:unknown):WaterInput {
  const d=object(value,['amountMl','cupCount','cupMl','occurredAt']);
  const direct=d.amountMl!==undefined;
  if(direct&&(d.cupCount!==undefined||d.cupMl!==undefined))return fail();
  const cup=direct?null:integer(d.cupMl,1,2000);
  return {amountMl:direct?integer(d.amountMl,1,5000):integer(integer(d.cupCount,1,20)*cup!,1,5000),occurredAt:instant(d.occurredAt),inputUnit:direct?'ML':'CUP',cupMlSnapshot:cup};
}
export function stepInput(value:unknown) {const d=object(value,['totalSteps','recordedForTime']);return {totalSteps:integer(d.totalSteps,0,200000),...(d.recordedForTime===undefined?{}:{recordedForTime:instant(d.recordedForTime)})};}
export function sleepInput(value:unknown) {const d=object(value,['startsAt','endsAt']);const startsAt=instant(d.startsAt),endsAt=instant(d.endsAt);const duration=Date.parse(endsAt)-Date.parse(startsAt);if(duration<=0||duration>86400000)return fail();return {startsAt,endsAt};}
export function exerciseInput(value:unknown) {const d=object(value,['type','startsAt','durationMin','note']);if(!['WALK','RUN','STRENGTH','OTHER'].includes(String(d.type)))return fail();return {type:d.type as string,startsAt:instant(d.startsAt),durationMin:integer(d.durationMin,1,1440),...(d.note===undefined?{}:{note:text(d.note,2000)})};}
export function profileInput(value:unknown) {const d=object(value,['displayName','timezone','locale','cupMl']);const displayName=text(d.displayName,80).trim();if(!displayName||d.locale!=='ar')return fail();return {displayName,timezone:timezone(d.timezone),locale:'ar' as const,...(d.cupMl===undefined?{}:{cupMl:integer(d.cupMl,1,2000)})};}
export function enrollmentInput(value:unknown) {const d=object(value,['programId','versionId','startDate','goalOverrides']);if(!Array.isArray(d.goalOverrides)||d.goalOverrides.length>4)return fail();const goalOverrides=d.goalOverrides.map(v=>{const g=object(v,['metric','value']);if(!['WATER_ML','STEPS','EXERCISE_MIN','SLEEP_MIN'].includes(String(g.metric)))return fail();return {metric:g.metric as string,value:integer(g.value,1,200000)};});if(new Set(goalOverrides.map(g=>g.metric)).size!==goalOverrides.length)return fail();return {programId:uuid(d.programId),versionId:uuid(d.versionId),startDate:date(d.startDate),goalOverrides};}
export function completionInput(value:unknown) {const d=object(value,['completed','occurredAt']);if(typeof d.completed!=='boolean')return fail();return {completed:d.completed,occurredAt:instant(d.occurredAt)};}
export function reviewInput(value:unknown) {
  const d=object(value,['schemaVersionId','answers','notes','weightKg']);if(!Array.isArray(d.answers)||d.answers.length>5)return fail();
  const answers=d.answers.map(v=>{const a=object(v,['dimensionId','optionId']);return {dimensionId:uuid(a.dimensionId),optionId:uuid(a.optionId)};});
  if(new Set(answers.map(a=>a.dimensionId)).size!==answers.length)return fail();
  if(d.weightKg!==undefined&&(typeof d.weightKg!=='string'||!/^\d{1,3}(\.\d{1,2})?$/.test(d.weightKg)||Number(d.weightKg)<=0||Number(d.weightKg)>500))return fail();
  return {schemaVersionId:uuid(d.schemaVersionId),answers,...(d.notes===undefined?{}:{notes:text(d.notes,2000)}),...(d.weightKg===undefined?{}:{weightKg:d.weightKg as string})};
}
export function revision(value:unknown):number {if(value===undefined||value===null)throw new ContractError('PRECONDITION_REQUIRED',428);if(typeof value!=='string'||!/^"[1-9]\d*"$/.test(value))return fail();return integer(Number(value.slice(1,-1)),1,2147483647);}
export function assertRevision(expected:number,actual:number) {if(expected!==actual)throw new ContractError('REVISION_CONFLICT',409);}
export function assertOwnership(actorId:string,ownerId:string) {if(actorId!==ownerId)throw new ContractError('NOT_FOUND',404);}
export function idempotency(key:unknown,action:string,normalized:unknown) {if(!/^[a-z.]{1,64}$/.test(action))return fail();return {key:uuid(key),action,requestHash:createHash('sha256').update(JSON.stringify(normalized)).digest('hex')};}
export function assertReplay(expected:string,actual:string) {if(expected!==actual)throw new ContractError('IDEMPOTENCY_CONFLICT',409);}
export type WaterDTO = Readonly<{id:string;amountMl:number;occurredAt:string;localDate:string;revision:number}>;
export type StepDTO = Readonly<{id:string;localDate:string;totalSteps:number;revision:number}>;
export type SleepDTO = Readonly<{id:string;startsAt:string;endsAt:string;wakeDate:string;revision:number}>;
export type ProfileDTO = Readonly<{displayName:string;timezone:string;locale:string;cupMl:number|null;revision:number}>;
export type EnrollmentDTO = Readonly<{id:string;programId:string;versionId:string;startDate:string;timezoneSnapshot:string;status:string;revision:number}>;
export type JobDTO = Readonly<{id:string;status:'PENDING'|'RUNNING'|'DONE'|'FAILED'|'CANCELLED'}>;
export function waterDTO(row:{id:string;amountMl:number;occurredAt:Date;localDate:string;revision:number}):WaterDTO {return {id:row.id,amountMl:row.amountMl,occurredAt:row.occurredAt.toISOString(),localDate:row.localDate,revision:row.revision};}
export function safeError(error:unknown,requestId:string) {
  const known=error instanceof ContractError;
  return {status:known?error.status:503,body:{error:{code:known?error.code:'SERVICE_UNAVAILABLE',message:known?'تعذر قبول الطلب. تحقق من البيانات والصلاحيات.':'الخدمة غير متاحة مؤقتًا.',requestId}}};
}
