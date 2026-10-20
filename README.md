# GHIDAI | غذائي قبل دوائي

A mobile-first digital health and lifestyle platform.

## P12-R1 — 2026-10-20

Latest local remediation: [handoff](docs/P12-R1-FINAL-HANDOFF.md), [functional evidence](docs/P12-R1-FUNCTIONAL-RESULTS.md), [regression](docs/P12-R1-REGRESSION-RESULTS.md). Frozen replay:135 units,172 PostgreSQL groups,7 relational assertions,9 full-graph groups,162 E2E and11 outage groups. Participant nutrition and synthetic authoring have direct acceptance evidence; exceptional corrections and sensitive reports remain restricted. Security, performance and operational gates prevent unconditional acceptance. All owner decisions remain OPEN; no public launch or main merge.

## P12 — قبول محلي ومرشح مراجعة، 2026-10-18

**LOCAL RELEASE CANDIDATE — PUBLIC LAUNCH BLOCKED**. أحدث حكم ونطاق الاختبارات في [تقرير القبول](docs/P12-FINAL-ACCEPTANCE-REPORT.md) و[نتائج الانحدار](docs/P12-REGRESSION-TEST-RESULTS.md). نجاح الرحلات الحالية لا يغلق فجوات التغذية للمشارك والتصحيح والتأليف الإداري أو الاعتمادات A-01–A-12. الفرع `feature/ghidai-p12-final-acceptance`؛ لا نشر عام أو إنتاج أو دمج main. الأقسام التالية تاريخية؛ تعليمات المرشح والاستعادة والبوابات في [حزمة RC المحلية](docs/P12-RELEASE-CANDIDATE.md).

## الحالة الأحدث — P8–P10 محليًا،2026-10-14

إضافة متابعة مدرب بموافقة ونطاق وانتهاء، وإدارة حسابات اصطناعية دون وصول صحة عام، وتنبيهات داخل التطبيق بفحص محلي صريح، وخصوصية وتصدير JSON/CSV مشفر وخاص. طلب الحذف مؤجل؛اختبار الحذف علائقي في مخطط مستقل فقط. PWA/أصول عامة/offline messages وإتاحة وقياسات محلية؛لاoffline health queue أوWeb Push أومجدول إنتاجي. تفاصيل النتائج والقيود ونقاطGit في[تقرير التكامل](docs/P8-P10-INTEGRATION-REPORT.md) و[P8](docs/P8-HANDOFF.md)/[P9](docs/P9-HANDOFF.md)/[P10](docs/P10-HANDOFF.md).

مع حاوياتGHIDAI والأسرار المحلية الحالية: `npm run db:migrate:platform:dev` و`npm run db:migrate:platform:test` ثم `npm run db:generate` و`npm run dev`. حسابي يربط موافقات المدربين والتنبيهات والخصوصية؛مساحات `/coach` و`/admin` محدودة بالصلاحية الاصطناعية. لا تعِد إنشاءtmpfs أوتحذف مخططات/Volumes. A-01..A-12 مفتوحة كليًا/جزئيًا؛لاP11/P12 أوإنتاج أوmain merge. الأقسام التالية تاريخ المراحل السابقة.

## الحالة الحالية — P5–P7 محليًا

تجربة المشارك تحفظ في PostgreSQL: استعراض البرامج المسموحة والانضمام لنسخة ثابتة، اليوم والجدول والإتمام والتراجع، سجلات شخصية للماء والخطوات والرياضة والنوم والعادات والتقييم، وتحليل وشارات وشهادات JSON خاصة للاختبار. الواجهات عربية RTL بخمس وجهات. الأقسام P1–P4 أدناه توثق نقاطها التاريخية.

بعد إعداد الأسرار المحلية وتشغيل حاويات المشروع الموجودة، استخدم `npm run db:migrate:participant:dev` و`npm run db:migrate:participant:test` و`npm run db:generate` ثم `npm run dev`. الرابط المحلي `http://127.0.0.1:3000`. لا تعِد إنشاء حاوية الاختبار أو تحذف مخططاتها عند إعادة الفحص.

راجع [تقرير التكامل والنتائج وحدودها](docs/P5-P7-INTEGRATION-REPORT.md)، وتسليم [P5](docs/P5-HANDOFF.md)، [P6](docs/P6-HANDOFF.md)، [P7](docs/P7-HANDOFF.md). سياسات A-03/A-04 وأهداف ومحتوى الاستخدام الحقيقي لم تعتمد؛ كل أمثلة المشاركة والاستحقاق اصطناعية ومحلية. جميع A-01..A-12 تحتفظ بحالتها. لا P8 أو إنتاج أو تسجيل عام على الإنترنت أو دمج main.

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

## P3 local authentication and profile (historical checkpoint)

P1/P2 paragraphs above describe their historical checkpoints. P3 implements real local registration, Mailpit verification/reset email, Argon2id login, opaque sessions, reauthentication, TOTP/recovery codes, profile/preferences, optional future goals and revocable consents. Synthetic accounts only; A-02/A-08/A-12 remain open. No programs, tracking, public deployment or admin bootstrap.

Use `npm run db:migrate:p3:dev`, `npm run db:migrate:p3:test`, `npm run db:generate`, then `npm run dev`. Start project-scoped PostgreSQL/Mailpit only after checking ports and existing resources. Open the app at http://127.0.0.1:3000 and Mailpit at http://127.0.0.1:8025. Keep all local env files private.

See [P3 implementation](docs/P3-AUTH-IMPLEMENTATION.md), [security validation](docs/P3-SECURITY-VALIDATION.md), [actual test results](docs/P3-TEST-RESULTS.md), and [handoff with exact setup/test/retry commands](docs/P3-HANDOFF.md).

## P4 — المحرك المحلي (نقطة تاريخية)

محرك البرامج والإصدارات والمحتوى والمراجعة والوجبات والبدائل منفذ على فرع P4. التشغيل والتأهيل الاصطناعي المؤقت، الاختبارات، والقيود في [P4-HANDOFF](docs/P4-HANDOFF.md). لا مشاركة أو جدول مستخدم فعلي أو P5/P6؛ المحتوى الحقيقي محجوب حتى اعتماد المالك والمختص.

## P11 — local operational preparation

P11 is now authorized and locally implemented; historical statements that P11 has not started describe earlier checkpoints. Current evidence/limitations: [P11 handoff](docs/P11-HANDOFF.md) and [tests](docs/P11-TEST-RESULTS.md). Production remains disabled, no provider is approved/activated and P12 has not started. Manual commands: `npm run config:production:check` validates injected future contracts only (missing values reject); `npm run ops:monitor -- test <isolated-schema>`; `npm run test:p11:backup`; browser/capacity commands require the built local app, available port3100 and fresh isolated schema. Do not run DB schema selection while a browser server is active.
