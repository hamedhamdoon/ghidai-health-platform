import { afterEach,describe,expect,it,vi } from 'vitest';
import { assertLocalRuntime,operationEnvironment,validateProductionContract } from '../../src/server/operations/config';
const {authQuery,appQuery,runtime}=vi.hoisted(()=>({authQuery:vi.fn(),appQuery:vi.fn(),runtime:vi.fn()}));
vi.mock('../../src/server/auth/runtime',()=>({authRuntime:runtime}));
import { GET as ready } from '../../src/app/api/ready/route';
import { GET as health } from '../../src/app/api/health/route';
import nextConfig from '../../next.config';
const fixture=()=>({NODE_ENV:'production',GHIDAI_RUNTIME_ENV:'production',GHIDAI_TRUSTED_ORIGIN:'https://ghidai.example',GHIDAI_APP_DATABASE_URL:'postgresql://ghidai_app:synthetic@db.example/ghidai?sslmode=verify-full',GHIDAI_AUTH_DATABASE_URL:'postgresql://ghidai_auth:synthetic@db.example/ghidai?sslmode=verify-full',GHIDAI_DATA_KEY:'0123456789abcdef'.repeat(4),GHIDAI_DATA_KEY_ID:'synthetic-test-v1'});
afterEach(()=>vi.resetAllMocks());
describe('P11 configuration boundary',()=>{
 it('sends baseline anti-framing, form-target and opener policies',async()=>{const rules=await nextConfig.headers!();const headers=rules.find(rule=>rule.source==='/:path*')!.headers;expect(headers).toContainEqual({key:'Content-Security-Policy',value:"base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'"});expect(headers).toContainEqual({key:'Cross-Origin-Opener-Policy',value:'same-origin'});});
 it('separates build mode from operation environment',()=>{expect(operationEnvironment({NODE_ENV:'production'})).toBe('development');expect(operationEnvironment({GHIDAI_AUTH_ENV:'test'})).toBe('test');expect(()=>operationEnvironment({GHIDAI_RUNTIME_ENV:'staging'})).toThrow();expect(()=>operationEnvironment({GHIDAI_RUNTIME_ENV:'production',GHIDAI_AUTH_ENV:'test'})).toThrow();});
 it('never enables production through local runtime',()=>{expect(()=>assertLocalRuntime({GHIDAI_RUNTIME_ENV:'production'})).toThrow('PRODUCTION_ADAPTER_NOT_ENABLED');expect(()=>assertLocalRuntime({GHIDAI_AUTH_ENV:'production'})).toThrow('PRODUCTION_ADAPTER_NOT_ENABLED');});
 it('validates future HTTPS/TLS/role/secret contract without returning secrets',()=>{const result=validateProductionContract(fixture());expect(result.secureCookies).toBe(true);expect(JSON.stringify(result)).not.toContain('synthetic@');expect(JSON.stringify(result)).not.toContain(fixture().GHIDAI_DATA_KEY);expect(Object.isFrozen(result)).toBe(true);});
 it.each([
  {GHIDAI_TRUSTED_ORIGIN:'http://ghidai.example'},{GHIDAI_TRUSTED_ORIGIN:'https://ghidai.example/'},{GHIDAI_TRUSTED_ORIGIN:'https://u:p@ghidai.example'},
  {GHIDAI_TRUSTED_ORIGIN:'https://127.0.0.1'},{GHIDAI_APP_DATABASE_URL:'postgresql://postgres:p@db.example/ghidai?sslmode=verify-full'},
  {GHIDAI_APP_DATABASE_URL:'postgresql://ghidai_app:p@db.example/ghidai?sslmode=require'},
  {GHIDAI_APP_DATABASE_URL:'postgresql://ghidai_app:p@db.example/ghidai?sslmode=verify-full&sslmode=disable'},
  {GHIDAI_AUTH_DATABASE_URL:'postgresql://ghidai_auth:p@db.example/other?sslmode=verify-full'},
  {GHIDAI_DATA_KEY:'0'.repeat(64)},{GHIDAI_DATA_KEY_ID:''},{NODE_ENV:'development'},
 ])('rejects unsafe or incomplete production contract %j',patch=>{expect(()=>validateProductionContract({...fixture(),...patch})).toThrow('GHIDAI_CONFIGURATION_REJECTED');});
 it('liveness is independent of database availability',async()=>{runtime.mockImplementation(()=>{throw new Error('synthetic private payload');});expect((await health().json()).database).toBe('not-checked');expect(runtime).not.toHaveBeenCalled();});
 it('readiness requires both restricted database pools',async()=>{runtime.mockReturnValue({auth:{query:authQuery},app:{query:appQuery}});authQuery.mockResolvedValue({rows:[{}]});appQuery.mockResolvedValue({rows:[{}]});const response=await ready();expect(response.status).toBe(200);expect(response.headers.get('cache-control')).toBe('no-store');expect(authQuery).toHaveBeenCalledWith('SELECT 1');expect(appQuery).toHaveBeenCalledWith('SELECT 1');});
 it('readiness failure is unavailable without diagnostics or credentials',async()=>{runtime.mockReturnValue({auth:{query:authQuery},app:{query:appQuery}});authQuery.mockRejectedValue(new Error('postgresql://secret@private/health'));appQuery.mockResolvedValue({rows:[]});const response=await ready();expect(response.status).toBe(503);expect(await response.json()).toEqual({status:'unavailable'});});
});
