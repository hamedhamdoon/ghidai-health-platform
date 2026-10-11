import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';
import { assertLocalDatabase } from './src/server/db/local-database';
config({ path: '.env.development.local', quiet: true });
const environment=process.env.GHIDAI_ENV;
if(environment!=='development'&&environment!=='test')throw new Error('LOCAL_ENVIRONMENT_REQUIRED');
export default defineConfig({ schema: 'prisma/schema.prisma', datasource: { url: assertLocalDatabase(process.env.DATABASE_URL,environment) } });
