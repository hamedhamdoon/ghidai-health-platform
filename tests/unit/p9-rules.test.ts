import { describe,it,expect } from 'vitest';
import { preferenceInput,quietAt,reminderInstant,retryDue,deliveryEligible } from '../../src/server/notifications/rules';
import { csvCell,exportCSV,deleteSyntheticSubject } from '../../src/server/privacy/rules';
import { exportFields } from '../../src/server/privacy/service';
import { readFileSync } from 'node:fs';
describe('P9 notification consent, quiet hours and DST',()=>{
 it('requires valid paired quiet boundaries and timezone',()=>{expect(()=>preferenceInput({enabledInApp:true,timezone:'bad',quietStart:null,quietEnd:null})).toThrow();expect(()=>preferenceInput({enabledInApp:true,timezone:'Asia/Muscat',quietStart:'22:00',quietEnd:null})).toThrow();expect(()=>preferenceInput({enabledInApp:true,timezone:'Asia/Muscat',quietStart:'22:00',quietEnd:'22:00'})).toThrow();});
 it('quiet overnight includes start and excludes end',()=>{expect(quietAt(new Date('2026-10-13T18:00Z'),'Asia/Muscat','22:00','07:00')).toBe(true);expect(quietAt(new Date('2026-10-13T03:00Z'),'Asia/Muscat','22:00','07:00')).toBe(false);});
 it('quiet daytime covers only its interval',()=>{expect(quietAt(new Date('2026-10-13T12:30Z'),'UTC','12:00','13:00')).toBe(true);expect(quietAt(new Date('2026-10-13T13:00Z'),'UTC','12:00','13:00')).toBe(false);});
 it('moves DST gap to first valid minute and chooses earlier fold once',()=>{expect(reminderInstant('2026-03-08','02:30','America/New_York')?.toISOString()).toBe('2026-03-08T07:00:00.000Z');expect(reminderInstant('2026-11-01','01:30','America/New_York')?.toISOString()).toBe('2026-11-01T05:30:00.000Z');});
 it('rechecks revocation, revision, quiet and expiry',()=>{const now=new Date('2026-01-01T00:00Z'),future=new Date('2026-01-01T00:15Z');expect(deliveryEligible(now,future,true,true,false)).toBe(true);expect(deliveryEligible(now,future,false,true,false)).toBe(false);expect(deliveryEligible(now,future,true,false,false)).toBe(false);expect(deliveryEligible(now,future,true,true,true)).toBe(false);expect(deliveryEligible(future,future,true,true,false)).toBe(false);});
 it('caps exponential retry at fifteen minutes',()=>{expect(retryDue(new Date(0),1).getTime()).toBe(30000);expect(retryDue(new Date(0),100).getTime()).toBe(900000);});
});
describe('P9 safe privacy serialization and synthetic isolation',()=>{
 it('export DTO fields match actual Prisma scalar fields and exclude credentials',()=>{const schema=readFileSync('prisma/schema.prisma','utf8');for(const [table,fields] of Object.entries(exportFields)){const body=schema.match(new RegExp(`model ${table} \\{([\\s\\S]*?)\\n\\}`))?.[1];expect(body,table).toBeDefined();for(const field of fields)expect(body,table+'.'+field).toMatch(new RegExp(`\\n\\s+${field}\\s`));expect(fields.some(f=>/Encrypted|Hash|token|password|keys/i.test(f))).toBe(false);}});
 it('quotes CSV and neutralizes spreadsheet formulas',()=>{expect(csvCell('=1+1')).toBe('"\'=1+1"');expect(csvCell(' \t@SUM(A1)')).toContain("'");expect(csvCell('a"b')).toBe('"a""b"');expect(csvCell(null)).toBe('""');});
 it('exports Unicode and record boundaries',()=>{const csv=exportCSV({Profile:[{displayName:'اسم، عربي\nثان'}]});expect(csv.startsWith('\uFEFF')).toBe(true);expect(csv).toContain('اسم، عربي');expect(csv.split('\r\n')).toHaveLength(2);});
 it('isolated rehearsal leaves other subject records',()=>{const store={syntheticOnly:true as const,records:[{userId:'a',value:1},{userId:'b',value:2}]};expect(deleteSyntheticSubject(store,'a')).toEqual({deleted:1,remaining:1});expect(store.records[0].userId).toBe('b');});
 it('refuses unmarked deletion rehearsal',()=>{expect(()=>deleteSyntheticSubject({syntheticOnly:false,records:[]} as unknown as Parameters<typeof deleteSyntheticSubject>[0],'a')).toThrow();});
});
