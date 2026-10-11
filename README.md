# GHIDAI | غذائي قبل دوائي

A mobile-first digital health and lifestyle platform.

## Technology
- Next.js
- TypeScript
- Tailwind CSS
- PostgreSQL
- Prisma
- Progressive Web App (PWA)

## Development
Local: C:\Users\User\Desktop\platforms\Ghidai

Repository: https://github.com/hamedhamdoon/ghidai-health-platform

## P1 local foundation

Arabic RTL Next.js foundation; accounts, tracking and programs are not implemented yet.
Use Node 24.20.0 LTS and Docker Desktop (Linux engine).

```powershell
npm ci
npm run env:init
npm run db:generate
npm run db:up
npm run dev
```

Open http://127.0.0.1:3000. No public deployment.
See [local development](docs/LOCAL-DEVELOPMENT.md), [P1 environment audit](docs/P1-ENVIRONMENT-AUDIT.md), [P1 implementation report](docs/P1-IMPLEMENTATION-REPORT.md), and [actual test results](docs/P1-TEST-RESULTS.md).
