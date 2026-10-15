import { AuthError } from '../auth/contracts';
import { date, timezone } from '../contracts/p2';

export function localDate(at:Date, zone:string):string {
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:timezone(zone),year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(at);
 return ['year','month','day'].map(kind=>parts.find(p=>p.type===kind)!.value).join('-');
}
export function addDays(value:string,amount:number):string {const at=new Date(`${date(value)}T12:00:00Z`);at.setUTCDate(at.getUTCDate()+amount);return at.toISOString().slice(0,10);}
export function localInstant(day:string,time:string,zone:string):Date {
 date(day);timezone(zone);
 const wall=Date.parse(`${day}T${time.slice(0,8).padEnd(8,':00')}Z`);
 if(!Number.isFinite(wall))throw new AuthError('VALIDATION_FAILED',422);
 const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});
 const matches:number[]=[];
 for(let offset=-840;offset<=840;offset+=15){const at=wall-offset*60000,p=formatter.formatToParts(new Date(at)),get=(k:string)=>p.find(x=>x.type===k)!.value;if(`${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}:${get('second')}`===`${day}T${time.slice(0,8).padEnd(8,':00')}`)matches.push(at);}
 if(!matches.length)throw new AuthError('INVALID_LOCAL_TIME',422);
 return new Date(Math.min(...matches));
}
export type ScheduleTask={id:string;scheduleKind:string;timeStart:string|null;timeEnd:string|null;anchorTaskId:string|null;offsetMin:number|null};
export function scheduleTasks(tasks:ScheduleTask[],day:string,zone:string){
 const map=new Map(tasks.map(t=>[t.id,t])),result=new Map<string,{scheduledAt:Date|null;dueAt:Date|null}>(),visiting=new Set<string>();
 const visit=(id:string):{scheduledAt:Date|null;dueAt:Date|null}=>{if(result.has(id))return result.get(id)!;const t=map.get(id);if(!t||visiting.has(id))throw new AuthError('INVALID_TASK_RELATION',422);visiting.add(id);let scheduledAt:Date|null=null,dueAt:Date|null=null;
 if(t.scheduleKind==='AT'||t.scheduleKind==='WINDOW'){scheduledAt=localInstant(day,t.timeStart!,zone);dueAt=t.timeEnd?localInstant(day,t.timeEnd,zone):scheduledAt;}
 else if(t.scheduleKind==='RELATIVE'){const anchor=visit(t.anchorTaskId!);if(!anchor.scheduledAt)throw new AuthError('INVALID_TASK_RELATION',422);scheduledAt=new Date(anchor.scheduledAt.getTime()+Number(t.offsetMin)*60000);dueAt=scheduledAt;}
 visiting.delete(id);const value={scheduledAt,dueAt};result.set(id,value);return value;};
 for(const task of tasks)visit(task.id);return result;
}
export function saveAllowed(day:string,today:string,lateWindow:number,state:string,status:string){return state==='OPEN'&&status==='ACTIVE'&&day<=today&&today<=addDays(day,lateWindow);}
