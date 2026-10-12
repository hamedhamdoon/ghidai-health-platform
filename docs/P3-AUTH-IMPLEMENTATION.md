# P3 — تنفيذ الحسابات والمصادقة

2026-10-12، Asia/Muscat. التكليف المعتمد P3 فقط. الأساس `feature/ghidai-p2-data-security` عند `e8902733d6cd92b7cd73aceec9d06410e2ce00af`، والحالة الابتدائية نظيفة. فرع التنفيذ `feature/ghidai-p3-auth-profile`؛ لم يعدل AGENTS أو migrations P2 ولم يبدأ P4.

## التنفيذ

`src/server/auth` خدمات خادم فعلية، و`src/app/api/v1/[...path]/route.ts` يطبق CSRF/Origin/body limits/errors/no-store. جميع نجاحات JSON تستخدم `{data,meta:{requestId,serverTime}}`، و204 بلا محتوى. النماذج العربية في `src/components/auth-forms.tsx` و`account-panel.tsx` تتصل بهذه العقود. فصل شاشات الملف والأمان والموافقات يقلل ازدحام الحساب والطلبات. جميع الحسابات المسجلة USER؛ لا تسجيل COACH/ADMIN ولا bootstrap إداري.

Register ينشئ User PENDING وProfile وPrivacy Consent وبريدًا مشفرًا في معاملة واحدة؛ duplicate registration يعيد الرسالة العامة. Verify ينقل الحساب إلى ACTIVE بعد استهلاك hash أحادي الاستخدام. Login يتحقق عبر Argon2id (64MiB/time3/parallel1) ويصدر opaque cookie/session hash، أو AuthChallenge فقط عند MFA. Logout/revoke/change/reset تغييرات DB فعلية. Password change يدور الجلسة ويبطل الأخرى؛ reset/change-email يبطل كل الجلسات والتحديات والرموز القديمة. Reauth يعتمد كلمة المرور وMFA عند تفعيله، ويشترط حداثة عشر دقائق للعمليات الحساسة.

TOTP SHA1/6digits/30s وفق RFC6238، نافذة ±1 خطوة، وlastStep يمنع إعادة الرمز عالميًا للحساب. AES-256-GCM يحمي السر؛ إعداد منتهي بعد عشر دقائق ولا يعتبر enabled حتى confirm. عشرة recovery codes عشوائية، تعرض مرة واحدة وتحفظ SHA256، وتستهلك تحت قفل DB. لا recovery backdoor لمسؤول أو وسيلة تجاوز A-12. تعطيل MFA يحتاج reauth حديثًا ومثبتًا بـMFA، ويبطل الجلسات الأخرى والتحديات.

## قاعدة البيانات والثقة

ثلاث migrations **إضافية**: `202610120001_p3_auth` يضيف AuthChallenge/AuthMail/candidateEmail/preferences/setup expiry/replay step؛ `002` يفصل INSERT USER عن تحديث حساب موجود ويقيد ملكية Mail→Token بمفتاح مركب؛ `003` يجعل حذف الهدف المستقبلي حسب منطقة المستخدم. Prisma يمثل 70 نموذجًا ويستخدم العميل فعليًا لقراءة Profile داخل transaction SET LOCAL. القيود وRLS مصدرها SQL؛ لا Prisma db push/reset.

`ghidai_auth` بوابة credentials مستقلة LOGIN/NOSUPERUSER/NOBYPASSRLS/non-owner، لها جداول المصادقة والحدود وبريد الرموز فقط، وINSERT تسجيل للملف والموافقة وaudit. لا وصول إلى الصحة أو الأهداف ولا عضوية ghidai_owner/policy/app. لا صلاحية لكتابة role. `ghidai_app` يظل دور بيانات مقيدًا؛ Profile/Goals/Consents تستخدم VerifiedActor المستخرج من Session موثقة وwithActor/RLS. قفل User من نوع NO KEY UPDATE يمنع تعارض FK بين اتصال المصادقة واتصال بيانات المستخدم، ويسلسل الإبطال مع الكتابة. لا userId/role من body أو headers.

## البريد المحلي

