# P3 — التسليم والتشغيل المحلي

2026-10-12، Asia/Muscat. فرع `feature/ghidai-p3-auth-profile` مشتق من P2 المعتمد e8902733d6cd92b7cd73aceec9d06410e2ce00af. [التنفيذ](P3-AUTH-IMPLEMENTATION.md)، [الأمن](P3-SECURITY-VALIDATION.md)، [النتائج](P3-TEST-RESULTS.md).

المتاح: الحسابات والتحقق والبريد المحلي والمصادقة والجلسات وإعادة المصادقة وTOTP/recovery، الملف والتفضيلات والأهداف الاختيارية والموافقات. الشاشات /register /verify /login /forgot-password /reset-password /onboarding /account /account/security /privacy. السياسات مؤقتة للاختبار الاصطناعي، وليست اعتمادًا A-02/A-08/A-12. لا برامج/تحديات/غذاء/سجلات يومية/تنبيهات فعلية أوP4.

## التشغيل على الجهاز الحالي

افحص Docker والمنافذ وملكية الموارد أولًا؛ لا stop/recreate لقاعدة test tmpfs قائمة بغرض إعادة التهيئة، ولا down/reset/delete.

```powershell
npm ci
# فقط إن لم تكن أسرار P1 موجودة:
npm run env:init
docker compose --env-file .env.development.local up -d --wait postgres-dev postgres-test
docker compose --env-file .env.development.local up -d mailpit
npm run db:migrate:p3:dev
npm run db:migrate:p3:test
npm run db:generate
npm run dev
```

التطبيق http://127.0.0.1:3000، البريد http://127.0.0.1:8025. استخدم عنوانًا اصطناعيًا مثل `example@ghidai.test` وكلمة اختبار خاصة بك، ثم افتح الرابط من Mailpit واضغط تأكيد البريد. لا رموز في terminal. بيانات التطوير منفصلة عن اختبار.

P3 setup يفحص الهوية/checksums، ويجهز دور credentials وكلمة عشوائية ومفتاح AES محليين في `.env.p3.development.local` و`.env.p3.test.local`؛ الملفات القائمة لا تستبدل. account app يستخدم `.env.p2.*.local` بحساب NOBYPASSRLS. لا تستخدم owner URL لتشغيل API. الأسرار الستة مستثناة من Git وscanner يفحص مفاتيح وكلمات P3.

في نسخة جديدة نظيفة، P3 setup يجهز أساس P2 محليًا ثم migrations الإضافية. عند فشل migration غير متوقع يوقف بدل حذف؛ تسوية المحاولة001 الوحيدة توثق تحقق rollback قبل resolve. المخططات الاصطناعية السابقة تبقى.

## الفحوص وإعادة البريد

```powershell
npm run check
npm run test:p2
npm run test:p3
$env:GHIDAI_E2E_PORT='3100'
npm run test:e2e
npm run test:p3:outages
npm run check:secrets
```

`test:p3` ينشئ schema جديدة داخل ghidai_test ويحدث مرجع P3_TEST_SCHEMA في ملف test **المستثنى**؛ لا يحذف القديمة. E2E يشغل build محليًا مع GHIDAI_AUTH_ENV=test فقط. `test:p3:outages` يتطلب3100فارغًا، ينشئ خادمه الخاص، ويستخدم pause/unpause لحاويتي GHIDAI الاختباريتين ثم يعيدهما في finally؛ لا يوقف PostgreSQL tmpfs أو يحذف بيانات. لا تشغله بالتوازي مع E2E أو عمليات DB أخرى.

لإعادة بريد التطوير pending: `npm run mail:retry`. لبريد مخطط الاختبار: `$env:GHIDAI_AUTH_ENV='test'; npm run mail:retry`. لا تدّعي هذه الآلية جدولة دائمة؛ راجع Mailpit وAuthMail.sentAt. لا export/delete/purge أو backup production في P3.

## القيود والقرارات

السقف المحلي account5محاولات/15min وسقف mutations300/15min؛ عناوين معدلات HMAC بلا بيانات صريحة. قد تحتاج الانتظار قبل إعادة محاولات الحساب نفسه؛ الاختبارات تولد عناوين مستقلة. SMTP قد يقبل رسالة ثم ينقطع اتصال قبل commit فتكرر الرسالة لاحقًا؛ single-use token يحمي إعادة الاستخدام. Secure cookies/بريد الإنتاج/HTTPS وأهلية الحسابات الحقيقية واحتفاظ البيانات وتدبير المسؤول تحتاج اعتماد المالك ومراجعاتها، ولا يوفر هذا الفرع تشغيلًا إنتاجيًا.

audit الكامل5high مفتوح، runtime0. CI إعداد manual فقط ولم ينفذ أو يعتمد رصيد Actions. قارئ شاشة يدوي وجهازان مستقلان وLighthouse/حمل إنتاج ليست قبولًا مثبتًا. لا merge main أو نشر أو خدمة سحابية.

قياس تحميل محلي فعلي لشاشة الدخول بـChromium ومحاكاة شبكة/CPU موثق في P3-TEST-RESULTS. لإعادته: `node node_modules/tsx/dist/cli.mjs scripts/p3-performance.ts` بعد build، مع3100فارغًا. المخططات `p3_test_*` السابقة محفوظة؛ تنظيفها وتقرير الاحتفاظ مهمة مستقلة تحتاج تفويضًا، ولا تنظف تلقائيًا.

Git: Commit/Push يتمان بعد الفحوص على فرع P3 فقط؛ قيمةCommit ونتيجةPush الفعلية في التقرير النهائي للمحادثة، دون ادعاء الدفع قبل حدوثه.
