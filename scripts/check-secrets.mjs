import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
const secrets = ['.env.development.local', '.env.test.local','.env.p2.development.local','.env.p2.test.local','.env.p3.development.local','.env.p3.test.local'].flatMap(path => {
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf8').split(/\r?\n/).flatMap(line => {
    const index = line.indexOf('=');
    const key = line.slice(0,index);
    const value = line.slice(index+1);
    if (key.includes('PASSWORD')) return [value];
    if (key==='P3_KEY') return [value];
    if (key.endsWith('DATABASE_URL')) return [new URL(value).password];
    return [];
  });
}).filter(value => value.length >= 16);
for (const path of readdirSync('.').filter(name=>/^\.env\.p4\.fixtures-\d+\.local$/.test(name))) {
  const fixture=JSON.parse(readFileSync(path,'utf8'));
  for(const user of fixture.users??[])if(typeof user.password==='string'&&user.password.length>=16)secrets.push(user.password);
}
const suspicious = files.filter(path => {
  if (/(^|\/)\.env/.test(path) && path !== '.env.example') return true;
  if (!existsSync(path)) return false;
  const data = readFileSync(path);
  return secrets.some(secret => data.includes(Buffer.from(secret))) || /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----\r?\n[A-Za-z0-9+/=]{32}/.test(data.toString('utf8'));
});
if (suspicious.length) {
  console.error('FAIL: sensitive file or credential found in Git candidates. Values omitted. Files:', suspicious.join(', '));
  process.exitCode = 1;
} else console.log(`PASS: ${files.length} Git candidate files checked; ignored local credentials absent. This is a scoped scan, not a security audit.`);
