# معمارية P1 المنفذة

المرجع التصميمي [SYSTEM_ARCHITECTURE](SYSTEM_ARCHITECTURE.md). تطبيق موحد Next.js App Router؛ صفحات عامة في src/app/(public)، ووجهات تأسيسية في (foundation)، ومكونات مشتركة في src/components. Navigation يحتاج client state لتمييز المسار؛ عرض الصفحات Server Components. health يفحص عملية التطبيق فقط ويعلن database=not-checked.

Prisma والاتصال في scripts منفصلان عن العرض؛ لا مكونات تصل DB، ولا API صحي أو جلسات بعد. PostgreSQL مستقل للتطوير والاختبار عبر Compose، والخادم loopback. مخطط Prisma خالٍ من نماذج GHIDAI؛ لا migrations/RLS/auth في P1. قرارات A وRV تظل مفتوحة.
