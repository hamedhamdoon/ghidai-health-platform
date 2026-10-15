# خطة التنفيذ والتحقق والتشغيل

تحديث تنفيذ2026-10-14: P8/P9/P10 نفذت بمسارات مستقلة ومالك تكامل واحد للمهاجرات والعقود. نقاطGit مستقلة؛الفحوص المرحلية ثم الانحدار الشامل في[تقرير التكامل](P8-P10-INTEGRATION-REPORT.md). المراحلP11/P12 لم تبدأ. بواباتمالك/قانون/صحةA-01..A-12 باقية؛الجدول الأصلي خطة وتاريخ وليس دليل تشغيل.


1.0 — 2026-10-11. هذه خطة مستقبلية شاملة؛ لا يبدأ تنفيذ التطبيق دون تكليف لاحق. جميع R-* موصوفة في [المتطلبات](PROJECT_REQUIREMENTS.md) ومتتبعة في [السجل](REQUIREMENTS-TRACEABILITY.md). حالة جميع الوظائف: غير منفذة؛ حالة هذا الإصدار: مواصفات معدة للمراجعة. لا جدول زمني تعاقدي قبل معرفة الفريق واعتماد الفجوات.

## ترتيب الاعتماديات والقبول

| المرحلة | الاعتماد | المخرجات المستقبلية | اختبار/شرط الانتقال |
|---|---|---|---|
| P0 اعتماد التصميم | هذا الإصدار | حسم A-01..12 بحسب المرحلة، سجل القرارات، حقوق المصدر، نطاق جمهور | لا تنشر غذاء دون مختص؛ لا إنتاج دون قانون/مزود ملائم |
| P1 أساس المشروع | P0 تقني | Next/TS/Tailwind ، lockfile ، env example ، Docker PostgreSQL dev/test ، CI ، changelog ، الوثائق التشغيلية | type/lint/build ، حاجز test يمنع production ، قياس أحجام أولية |
| P2 البيانات والأمان | P1 | Prisma/SQL migrations ، FK/check/RLS ، audit/idempotency/rate limit ، synthetic seed | T-03/T-20 ، non-owner DB tests ، migrations forward/recovery على test |
| P3 الهوية والملف | P2 + A-08/09/12 | auth/verify/reset/MFA/sessions/profile/consent/goals | T-01/02 ، إفشال token replay و role injection ، بريد مجاني متحقق قبل الإنتاج |
| P4 محرك البرامج والمحتوى | P2/P3 + A-01/05 | مصادر/نسخ، أيام/تكرار/أوقات، مراجعات وتأهيل، وجبات/بدائل، مؤلف/معاينة/نشر | T-04/07/15/17 ، نشر غير مراجع مرفوض، clone لا يغير مشتركًا قديمًا |
| P5 المشاركة والجدول | P4 + A-03 | enrollment snapshots ، occurrences ، required/optional ، today ، withdraw/corrections | T-05/06/19 ، duplicate/concurrent joins ، القادمة واضحة |
| P6 التتبع والمراجعة | P3/P5 | ماء/خطوات/رياضة/نوم/عادات/review ، quick add ، تعديل/حذف خادمي | T-08..11 ، حفظ ثم إعادة دخول واسترجاع، وقت/تداخل/حدود |
| P7 التقدم والتحفيز | P5/P6 + A-04 | BR calculators ، إحصاء فعلي ورسوم/جداول، awards/revoke/certificates | T-12/13 ، N=0 ، أهداف مختلفة، حذف يسحب استحقاقًا، لا رسومات وهمية |
| P8 المدرب والإدارة | P3/P4/P6 | assignment-consent/scopes ، coach views/notes ، users/roles/reports/audit/operations | T-03/15 ، سحب الموافقة يمنع الطلب التالي، آخر ADMIN محمي |
| P9 التنبيهات والخصوصية | P3/P5/P6 + A-07..11 | مركز تنبيهات، preferences ، outbox ، export/delete/ledger ، push إن دعم مجانيًا | T-14/16 ، duplicate jobs/quiet/DST ، private download ، استعادة لا تعيد محذوفًا |
| P10 PWA و UX والأداء | جميع الشاشات | تثبيت، offline banner ، assets cache ، RTL/A-11Y وتخفيف JS | T-19/22/23 ، widths360/768/1280 ، keyboard/screen reader ، Lighthouse ومقاييس فعلية |
| P11 تجهيز التشغيل | P2/P9/P10 + A-06/07/08/09 | host مجاني مجاز، DB مستقل، secrets ، backup scheduler/site ، runbooks ، فحص quotas | T-18/24 ، backup restore مثبت، no-card/no-autocharge ، لا نشر تلقائي |
| P12 قبول وإصدار | P11 + موافقة نشر منفصلة | HTTPS domain مجاني، changelog ، release reviewed ، تقرير قبول | T-21: حسابان من جهازين مستقلين فعليًا، persistence/isolation ، موافقة دمج main منفصلة |

