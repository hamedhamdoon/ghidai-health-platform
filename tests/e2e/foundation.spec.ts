import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
test('Arabic welcome, responsive layout and accessibility', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('lang','ar');
  await expect(page.locator('html')).toHaveAttribute('dir','rtl');
  await expect(page.getByRole('heading', { level:1 })).toContainText('لمتابعة يومك');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await expect(page.getByRole('navigation').getByRole('link')).toHaveCount(5);
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name:'انتقل إلى المحتوى' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  const results = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze();
  expect(results.violations).toEqual([]);
  await page.screenshot({ path:`test-results/welcome-${test.info().project.name}.png`, fullPage:true });
});
for (const [path,label] of [['today','اليوم'],['my-programs','برنامجي'],['logs','سجلاتي'],['progress','تقدمي'],['account','حسابي']]) {
  test(`honest empty state: ${path}`, async ({ page }) => {
    await page.goto(`/${path}`);
    await expect(page.getByRole('heading',{level:1})).toHaveText(label);
    await expect(page.getByRole('navigation').getByRole('link',{name:label})).toHaveAttribute('aria-current','page');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect((await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21aa','wcag22aa']).analyze()).violations).toEqual([]);
  await page.getByRole('link',{name:'تعرف على المرحلة الحالية'}).click();
  await expect(page.getByRole('heading',{level:1})).toContainText('بداية واضحة');
  });
}
test('health and not-found contracts', async ({ request,page }) => {
  const health = await request.get('/api/health');
  expect(health.status()).toBe(200);
  expect(health.headers()['cache-control']).toBe('no-store');
  expect(await health.json()).toEqual({status:'ok',phase:'P1',database:'not-checked'});
  await page.goto('/unknown-page');
  await expect(page.getByRole('heading',{level:1})).toHaveText('الصفحة غير موجودة');
});
