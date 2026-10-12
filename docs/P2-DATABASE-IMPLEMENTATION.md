# P2 — قرارات التنفيذ المحلية

2026-10-11، خط الأساس P1 `78f6e91156f95e8853d0adbb438dea137d29da10`. نطاق P2 فقط؛ لا مصادقة أو API أو نشر. A-01..A-12 تبقى مفتوحة.

## RV-01 — قرار تقني قبل migrations

AccessGrant: subjectId (المتلقي)، resource (اسم مورد من allowlist)، action READ أو NOTE، scopeUserId (صاحب البيانات)، startsAt/expiresAt، revokedAt، reason، grantedBy، consentId وassignmentId. لا wildcards ولا نطاق شامل. READ للمدرب يتطلب COACH نشطًا، تعيينًا نافذًا، موافقة COACH نافذة من صاحب النطاق، والمنح يربط نفس الثلاثية بمفاتيح مركبة. سحب الموافقة/التعيين أو انتهاء أي منها يبطل القراءة فورًا دون الاعتماد على cache. ADMIN لا يحصل استثناء صحي؛ break-glass والمصحح مؤجلان إلى A-11. الصلاحيات الكتابية الذاتية لا تسمح بتعديل المنح أو الأدوار. التدقيق لا يحمل نصوصًا صحية. اختبارات القبول: قراءة الذات، منع الآخر والإدارة، grant صالح ثم expiry/revoke، منع منح متعارضة الملكية.

## RV-02 — قرار تقني قبل migrations

مفاتيح (userId,id) في كل سجل مملوك، ومفاتيح (versionId,id) للتعريفات؛ مشاركة تربط program/version/policy، اليوم يربط enrollment/version/dayIndex، occurrence يربط اليوم والتعريف بنفس النسخة. ReviewAnswer يربط review/schema وdimension/schema وoption/dimension. ContentSource وConflictExtract جداول ربط صريحة. ContentWithdrawal وProgramWithdrawal سجلات أسباب وسحب مرتبطة بالنسخة؛ TaskExclusion يربط سحب البرنامج. إصدارات التصحيح تربط السجل عبر HealthRecord registry مغلق الأنواع، بدل UUID متعدد المعاني بلا FK. جميع الحذف RESTRICT في P2 حتى اعتماد سياسة purge؛ لا تنفيذ حذف إنتاجي.

SQL للـCHECK وpartial unique وexclusion وRLS وثبات النسخ؛ Prisma يعكس العلاقات بعد introspection. قبول: FK ownership/version/schema سالبة، duplicate، overlap، immutability، recreate على schema اختبار جديدة داخل قاعدة الاختبار دون حذف بيانات أو volumes.

## حدود الثقة

حساب migration المحلي السابق منفصل عن ghidai_app؛ مالك الجداول ghidai_owner NOLOGIN. التطبيق NOSUPERUSER/NOBYPASSRLS وغير مالك. FORCE RLS وtransaction-local context. سياق actor لا يقبل payload/browser؛ لا منشئ هوية إنتاجي حتى P3. الاختبارات فقط تحدد fixture actor من registry خادمي. امتلاك سر حساب DB يتيح تعيين سياق SQL: RLS دفاع ضد أخطاء scoping وليس بديل مصادقة أو حماية من اختراق الخادم.

## التنفيذ

68 نموذج وجدول بيانات، 9 migrations SQL ذرية. الأسماء PascalCase مقتبسة لتطابق Prisma، بدل snake_case المقترح. Prisma7.10.0/PostgreSQL17.6 كما في P1؛ الحزم والـlockfile لم تتغير.

| migration | المسؤولية |
|---|---|
| 001 | النماذج/enums/FK/index وRLS وpartial unique وexclusion |
| 002 | مراجعة hash/qualification وثبات المحتوى والنسخ ودورات المهام |
| 003 | إصلاح trigger متعدد الجداول والتدقيق وثبات review schema |
| 004 | نطاق موافقة المدرب واتساق نسخ السحب والتغذية والتذكير والإنجاز |
| 005–006 | exact composite unique المطلوبة لـPrisma one-to-one |
| 007 | strict NULL checks والتوقيت المحلي |
| 008 | تجميد روابط التغذية المعتمدة |
| 009 | نسخ الوجبات والبدائل وتجميد المكونات المرتبطة بالاعتماد |

كل FK مفهرس. SQL مرجع RLS/triggers/CHECK/exclusion/partial indexes التي لا يمثلها Prisma كاملة؛ لا تستخدم db push أوschema وحدها لإعادة بنائها. `.gitattributes` يثبت LF/checksums. `scripts/p2-schema.mjs` مصدر توليد الأولى؛ تغييرات لاحقة عبر migration جديدة، لا إعادة كتابة migrations مطبقة.

## التشغيل

```powershell
npm ci
npm run env:init # أول مرة فقط؛ يرفض overwrite
npm run db:up
npm run db:migrate:dev
npm run db:migrate:test
npm run db:generate
npm run db:validate
npm run test:p2
npm run db:check
npm run test:db
npm run check
$env:GHIDAI_E2E_PORT='3100' # إذا كان 3000 مستخدمًا
npm run test:e2e
npm run check:secrets
```

أسرار app تولد في `.env.p2.development.local` و`.env.p2.test.local` المستثنيين من Git. حسابا P1 المحليان migration/probes فقط؛ withActor يرفضهما. URL app يخضع لحاجز منفصل يفرض ghidai_app وloopback والمنفذ/اسم القاعدة؛ prisma.config يرفض الإنتاج قبل migration engine. preflight يطابق هوية الخادم/الحساب/المنفذ، الجداول المسموحة وخلو جميع جداول public من البيانات، وchecksums. لا reset/drop أوحذف volumes.

public في dev/test بلا مستخدمين؛ fixtures A/B/Coach/Admin والسياسات والمسودات والمصادر الاصطناعية داخل schema جديدة `p2_test_<timestamp>` في test. تبقى schemas بعد الاختبارات وفق قيد عدم حذف البيانات وتستهلك مساحة؛ تنظيفها يحتاج تكليفًا مستقلًا. APPROVED داخل fixtures اختبار ثبات لنص اصطناعي فقط، لا اعتماد مختص أومحتوى غذائي. PUBLISHED للبرامج محجوب بالكامل في P2.

## العقود والحدود

`src/server/contracts/p2.ts`: allowlists، UUID/date/instant/timezone، ماء XOR/كوب صريح، خطوات صحيحة، نوم، exercise، review/decimal weight، profile/enrollment/completion، If-Match/revision، ownership404، idempotency action/hash، DTOs وأخطاء عربية آمنة. لا endpoints جديدة. حدود الإدخال من API specification مقترحات منتج لا أهداف صحية معتمدة.

replay/claim/outbox وإعادة الحساب وخدمات grants/consents/enrollment/publishing مؤجلة قبل مراحلها. bytea حقول مخصصة للتشفير وليست خدمة تشفير أوإدارة مفاتيح منفذة. grant NOTE بنيوي فقط، وكتابات الوظائف غير المنفذة مرفوضة. RV-01/RV-02 مغلقان تقنيًا لنطاق migrations المنفذ؛ لا إغلاق A-01..A-12 أوتفويض أشخاص أوتشغيل P3.