P8 إدارة التأليف الأساسية تبدأ مع P4 ، لكن اكتمال لوحة التشغيل بعد P7 ؛ لا يؤخر ذلك بوابة مراجعة المحتوى. مراحل الاختبار ملازمة للعمل لا تنتظر P12. التكاملات التي لا تثبت مجانيتها تسجل non-available ولا يحذف نطاقها بصمت.

## مواصفات الاختبارات

| Test ID | حالات قبول إلزامية |
|---|---|
| T-01 | register/verify/login/logout/reset ، token expiry/replay ، revoke بعد تغيير كلمة/دور، MFA setup/challenge/recovery ، rate limit لا يكشف الحساب |
| T-02 | ملف/هدف مؤرخ/حجم كوب وموافقات، تخطي الوزن والموافقة الاختيارية، timezone لا يعيد كتابة الماضي |
| T-03 | مصفوفة وصول لكل route/table: A/B مستخدمان، COACH مع/دون تعيين/بعد سحب، ADMIN دون grant صحي؛ UUID spoof و role injection و pooled connection context ؛ negative cases لا تُكتفى بـ happy path |
| T-04 | برنامج 7/15/21 يومًا، مهام يومية/أيام مختارة، order/relative-cycle invalid ، immutable version ، pause/archive ، تخصيص مستقبل لا يغير الماضي |
| T-05 | الانضمام لنفس البرنامج مرتين وبتزامن، fixed/flexible date ، withdrawn/content withdrawal ، goal overrides ، rollback لا يترك days orphan |
| T-06 | complete/replay/undo/recomplete ، quantitative لا يتمم manual ، 409stale ، next-task order ، optional لا يدخل المقام |
| T-07 | مكونات ووحدات/وزن RAW/COOKED ، اختيار بديل من نسخة أخرى مرفوض، لا تحويل SPOON لـ G بلا عامل، قراءة published فقط |
| T-08 | ml/cup snapshot/negative/NaN/future ، retry نفس key لا duplicate ، bodychanged409 ، edit/delete يعيد derivedcompletion ؛ الماء لا يتمم بقية tasks |
| T-09 | PUTsteps1000 ثم 1500 يعني 1500 لا 2500 ؛ zero مقابل absent ، goal8000 أو targetperson ، stale update/deletion |
| T-10 | نوم عبر midnight/daywake ، ends≤start/overlap مرفوض، timezone/DST ، تمرين مدة invalid ، habit duplicate/archive/future |
| T-11 | reviewuniqueuser/day ، option خارج schema مرفوض، notesXSSescaped ، غياب الوزن مسموح، schema ثلاثي وخماسي لا يخلطان |
| T-12 | N=0→null ؛ C0/3→0 و C1/3→33.3 و C3/3→100 ؛ optionalonlynull ؛ أيام N2 و N4 ب C2 و C1 تعطي 50% لا 62.5 ؛ futureexcluded/missingzero/latewindow/streak/withdraw ؛ total≥target لا يتجاوز 100 |
| T-13 | firstday/3daystreak/≥80% حسب ruleVersion ، thresholdboundary ، enddate ، duplicateaward ، deletion→REVOKED ، certificate private/revoked |
| T-14 | consentdenied/revoked ، quiet crossingmidnight ، DSTnonexistent/repeated ، duplicateclaim/deliveryfailure/retry/endpointrevoked ، notification nohealthcontent |
| T-15 | كل زر ADMIN/COACH يدخل وينفذ ويحفظ، draftspreview لا enrollment ، لا lastadminremoval ، reports تحجب cohort صغير وفق policy |
| T-16 | exportschema/count/owner ، TTL ورابطغيرعام، لا hash/secrets ، deletionjobretry ، orphancheck ، ledger بعد restore ، موافقةوسحب coach |
| T-17 | healthreviewgate ، source+DIF مرتبطة، author≠reviewer ، qualificationscope/expiry ، contenthashchanged يلغي approval ، publishmissingday/alternative مرفوض |
| T-18 | dev/test/prodguards ، pg_dump مشفر/مستقل، restore جديد checksum/count/FK/login/RLS/aggregate ، سجلوقت RPO/RTO ؛ فشل restore لايسجلنجاحًا |
| T-19 | جميع S-01..32/S-40..56: loading/empty/error/offline/success/forbidden ، حفظ فاشل لا يعرض نجاحًا، dailyactions≤2 نقرة، 5nav ، 360/768/1280 |
| T-20 | CSRF/Origin ، stored/reflectedXSS ، unknownfield/role ، brute force/rate/capbody ، session fixation ، secret scan ، authorization في RSC/API و DB |
| T-21 | typecheck/lint/build/unit/integration/E2E ، حسابان فعليان من جهازين مستقلين عبر HTTPS بعد الموافقة، حفظ/استرجاع بعد خروج، منعتبادل UUID ، تقرير إصدار ومراجعة |
| T-22 | contrast/zoom200%/touch/focus/reducedmotion ، keyboard+screenreader ، textualcharts ، Lighthouse ودليلجهاز/شبكة و p95/API/JSbudget مقابل R-22 |
| T-23 | installability على devices مدعومة، publicassetcache فقط، offlinehealthAPI لا ينجح، logout لا cache صحي، لا ادعاء sync |
| T-24 | quotas70/85/95 ، cappedprovider503 ، gracefuldegrade ، nocharge/upgrade/card ، pgexport/h جرة trialsynthetic ، قانونومزود reviewgates |

