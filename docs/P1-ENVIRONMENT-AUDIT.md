# P1 — تدقيق البيئة المحلية

2026-10-11 — Asia/Muscat. المصدر فحص الجهاز الفعلي؛ لا تثبيت أدوات عامة.

| العنصر | النتيجة |
|---|---|
| المستودع | المسار المعتمد؛ Git status نظيف قبل العمل |
| التصميم | feature/ghidai-system-design عند f0f96aeb9c13f372c51dc39e89f9eed79e6780c3؛ ancestor تحقق exit 0 |
| فرع التنفيذ | feature/ghidai-p1-foundation أُنشئ من checkpoint المعتمد؛ محاولة sandbox الأولى لم تكتب .git، وأعيد الإنشاء بصلاحية Git قبل أي Commit |
| Windows | Win32_OperatingSystem: Windows 11 Pro 10.0.26300، build 26300؛ DisplayVersion 26H2؛ ProductName القديم في registry ليس المرجع |
| Node | v24.20.0 موجود؛ خط LTS 24؛ لم يُعد تثبيته |
| npm | 11.19.0 موجود؛ لم يُحدث عالميًا |
| Git | 2.55.0.windows.3 |
| Docker Desktop | 4.90.0.238679؛ تثبيت المستخدم AppData/Local/Programs/DockerDesktop |
| Docker CLI | 29.7.2 a7dcaa6؛ لا يدل وحده على جاهزية Engine |
| Compose | v5.5.1 |
| المنافذ | netstat لم يجد listeners على 3000/5432/55432/55433 في الفحص الأول؛ يعاد الفحص قبل التشغيل |
| الملفات الأولية | AGENTS وREADME وgitignore وdocs والصور الست؛ لا تطبيق سابق |

داخل sandbox حُجبت CIM وGet-NetTCPConnection وملفات config؛ أُعيد الفحص المصرح read-only خارج sandbox. npm network رفض EACCES؛ أُجيز تثبيت الحزم المحلية مع lockfile. تنزيل الحزم بطيء؛ لا حاجة إلى إعادة تثبيت Node/npm.

Docker بدأ غير مشغل. تشغيل Desktop الموجود من عملية Codex أظهر خطأ sailor-ingest.sock إلى .stale؛ المالك أكد النص. لم تُحذف أو تُنقل ملفات runtime ولم يُمس Volume أو WSL أو إعداد نظام. طلب تشغيل Desktop من قائمة ابدأ خارج Codex، بناءً على [بلاغ مطابق](https://github.com/openai/codex/issues/52698)؛ هذه قرينة وليست تشخيصًا مثبتًا. [إرشادات Docker](https://docs.docker.com/desktop/troubleshoot-and-support/troubleshoot/) لا تبرر factory reset مع بيانات مشروعات قائمة.

توافق الحزم: [Next installation](https://nextjs.org/docs/app/getting-started/installation)، [Node releases](https://nodejs.org/en/about/previous-releases)، [Prisma requirements](https://www.prisma.io/docs/orm/v7/reference/system-requirements). استُعلم npm عن الإصدارات الفعلية؛ Prisma latest كان RC فاختير 7.10.0 المستقر. القائمة المثبتة الدقيقة في package.json وpackage-lock.json، لا استخدام ranges للحزم المباشرة.

ما لم يُنفذ: خدمات سحابية، تثبيت Docker جديد، تحديث Windows/WSL، تغيير إعدادات عامة أو خدمات مشروعات أخرى، أو تشغيل قواعد إنتاج.

النتيجة النهائية: استجاب Engine 29.7.2، وجرد ps/volume أظهر egos-postgres وmihan-* وvolumes egos_postgres_data/mihan_pgdata. أنشئت موارد ghidai-p1-local فقط؛ نجح stop/up للقاعدتين ثم Prisma dev/test مجددًا، وبقي volume التطوير ghidai-p1-local_development-data والـvolumes الأصلية. لم يُنفذ reset أو down -v. التطبيق يعمل على loopback:3000.
