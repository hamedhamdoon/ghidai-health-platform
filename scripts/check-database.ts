import { config } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';
import { assertLocalDatabase } from '../src/server/db/local-database';
const environment = process.argv[2];
if (environment !== 'test' && environment !== 'development') throw new Error('Specify development or test.');
config({ path: `.env.${environment === 'test' ? 'test' : 'development'}.local`, quiet: true });
if (process.env.GHIDAI_ENV !== environment) throw new Error('Environment mismatch.');
const connectionString = assertLocalDatabase(process.env[environment === 'test' ? 'TEST_DATABASE_URL' : 'DATABASE_URL'], environment);
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString, connectionTimeoutMillis: 5000 }) });
try {
  const result = await prisma.$queryRaw<{ database: string; user: string; schemas: bigint }[]>`SELECT current_database() AS database, current_user AS user, (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public') AS schemas`;
  const expected = environment === 'test' ? 'ghidai_test' : 'ghidai_development';
  if (result[0]?.database !== expected) throw new Error('Unexpected database detected.');
  if (result[0].schemas !== 0n) {
    const migrations = await prisma.$queryRaw<{ count: bigint }[]>`SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`;
    if (migrations[0]?.count !== 9n) throw new Error('Unexpected migration baseline.');
  }
  // Session-local temporary table; never creates persistent GHIDAI schema.
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`CREATE TEMP TABLE p1_connection_probe (value integer) ON COMMIT DROP`;
    await tx.$executeRaw`INSERT INTO p1_connection_probe VALUES (1)`;
    const rows = await tx.$queryRaw<{ value: number }[]>`SELECT value FROM p1_connection_probe`;
    if (rows[0]?.value !== 1) throw new Error('Temporary round-trip failed.');
  });
  console.log(`PASS ${environment}: Prisma connection, dedicated database, recognized migration baseline, temporary write/read.`);
} catch {
  console.error(`FAIL ${environment}: connection or isolation probe failed. No credentials logged.`);
  process.exitCode = 1;
} finally { await prisma.$disconnect(); }
