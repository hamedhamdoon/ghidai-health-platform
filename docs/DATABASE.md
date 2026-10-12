# قاعدة بيانات GHIDAI — سجل الأساس P1 وملحق P2

## ملحق P3

العدد الحالي70نموذجًا،12migration (9P2محفوظة +3إضافيةP3). AuthChallenge وAuthMail وحقول candidateEmail/preferences/MFA replay/setup expiry، ومفتاح مركب لملكية البريد والرمز. ghidai_auth غير مالك/غير superuser/غير bypass ولاhealth privileges، وghidai_app يظل RLS. Profile query عبرPrisma وwrites/goals/consents عبرمعاملاتSQLمقيدة. التفاصيل في [P3-AUTH-IMPLEMENTATION](P3-AUTH-IMPLEMENTATION.md). dev/test مستقلتان؛ fixtures فيschemasمعزولةمحفوظة ولاحذف أوreset. الفقرات التالية تاريخP1/P2.

التصميم المستقبلي [DATABASE_DESIGN](DATABASE_DESIGN.md)، وبوابة RV-01/RV-02 في [IMPLEMENTATION-READINESS](IMPLEMENTATION-READINESS.md).

حاويتان PostgreSQL 17.6 منفصلتان؛ loopback 55432/55433، volume تطوير جديد وtmpfs للاختبار، healthchecks. الصورة مثبتة بـdigest في compose.yaml. حسابا التهيئة محليان؛ لا يستخدمان كتفويض تطبيق أو برهان RLS. لا جداول GHIDAI أو migrations أو seed.

check-database يتحقق من identity ومخطط public فارغ وround-trip داخل temporary table transaction؛ ينتهي الجدول عند commit. حاجز الاتصال يرفض عنوان/حساب/قاعدة/منفذ غير مطابقين أو query parameters. فصل قواعد البيئات لا يثبت عزل مستخدمين داخل التطبيق؛ ذلك في P2 وما بعدها.

## الحالة الحالية P2

النص أعلاه يوثق P1 تاريخيًا. نفذت P2 عدد68 جدولًا و9 migrations مع RLS وقيود ملكية/نسخ/زمن؛ [التنفيذ والتشغيل](P2-DATABASE-IMPLEMENTATION.md) و[الاختبارات](P2-TEST-RESULTS.md). public في dev/test بلا مستخدمين، والـfixtures في schemas اختبار اصطناعية باقية. حساب ghidai_app منفصل غير مالك ولاSuperuser/BYPASSRLS، وحسابا P1 لمهاجرات/probes محلية فقط.

check-database يفحص الآن identity وbaseline migrations وtemporary round-trip. preflight يفحص الجداول وخلوها وchecksums قبل deploy؛ حواجز URL تمنع إنتاجًا أوحسابًا/منفذًا غير مطابق. auth وخدمات المستخدم ليست منفذة، ولاجاهزية إنتاج أوreset أوحذفvolume.
