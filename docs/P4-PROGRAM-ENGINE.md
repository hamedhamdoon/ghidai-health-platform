# P4 — محرك البرامج الديناميكي

2026-10-12، Asia/Muscat. الأساس المعتمد `09a3efb8ea496dcfb361a7ebdfce4d3c87b10eb1`؛ الفرع `feature/ghidai-p4-program-engine`. التنفيذ محلي فقط، ولا مشاركة أو occurrence أو جدول مستخدم أو P5/P6.

المصدر: AGENTS والوثائق المعتمدة PROJECT_REQUIREMENTS، IMAGE_CONTENT_ANALYSIS، UX_UI_SPECIFICATION، SYSTEM_ARCHITECTURE، DATABASE_DESIGN، API_SPECIFICATION، IMPLEMENTATION_PLAN، DECISION-REGISTER، IMPLEMENTATION-READINESS، P3-HANDOFF وP3-TEST-RESULTS. التعاريف في جداول P2، والخدمات في `src/server/programs`؛ المهاجرات P4 إضافية، ولم تعدل P2/P3.

## ما ينفذ فعليًا

برنامج بمالك ونوع وslug؛ النسخة تحمل الاسم والوصف الإصدارِي والمدة 1..366 ونمط FLEXIBLE/FIXED وتاريخ ثابت عند اختياره. هذا حد إدخال منتج وليس وصفة صحية. الأيام متسلسلة 1..duration. مهام مطلوبة/اختيارية، ترتيب، نوع وهدف كمي اختياري، NONE/AT/WINDOW/RELATIVE، مرجع داخل اليوم وإزاحة بالدقائق؛ دورة المراجع مرفوضة في DTO وفي constraint trigger PostgreSQL.

التكرار EVERY_DAY أو SELECTED_DAYS في API؛ SELECTED_DAYS يخزن EXPLICIT في نموذج P2. يحفظ قالب التأليف ثم يوسّع TaskDefinition للأيام المختارة داخل المعاملة. الأيام الموسعة هي المصدر المعتمد للتنفيذ المستقبلي؛ لا توليد مشاركة أو إتمام في P4. تعديل يوم بعد التكرار لا يعيد تطبيق القالب تلقائيًا عليه. نسخة البرنامج الجديدة تعيد معرفات الأيام والمهام والمراجع النسبية، وتحفظ روابط المحتوى الثابتة؛ النسخة السابقة تبقى كما هي.

## RV-10: انتقالات P4

| الكيان / الحالة | الانتقال المسموح | الشروط | المرفوض |
|---|---|---|---|
| Program ACTIVE | PAUSED، ARCHIVED | ADMIN مؤقت مخول، إعادة مصادقة وMFA وسبب وIf-Match | حذف التاريخ أو تغيير المالك |
| Program PAUSED | ACTIVE، ARCHIVED | الشروط نفسها | نشر نسخة أثناء التوقف |
| Program ARCHIVED | لا انتقال | قراءة تاريخ إدارية فقط | إعادة التنشيط أو إنشاء إصدار |
| ProgramVersion DRAFT | IN_REVIEW | جميع الأيام موجودة وغير فارغة؛ مالك أوADMIN | النشر المباشر |
| ProgramVersion IN_REVIEW | DRAFT، PUBLISHED | الرجوع للتحرير صريح؛ النشر ADMIN+MFA وفحص نهائي | تحرير المحتوى/الأيام أثناء المراجعة |
| ProgramVersion PUBLISHED | WITHDRAWN | سجل ProgramWithdrawal، سبب، safety ووقت، ADMIN+MFA | تعديل المحتوى أو الأطفال أو إعادة المسودة |
| ProgramVersion WITHDRAWN | لا انتقال | إنشاء نسخة جديدة مستقلًا ممكن قبل أرشفة البرنامج | إعادة نشر النسخة نفسها |