Unit: domain calculators/validation/scheduling ؛ integration: PostgreSQL حقيقي مؤقت non-owner + transactions/RLS/constraints/API ؛ Playwright: رحلات register→join→daily→summary/coach/admin على أحجام محددة. Vitest أواختيار stable متوافق في P1 ، لا اختبارات تعكس تفاصيل التنفيذ فقط؛ اختبارات عزل وتزامن ذات قيمة. Accessibility axe آلي مع فحص يدوي، performanceLighthouse ومقاييس load test ببيانات اصطناعيةضمن quotas.

دليل كل تشغيل: timestamp/commit/environment/command/dataset/device+viewport و pass/fail/blocked/artifact ، لا اعتبار «مخطط» ناجحًا. توثق `docs/TEST-RESULTS.md` فيالتنفيذ، و`docs/ARCHITECTURE.md`/`DATABASE.md` يمكن فهرسة وثيقتي التصميم دون نسخ متضارب؛ `FEATURES.md`/`DEPLOYMENT.md`/`FINAL-STATUS.md` تعد عند بدء المراحل المناسبة مع حالة حقيقية، وفق AGENTS. لا عمل build/test تطبيقي الآن لأن لا app موجود.

## سجل المخاطر

| الخطر | الأثر | المعالجة / مسؤول |
|---|---|---|
| تعارض الغذاء/claims | ضرر أو وعود غير صحيحة | A-01+content hash review ، مختص |
| تسرب بين مستخدمين | خصوصية وأمن | RLS/ownerFK/scopedrepository/T-03 ، أمن+DB |
| حصص كوب/ملعقة مجهولة | بيانات/هدف غير صحيح | حجم صريح/لا conversion افتراضي/A-05 ، مختص+UX |
| late/timezone/DST | حساب streak خاطئ | PolicyVersion/snapshots/T-12/14 ، backend |
| خطة مجانية غير مناسبة أو حد مفاجئ | توقف خدمة أو مخالفة شروط | تحقق استخدام/quotas ، alerts ، noautoupgrade ، المالك+تشغيل |
| scheduler/mail مجاني غير كاف | reset/push غير يعمل | A-09 بوابة إنتاج، fallback داخل التطبيق صريح، تشغيل |
| RLS مع connection pool | context مستخدم سابق | SETLOCALtransaction/nonowner و testpool ، DB |
| تغيير برنامج منشور | تاريخ إنجاز يتغير | versionimmutable وسحب سلامة مدقق، backend |
| نسخ احتياطية غير قابلة للاستعادة | فقد بيانات | encryptedindependent و restoretest/RPO/RTO ، تشغيل |
| قانون/نقل بيانات صحية | عدم أهلية الإنتاج | A-07 تقييم مختص وتصريح عند انطباقه، مالك+قانوني |
| ضعف اتصال/هاتف | إدخال مكرر أو نجاح زائف | idempotency ، حالات UX ، JSbudget/T-19/22/23 ، frontend |
| وصول إداري واسع | كشف صحة دون حاجة | metadataonly/breakglassgrant منفصل و audit ، أمن |

