# P11 — المراقبة والتعامل مع الأعطال

تشغيل محلي يدوي فقط، دون scheduler دائم أو رسائل خارجية أو حسابات خدمات. البيانات اصطناعية. `scripts/p11-monitor.ts test|development [schema]` يخرج JSON تجميعيًا دون أسماء/بريد/صفوف أو payloads صحية. المخطط الافتراضي public، أو مخطط p3_test_timestamp محدد صراحة؛ لا يمثل public حالة مخططات الاختبارات الأخرى. دوال العتبات في `src/server/operations/monitor.ts` مختبرة؛ العتبات الأولية ليست SLA أو قبولًا إنتاجيًا.

```powershell
node node_modules/tsx/dist/cli.mjs scripts/p11-monitor.ts test
```

| القياس | الإشارة/التصرف |
|---|---|
| قاعدة البيانات | اتصال بهوية وقاعدة loopback المتوقعة؛ فشل الاتصال DATABASE_UNAVAILABLE ورمز خروج 1 |
| OutboxJob | FAILED>0 أو PENDING متأخر أكثر من 15 دقيقة؛ لا يخرج محتوى الوظائف |
| AuthMail | محاولات فاشلة ورسالة غير مرسلة وغير منتهية؛ لا يخرج مستلمين أو روابط tokens |
| النسخ | BACKUP_NOT_VERIFIED يبقى ظاهرًا لأن الجولة ذات مفتاح مؤقت؛ لا تتحول إلى نسخة تشغيل ناجحة بمجرد وجود دليلها. يدعم عقد العتبات BACKUP_STALE عند عمر>24 ساعة، لكن مصدر النسخ التشغيلية الدائم لم يُعتمد |
| التخزين | مساحة متاحة<15% STORAGE_LOW؛ الرقم للـfilesystem الحالي وليس حصة مزود سحابي |
| الأخطاء | ERROR_RATE_NOT_MEASURED حتى تجميع counters من خادم فعلي؛ لا يُقدّم صفرًا مصطنعًا |
| الموارد | RSS لعملية أداة المراقبة فقط؛ راقب خادم Next وPostgreSQL على حدة؛ لا يُنسب RSS الأداة للتطبيق |

يجب ربط health/readiness بـHTTP probes محلية: health يشخص عملية التطبيق، readiness يفحص اتصالًا محدود المهلة دون تفاصيل بنية أو أسرار. احجب caching. لا تجعل health نجاحًا دليلًا على جاهزية قاعدة البيانات. لا تنشر debug endpoints أو مقاييس مستخدمين للعامة. معدل 5xx/zمن الاستجابة يحتاج تجميعًا محليًا أو نظامًا معتمدًا عند اختيار الاستضافة؛ لا يوجد منتج خارجي مفعّل.

## Runbooks

**انقطاع PostgreSQL:** أوقف إدخال تعديلات جديدة إذا استمرت الأخطاء؛ افحص readiness وحالة حاويتي المشروع فقط وموارد القرص. لا تُعد تشغيل Docker كله ولا تستخدم down -v أو reset. حاول استرجاع الخدمة القائمة دون حذف Volumes. أعد readiness واختبار قراءة/كتابة اصطناعي واختبار عزل RLS قبل استئناف العمل. قواعد tmpfs الاختبارية تفقد البيانات عند إعادة الحاوية؛ لا توقفها بغرض التجربة في جولة مشتركة.

**إعادة تشغيل التطبيق:** تحقق من العقود البيئية والأصول الموثوقة والمهاجرات والصلاحيات، أوقف عملية المشروع المحددة برقمها فقط، ابدأ الخادم على loopback، ثم افحص health/readiness وتسجيل الدخول الاصطناعي. لا تطبع البيئة. لا تستخدم منافذ/عمليات مشروعات أخرى. تظل إعادة التشغيل الإنتاجية وتغيير الإعدادات gated.

**فشل البريد:** افحص Mailpit المحلي ومهلات SMTP وعدد الرسائل المعلقة دون فتح payloads في التقارير. التسليم الحالي خاص بـloopback وليس adapter بريد إنتاجي. لا تشغّل mail:retry بلا تحديد عدد محاولات وحدود إرسال؛ لا توجد حاليًا آلية backoff/maxAttempts في AuthMail، وهذا مانع إنتاج موثق. انتهِ باختبار اصطناعي بلا إرسال خارجي. لا تتعامل مع نجاح queue كدليل تسليم.

**فشل الوظائف/الجدولة:** افحص تجميعي status/attempts/dueAt وquiet hours والموافقة النافذة. Outbox يستخدم إعادة محاولة مؤجلة بحد أقصى ويمنع التسليم عند سحب الموافقة أو قدم الرسالة؛ endpoint local-tick يعمل في سياق المستخدم. لم يُنفذ عامل مستقل شامل متعدد المستخدمين ولا مجدول دائم؛ يجب تصميم lease/منع التكرار/إعادة المحاولة قبل تفعيل أي scheduler. لا تغيّر حالات الوظائف مباشرة في قاعدة البيانات ولا تعيد إرسال جماعيًا.

