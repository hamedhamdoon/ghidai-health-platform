# قاعدة بيانات GHIDAI — سجل الأساس P1 وملحق P2

## ملحق P3

العدد الحالي70نموذجًا،12migration (9P2محفوظة +3إضافيةP3). AuthChallenge وAuthMail وحقول candidateEmail/preferences/MFA replay/setup expiry، ومفتاح مركب لملكية البريد والرمز. ghidai_auth غير مالك/غير superuser/غير bypass ولاhealth privileges، وghidai_app يظل RLS. Profile query عبرPrisma وwrites/goals/consents عبرمعاملاتSQLمقيدة. التفاصيل في [P3-AUTH-IMPLEMENTATION](P3-AUTH-IMPLEMENTATION.md). dev/test مستقلتان؛ fixtures فيschemasمعزولةمحفوظة ولاحذف أوreset. الفقرات التالية تاريخP1/P2.

التصميم المستقبلي [DATABASE_DESIGN](DATABASE_DESIGN.md)، وبوابة RV-01/RV-02 في [IMPLEMENTATION-READINESS](IMPLEMENTATION-READINESS.md).

حاويتان PostgreSQL 17.6 منفصلتان؛ loopback 55432/55433، volume تطوير جديد وtmpfs للاختبار، healthchecks. الصورة مثبتة بـdigest في compose.yaml. حسابا التهيئة محليان؛ لا يستخدمان كتفويض تطبيق أو برهان RLS. لا جداول GHIDAI أو migrations أو seed.

check-database يتحقق من identity ومخطط public فارغ وround-trip داخل temporary table transaction؛ ينتهي الجدول عند commit. حاجز الاتصال يرفض عنوان/حساب/قاعدة/منفذ غير مطابقين أو query parameters. فصل قواعد البيئات لا يثبت عزل مستخدمين داخل التطبيق؛ ذلك في P2 وما بعدها.

## الحالة الحالية P2

النص أعلاه يوثق P1 تاريخيًا. نفذت P2 عدد68 جدولًا و9 migrations مع RLS وقيود ملكية/نسخ/زمن؛ [التنفيذ والتشغيل](P2-DATABASE-IMPLEMENTATION.md) و[الاختبارات](P2-TEST-RESULTS.md). public في dev/test بلا مستخدمين، والـfixtures في schemas اختبار اصطناعية باقية. حساب ghidai_app منفصل غير مالك ولاSuperuser/BYPASSRLS، وحسابا P1 لمهاجرات/probes محلية فقط.

check-database يفحص الآن identity وbaseline migrations وtemporary round-trip. preflight يفحص الجداول وخلوها وchecksums قبل deploy؛ حواجز URL تمنع إنتاجًا أوحسابًا/منفذًا غير مطابق. auth وخدمات المستخدم ليست منفذة، ولاجاهزية إنتاج أوreset أوحذفvolume.

## ملحق P4

ست migrations إضافية 202610120004..202610120009؛ لا تعديل للمهاجرات التاريخية. أضيف P4LocalCapability وContentRevision.syntheticOnly وContentReview.qualificationSnapshot، وسياسات التأليف والنشر ومراجعة مستقلة وأقفال graph وثبات الهوية والدليل. تغيير صلاحية التأهيل لا يمحو حالته المحفوظة وقت القرار. [المراجعة](P4-CONTENT-REVIEW.md) و[الأمن](P4-SECURITY-VALIDATION.md). لا حذف مخططات الاختبار أو volumes؛ النسخ الجديدة معزولة ومحفوظة أثناء التشغيل.

## إضافة P5–P7 المحلية — 2026-10-13

Enrollment يحفظ النسخة والسياسة والمنطقة والأهداف؛ EnrollmentDay وTaskOccurrence تولدان ذريًا ويمنع تغيير snapshot. TaskCompletion يدوي أو مشتق من سجلات المستخدم، والتصحيح يعيد احتسابه دون ازدواج. السجلات الشخصية مستقلة؛ StepDayLog.recordedForTime مرساة UTC، وExerciseLog وDailyReview يحملان timezoneSnapshot، والحذف المنطقي يبقي revision وتاريخ LogRevision المشفر.

AchievementRuleVersion مرتبطة قبل نشر البرنامج؛ AchievementAward وCertificate يطابقان aggregateRevision الحالي، والسحب يشملهما في معاملة المصدر. المهاجرات010–014 إضافية فقط: مشاركة، تتبع، استحقاق، انتهاء تمرين، ونموذج تقييم كامل منشور أو تاريخي خاص بالمالك. Published schema وأطفاله ثابتون بقيود P2؛ لا تظهر مسودة ناقصة. 23 مهاجرة مطبقة بمجموعتي GHIDAI المحليتين دون تعديل السابق أو حذف البيانات. [تفاصيل وأدلة التكامل](P5-P7-INTEGRATION-REPORT.md).
