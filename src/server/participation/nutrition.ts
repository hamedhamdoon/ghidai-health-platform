import type {PoolClient} from 'pg';
import type {ParticipationService} from './service';
import {AuthError} from '../auth/contracts';
import {object,uuid,revision,assertRevision} from '../contracts/p2';
import {saveAllowed} from './rules';

export function mealSelectionInput(input:unknown){const d=object(input,['alternativeMealId']);return {alternativeMealId:d.alternativeMealId===null?null:uuid(d.alternativeMealId)};}
const unavailable=():never=>{throw new AuthError('PROGRAM_UNAVAILABLE',409);};
export async function participantNutritionCommand(db:PoolClient,path:string,method:string,input:unknown,actor:string,match:string|null,service:ParticipationService):Promise<unknown|undefined>{
 if(!/^occurrences\/[\w-]+\/meal$/.test(path)||!['GET','PUT'].includes(method))return undefined;
 const id=uuid(path.split('/')[1]);
 const link=(await db.query('SELECT d."enrollmentId",d.id AS "dayId",d."localDate"::text AS "localDate" FROM "TaskOccurrence" o JOIN "EnrollmentDay" d ON d.id=o."dayId" WHERE o.id=$1 AND o."userId"=$2',[id,actor])).rows[0];
 if(!link)throw new AuthError('NOT_FOUND',404);
 const e=await service.enrollment(db,link.enrollmentId,actor,true),today=await service.sync(db,e,actor);
 // Share locks serialize publication withdrawal with selection. The enrolled version
 // is the sole source of plan and content references; no client plan ID is accepted.

 if(!(await db.query('SELECT p12r1_lock_nutrition($1) ready',[e.versionId])).rows[0]?.ready)unavailable();
 const task=(await db.query('SELECT o.*,t."planMealId",t."completionMode",p."mealRevisionId" FROM "TaskOccurrence" o JOIN "TaskDefinition" t ON t.id=o."definitionId" JOIN "PlanMeal" p ON p.id=t."planMealId" JOIN "ProgramNutritionPlan" n ON n."planId"=p."planId" AND n."versionId"=o."versionId" WHERE o.id=$1 AND o."userId"=$2 AND t.type=\'MEAL\' FOR UPDATE OF o',[id,actor])).rows[0];
 if(!task)throw new AuthError('NOT_FOUND',404);
 const content=(await db.query('SELECT c.id,c.title,c."bodyText",c.status,c."syntheticOnly",m.id AS "mealId" FROM "Meal" m JOIN "ContentRevision" c ON c.id=m."contentRevisionId" WHERE c.id=$1 OR m.id IN(SELECT "alternativeMealId" FROM "MealAlternative" WHERE "planMealId"=$2) ORDER BY c.id',[task.mealRevisionId,task.planMealId])).rows;
 if(!content.length||content.some(c=>c.status!=='APPROVED'||!c.syntheticOnly))unavailable();
 const alternatives=(await db.query('SELECT "alternativeMealId","approvalRevisionId" FROM "MealAlternative" WHERE "planMealId"=$1 ORDER BY "order"',[task.planMealId])).rows;
 const choices=[];
 for(const c of content){if(c.id!==task.mealRevisionId&&!alternatives.some(a=>a.alternativeMealId===c.mealId&&a.approvalRevisionId===c.id))continue;choices.push({id:c.id===task.mealRevisionId?null:c.mealId,title:c.title,bodyText:c.bodyText,ingredients:(await db.query('SELECT i.name,mi.quantity,mi.unit,mi."measurementBasis",mi.preparation FROM "MealIngredient" mi JOIN "Ingredient" i ON i.id=mi."ingredientId" WHERE mi."mealId"=$1 ORDER BY mi.id',[c.mealId])).rows});}
 const day=(await db.query('SELECT * FROM "EnrollmentDay" WHERE id=$1 AND "userId"=$2 FOR UPDATE',[link.dayId,actor])).rows[0];
 const excluded=Boolean((await db.query('SELECT id FROM "TaskExclusion" WHERE "occurrenceId"=$1 AND "userId"=$2',[id,actor])).rowCount);
 const allowed=!excluded&&saveAllowed(link.localDate,today,e.lateWindowDays,day.state,e.status);
 let selection=(await db.query('SELECT id,"alternativeMealId",revision FROM "MealSelection" WHERE "occurrenceId"=$1 AND "userId"=$2',[id,actor])).rows[0]??null;
 if(method==='PUT'){
  const d=mealSelectionInput(input);assertRevision(revision(match),task.revision);
  if(!allowed)throw new AuthError('SAVE_WINDOW_CLOSED',409);
  if(!choices.some(c=>c.id===d.alternativeMealId))throw new AuthError('NOT_FOUND',404);
  if(!selection||selection.alternativeMealId!==d.alternativeMealId){
   selection=(await db.query('INSERT INTO "MealSelection"("userId","occurrenceId","planMealId","alternativeMealId") VALUES($1,$2,$3,$4) ON CONFLICT("occurrenceId") DO UPDATE SET "alternativeMealId"=EXCLUDED."alternativeMealId",revision="MealSelection".revision+1,"updatedAt"=now() RETURNING id,"alternativeMealId",revision',[actor,id,task.planMealId,d.alternativeMealId])).rows[0];
   // Selection records a preference, not consumption. The approved P5 MANUAL
   // completion contract remains explicit, preventing a preference from inflating progress.
   await db.query('UPDATE "TaskOccurrence" SET revision=revision+1 WHERE id=$1 AND "userId"=$2',[id,actor]);task.revision++;
   await db.query('UPDATE "EnrollmentDay" SET revision=revision+1 WHERE id=$1 AND "userId"=$2',[day.id,actor]);
   await db.query('UPDATE "Enrollment" SET revision=revision+1 WHERE id=$1 AND "userId"=$2',[e.id,actor]);
  }
 }
 return {id,revision:task.revision,selection,...(method==='GET'?{choices}:{}),allowed,syntheticOnly:true};
}