**فشل النسخ/المساحة:** اتبع P11-BACKUP-RESTORE؛ لا تعتبر ملفًا موجودًا دليل استعادة. أوقف النسخ الجديدة عند نفاد المساحة واحفظ آخر نسخة متحقق منها. لا تحذف سجلات أو نسخ أو بيانات المستخدمين لتوفير مساحة دون سياسة معتمدة.

**ارتفاع الأخطاء/الاستهلاك:** اجمع timestamps وroute templates وstatus counters وlatency دون query strings أو tokens أو user IDs. ابدأ بتشخيص event loop والاتصالات/pg_stat_activity وEXPLAIN غير المعدل ثم خفّض الحمل الاصطناعي. لا تعالج تشبع الاتصالات بإلغاء حدود مجمع الاتصال أو تعطيل rate limits. تجنب log request/response bodies وSQL parameters.

## ضوابط التشغيل والقيود

فاصل فحص أولي مقترح 60 ثانية ومراجعة العتبات من قياسات فعلية؛ غير مفعّل. التنبيه يحتاج مسؤولًا/بديلًا وقناة وموافقة وسياسة وصول واحتفاظ قبل الإطلاق. لا توجد متابعة دائمة من انتهاء P11 ولا incident SLA أو on-call معتمد. سجلات الأدلة المحلية مستثناة من Git؛ التقارير الملتزمة تحتوي مقاييس مجمعة فقط. حد الموارد/استهلاك مجانية السحابة والتنبيه قبل الحصة يحتاج اختبارًا لدى مزود يختاره المالك.

## نتائج محلية 2026-10-15

الفحص النهائي على `p3_test_1792036970189` عند 08:05:45 بتوقيت مسقط: databaseAvailable=true، jobTelemetryAvailable=true، failedJobs=0، overdueJobs=0، failedMail=0. الموارد: مساحة متاحة 6906191872 بايت من 128340455424 (5.381%)، أقل من عتبة 15%؛ أصدرت الأداة STORAGE_LOW وexit 1 بصورة صحيحة. هذا تنبيه فعلي مفتوح في جهاز التطوير؛ لم تُحذف ملفات أو بيانات لتجاوزه. بقي BACKUP_NOT_VERIFIED (مفتاح تمرين مؤقت) وERROR_RATE_NOT_MEASURED صريحين. RSS أداة المراقبة 70033408 بايت وليس RSS التطبيق.

عينة `docker stats --no-stream` للحاوية المحددة `ghidai-p1-local-postgres-test-1` فقط خلال أعمال الاختبار المتزامنة: CPU=18.35%، ذاكرة 1.094GiB من حد Docker المشترك 15.46GiB، PIDs=13، Block I/O=176MB/8.19kB، network=103MB/118MB. ليست baseline ساكنة أو قياس إنتاج أو دليل سعة مزود مجاني؛ لا تشمل حاوية أو موارد مشروع آخر.

اختبارات الوحدة للعمليات: 5/5 PASS (تشفير/فك، عبث/مفتاح خاطئ، حد الوجهة الجديدة، إشارات المراقبة، قيم غير صحيحة). الاستعادة المنفذة ونتائج المصادقة/RLS والتحليلات موثقة في P11-BACKUP-RESTORE. فشل تشغيل مراقبة public الأول لا يعني تعطل PostgreSQL: افتقار المخطط الافتراضي إلى بيانات التليمتري فُصل في الأداة عن إتاحة الاتصال، وأُعيد القياس بنجاح على المخطط المعزول المحدد أعلاه.

## Opt-in local HTTP counters

`GHIDAI_LOCAL_METRICS=true` enables sanitized status/duration records for handled `/api/v1` responses only. Production or invalid environment selection disables emission. No URL, actor, requestId, cookie, body, email or health text is accepted by the emitter. Sink failure does not alter the response. No scheduler/file writer/remote transport is installed in the app.

The explicit P11 capacity runner directs local server output to ignored `.npm-cache/p11-http-metrics.jsonl`. The strict parser accepts only the three approved fields and summarizes valid responses (5xx/total;4xx separate;p95 duration). `ops:monitor` consumes that file only when<=2MB and modified within15minutes; missing/stale/unrecognized observations remain unknown. This is a bounded rehearsal sample, not a persistent/global production error rate. The outage run captures a separate sanitized stream to verify real503 observation. Production aggregation/retention/operator alert transport remain OPEN.

Rehearsal HTTP file attribution is test-only: a development monitor does not consume the capacity runner's test traffic and leaves its own rate unknown.
