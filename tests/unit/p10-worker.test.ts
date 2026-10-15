import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
function worker(extra: Record<string, unknown> = {}) {
  const handlers = new Map<string, (event: Record<string, unknown>) => void>();
  const context = { URL, Response, ...extra, self: { location: { origin: 'https://ghidai.test' }, addEventListener: (name: string, fn: (event: Record<string, unknown>) => void) => handlers.set(name, fn) } };
  vm.runInNewContext(readFileSync('public/sw.js', 'utf8'), context);
  return handlers;
}
describe('P10 worker cache boundaries', () => {
  it.each(['/api/v1/today', '/api/v1/auth/csrf', '/api/health', '/today', '/account', '/_next/static/chunk.js', '/icons/ghidai-192.png?token=private', 'https://other.test/icons/ghidai-192.png'])('does not intercept sensitive or unlisted requests: %s', path => {
    let intercepted = false;
    worker().get('fetch')!({ request: { method: 'GET', mode: 'cors', url: new URL(path, 'https://ghidai.test').href }, respondWith: () => { intercepted = true; } });
    expect(intercepted).toBe(false);
  });
  it('never intercepts mutations', () => {
    worker().get('fetch')!({ request: { method: 'POST', url: 'https://ghidai.test/icons/ghidai-192.png' }, respondWith: () => { throw Error('mutation intercepted'); } });
  });
  it('uses cached public assets without requesting the network', async () => {
    let response: Promise<Response> | undefined;
    worker({ caches: { match: async () => new Response('public') }, fetch: () => { throw Error('unexpected fetch'); } }).get('fetch')!({ request: { method: 'GET', mode: 'cors', url: 'https://ghidai.test/icons/ghidai-192.png' }, respondWith: (value: Promise<Response>) => { response = value; } });
    expect(await (await response!).text()).toBe('public');
  });
  it('offline navigation returns only generic cached offline HTML', async () => {
    let response: Promise<Response> | undefined;
    worker({ caches: { match: async (path: string) => { expect(path).toBe('/offline.html'); return new Response('offline'); } }, fetch: async () => { throw Error('offline'); } }).get('fetch')!({ request: { method: 'GET', mode: 'navigate', url: 'https://ghidai.test/account' }, respondWith: (value: Promise<Response>) => { response = value; } });
    expect(await (await response!).text()).toBe('offline');
  });
  it('logout deletion touches GHIDAI public caches only', async () => {
    const deleted: string[] = []; let complete: Promise<unknown> | undefined;
    worker({ caches: { keys: async () => ['ghidai-public-v1', 'other-app'], delete: async (key: string) => { deleted.push(key); return true; } } }).get('message')!({ data: { type: 'CLEAR_PUBLIC_CACHE' }, ports: [], waitUntil: (value: Promise<unknown>) => { complete = value; } });
    await complete; expect(deleted).toEqual(['ghidai-public-v1']);
  });
  it('manifest uses RTL and required icon sizes', async () => {
    const manifest = (await import('../../src/app/manifest')).default();
    expect(manifest.dir).toBe('rtl'); expect(manifest.display).toBe('standalone');
    expect(manifest.icons?.map(icon => icon.sizes)).toContain('192x192');
    expect(manifest.icons?.map(icon => icon.sizes)).toContain('512x512');
  });
});
