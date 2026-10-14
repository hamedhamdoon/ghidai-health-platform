import {describe,it,expect} from 'vitest';
import {assignmentInput,userInput,noteInput} from '../../src/server/administration/contracts';
const id='550e8400-e29b-41d4-a716-446655440000',now=Date.parse('2026-10-13T00:00:00Z');
const base={coachId:id,resources:['Progress'],expiresAt:'2026-10-13T01:00:00Z',accepted:true};
describe('P8 explicit scoped local consent',()=>{
 it('accepts an explicit future synthetic assignment',()=>expect(assignmentInput(base,now).resources).toEqual(['Progress']));
 it.each([false,undefined,'true'])('rejects absent or implicit consent %s',accepted=>expect(()=>assignmentInput({...base,accepted},now)).toThrow());
 it.each([[],['DailyReview'],['Progress','Progress'],['weight'],['*']].map(resources=>({resources})))('rejects unsafe resources $resources',({resources})=>expect(()=>assignmentInput({...base,resources},now)).toThrow());
 it.each(['2026-10-12T23:00:00Z','2026-10-13T00:00:00Z','2026-10-15T00:00:00Z'])('rejects invalid expiry %s',expiresAt=>expect(()=>assignmentInput({...base,expiresAt},now)).toThrow());
 it('rejects client ownership and hidden elevation fields',()=>{expect(()=>assignmentInput({...base,userId:id},now)).toThrow();expect(()=>userInput({role:'ADMIN',status:'ACTIVE',reason:'x',bypass:true})).toThrow();});
 it('requires meaningful reason and bounded separate note',()=>{expect(()=>userInput({role:'ADMIN',status:'ACTIVE',reason:' '})).toThrow();expect(()=>noteInput({text:'x'.repeat(2001)})).toThrow();expect(noteInput({text:' ملاحظة '})).toBe('ملاحظة');});
});
