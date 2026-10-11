import { defineConfig } from '@playwright/test';
const port=process.env.GHIDAI_E2E_PORT ?? '3000';
if(!['3000','3100'].includes(port))throw new Error('Unsupported local E2E port.');
const baseURL=`http://127.0.0.1:${port}`;
export default defineConfig({ testDir: './tests/e2e', fullyParallel: true, workers: 2, use: { baseURL, browserName: 'chromium', screenshot: 'only-on-failure' }, projects: [360,768,1280].map(width => ({ name: `${width}px`, use: { viewport: { width, height: 900 } } })), webServer: { command: `npm run start -- --port ${port}`, url: baseURL, reuseExistingServer: false, timeout: 60000 } });
