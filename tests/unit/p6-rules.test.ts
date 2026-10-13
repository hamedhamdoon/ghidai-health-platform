import { describe,it,expect } from 'vitest';
import { boundedPeriod,habitDue,habitInput,localDate,singletonPrecondition } from '../../src/server/tracking/rules';
describe('P6 independent tracking rules',()=>{
 it('attributes midnight and travel to explicit frozen zone',()=>{const at=new Date('2026-10-12T21:30:00Z');expect(localDate(at,'Asia/Muscat')).toBe('2026-10-13');expect(localDate(at,'America/New_York')).toBe('2026-10-12');});
 it('handles DST wake date',()=>expect(localDate(new Date('2026-11-01T06:30:00Z'),'America/New_York')).toBe('2026-11-01'));
 it('bounds read periods and rejects reversed dates',()=>{expect(()=>boundedPeriod({from:'2025-01-01',to:'2026-01-02'},'2026-01-01')).toThrow();expect(()=>boundedPeriod({from:'2026-10-13',to:'2026-10-12'},'2026-10-12')).toThrow();});
 it('uses actual recurrence and finite validity',()=>{expect(habitDue('2026-10-12','2026-10-01','2026-10-20',[1])).toBe(true);expect(habitDue('2026-10-13','2026-10-01',null,[1])).toBe(false);expect(()=>habitInput({title:'x',startsDate:'2026-10-12',recurrence:{weekdays:[1,1]}})).toThrow();});
 it('requires distinct create and update conditions',()=>{expect(()=>singletonPrecondition(undefined,null,null)).toThrow();expect(()=>singletonPrecondition({revision:1},null,'*')).toThrow();expect(()=>singletonPrecondition(undefined,null,'*')).not.toThrow();expect(()=>singletonPrecondition({revision:1},'"1"',null)).not.toThrow();});
});
