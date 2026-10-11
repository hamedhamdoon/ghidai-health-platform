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

## P2 database and security foundation

68 Prisma models, local migrations and tested RLS isolation. Authentication and feature APIs remain unimplemented. After starting Docker, run `npm run db:migrate:dev`, `npm run db:migrate:test`, `npm run db:generate`, and `npm run test:p2`.
See [implementation and commands](docs/P2-DATABASE-IMPLEMENTATION.md), [security](docs/P2-SECURITY-VALIDATION.md), [test results](docs/P2-TEST-RESULTS.md), and [handoff](docs/P2-HANDOFF.md). No cloud database or deployment.
