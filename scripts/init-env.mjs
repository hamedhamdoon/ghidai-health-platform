import { randomBytes } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
const paths = ['.env.development.local', '.env.test.local'];
if (paths.some(existsSync)) {
  throw new Error('Local environment already exists; refusing to replace credentials.');
}
const dev = randomBytes(24).toString('hex');
const test = randomBytes(24).toString('hex');
writeFileSync(paths[0], `GHIDAI_ENV=development\nPOSTGRES_DEV_PASSWORD=${dev}\nPOSTGRES_TEST_PASSWORD=${test}\nDATABASE_URL=postgresql://ghidai_dev:${dev}@127.0.0.1:55432/ghidai_development\n`, { flag: 'wx', mode: 0o600 });
writeFileSync(paths[1], `GHIDAI_ENV=test\nTEST_DATABASE_URL=postgresql://ghidai_test:${test}@127.0.0.1:55433/ghidai_test\n`, { flag: 'wx', mode: 0o600 });
console.log('Created ignored development/test files. No credentials printed.');
