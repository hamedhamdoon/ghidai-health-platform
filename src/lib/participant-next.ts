export type UpcomingTask={id:string;requiredSnapshot:boolean;completed:boolean;exclusionReason:string|null;scheduledAt:string|null;orderSnapshot:number};
// Required due tasks precede untimed tasks, then the nearest future task.
// Optional tasks remain outside the required task prompt and C/N denominator.
export function nextRequiredTask<T extends UpcomingTask>(tasks:T[],now:number):T|null{
 const remaining=tasks.filter(task=>task.requiredSnapshot&&!task.completed&&!task.exclusionReason);
 const due=remaining.filter(task=>task.scheduledAt&&Date.parse(task.scheduledAt)<=now).sort((a,b)=>a.orderSnapshot-b.orderSnapshot);
 const untimed=remaining.filter(task=>!task.scheduledAt).sort((a,b)=>a.orderSnapshot-b.orderSnapshot);
 const future=remaining.filter(task=>task.scheduledAt&&Date.parse(task.scheduledAt)>now).sort((a,b)=>Date.parse(a.scheduledAt!)-Date.parse(b.scheduledAt!)||a.orderSnapshot-b.orderSnapshot);
 return due[0]??untimed[0]??future[0]??null;
}
