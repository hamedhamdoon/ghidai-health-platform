# Changelog

## P5–P7 — 2026-10-13، local participant experience

- مشاركات وإصدارات ثابتة وأيام ومهام محفوظة، بداية مرنة/ثابتة، إتمام وتراجع وانسحاب مع التاريخ، وحالات مشاركة محددة.
- سجلات شخصية مستقلة للماء والخطوات والرياضة المكتملة والنوم والعادات والتقييم الإصداري؛ تصحيح وحذف منطقي وتدقيق مشفر وإعادة إتمام كمي ذرية.
- حساب C/N وفصل الاختيارية والمستقبل والغياب عن صفر، فلاتر ورسوم فعلية، شارات إصدارية وسحب، وشهادات JSON خاصة بعلامة TEST وإعادة فحص المصدر عند التنزيل.
- تسويات RV-07/RV-08/RV-09 وحالات مشاركة RV-10، RLS وجلسات P3 وإعادة طلب وتزامن؛ خمس migrations إضافية فوق P4، تشمل انتهاء التمرين وإتاحة مخطط التقييم المكتمل، دون تعديل التاريخية.
- نقاط P5/P6 مستقلة محفوظة؛ P7 والتكامل النهائي يسجلان بعد اكتمال الفحص. النتائج الفعلية والمعلّقة والإخفاقات المصححة في [تقرير التكامل](docs/P5-P7-INTEGRATION-REPORT.md).
- جميع A-01..A-12 تحتفظ بحالتها؛ لا شهادة حقيقية أو محتوى صحي مرجعي منشور أو P8 أو سحابة أو نشر أو دمج main.

## P3 — 2026-10-12

- مصادقة محلية فعلية بـArgon2id وopaque sessions وemail verification/reset وreauth وTOTP/recovery وCSRF/rate limiting.
- Mailpit محلي مقيد loopback، encrypted outbox وإعادة محاولة؛ اختبار انقطاع واستعادة دون حذف موارد.
- ملف عربي RTL وتفضيلات وأهداف اختيارية وموافقات قابلة للسحب، خلف VerifiedActor وRLS وPrisma.
- ثلاث migrations إضافية؛ حفظ migrations P2 وAGENTS؛ RV03/04/07 مسوّاة ضمنP3 فقط.
- اختبارات PostgreSQL/Playwright سلبية وتزامن وregression وتقارير تسليم؛ لاP4/mainmerge/cloud/deploy أوإغلاقA02/A08/A12.

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

## P4 — 2026-10-12 (local development)

- Dynamic program/version authoring, flexible duration, recurrence and relative schedules backed by PostgreSQL.
- Independent hash-bound content review with immutable qualification evidence, meal/alternative graphs and synthetic-only publication gates.
- Arabic RTL authoring/review/publication UI, temporary local permissions, RLS, optimistic concurrency and encrypted idempotency receipts.
- Additional migrations only; P1–P3 regression and documented P4 validation. Real health publication and P5 remain blocked pending owner authorization.
