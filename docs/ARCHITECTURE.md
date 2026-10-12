# معمارية P1 المنفذة

## ملحق المعمارية الحالية P3

App Router يحتفظ بأساس P1، ويضيف صفحات الحساب وRoute Handlers تحت api/v1 وخدمات auth خادمية. ghidai_auth بوابة credentials محدودة منفصلة عن ghidai_app؛ الجلسة الموثوقة تنتج VerifiedActor، ثم RLS وSET LOCAL في معاملات pg/Prisma. Prisma يستخدم فعليًا لقراءة Profile. البريد Mailpit محلي مع encrypted AuthMail، وMFA challenge منفصل عن Session. تفاصيل الحدود والاعتمادات في [P3-AUTH-IMPLEMENTATION](P3-AUTH-IMPLEMENTATION.md). النص التالي سجل P1 التاريخي، وليس نفيًا للمصادقة المنفذة حاليًا.

المرجع التصميمي [SYSTEM_ARCHITECTURE](SYSTEM_ARCHITECTURE.md). تطبيق موحد Next.js App Router؛ صفحات عامة في src/app/(public)، ووجهات تأسيسية في (foundation)، ومكونات مشتركة في src/components. Navigation يحتاج client state لتمييز المسار؛ عرض الصفحات Server Components. health يفحص عملية التطبيق فقط ويعلن database=not-checked.

Prisma والاتصال في scripts منفصلان عن العرض؛ لا مكونات تصل DB، ولا API صحي أو جلسات بعد. PostgreSQL مستقل للتطوير والاختبار عبر Compose، والخادم loopback. مخطط Prisma خالٍ من نماذج GHIDAI؛ لا migrations/RLS/auth في P1. قرارات A وRV تظل مفتوحة.

## ملحق P4

خدمات src/server/programs تعمل من Route Handler نفسه بعد حل جلسة P3، داخل withActor وRLS؛ DTOs محدودة وأقفال معاملات وإيصالات مشفرة ونسخ ثابتة. P4LocalCapability مستقل ومؤقت ومحلي فقط. تفاصيل دورة الحالة في [P4-PROGRAM-ENGINE](P4-PROGRAM-ENGINE.md). لا تغيير إلى خدمات منفصلة أو مزود سحابي، ولا مشاركة مستخدم أو مجدول.
