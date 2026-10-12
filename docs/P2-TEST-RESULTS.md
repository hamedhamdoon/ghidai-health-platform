# P2 — نتائج الاختبارات المنفذة

2026-10-11 Asia/Muscat؛ Windows11/Node24.20.0/PostgreSQL17.6/Prisma7.10.0. فرع P2 من P1 `78f6e91156f95e8853d0adbb438dea137d29da10`؛ هذه نتائج الشيفرة المرشحة للـCommit، لا نجاح CI مفترض.

| التحقق | النتيجة |
|---|---|
| Git baseline | PASS: نظيف ومطابق؛ فرع feature/ghidai-p2-data-security مستقل |
| db:migrate:dev / test | PASS:9 migrations في القاعدتين، deploy متكرر وchecksums متطابقة؛ public بلا بيانات |
| db:validate / generate | PASS:68 نموذج وPrisma Client7.10.0 |
| test:p2 | PASS:42 مجموعة قبول حقيقية وreplay علىschema اختبار نظيفة، بلا حذف بيانات/DB/volume |
| db:check / test:db | PASS:identity/baseline/Prisma temporary round-trip لكلا القاعدتين |
| TypeScript/lint/build | PASS عبر npm run check |
| Unit | PASS:21 (13 P1 +8 P2) |
| P1 E2E | PASS:21/21،24 ثانية،localhost3100،360/768/1280 |
| RTL/keyboard/axe/overflow | PASS ضمن P1 E2E لشاشات الأساس فقط |
| Docker config/ps | PASS:dev/test healthy،loopback55432/55433؛ compose/volumes لم تتغير |
| audit --omit=dev | PASS:0 vulnerabilities |
| audit كامل | WARN/exit1:5high تطويرية؛ [التقييم](P2-SECURITY-VALIDATION.md) |
| أسرار/diff | PASS قبل Commit؛ AGENTS والصور وsrc/app/components محفوظة |

PostgreSQL: default deny/self A/B/cross-user SELECT/INSERT/UPDATE/ADMIN deny؛ coach scope/expiry/consent withdrawal/assignment revoke؛ pool commit/rollback وPrisma model RLS؛ FK ملكية/نسخ/options/schema وduplicate/day bounds؛ approval/hash/qualification/self-review؛ ثبات policy/content/nutrition/source/audit؛ CHECK water/NULL/window/localDate؛ goal/sleep exclusion؛ idempotency وoptimistic races؛ rollback atomicity؛ منع إنتاج داخل config قبل الاتصال وأخطاء آمنة. المجموع42 مجموعة بعدة assertions، وليس ادعاء تغطية شاملة لكل جدول.

## إخفاقات سابقة وإصلاحها

- اسم SQL `window` محجوز، ثم grant شمل جدول Prisma غير المملوك: تحقق rollback وعدم وجود جداول بيانات، وسجل rolled-back وأعيد دون حذف؛ quoting/grants مصححة وBEGIN/COMMIT ذريتان.
- trigger عام قرأ dayIndex من TaskDefinition: أصلح بـmigration003 مع إبقاء002 المطبقة.
- تحديث can_read من دور لا يملك الدالة أفشل004 وردّت كاملًا؛ صححت صلاحية التنفيذ وأعيدت بعد resolve rolled-back.
- Prisma introspection طلب exact composite unique؛005/006 أصلحتها، ثم نجح validate/generate.
- اختبار ownerFK أصاب unique قبله؛ عُدل لتغيير owner مباشرة. Prisma model عاد إلىpublic؛ ضبط adapter schema الرسمي ثم نجح RLS.
- E2E3000 مستخدم: اختبر3100 دون إنهاء خادم المستخدم، ثم21pass.
- مراجعة CHECK كشفت NULL bypass:007 شددت cup/window/metric مع اختبارات سالبة ناجحة.

audit تحذير مفتوح، بلا فشل نهائي في checks المنفذة. لم تنفذ auth/P3 أوAPI/services أوتشفير فعلي أوLighthouse/قارئ شاشة عملي/جهازان/HTTPS أوbackup restore إنتاجية. الاختبار النظيف schema جديدة داخل ghidai_test؛ لم تحذف أوتعيد إنشاء حاوية أوvolume. schemas الاصطناعية باقية وفق قيد عدم حذف بيانات.
