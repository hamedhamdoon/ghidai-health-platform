# GHIDAI — تشغيل P1 محليًا

العمل داخل `C:\Users\User\Desktop\platforms\Ghidai` فقط. Node 24 LTS، npm وDocker Desktop بوضع Linux containers. لا حاجة إلى حساب سحابي. لا تستخدم بيانات حقيقية.

```powershell
npm ci
npm run env:init
npm run db:validate
npm run db:generate
npm run db:up
npm run db:check
npm run test:db
npm run dev
```

افتح http://127.0.0.1:3000. أمر dev وstart يربطان الخادم بواجهة loopback فقط. `env:init` ينشئ أسرارًا محلية عشوائية في `.env.development.local` و`.env.test.local`، ويرفض استبدال الملفات القائمة. لا تطبع محتواها أو ترفعها.

تستخدم Compose اسم مشروع `ghidai-p1-local`، دون container_name عام. قاعدة التطوير على 127.0.0.1:55432 باسم ghidai_development، والاختبار على 127.0.0.1:55433 باسم ghidai_test، بحسابين وكلمتي مرور مختلفتين وحاويتين منفصلتين. بيانات التطوير في named volume خاص بالمشروع؛ الاختبار tmpfs مؤقت. افحص المنافذ واسم مشروع Compose قبل التشغيل على جهاز آخر. إذا كانت الموارد موجودة مسبقًا، تحقق من ملكيتها بدل إعادة إنشائها أو حذفها.

```powershell
npm run check
npx playwright install chromium
npm run test:e2e
npm run db:stop
```

`check` يشغل typecheck وlint وunit وbuild. typecheck يولد أنواع Next أولًا باستخدام next typegen؛ توليد Prisma في خطوة db:generate السابقة مطلوب. E2E يشغل نسخة build محلية على 3000؛ أوقف خادم GHIDAI الآخر قبل الاختبار. لنسخة build: `npm run build` ثم `npm run start`. لا تستخدم `docker compose down -v` أو reset. إيقاف الحاويات يحفظ volume التطوير؛ tmpfs الاختبار مؤقت. إعادة التشغيل تتم بـ db:up. لا migrations في P1؛ حتى temporary probe لا ينشئ جدولًا دائمًا.

Prisma CLI يقرأ بيئة التطوير، وprobe الاختبار يقرأ بيئة الاختبار. الحاجز يرفض غير loopback، أو اسم/حساب/منفذ غير مطابق، أو query parameters. الاختبارات لا تستخدم URL الإنتاج. حسابا PostgreSQL في P1 حسابا تهيئة محليان، وليسا أدوار التطبيق المحدودة/RLS المطلوبة في P2؛ لا بيانات مستخدمين ولا جداول تطبيق بعد.

CI يدوي فقط عبر workflow_dispatch؛ لا نشر أو تشغيل تلقائي عند push. لم تُتحقق حصة Actions الفعلية لحساب المالك، لذلك يشغل المالك workflow بعد فحص رصيده المجاني ولا يفعل أي مدفوعات. سجل التنفيذ المحلي في P1-TEST-RESULTS.

عند تعطل Docker: افتح Desktop واقرأ خطأ Engine، تحقق من WSL2/virtualization. لا تغير ميزات Windows أو restart عام أو reset Docker دون تشخيص وصلاحية المالك. لا توجد خطة نسخ إنتاج أو عمل offline أو مصادقة في P1.
