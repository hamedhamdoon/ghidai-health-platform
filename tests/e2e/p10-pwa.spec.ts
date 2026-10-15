import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { participantFixtures } from '../integration/participant-fixtures';
test('P10 manifest, safe caching, outage and logout purge', async ({ page, context, request }) => {
  const manifest = await request.get('/manifest.webmanifest');
  expect(manifest.ok()).toBe(true); expect((await manifest.json()).dir).toBe('rtl');
  expect((await request.get('/sw.js')).headers()['cache-control']).toBe('no-store');
  await page.goto('/');
  const manifestState = await (await context.newCDPSession(page)).send('Page.getAppManifest');
  expect(manifestState.errors).toEqual([]);
  expect(manifestState.url).toContain('/manifest.webmanifest');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.reload();
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await page.evaluate(async () => { await fetch('/api/health'); await fetch('/api/v1/auth/csrf'); });
  const cached = await page.evaluate(async () => (await Promise.all((await caches.keys()).filter(key => key.startsWith('ghidai-public-')).map(async key => (await (await caches.open(key)).keys()).map(item => new URL(item.url).pathname)))).flat());
  expect(cached.sort()).toEqual(['/icons/ghidai-192.png', '/icons/ghidai-512.png', '/offline.html']);
  await context.setOffline(true);
  await expect(page.locator('.pwa-status [role=alert]')).toContainText('لم يُحفظ أي تعديل');
  expect(await page.evaluate(async () => { try { await fetch('/api/v1/today'); return true; } catch { return false; } })).toBe(false);
  await page.goto('/progress');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('تعذر الاتصال');
  await expect(page.locator('main')).toContainText('لا تتوفر السجلات الصحية دون اتصال');
  await context.setOffline(false);
  await page.goto('/');
  await expect(page.locator('.pwa-status [role=alert]')).toHaveCount(0);
  const fixture = await participantFixtures();
  try {
    const participant = await fixture.user();
    await context.addCookies([{ name: 'ghidai_session', value: participant.token, domain: '127.0.0.1', path: '/', httpOnly: true, sameSite: 'Strict' }]);
    await page.goto('/account');
    await page.waitForLoadState('networkidle');
    await expect(page.getByRole('button', { name: 'تسجيل الخروج', exact: true })).toBeVisible();
    // A real outage also covers the CSRF preflight; no route mock can be
    // bypassed by a service-worker-owned request.
    await context.setOffline(true);
    await page.getByRole('button', { name: 'تسجيل الخروج', exact: true }).click();
    await expect(page.locator('main .form-error').filter({ hasText: 'تعذر الاتصال' })).toBeVisible();
    expect(await page.evaluate(async () => (await caches.keys()).filter(key => key.startsWith('ghidai-public-')).length)).toBe(1);
    expect((await fixture.owner.query('SELECT "revokedAt" FROM "Session" WHERE "userId"=$1', [participant.id])).rows[0].revokedAt).toBeNull();
    await context.setOffline(false);
    await page.getByRole('button', { name: 'تسجيل الخروج', exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    await expect.poll(() => page.evaluate(async () => (await caches.keys()).filter(key => key.startsWith('ghidai-public-')).length)).toBe(0);
    expect((await fixture.owner.query('SELECT "revokedAt" FROM "Session" WHERE "userId"=$1', [participant.id])).rows[0].revokedAt).not.toBeNull();
  } finally { await fixture.close(); }
});
test('P10 keyboard, zoom, motion, RTL and measured browser timing', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/login');
  await page.keyboard.press('Tab'); await expect(page.getByRole('link', { name: 'انتقل إلى المحتوى' })).toBeFocused();
  await page.keyboard.press('Enter'); await expect(page.locator('main')).toBeFocused();
  // Chromium layout emulation of browser zoom: preserve a >=320 CSS px layout.
  // Physical device zoom and assistive technology remain manual acceptance.
  const originalWidth = page.viewportSize()!.width;
  await page.setViewportSize({ width: Math.max(640, originalWidth), height: 1800 });
  await page.evaluate(() => { document.body.style.zoom = '2'; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
  await page.evaluate(() => { document.body.style.zoom = ''; });
  await page.setViewportSize({ width: originalWidth, height: 900 });
  const metrics = await page.evaluate(() => {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    return { domContentLoadedMs: navigation.domContentLoadedEventEnd - navigation.startTime, responseMs: navigation.responseEnd - navigation.startTime, scriptTransferBytes: resources.filter(entry => entry.initiatorType === 'script').reduce((sum, entry) => sum + entry.transferSize, 0), userAgent: navigator.userAgent, viewport: innerWidth };
  });
  await info.attach('p10-local-browser-measurements', { body: JSON.stringify(metrics), contentType: 'application/json' });
  expect(metrics.domContentLoadedMs).toBeGreaterThan(0);
});
for (const route of ['/today', '/my-programs', '/logs', '/progress', '/account', '/coach', '/coaching', '/admin', '/notifications', '/privacy']) {
  test(`P10 route accessibility and unauthorized-state layout ${route}`, async ({ page }) => {
    await page.goto(route);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('main')).toBeVisible();
    await expect(page.getByRole('navigation', { name: 'التنقل الرئيسي' }).getByRole('link')).toHaveCount(5);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.keyboard.press('Tab'); await expect(page.getByRole('link', { name: 'انتقل إلى المحتوى' })).toBeFocused();
    await page.keyboard.press('Enter'); await expect(page.locator('main')).toBeFocused();
    expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze()).violations).toEqual([]);
  });
}
