import { describe, expect, it } from 'vitest';
import { assertLocalDatabase } from '../../src/server/db/local-database';
const test = 'postgresql://ghidai_test:synthetic@127.0.0.1:55433/ghidai_test';
describe('database environment boundary', () => {
  it('allows only dedicated local test configuration', () => expect(assertLocalDatabase(test, 'test')).toBe(test));
  it.each([undefined, '', 'not-a-url', test.replace('127.0.0.1', 'production.example.com'), test.replace('55433', '55432'), test.replace('/ghidai_test', '/ghidai_development'), test.replace('ghidai_test:', 'admin:'), test + '?host=production.example.com', test.replace('postgresql:', 'https:'), test.replace(':synthetic@', '@')])('rejects unsafe configuration %#', (value) => expect(() => assertLocalDatabase(value, 'test')).toThrow());
  it('rejects development database from test runner', () => expect(() => assertLocalDatabase('postgresql://ghidai_dev:synthetic@127.0.0.1:55432/ghidai_development', 'test')).toThrow());
  it('rejects test database from development probe', () => expect(() => assertLocalDatabase(test, 'development')).toThrow());
});
