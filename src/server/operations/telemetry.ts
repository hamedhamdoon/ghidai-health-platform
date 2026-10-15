import { operationEnvironment } from './config';
export type HttpMetric = {event:'ghidai_http';status:number;durationMs:number};
/** Opt-in local aggregate data only. Never accepts request paths, actors or payloads. */
export function emitHttpMetric(status:number,durationMs:number,env:Record<string,string|undefined>=process.env,emit:(line:string)=>void=console.log):void {
 if(env.GHIDAI_LOCAL_METRICS!=='true')return;
 try {if(operationEnvironment(env)==='production')return;}catch{return;}
 if(!Number.isInteger(status)||status<100||status>599||!Number.isFinite(durationMs)||durationMs<0)return;
 try {emit(JSON.stringify({event:'ghidai_http',status,durationMs:Math.min(3600000,Math.round(durationMs))}));}catch{/* Metrics must never change the response or reveal request data. */}
}
/** Bound work and ignore any line containing unapproved fields; no raw input is returned. */
export function summarizeHttpMetrics(input:string,limit=1000){
 const bound=Number.isSafeInteger(limit)&&limit>0?Math.min(limit,10000):1000;
 const metrics:HttpMetric[]=[];
 for(const line of input.slice(-2_000_000).split(/\r?\n/).slice(-bound)){
  if(line.length>160)continue;
  try {const value:unknown=JSON.parse(line);if(!value||typeof value!=='object'||Array.isArray(value))continue;
   const row=value as Record<string,unknown>;
   if(Object.keys(row).length!==3||row.event!=='ghidai_http'||!Number.isInteger(row.status)||Number(row.status)<100||Number(row.status)>599||!Number.isInteger(row.durationMs)||Number(row.durationMs)<0||Number(row.durationMs)>3600000)continue;
   metrics.push(row as HttpMetric);
  }catch{/* Invalid/unrelated log lines are excluded without disclosure. */}
 }
 const total=metrics.length,serverErrors=metrics.filter(row=>row.status>=500).length,clientErrors=metrics.filter(row=>row.status>=400&&row.status<500).length;
 const durations=metrics.map(row=>row.durationMs).sort((a,b)=>a-b);
 return {total,serverErrors,clientErrors,errorRate:total?serverErrors/total:null,p95Ms:total?durations[Math.ceil(total*.95)-1]:null};
}
