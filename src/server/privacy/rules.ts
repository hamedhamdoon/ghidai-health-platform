import { AuthError } from '../auth/contracts';
export function csvCell(value:unknown):string {let text=value===null||value===undefined?'':typeof value==='object'?JSON.stringify(value):String(value);if(/^[\s]*[=+\-@\t\r\n]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';}
export function exportCSV(data:Record<string,unknown[]>){return '\uFEFF'+['collection,record',...Object.entries(data).flatMap(([name,rows])=>rows.map(row=>`${csvCell(name)},${csvCell(row)}`))].join('\r\n');}
// A pure rehearsal confined to data explicitly marked synthetic. No database or
// filesystem dependency exists here; production purge remains policy gated.
export function deleteSyntheticSubject(store:{syntheticOnly:true;records:{userId:string;value:unknown}[]},userId:string){if(store.syntheticOnly!==true)throw new AuthError('POLICY_NOT_APPROVED',403);const before=store.records.length;store.records=store.records.filter(r=>r.userId!==userId);return {deleted:before-store.records.length,remaining:store.records.length};}
