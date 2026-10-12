import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { writeFileSync,mkdirSync } from 'node:fs';
const probe=createServer();await new Promise<void>((resolve,reject)=>{probe.once('error',reject);probe.listen(3100,'127.0.0.1',()=>probe.close(()=>resolve()));});
const child=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3100'],{env:{...process.env,GHIDAI_AUTH_ENV:'test'},windowsHide:true,stdio:'ignore'});
const rows:unknown[]=[];
try {
 let ready=false;for(let i=0;i<100;i++){try{if((await fetch('http://127.0.0.1:3100/api/health',{signal:AbortSignal.timeout(1000)})).ok){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,300));}if(!ready)throw new Error('LOCAL_SERVER_UNAVAILABLE');
 const browser=await chromium.launch();
 try{for(const width of [360,768,1280]){
  const context=await browser.newContext({viewport:{width,height:900}}),page=await context.newPage();
  try {const cdp=await context.newCDPSession(page);await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:100,downloadThroughput:187500,uploadThroughput:93750});await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
   await page.addInitScript(()=>{const entries:PerformanceEntry[]=[];new PerformanceObserver(list=>entries.push(...list.getEntries())).observe({type:'largest-contentful-paint',buffered:true});Object.assign(window,{ghidaiLcp:entries});});
   await page.goto('http://127.0.0.1:3100/login',{waitUntil:'networkidle'});await page.getByRole('button',{name:'تسجيل الدخول',exact:true}).waitFor();
   const metrics=await page.evaluate(()=>{const n=performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming,lcp=(window as unknown as {ghidaiLcp:PerformanceEntry[]}).ghidaiLcp;return {domContentLoadedMs:Math.round(n.domContentLoadedEventEnd),loadMs:Math.round(n.loadEventEnd),lcpMs:Math.round(lcp.at(-1)?.startTime??0),transferredBytes:Math.round(n.transferSize+performance.getEntriesByType('resource').reduce((sum,e)=>sum+(e as PerformanceResourceTiming).transferSize,0)),horizontalOverflow:document.documentElement.scrollWidth>window.innerWidth};});
   rows.push({route:'/login',width,cpuSlowdown:4,latencyMs:100,downloadMbps:1.5,...metrics});console.log(`MEASURE /login ${width}px: DCL=${metrics.domContentLoadedMs}ms load=${metrics.loadMs}ms LCP=${metrics.lcpMs}ms transferred=${metrics.transferredBytes}bytes overflow=${metrics.horizontalOverflow}`);
  } finally {await context.close();}
 }}finally{await browser.close();}
 mkdirSync('test-results',{recursive:true});writeFileSync('test-results/p3-performance.json',JSON.stringify(rows,null,2));
}finally{child.kill();}