RV-10 سوي لانتقالات البرامج والإصدارات والمحتوى في P4. انتقالات Enrollment COMPLETED/LOCKED وآثار TaskExclusion على مشاركة فعلية تبقى لـP5؛ لا يعد هذا إغلاقًا لها أو تنفيذًا خارج التكليف.

## العقود الفعلية

جميع المسارات تحت `/api/v1`. `admin` و`coach` لتأليف البرامج والمحتوى؛ COACH يحرر مسوداته فقط ولا ينشر. RLS يمنع قراءة مسودات مؤلف برنامج آخر. قائمة المحتوى مشتركة للمؤلفين/المراجعين المخولين محليًا، لكن تحريره/إرساله للمراجعة يقتصر على المؤلف، والاعتماد مستقل ومؤهل.

| الطريقة والمسار | العملية |
|---|---|
| GET/POST `admin/programs` | قائمة/إنشاء برنامج |
| GET/PATCH `admin/programs/:id` | إصدارات/حالة البرنامج |
| POST `admin/programs/:id/versions` | `{metadata}` أو `{copyFromVersionId, metadata?}` |
| GET/PATCH `admin/program-versions/:id` | معاينة/بيانات مسودة |
| GET `admin/program-versions/:id/preview` | أيام ومهام محفوظة فعلية؛ بلا سجلات مشاركة |
| PUT `admin/program-versions/:id/days/:index` | استبدال مهام يوم ذريًا |
| PUT `admin/program-versions/:id/recurrence` | `{pattern,dayIndices,tasks}` وتوسيع ذري |
| PUT `admin/program-versions/:id/nutrition` | `{planIds}` |
| POST `.../:id/submit`, `return-to-draft`, `publish`, `withdraw` | انتقالات محددة ومتحققة |
| GET `programs`, `programs/:id` | كتالوج خاص بجلسة، للنسخ المسموح عرضها فقط |

POST يحتاج Idempotency-Key UUID؛ hash يشمل المسار والطريقة والمدخل وIf-Match. قفل advisory ثم إيصال مشفر في IdempotencyRecord يضمن replay وتعارض إعادة المفتاح بمدخل مختلف. UUID المؤلف يستخرج من جلسة P3. PATCH/PUT وأوامر النسخة/المحتوى تحتاج If-Match مقتبسًا؛ نقصه428، stale409. قفل النسخة وقفل الآباء في triggers يمنعان سباق تعديل الأطفال مع النشر. لا تقبل الواجهة اختيار userId أو role.

الفحص النهائي يشمل مدة الأيام، المهام، البرنامج ACTIVE، مراجع APPROVED وhash مطابق، وجبات وبدائل ومقادير صريحة، جميع الروابط، والتصنيف الاصطناعي. مصدر الصور أو نسله غير اصطناعي ويظل محجوبًا عن النشر، حتى مع اعتماد اختبار. الحالات المنشورة والمسحوبة لا تعدل؛ الانسحاب يحجب العرض دون حذف التاريخ.

## الواجهة وحدود القبول

`/admin/programs` و`/admin/content` تعرضان مساحة واحدة ذات أقسام برامج/محتوى/وجبات/مصادر. يدعم المحرر الإنشاء والمعاينة والتكرار وترتيب المهام بأزرار لوحة مفاتيح، المراجعة المستقلة والنشر والسحب. الأزرار مرتبطة بـAPI وقاعدة حقيقية، مع loading/empty/error/saving/success. لا تقدم معالج الصفحات المستقل لكل S45..S49؛ جمعت هذه الأفعال في مساحة محلية واحدة لتقليل التنقل. تفاصيل المقادير والتحويلات الحقيقية وتدبير المسؤول الإنتاجي تبقى محجوبة.

لا شارات أو قواعد تقدم مفعلة، ولا joins أو occurrences أو سجلات صحية شخصية. حالات المصدر واختلافات الصور لا تحسم آليًا. الأدلة والقيود في [الاختبارات](P4-TEST-RESULTS.md) و[التسليم](P4-HANDOFF.md).
