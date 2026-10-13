import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {participantFixtures} from '../integration/participant-fixtures';
import {localDate} from '../../src/server/participation/rules';
let fixture:Awaited<ReturnType<typeof participantFixtures>>;
test.beforeAll(async()=>{fixture=await participantFixtures();});
test.afterAll(async()=>{await fixture.close();});
test('real participant joins, completes, undoes and withdraws; Arabic responsive UI',async({page,context})=>{
 const {v}=await fixture.program(7);await context.addCookies([{name:'ghidai_session',value:fixture.a.token,domain:'127.0.0.1',path:'/',httpOnly:true,sameSite:'Strict'}]);
 await page.goto('/my-programs');const card=page.locator('article').filter({has:page.getByRole('heading',{name:v.title,exact:true})});await card.getByRole('button',{name:'تفاصيل البرنامج'}).click();await page.getByLabel('تاريخ البداية').fill(localDate(new Date(),'Asia/Muscat'));await page.getByRole('button',{name:'تأكيد الانضمام الاختباري'}).click();await expect(page.locator('main p[role=status]').first()).toContainText('تم إنشاء المشاركة');
 await page.goto('/today');await page.getByRole('button',{name:'إتمام المهمة',exact:true}).first().click();await expect(page.locator('main p[role=status]').first()).toContainText('تم حفظ إتمام المهمة');await page.getByRole('button',{name:'التراجع عن الإتمام'}).first().click();await expect(page.locator('main p[role=status]').first()).toContainText('تم التراجع');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag22aa']).analyze()).violations).toEqual([]);await page.screenshot({path:`test-results/p5-today-${test.info().project.name}.png`,fullPage:true});
 await page.goto('/my-programs');await page.getByRole('button',{name:'الانسحاب من البرنامج'}).first().click();await expect(page.locator('main p[role=status]').first()).toContainText('تم الانسحاب');
});
test('participant unauthorized and save failure never show success',async({page,context})=>{
 await page.goto('/today');await expect(page.locator('main p[role=alert]').first()).toContainText('تسجيل الدخول');
 await context.addCookies([{name:'ghidai_session',value:fixture.b.token,domain:'127.0.0.1',path:'/',httpOnly:true,sameSite:'Strict'}]);const {v}=await fixture.program(7);await page.goto('/my-programs');await page.locator('article').filter({has:page.getByRole('heading',{name:v.title,exact:true})}).getByRole('button',{name:'تفاصيل البرنامج'}).click();await page.getByLabel('تاريخ البداية').fill(localDate(new Date(),'Asia/Muscat'));await page.route('**/api/v1/enrollments',async route=>{if(route.request().method()==='POST')await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:{code:'SERVICE_UNAVAILABLE',message:'تعذر حفظ الاختبار'}})});else await route.continue();});await page.getByRole('button',{name:'تأكيد الانضمام الاختباري'}).click();await expect(page.locator('main p[role=alert]').first()).toContainText('تعذر حفظ الاختبار');await expect(page.getByText('تم إنشاء المشاركة وجدول الأيام بنجاح',{exact:true})).toHaveCount(0);
});
