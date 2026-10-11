# Changelog

## P2 — 2026-10-11

- 68 نموذج Prisma وتسع migrations ذرية، ownership/version FK وRLS وgrants/consents/audit وidempotency/outbox.
- عقود DTO/validation/revision/errors وحواجز بيئة محلية فقط.
- اختبارات PostgreSQL سلبية وتزامن وpool وPrisma، مع استمرار أساس P1 العربي.
- لا auth أوAPI جديد أوP3 أونشر؛ قرارات المالك مفتوحة. docs/P2-HANDOFF.md يوضح التسليم.

## 0.1.0 — P1 — 2026-10-11

- أساس Next.js App Router وReact وTypeScript strict وTailwind.
- هوية نصية أصلية وواجهة عربية RTL وخمس وجهات تأسيسية بحالات فراغ صريحة.
- خط Cairo محلي وأيقونات Lucide؛ لا استخدام الصور المرجعية في الواجهة.
- إعداد PostgreSQL development/test وPrisma دون GHIDAI models أو migrations.
- توليد أسرار محلية مستثناة وحاجز اتصال قواعد الاختبار.
- أدوات type/lint/unit/E2E، وفحوص وصول آلية وCI يدوي دون نشر.

الحالة النهائية ونتائج التنفيذ في docs/P1-IMPLEMENTATION-REPORT.md وdocs/P1-TEST-RESULTS.md.
