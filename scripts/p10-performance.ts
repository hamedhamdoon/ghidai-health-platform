import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdirSync, writeFileSync } from 'node:fs';
const probe = createServer();
await new Promise<void>((resolve, reject) => { probe.once('error', reject); probe.listen(3100, '127.0.0.1', () => probe.close(() => resolve())); });
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3100'], { env: { ...process.env, GHIDAI_AUTH_ENV: 'test' }, windowsHide: true, stdio: 'ignore' });
const rows: unknown[] = [];
try {
  let ready = false;
  for (let i = 0; i < 100; i++) { try { if ((await fetch('http://127.0.0.1:3100/api/health', { signal: AbortSignal.timeout(1000) })).ok) { ready = true; break; } } catch {} await new Promise(resolve => setTimeout(resolve, 300)); }
  if (!ready) throw Error('LOCAL_SERVER_UNAVAILABLE');
  const browser = await chromium.launch();
  try {
    for (const width of [360, 768, 1280]) for (const route of ['/', '/login', '/today', '/privacy']) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      try {
        const page = await context.newPage(), cdp = await context.newCDPSession(page);
        await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
        await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 100, downloadThroughput: 187500, uploadThroughput: 93750 });
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 }); await cdp.send('Performance.enable');
        await page.addInitScript(() => {
          const metrics = { lcpMs: null as number | null, cls: 0 };
          Object.assign(window, { ghidaiMetrics: metrics });
          new PerformanceObserver(list => list.getEntries().forEach(entry => { metrics.lcpMs = entry.startTime; })).observe({ type: 'largest-contentful-paint', buffered: true });
          new PerformanceObserver(list => list.getEntries().forEach(entry => { const shift = entry as PerformanceEntry & { hadRecentInput: boolean; value: number }; if (!shift.hadRecentInput) metrics.cls += shift.value; })).observe({ type: 'layout-shift', buffered: true });
        });
        await page.goto(`http://127.0.0.1:3100${route}`, { waitUntil: 'networkidle' });
        await page.waitForLoadState('load');
        const metrics = await page.evaluate(() => {
          const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          const scripts = (performance.getEntriesByType('resource') as PerformanceResourceTiming[]).filter(entry => entry.initiatorType === 'script');
          return { ...(window as unknown as { ghidaiMetrics: object }).ghidaiMetrics, domContentLoadedMs: nav.domContentLoadedEventEnd, scriptEncodedBytes: scripts.reduce((sum, item) => sum + item.encodedBodySize, 0), transferBytes: nav.transferSize + (performance.getEntriesByType('resource') as PerformanceResourceTiming[]).reduce((sum, item) => sum + item.transferSize, 0), horizontalOverflow: document.documentElement.scrollWidth > innerWidth, userAgent: navigator.userAgent };
        });
        const runtime = await cdp.send('Performance.getMetrics');
        const heapBytes = runtime.metrics.find(metric => metric.name === 'JSHeapUsedSize')?.value;
        const row = { route, width, authenticated: false, sampleCount: 1, cpuSlowdown: 4, latencyMs: 100, downloadMbps: 1.5, heapBytes, ...metrics };
        rows.push(row); console.log(JSON.stringify(row));
      } finally { await context.close(); }
    }
  } finally { await browser.close(); }
  mkdirSync('.npm-cache', { recursive: true }); writeFileSync('.npm-cache/p10-performance.json', JSON.stringify(rows, null, 2));
} finally { server.kill(); }
