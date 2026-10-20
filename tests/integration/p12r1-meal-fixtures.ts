import {randomUUID} from 'node:crypto';
import {participantFixtures,type Row} from './participant-fixtures';
import {ParticipationService} from '../../src/server/participation/service';
import {localDate} from '../../src/server/participation/rules';
export async function mealFixture(f:Awaited<ReturnType<typeof participantFixtures>>,token=f.a.token){
 const qualification=(await f.owner.query('INSERT INTO "ReviewerQualification"("reviewerId",scope,"evidenceReference","verifiedBy","validUntil",status) VALUES($1,\'MEAL\',\'synthetic-local:p12r1-food\',$2,now()+interval \'2 hours\',\'ACTIVE\') RETURNING id',[f.reviewer.id,f.admin.id])).rows[0];
 async function review(c:Row){c=await f.command(`content-revisions/${c.id}/submit`,'POST',{},f.admin.token,c.revision);return f.command(`content-revisions/${c.id}/review`,'POST',{decision:'APPROVED',rationale:'مراجعة اصطناعية فقط',contentHash:c.contentHash,qualificationId:qualification.id},f.reviewer.token,c.revision);}
 const meals:Row[]=[];
 for(const title of ['وجبة اختبار محايدة','بديل اختبار محايد']){let c=await f.command('admin/content','POST',{contentKey:`meal-r1-${randomUUID()}`,kind:'MEAL',title,bodyText:'محتوى اصطناعي محايد فقط دون توصية صحية.',sourceExtractIds:[]},f.admin.token);const m=await f.command('admin/meals','POST',{contentRevisionId:c.id,slot:'BREAKFAST',ingredients:[{name:'مكون اصطناعي',unitFamily:'MASS',quantity:1.25,unit:'G',measurementBasis:'RAW'}]},f.admin.token,c.revision);c={...c,revision:m.revision};c=await review(c);meals.push({...c,mealId:m.id});}
 let c=await f.command('admin/content','POST',{contentKey:`plan-r1-${randomUUID()}`,kind:'MEAL',title:'خطة اصطناعية محايدة',bodyText:'محتوى اصطناعي محايد فقط.',sourceExtractIds:[]},f.admin.token);
 const plan=await f.command('admin/nutrition-plans','POST',{contentRevisionId:c.id,label:'خطة اصطناعية',meals:[{dayIndex:1,slot:'BREAKFAST',order:1,mealRevisionId:meals[0].id,alternatives:[meals[1].id]}]},f.admin.token,c.revision);c=await review({...c,revision:plan.revision});
 const pm=(await f.owner.query('SELECT id FROM "PlanMeal" WHERE "planId"=$1',[plan.id])).rows[0];
 const p=await f.command('admin/programs','POST',{slug:`food-r1-${randomUUID()}`,type:'CUSTOM'},f.admin.token);
 let v=await f.command(`admin/programs/${p.id}/versions`,'POST',{metadata:{title:`برنامج وجبة ${randomUUID().slice(0,8)}`,descriptionRevisionId:f.content.id,durationDays:1,startMode:'FLEXIBLE',policyVersionId:f.policy.id,reviewSchemaVersionId:f.schema.id}},f.admin.token,p.revision);
 v=await f.command(`admin/program-versions/${v.id}/nutrition`,'PUT',{planIds:[plan.id]},f.admin.token,v.revision);
 v=await f.command(`admin/program-versions/${v.id}/days/1`,'PUT',{tasks:[{key:'meal',titleRevisionId:meals[0].id,type:'MEAL',required:true,order:1,scheduleKind:'NONE',completionMode:'MANUAL',planMealId:pm.id}]},f.admin.token,v.revision);
 const snapshot=await f.command(`admin/program-versions/${v.id}/preview`,'GET',{},f.admin.token);
 v=await f.command(`admin/program-versions/${v.id}/submit`,'POST',{},f.admin.token,v.revision);
 v=await f.command(`admin/program-versions/${v.id}/publish`,'POST',{confirmation:true,expectedContentHashes:Object.fromEntries(snapshot.references.map((r:Row)=>[r.id,r.contentHash]))},f.admin.token,v.revision);
 const service=new ParticipationService(f.auth),date=localDate(new Date(),'Asia/Muscat');
 const enrollment=(await service.execute('enrollments','POST',{programId:p.id,versionId:v.id,startDate:date,goalOverrides:[]},token,null,randomUUID())).body as Row;
 const day=(await service.execute(`enrollments/${enrollment.id}/days/${date}`,'GET',{},token,null,null)).body as Row;
 return {p,v,meals,plan,pm,enrollment,task:day.tasks[0],service,date};
}
