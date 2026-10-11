import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';
config({ path: '.env.development.local', quiet: true });
export default defineConfig({ schema: 'prisma/schema.prisma', datasource: { url: process.env.DATABASE_URL } });
