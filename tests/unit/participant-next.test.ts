import {describe,it,expect} from 'vitest';
import {nextRequiredTask,type UpcomingTask} from '../../src/lib/participant-next';
const task=(id:string,time:string|null,order=1,required=true):UpcomingTask=>({id,scheduledAt:time,orderSnapshot:order,requiredSnapshot:required,completed:false,exclusionReason:null});
describe('required upcoming task priority',()=>{
 it('uses order for due tasks, before untimed and future, without optional prompts',()=>{const tasks=[task('optional','2026-10-13T08:00:00Z',0,false),task('future','2026-10-13T12:00:00Z'),task('untimed',null),task('due-second','2026-10-13T07:00:00Z',2),task('due-first','2026-10-13T09:00:00Z',1)];expect(nextRequiredTask(tasks,Date.parse('2026-10-13T10:00:00Z'))?.id).toBe('due-first');});
 it('chooses nearest future after untimed; excludes completed and withdrawn tasks',()=>{const done={...task('done',null),completed:true},excluded={...task('excluded',null),exclusionReason:'synthetic withdrawal'};expect(nextRequiredTask([done,excluded,task('late','2026-10-13T12:00:00Z'),task('early','2026-10-13T11:00:00Z')],Date.parse('2026-10-13T10:00:00Z'))?.id).toBe('early');expect(nextRequiredTask([done,excluded,task('optional',null,1,false)],Date.now())).toBeNull();});
});
