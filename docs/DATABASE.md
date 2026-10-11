# قاعدة بيانات P1

التصميم المستقبلي [DATABASE_DESIGN](DATABASE_DESIGN.md)، وبوابة RV-01/RV-02 في [IMPLEMENTATION-READINESS](IMPLEMENTATION-READINESS.md).

حاويتان PostgreSQL 17.6 منفصلتان؛ loopback 55432/55433، volume تطوير جديد وtmpfs للاختبار، healthchecks. الصورة مثبتة بـdigest في compose.yaml. حسابا التهيئة محليان؛ لا يستخدمان كتفويض تطبيق أو برهان RLS. لا جداول GHIDAI أو migrations أو seed.

check-database يتحقق من identity ومخطط public فارغ وround-trip داخل temporary table transaction؛ ينتهي الجدول عند commit. حاجز الاتصال يرفض عنوان/حساب/قاعدة/منفذ غير مطابقين أو query parameters. فصل قواعد البيئات لا يثبت عزل مستخدمين داخل التطبيق؛ ذلك في P2 وما بعدها.
