import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { participantFixtures } from '../tests/integration/participant-fixtures';
import { ParticipationService } from '../src/server/participation/service';
import { TrackingService } from '../src/server/tracking/service';
import { localDate } from '../src/server/participation/rules';
import { randomUUID } from 'node:crypto';
import { gzipSync } from 'node:zlib';
const label=process.argv[2]??'diagnostic';
if(!/^[a-z0-9-]+$/.test(label))throw Error('UNSUPPORTED_LOCAL_MEASUREMENT');
const output=`.npm-cache/p12-r1/performance-${label}.json`;
if(existsSync(output))throw Error('MEASUREMENT_OUTPUT_ALREADY_EXISTS_USE_NEW_LABEL');
const buildId=readFileSync('.next/BUILD_ID','utf8').trim();
console.log(JSON.stringify({stage:'PREFLIGHT',label,buildId}));
const probe = createServer();
await new Promise<void>((resolve, reject) => { probe.once('error', reject); probe.listen(3100, '127.0.0.1', () => probe.close(() => resolve())); });
const f = await participantFixtures();
console.log(JSON.stringify({stage:'FIXTURES_READY',label}));
const program = await f.program(7, 'FLEXIBLE', undefined, true, true);
await new ParticipationService(f.auth).execute('enrollments', 'POST', {programId:program.p.id,versionId:program.v.id,startDate:localDate(new Date(),'Asia/Muscat'),goalOverrides:[]},f.a.token,null,randomUUID());
await new TrackingService(f.auth).execute('logs/water','POST',{amountMl:123,occurredAt:new Date().toISOString()},f.a.token,null,randomUUID(),null);
console.log(JSON.stringify({stage:'PROGRAM_READY',label}));
const server = spawn(process.execPath, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3100'], { env: { ...process.env, GHIDAI_AUTH_ENV: 'test' }, windowsHide: true, stdio: 'ignore' });
const rows: {route:string;width:number;[key:string]:unknown}[] = [];
const cohort = new Date().toISOString();
const routes = ['/', '/register', '/verify', '/login', '/forgot-password', '/reset-password', '/onboarding', '/account', '/account/security', '/my-programs', '/today', '/logs', '/progress', '/privacy', '/notifications', '/coaching', '/coach/participants', '/admin', '/admin/programs', '/admin/content'];
const adminReads=['admin/context','admin/content','admin/programs','admin/meals','admin/nutrition-plans'];
const requiredReads:Record<string,string[]>={
  '/onboarding':['me','me/goals'],'/account':['me','me/goals'],'/account/security':['me','me/sessions'],
  '/my-programs':['participant/programs','enrollments'],'/today':['today'],
  '/logs':['me','logs','habits',`reviews/${localDate(new Date(),'Asia/Muscat')}`],
  '/progress':['analytics','achievements','enrollments'],'/privacy':['privacy'],
  '/notifications':['notifications/settings','notifications'],'/coaching':['coaching/assignments'],
  '/coach/participants':['coach/participants'],'/admin':['admin/users','admin/assignments','admin/operations','admin/audit'],
  '/admin/programs':adminReads,'/admin/content':adminReads,
};
const scenarios=[360,768,1280].flatMap(width=>routes.map(route=>({width,route}))).filter(cell=>!rows.some(row=>row.width===cell.width&&row.route===cell.route));
const selectedScenarios=label.startsWith('shift-probe')?scenarios.filter(cell=>cell.width===768&&['/account/security','/privacy'].includes(cell.route)):scenarios;
try {
  let ready = false;
  for (let i = 0; i < 100; i++) { try { if ((await fetch('http://127.0.0.1:3100/api/health', { signal: AbortSignal.timeout(1000) })).ok) { ready = true; break; } } catch {} await new Promise(resolve => setTimeout(resolve, 300)); }
  if (!ready) throw Error('LOCAL_SERVER_UNAVAILABLE');
  console.log(JSON.stringify({stage:'SERVER_READY',label}));
  const browser = await chromium.launch();
  try {
    for (const {width,route} of selectedScenarios) {
      const context = await browser.newContext({ viewport: { width, height: 900 } });
      const failedApiStatuses: number[] = [];
      try {
        const authenticated = !['/','/register','/verify','/login','/forgot-password','/reset-password'].includes(route);
        const actor = route.startsWith('/admin') ? f.admin : route.startsWith('/coach/') ? f.reviewer : f.a;
        if(authenticated) await context.addCookies([{name:'ghidai_session',value:actor.token,url:'http://127.0.0.1:3100',httpOnly:true,sameSite:'Strict'}]);
        const page = await context.newPage(), cdp = await context.newCDPSession(page);
        const scriptEncodings: string[] = [];
        const scriptBodies: Promise<number>[]=[];
        let documentHtml='';
        page.on('response', response => {
          if(response.request().resourceType()==='script'){scriptEncodings.push(response.headers()['content-encoding']??'identity');scriptBodies.push(response.body().then(body=>gzipSync(body).length,()=>-1));}
          if(new URL(response.url()).pathname.startsWith('/api/v1/')&&response.status()>=400)failedApiStatuses.push(response.status());
        });
        await cdp.send('Network.enable'); await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
        await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 100, downloadThroughput: 187500, uploadThroughput: 93750 });
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 }); await cdp.send('Performance.enable');
        await page.addInitScript(() => {
          const metrics = { lcpMs: null as number | null, lcpElement:null as string|null, lcpResource:null as string|null, lcpSize:0, cls: 0, layoutShiftSum:0, layoutShifts:[] as {startTime:number;value:number;sources:unknown[]}[] };
          let clsWindowStarted=false,clsWindowStart=0,clsWindowLast=0,clsWindowValue=0;
          Object.assign(window, { ghidaiMetrics: metrics });
          new PerformanceObserver(list => list.getEntries().forEach(entry => { const lcp=entry as PerformanceEntry & {element:Element|null;url:string;size:number}; metrics.lcpMs = entry.startTime; metrics.lcpElement=lcp.element?`${lcp.element.tagName.toLowerCase()}${lcp.element.id?'#'+lcp.element.id:''}.${[...lcp.element.classList].join('.')}`:null;metrics.lcpResource=lcp.url||null;metrics.lcpSize=lcp.size; })).observe({ type: 'largest-contentful-paint', buffered: true });
          new PerformanceObserver(list => {for(const entry of list.getEntries()){
            const shift=entry as PerformanceEntry & {hadRecentInput:boolean;value:number;sources?:{node:Element|null;previousRect:DOMRectReadOnly;currentRect:DOMRectReadOnly}[]};
            if(shift.hadRecentInput)continue;
            metrics.layoutShiftSum+=shift.value;
            if(metrics.layoutShifts.length<500)metrics.layoutShifts.push({startTime:shift.startTime,value:shift.value,sources:(shift.sources??[]).map(source=>({element:source.node instanceof Element?`${source.node.tagName.toLowerCase()}.${[...source.node.classList].join('.')}`:null,previous:{x:source.previousRect.x,y:source.previousRect.y,width:source.previousRect.width,height:source.previousRect.height},current:{x:source.currentRect.x,y:source.currentRect.y,width:source.currentRect.width,height:source.currentRect.height}}))});
            if(clsWindowStarted&&shift.startTime-clsWindowLast<1000&&shift.startTime-clsWindowStart<5000)clsWindowValue+=shift.value;
            else{clsWindowStarted=true;clsWindowStart=shift.startTime;clsWindowValue=shift.value;}
            clsWindowLast=shift.startTime;metrics.cls=Math.max(metrics.cls,clsWindowValue);
          }}).observe({type:'layout-shift',buffered:true});
        });
        // Arm before navigation so fast API responses cannot be missed. The existing
        // 30-second bound also rejects shells which have not yet hydrated their APIs.
        const apiReadiness=(requiredReads[route]??[]).map(path=>page.waitForResponse(response=>new URL(response.url()).pathname===`/api/v1/${path}`&&response.status()===200,{timeout:30000}).then(()=>null,error=>error as Error));
        try { const response=await page.goto(`http://127.0.0.1:3100${route}`, { waitUntil: 'load' });documentHtml=await response?.text()??''; }
        catch(error) { console.error(JSON.stringify({route,width,cohort,error:'NAVIGATION_FAILED',type:error instanceof Error?error.name:'UNKNOWN'})); throw Error('MEASUREMENT_NAVIGATION_FAILED'); }
        await page.waitForLoadState('load');
        const apiReadinessResults=await Promise.all(apiReadiness);
        if(apiReadinessResults.some(error=>error!==null))throw Error('REQUIRED_AUTHENTICATED_API_READINESS_FAILED');
        await page.evaluate(()=>document.fonts.ready.then(()=>true));
        await page.waitForTimeout(1500);
        await page.waitForFunction(()=>!document.querySelector('main [aria-busy="true"]')&&!/جارٍ (التحميل|تحميل)/.test(document.querySelector('main')?.textContent??''));
        const metrics = await page.evaluate(() => {
          const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          const scripts = (performance.getEntriesByType('resource') as PerformanceResourceTiming[]).filter(entry => entry.initiatorType === 'script');
          const resources=(performance.getEntriesByType('resource') as PerformanceResourceTiming[]).map(item=>({path:new URL(item.name).pathname,initiator:item.initiatorType,startMs:item.startTime,endMs:item.responseEnd,encodedBytes:item.encodedBodySize,transferBytes:item.transferSize}));
          return { ...(window as unknown as { ghidaiMetrics: {lcpMs:number|null;cls:number} }).ghidaiMetrics, resources, timeToFirstByteMs:nav.responseStart, domContentLoadedMs: nav.domContentLoadedEventEnd, scriptEncodedBytes: scripts.reduce((sum, item) => sum + item.encodedBodySize, 0), transferBytes: nav.transferSize + (performance.getEntriesByType('resource') as PerformanceResourceTiming[]).reduce((sum, item) => sum + item.transferSize, 0), horizontalOverflow: document.documentElement.scrollWidth > innerWidth, userAgent: navigator.userAgent };
        });
        const runtime = await cdp.send('Performance.getMetrics');
        if(metrics.lcpMs===null||failedApiStatuses.length)throw Error('INCOMPLETE_OR_FAILED_INTERFACE_MEASUREMENT');
        const heapBytes = runtime.metrics.find(metric => metric.name === 'JSHeapUsedSize')?.value;
        // Decoded response bodies are separately gzip-compressed, including initial inline
        // hydration/RSC scripts. This is a reproducible payload estimate, not wire encoding.
        const externalGzipResults=await Promise.allSettled(scriptBodies);
        const externalScriptsGzipEstimateBytes=externalGzipResults.reduce((sum,result)=>sum+(result.status==='fulfilled'&&result.value>=0?result.value:0),0);
        const inlineScripts=[...documentHtml.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(match=>match[1]).filter(Boolean);
        const inlineScriptsGzipEstimateBytes=inlineScripts.reduce((sum,body)=>sum+gzipSync(body).length,0);
        const gzipMetrics={gzipEstimateMethod:'sum of separately gzip-compressed decoded script response bodies and original document inline script bodies; includes modules loaded during observation',gzipEstimateComplete:externalGzipResults.every(result=>result.status==='fulfilled'&&result.value>=0),externalScriptsGzipEstimateBytes,inlineScriptsGzipEstimateBytes,initialJavascriptGzipEstimateBytes:externalScriptsGzipEstimateBytes+inlineScriptsGzipEstimateBytes};
        if(await page.locator('h1').count()===0)throw Error('MISSING_ROUTE_HEADING');
        const row = { route, width, cohort, buildId, clsMethod:'maximum session window; gap <1000ms, duration <5000ms, recent input excluded', readiness:'load + required successful authenticated API reads (30s bound armed before navigation) + fonts.ready + 1500ms observation + no main loading state',requiredApiReads:requiredReads[route]??[], authenticated, sampleCount: 1, cpuSlowdown: 4, latencyMs: 100, downloadMbps: 1.5, heapBytes, scriptEncodings, externalScriptsAllGzip:scriptEncodings.length>0&&scriptEncodings.every(value=>value==='gzip'), failedApiStatuses, ...metrics };
        Object.assign(row,gzipMetrics);rows.push(row); console.log(JSON.stringify(row));
      } catch(error) {rows.push({route,width,cohort,buildId,status:'NOT TESTED',failedApiStatuses,error:error instanceof Error?error.message:'UNKNOWN'});console.error(JSON.stringify(rows.at(-1)));} finally { await context.close(); mkdirSync('.npm-cache/p12-r1', {recursive:true});writeFileSync(output,JSON.stringify(rows,null,2)); }
    }
  } finally { await browser.close(); }
  mkdirSync('.npm-cache/p12-r1', { recursive: true }); writeFileSync(output, JSON.stringify(rows, null, 2));
  const valid=rows.filter(row=>row.status!=='NOT TESTED');
  const summary={cohort,buildId,intended:60,attempted:rows.length,valid:valid.length,notTested:60-valid.length,lcpOverBudget:valid.filter(row=>Number(row.lcpMs)>2500).length,clsOverBudget:valid.filter(row=>Number(row.cls)>0.1).length};
  writeFileSync(output.replace('.json','-summary.json'),JSON.stringify(summary,null,2));console.log(JSON.stringify(summary));
  if(valid.length!==60)process.exitCode=1;
} finally { server.kill(); await f.close(); }