## متطلبات النشر واستعادة الخدمة

محلي مستقبلًا: NodeLTS/DockerDesktop/Git ، clone في المسار المعتمد فقط، envlocal مستقل، dependencieslock ، migrationdev ، syntheticseed ، devserver ؛ الوثيقة التشغيلية لاحقًا تحدد أوامر فعلية من package الموجود بدل أوامر متخيلة. الإنتاج: موافقة مالك، محتوى معتمد، legalreview ، freehostverified/no-card/domain ، secrets ، DB مستقل/RLS ، migrationreview/backup ، endpointsreadiness ، mail/scheduler ، quotaalerts ، restoretest ؛ ثم smokeHTTPS/userA/B جهازان. automaticpreviewdeployment على push **يجب تعطيله قبل ربط host** حتى لا يتحول push المصرح إلى نشر عام غير مصرح.

Release: branchfeature/fix ، changelog ، requiredchecks/review ، موافقة main منفصلة، موافقة publicdeploy منفصلة، tag/release بعد قبول؛ لا forcepush. Recovery تتبع[ADR النسخ](SYSTEM_ARCHITECTURE.md): وقف الكتابة، restore لبيئة جديدة، deletionledger ، functional/isolationchecks ، موافقة تبديل، postincident ؛ لا resetproduction من test.

## تحقق حزمة التصميم الحالية

نتيجة الفحص المنفذ في 2026-10-11: اكتملت الملفات الثمانية؛ نجح فحص 38 رابطًا محليًا ووجود R-01..24 وT-01..24، وتحليل IMG-01..06 وسجل DIF-01..17 والشاشات S-01..32 وS-40..56. فُحصت المصادر بصريًا وروجعت قواعد الحساب والنسخ والملكية. لم يتغير AGENTS.md أو README.md أو الصور. فحص Git للمسافات والنطاق مطلوب قبل Commit. هذه نتائج تحقق وثائق وليست اختبارات تطبيق.

فحص اكتمال الملفات الثمانية، روابط Markdown المحلية، وجود كل R-01..24 و T-01..24 في التتبع، صورة مصدر لكل IMG01..06 ، اتساق قواعد required/optional/versions/ملكية، `git diff --check`، ونطاق diff وثائق فقط. سيُنشأ commit ويُدفع فرع feature بعد نجاح الفحوص. بيانات حالة Git النهائية في التقرير المرافق، لا ادعاء push داخل وثيقة قبل حدوثه.

سجل تغيير 1.0: تحليل ست صور على حدة؛ 17 اختلافًا؛ متطلبات 24 مجموعة؛ مصفوفة صلاحيات؛ خريطة 49 شاشة/حالة؛ عقود API ؛ تصميم جداول وقيود؛ قواعد حساب صريحة؛ خطة مرحلية واختبارات ومخاطر وبوابات اعتماد. العدد 49=32 شاشة مشارك+17 مدرب/إدارة. الوظائف منفذة: لا شيء؛ جزئية: لا شيء؛ تصميمية: هذه الحزمة؛ جاهزية الإنتاج: غير جاهز؛ اختبارات التطبيق: لم تُشغّل ولا ينطبق إعلان نجاحها.

## P11 authorization — 2026-10-15

P11 local operational preparation is authorized from79752ab on feature/ghidai-p11-production-readiness. Provider assessment, fail-closed configuration contracts, isolated encrypted restore rehearsal, monitoring/runbooks, dependency review and performance measurements are integrated under one owner. [P11-HANDOFF](P11-HANDOFF.md) and [P11-TEST-RESULTS](P11-TEST-RESULTS.md) define actual engineering acceptance. A-01–A-12 and production runtime/provider/legal/content/independent-backup gates remain open; P12 requires a new instruction. No public/cloud/paid activation or main merge.
