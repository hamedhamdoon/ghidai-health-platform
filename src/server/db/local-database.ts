export type DatabaseEnvironment = 'development' | 'test';
export function assertLocalAppDatabase(value: string, environment: DatabaseEnvironment): string {
  let url:URL;
  try {url=new URL(value);}catch{throw new Error('Invalid application database configuration.');}
  if(url.username!=='ghidai_app')throw new Error('Restricted application account required.');
  url.username=environment==='test'?'ghidai_test':'ghidai_dev';
  assertLocalDatabase(url.toString(),environment);
  return value;
}
export function assertLocalDatabase(value: string | undefined, environment: DatabaseEnvironment): string {
  if (!value) throw new Error('Missing local database configuration.');
  let url: URL;
  try { url = new URL(value); } catch { throw new Error('Invalid database configuration.'); }
  const expected = environment === 'test'
    ? { port: '55433', name: '/ghidai_test', user: 'ghidai_test' }
    : { port: '55432', name: '/ghidai_development', user: 'ghidai_dev' };
  if (url.protocol !== 'postgresql:' || url.hostname !== '127.0.0.1' || url.port !== expected.port || url.pathname !== expected.name || url.username !== expected.user || !url.password || url.search || url.hash) {
    throw new Error('Only the dedicated GHIDAI loopback database is allowed.');
  }
  return value;
}
