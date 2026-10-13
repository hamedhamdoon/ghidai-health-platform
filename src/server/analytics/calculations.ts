export type Count = {completed:number;required:number;percentage:number|null};
export type OccurrenceSource = {id:string;required:boolean;completed:boolean;excluded:boolean};
export type DaySource = {date:string;state:string;tasks:OccurrenceSource[]};
export function percentage(completed:number,required:number):number|null {
 if(required===0)return null;
 return Math.round(Math.min(100,Math.max(0,100*completed/required))*10)/10;
}
export function countTasks(tasks:OccurrenceSource[]):Count & {optionalCompleted:number;optionalTotal:number} {
 const unique=[...new Map(tasks.map(task=>[task.id,task])).values()].filter(task=>!task.excluded);
 const required=unique.filter(task=>task.required),optional=unique.filter(task=>!task.required);
 const completed=required.filter(task=>task.completed).length;
 return {completed,required:required.length,percentage:percentage(completed,required.length),optionalCompleted:optional.filter(task=>task.completed).length,optionalTotal:optional.length};
}
export function summarizeDays(days:DaySource[],today:string) {
 const daily=days.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(day=>({date:day.date,state:day.state,...countTasks(day.state==='EXCLUDED'?[]:day.tasks)}));
 const sum=(items:typeof daily):Count=>{const completed=items.reduce((n,d)=>n+d.completed,0),required=items.reduce((n,d)=>n+d.required,0);return {completed,required,percentage:percentage(completed,required)};};
 const due=daily.filter(day=>day.date<=today);let current=0,longest=0;
 for(const day of due){if(day.required===0)continue;if(day.completed===day.required){current++;longest=Math.max(longest,current);}else current=0;}
 const weekStart=new Date(`${today}T00:00:00Z`);weekStart.setUTCDate(weekStart.getUTCDate()-6);
 return {daily,due:sum(due),final:sum(daily),weekly:sum(due.filter(day=>day.date>=weekStart.toISOString().slice(0,10))),streak:{current,longest},elapsedDays:due.length,durationDays:daily.length,ended:daily.length>0&&daily.at(-1)!.date<today};
}
export function ruleEligible(type:string,value:unknown,summary:ReturnType<typeof summarizeDays>,active:boolean):boolean {
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 const config=value as Record<string,unknown>;
 if(!active||config.syntheticOnly!==true)return false;
 if(type==='FIRST_DAY')return summary.daily.some(day=>day.required>0&&day.completed===day.required);
 if(type==='STREAK')return Number.isSafeInteger(config.days)&&Number(config.days)>0&&summary.streak.longest>=Number(config.days);
 if(type==='COMPLETION')return summary.ended&&summary.final.required>0&&typeof config.percentage==='number'&&config.percentage>=0&&config.percentage<=100&&summary.final.percentage!>=config.percentage;
 return false;
}