فحص Docker والمنافذ أظهر dev GHIDAI وegos-postgres؛ لم يمس الأخير. Mailpit مثبت بالإصدار v1.27.4 وdigest محدد في compose، والمنافذ 1025/8025 loopback فقط. لا relay/cloud account/provider إنتاجي. الرسائل تحتوي روابط fragments لمنع الرمز من query/access logs. AuthToken يخزن hash فقط؛ نسخة الإرسال في AuthMail مشفرة بمفتاح محلي مستثنى من Git. sender `local@ghidai.test` اصطناعي.

الطلب يحفظ البريد أولًا؛ محاولة SMTP لاحقة. عند فشل البريد يبقى الطلب 202 عامًا والبريد pending مع attempts، ثم `npm run mail:retry` يعيد المحاولة. العامل محلي يدوي؛ لا مجدول إنتاجي أو ضمان تسليم دائم. lock/SKIP LOCKED يمنع عاملين من claim متزامن؛ crash بعد قبول SMTP وقبل commit قد يكرر الرسالة، لكن token يظل أحادي الاستخدام. لا طباعة token/secret/password/email payload في سجلات الخادم.

## الملف والأهداف والموافقات

displayName/timezone IANA/locale ar/preferences.reducedMotion، وcupMl اختياري وقابل للإزالة بـnull. لا هدف صحي افتراضي. إنشاء/تعديل/حذف أهداف شخصية مستقبلية فقط، بقيم صريحة؛ DB يمنع التداخل. الموافقات PRIVACY وNOTIFICATIONS محلية منفصلة وصريحة وقابلة للسحب، وCOACH grant creation غير متاح في P3. سحب موافقة COACH موجودة يمنع الوصول فورًا عبر سياسات P2، دون إنشاء متابعة مدرب جديدة. لا وظائف notification jobs في P3 تستلزم cancellation؛ تفعيلها يبقى في مرحلتها مع إعادة فحص الموافقة.

## RV والقرارات

RV-04: تمثيل preauth منفصل، 5 دقائق/5 محاولات/استهلاك واحد، ولا يمكنه الوصول إلى /me. الجزء المحلي مغلق تقنيًا بعد الاختبارات؛ استرداد المسؤول واعتماد سياسة الإنتاج يبقيان A-12 مفتوحًا. RV-03: طلب بريد جديد بعد reauth، candidateEmail مربوط بالرمز؛ القديم يبقى حتى verify، duplicate conflict يرجع المعاملة، والتأكيد يبطل الجلسات. RV-07: PATCH profile/goals جزئي وIf-Match؛ DELETE goals/consents If-Match؛ غياب الشرط428، stale409، غير المملوك404. أوامر أمنية (logout/session revoke/MFA disable/password rotation) أوامر إبطال/مصادقة، تتطلب CSRF وfresh حيث يلزم، ولا تستبدل محتوى بإصدار قديم. بقية RV-07 خارج P3 مفتوحة.

A-02/A-08/A-12 لم تغلق. الإعداد **اختبار اصطناعي محلي فقط**: سياسة `synthetic-local-p3-v1`، موافقة اختبار30يومًا، جلسة7أيام/خمول24h، verify24h/reset15min، reauth10min، MFA challenge5min/5attempts، CSRF1h، account limits5/15min، سقف loopback shared300mutation/15min. هذه ليست سياسة جمهور/احتفاظ/أمن إنتاج معتمدة. لا purge أو حسابات حقيقية أو إدارة إنتاجية.

مكتبات مثبتة: argon20.45.1، nodemailer10.1.0، @types/nodemailer8.0.2، مع lockfile. مصادر تقنية: [Argon2](https://github.com/ranisalt/node-argon2)، [SMTP](https://nodemailer.com/smtp)، [Mailpit Docker](https://mailpit.axllent.org/docs/install/docker/). لا ترقيات كبرى إلى release candidates.

التشغيل والقيود في [P3-HANDOFF](P3-HANDOFF.md)، والأدلة الفعلية في [P3-TEST-RESULTS](P3-TEST-RESULTS.md).

Mailpit صندوق التقاط اختبار محلي بسقف500رسالة، وليس سجل احتفاظ أو نسخة احتياطية معتمدة. السجل الموثوق للرمز/الإرسال في PostgreSQL ومشفر عند احتوائه رابطًا؛ لا purge تلقائيًا فيخدماتP3. سياسات الاحتفاظ وتنظيف مخططات الاختبار تحتاج اعتمادًا مستقلًا.
