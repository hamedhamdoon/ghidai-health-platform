import {test,expect} from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {passwordHash} from '../../src/server/auth/crypto';
import {participantFixtures} from '../integration/participant-fixtures';
import {mealFixture} from '../integration/p12r1-meal-fixtures';
let f:Awaited<ReturnType<typeof participantFixtures>>;
test.beforeAll(async()=>{f=await participantFixtures();});
test.afterAll(async()=>{await f.close();});
test('P12R1 participant meal UI saves alternative in PostgreSQL, reload and renewed session; response loss retries once',async({page,context})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 const participant=await f.user(),food=await mealFixture(f,participant.token),password='synthetic-r1-meal-password';
 const account=(await f.owner.query('UPDATE "User" SET "passwordHash"=$2 WHERE id=$1 RETURNING "emailNormalized"',[participant.id,await passwordHash(password)])).rows[0];
 const cookie={name:'ghidai_session',value:participant.token,domain:'127.0.0.1',path:'/',httpOnly:true,sameSite:'Strict' as const};
 await context.addCookies([cookie]);await page.goto(`/today?enrollmentId=${food.enrollment.id}`);
 await page.getByRole('button',{name:'عرض الوجبة والبدائل'}).click();await expect(page.getByLabel('الوجبة أو البديل')).toBeVisible();await page.getByLabel('الوجبة أو البديل').selectOption(food.meals[1].mealId);
 await expect(page.getByText('مكون اصطناعي: 1.25 غرام · قبل الطهي',{exact:true})).toBeVisible();
 const writes:{key:string|undefined;body:string|null}[]=[];
 await page.route('**/api/v1/occurrences/*/meal',async route=>{if(route.request().method()!=='PUT')return route.continue();writes.push({key:route.request().headers()['idempotency-key'],body:route.request().postData()});if(writes.length===1){const response=await route.fetch();expect(response.ok()).toBe(true);await route.abort();}else await route.continue();});
 await page.getByRole('button',{name:'حفظ اختيار الوجبة'}).click();await expect(page.getByRole('alert').filter({hasText:'تعذر الاتصال'})).toBeVisible();
 await page.getByRole('button',{name:'حفظ اختيار الوجبة'}).click();await expect(page.getByRole('status').filter({hasText:'تم حفظ اختيار الوجبة'})).toBeVisible();expect(writes).toHaveLength(2);expect(writes[1]).toEqual(writes[0]);
 const rows=(await f.owner.query('SELECT "alternativeMealId",revision FROM "MealSelection" WHERE "userId"=$1 AND "occurrenceId"=$2',[participant.id,food.task.id])).rows;expect(rows).toHaveLength(1);expect(rows[0].alternativeMealId).toBe(food.meals[1].mealId);expect(rows[0].revision).toBe(1);
 await page.reload();await page.getByRole('button',{name:'عرض الوجبة والبدائل'}).click();await expect(page.getByLabel('الوجبة أو البديل')).toHaveValue(food.meals[1].mealId);
 await page.goto('/account');await page.getByRole('button',{name:'تسجيل الخروج',exact:true}).click();await expect(page).toHaveURL(/\/login$/);
 await page.getByLabel('البريد الإلكتروني',{exact:true}).fill(account.emailNormalized);await page.getByLabel(/^كلمة المرور/).fill(password);await page.getByRole('button',{name:'تسجيل الدخول',exact:true}).click();await expect(page).not.toHaveURL(/\/login$/);
 await page.goto(`/today?enrollmentId=${food.enrollment.id}`);await page.getByRole('button',{name:'عرض الوجبة والبدائل'}).click();await expect(page.getByLabel('الوجبة أو البديل')).toHaveValue(food.meals[1].mealId);
 await page.getByLabel('الوجبة أو البديل').selectOption('');await page.getByRole('button',{name:'حفظ اختيار الوجبة'}).click();await expect(page.getByRole('status').filter({hasText:'تم حفظ اختيار الوجبة'})).toBeVisible();
 expect((await f.owner.query('SELECT "alternativeMealId",revision FROM "MealSelection" WHERE "occurrenceId"=$1',[food.task.id])).rows[0]).toEqual({alternativeMealId:null,revision:2});
 await page.getByLabel('الوجبة أو البديل').focus();await page.keyboard.press('Home');await page.keyboard.press('Tab');await expect(page.getByRole('button',{name:'حفظ اختيار الوجبة'})).toBeFocused();
 expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag22aa']).analyze()).violations).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 expect(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
 // CSS 200% zoom/reflow emulation follows P10; physical browser zoom and
 // actual screen-reader/device acceptance remain separate manual checks.
 const originalViewport=page.viewportSize()!;
 try{
  await page.setViewportSize({width:Math.max(640,originalViewport.width),height:1800});
  await page.evaluate(()=>{document.body.style.zoom='2';});
  await expect(page.getByLabel('الوجبة أو البديل')).toBeVisible();await expect(page.getByRole('button',{name:'حفظ اختيار الوجبة'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag22aa']).analyze()).violations).toEqual([]);
 }finally{await page.evaluate(()=>{document.body.style.zoom='';});await page.setViewportSize(originalViewport);}
});
