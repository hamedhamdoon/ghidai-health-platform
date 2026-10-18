import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { participantFixtures } from '../tests/integration/participant-fixtures';
import { ParticipationService } from '../src/server/participation/service';
import { TrackingService } from '../src/server/tracking/service';
import { localDate } from '../src/server/participation/rules';
import { randomUUID } from 'node:crypto';
const resume=process.argv[2]==='resume';
if(process.argv[2]&&!resume)throw Error('UNSUPPORTED_LOCAL_MEASUREMENT');
const buildId=readFileSync('.next/BUILD_ID','utf8').trim();
const probe = createServer();
await new Promise<void>((resolve, reject) => { probe.once('error', reject); probe.listen(3100, '127.0.0.1', () => probe.close(() => resolve())); });
const f = await participantFixtures();
const program = await f.program(7, 'FLEXIBLE', undefined, true, true);
await new ParticipationService(f.auth).execute('enrollments', 'POST', {programId:program.p.id,versionId:program.v.id,startDate:localDate(new Date(),'Asia/Muscat'),goalOverrides:[]},f.a.token,null,randomUUID());
await new TrackingService(f.auth).execute('logs/water','POST',{amountMl:123,occurredAt:new Date().toISOString()},f.a.token,null,randomUUID(),null);
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3100'], { env: { ...process.env, GHIDAI_AUTH_ENV: 'test' }, windowsHide: true, stdio: 'ignore' });
const rows: {route:string;width:number;[key:string]:unknown}[] = resume ? JSON.parse(readFileSync('.npm-cache/p12/browser-performance.json','utf8')) : [];
const cohort = new Date().toISOString();
const routes = ['/', '/register', '/verify', '/login', '/forgot-password', '/reset-password', '/onboarding', '/account', '/account/security', '/my-programs', '/today', '/logs', '/progress', '/privacy', '/notifications', '/coaching', '/coach/participants', '/admin', '/admin/programs', '/admin/content'];
const scenarios=[360,768,1280].flatMap(width=>routes.map(route=>({width,route}))).filter(cell=>!rows.some(row=>row.width===cell.width&&row.route===cell.route));
try {
  let ready = false;
  for (let i = 0; i < 100; i++) { try { if ((await fetch('http://127.0.0.1:3100/api/health', { signal: AbortSignal.timeout(1000) })).ok) { ready = true; break; } } catch {} await new Promise(resolve => setTimeout(resolve, 300)); }
  if (!ready) throw Error('LOCAL_SERVER_UNAVAILABLE');
  const browser = await chromium.launch();
  try {
    for (const {width,route} of scenarios) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      try {
        const authenticated = !['/','/register','/verify','/login','/forgot-password','/reset-password'].includes(route);
        const actor = route.startsWith('/admin') ? f.admin : route.startsWith('/coach/') ? f.reviewer : f.a;
        if(authenticated) await context.addCookies([{name:'ghidai_session',value:actor.token,url:'http://127.0.0.1:3100',httpOnly:true,sameSite:'Strict'}]);
        const page = await context.newPage(), cdp = await context.newCDPSession(page);
        const scriptEncodings: string[] = [], failedApiStatuses: number[] = [];
        page.on('response', response => {
          if(response.request().resourceType()==='script')scriptEncodings.push(response.headers()['content-encoding']??'identity');
          if(new URL(response.url()).pathname.startsWith('/api/v1/')&&response.status()>=400)failedApiStatuses.push(response.status());
        });
        await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
        await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 100, downloadThroughput: 187500, uploadThroughput: 93750 });
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 }); await cdp.send('Performance.enable');
        await page.addInitScript(() => {
          const metrics = { lcpMs: null as number | null, cls: 0, layoutShiftSum:0, layoutShifts:[] as {startTime:number;value:number}[] };
          let clsWindowStarted=false,clsWindowStart=0,clsWindowLast=0,clsWindowValue=0;
          Object.assign(window, { ghidaiMetrics: metrics });
          new PerformanceObserver(list => list.getEntries().forEach(entry => { metrics.lcpMs = entry.startTime; })).observe({ type: 'largest-contentful-paint', buffered: true });
          new PerformanceObserver(list => {for(const entry of list.getEntries()){
            const shift=entry as PerformanceEntry & {hadRecentInput:boolean;value:number};
            if(shift.hadRecentInput)continue;
            metrics.layoutShiftSum+=shift.value;
            if(metrics.layoutShifts.length<500)metrics.layoutShifts.push({startTime:shift.startTime,value:shift.value});
            if(clsWindowStarted&&shift.startTime-clsWindowLast<1000&&shift.startTime-clsWindowStart<5000)clsWindowValue+=shift.value;
            else{clsWindowStarted=true;clsWindowStart=shift.startTime;clsWindowValue=shift.value;}
            clsWindowLast=shift.startTime;metrics.cls=Math.max(metrics.cls,clsWindowValue);
          }}).observe({type:'layout-shift',buffered:true});
        });
        try { await page.goto(`http://127.0.0.1:3100${route}`, { waitUntil: 'load' }); }
        catch(error) { console.error(JSON.stringify({route,width,cohort,error:'NAVIGATION_FAILED',type:error instanceof Error?error.name:'UNKNOWN'})); throw Error('MEASUREMENT_NAVIGATION_FAILED'); }
        await page.waitForLoadState('load');
        await page.evaluate(()=>document.fonts.ready.then(()=>true));
        await page.waitForTimeout(1500);
        await page.waitForFunction(()=>!document.querySelector('main [aria-busy="true"]')&&!document.querySelector('main')?.textContent?.includes('جارٍ التحميل'));
        const metrics = await page.evaluate(() => {
          const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          const scripts = (performance.getEntriesByType('resource') as PerformanceResourceTiming[]).filter(entry => entry.initiatorType === 'script');
          return { ...(window as unknown as { ghidaiMetrics: object }).ghidaiMetrics, domContentLoadedMs: nav.domContentLoadedEventEnd, scriptEncodedBytes: scripts.reduce((sum, item) => sum + item.encodedBodySize, 0), transferBytes: nav.transferSize + (performance.getEntriesByType('resource') as PerformanceResourceTiming[]).reduce((sum, item) => sum + item.transferSize, 0), horizontalOverflow: document.documentElement.scrollWidth > innerWidth, userAgent: navigator.userAgent };
        });
        const runtime = await cdp.send('Performance.getMetrics');
        const heapBytes = runtime.metrics.find(metric => metric.name === 'JSHeapUsedSize')?.value;
        if(await page.locator('h1').count()===0)throw Error('MISSING_ROUTE_HEADING');
        const row = { route, width, cohort, buildId, clsMethod:'maximum session window; gap <1000ms, duration <5000ms, recent input excluded', readiness:'load + fonts.ready + 1500ms observation + no main loading state', authenticated, sampleCount: 1, cpuSlowdown: 4, latencyMs: 100, downloadMbps: 1.5, heapBytes, scriptEncodings, externalScriptsAllGzip:scriptEncodings.length>0&&scriptEncodings.every(value=>value==='gzip'), failedApiStatuses, ...metrics };
        rows.push(row); console.log(JSON.stringify(row));
        mkdirSync('.npm-cache/p12', { recursive: true }); writeFileSync('.npm-cache/p12/browser-performance.json', JSON.stringify(rows, null, 2));
      } finally { await context.close(); }
    }
  } finally { await browser.close(); }
  mkdirSync('.npm-cache/p12', { recursive: true }); writeFileSync('.npm-cache/p12/browser-performance.json', JSON.stringify(rows, null, 2));
} finally { server.kill(); await f.close(); }
