import {describe,it,expect} from 'vitest';
import {waterInput,stepInput,sleepInput,reviewInput,revision,assertOwnership,assertReplay,safeError,date,timezone} from '../../src/server/contracts/p2';
import {assertLocalAppDatabase} from '../../src/server/db/local-database';
describe('P2 closed data contracts',()=>{
  it('rejects identity/role injection and water ambiguity',()=>{
    for(const extra of [{userId:'a'},{role:'ADMIN'},{cupCount:1,cupMl:250},{revision:100}])expect(()=>waterInput({amountMl:250,occurredAt:'2026-10-11T09:00:00+04:00',...extra})).toThrow();
  });
  it('normalizes explicit cups without defaults',()=>expect(waterInput({cupMl:250,cupCount:2,occurredAt:'2026-10-11T09:00:00+04:00'}).amountMl).toBe(500));
  it('checks integer boundaries',()=>{for(const totalSteps of [-1,200001,NaN,1.5])expect(()=>stepInput({totalSteps})).toThrow();expect(stepInput({totalSteps:0}).totalSteps).toBe(0);});
  it('checks calendar, zone and sleep',()=>{expect(()=>date('2026-02-30')).toThrow();expect(()=>timezone('fake')).toThrow();expect(()=>sleepInput({startsAt:'2026-10-11T00:00:00Z',endsAt:'2026-10-10T00:00:00Z'})).toThrow();});
  it('rejects arbitrary answers and float weights',()=>expect(()=>reviewInput({schemaVersionId:'bad',answers:[],weightKg:70.1})).toThrow());
  it('requires revisions, hides ownership and rejects key conflict',()=>{expect(()=>revision(undefined)).toThrow();expect(revision('"2"')).toBe(2);expect(()=>assertOwnership('a','b')).toThrow();expect(()=>assertReplay('a','b')).toThrow();});
  it('never propagates database detail',()=>{expect(JSON.stringify(safeError(new Error('password SQL health text'),'request'))).not.toMatch(/password|SQL|health/);});
  it('restricts application URL before any connection',()=>{expect(()=>assertLocalAppDatabase('postgresql://ghidai_app:fixture@cloud.example:55433/ghidai_test','test')).toThrow();expect(()=>assertLocalAppDatabase('postgresql://ghidai_test:fixture@127.0.0.1:55433/ghidai_test','test')).toThrow();expect(assertLocalAppDatabase('postgresql://ghidai_app:fixture@127.0.0.1:55433/ghidai_test','test')).toContain('ghidai_app');});
});
