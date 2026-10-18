# سجل تتبع المتطلبات

## P12 — سجل القبول الحالي، 2026-10-18

المصدر: تكليف المالك P12 وAGENTS والمتطلبات الأصلية R-01–R-24 واختبارات T-01–T-24. [مصفوفة القبول](P12-REQUIREMENTS-ACCEPTANCE.md) تربط كل معرف بالتنفيذ واختباره الفعلي والجزئية/القرار والفجوة؛ [الرحلات](P12-USER-JOURNEY-VALIDATION.md) تربط UC-01–UC-10 بالمتصفح والخادم/القاعدة. الحالة PASS / FAIL / BLOCKED / NOT TESTED مقيدة بالنطاق؛ لا تعني نتائج P1–P11 أو مجرد ملف اكتمال الوظيفة. P12-F01 يثبت غياب رحلة وجبة/بديل المشارك رغم نجاح تأليف الغذاء؛ P12-F02..04 توثق بقية الجزئيات في [الفجوات](P12-OPEN-ISSUES.md). أولوية ومصدر الصور/المالك والملفات الأصلية محفوظة في الجداول التاريخية أدناه. لا تعديل لقرار A غير معتمد. نتيجة التشغيل النهائي لكل مجموعة وأدلته في [الانحدار](P12-REGRESSION-TEST-RESULTS.md).

## تنفيذ P8–P10 — 2026-10-14

المصدر: تكليف المالك COMBINED IMPLEMENTATION P8 + P9 + P10؛ AG/PR/UX/SA/API/IP. الأدلة [تقرير التكامل](P8-P10-INTEGRATION-REPORT.md) وتقارير كل مرحلة. الجداول التاريخية أدناه لا تلغي الحالة الأحدث ولا تغلق A-01..A-12.

| المعرف | المصدر/الأولوية | الوحدة والملفات | اختبار القبول | الحالة والحد |
|---|---|---|---|---|
| R-03/R-15/R-20،T-03/15/20 | المالك3/6؛AG6/8/18؛P0 | administration،migrations015/017،coaching/admin panels،auth/http | p8 native/browser؛expiry/revoke/replay/last-admin/RLS A/B/coach/admin؛READ/NOTE exact assignment/consent | محلي اصطناعي؛A-11/A-12 تحجبان سلطات حقيقية/صحة إدارية |
| R-02/R-14،T-02/14 | المالك4؛UX25/27؛P1 | notifications service/rules/panel،migration016 | p9 unit/native/browser quiet/DST/expiry/consent/change/dedup/retry | داخل التطبيق وفحص محلي؛لاPush/مجدول إنتاج |
| R-16/R-20،T-16/20 | المالك4؛UX29..31؛P0 | privacy service/rules/panel/artifacts/full-deletion-rehearsal | p9 ownership/reauth/JSONCSV/TTL/RLS/audit؛full isolated graph deletion/rollback | تصدير وطلبات وآلية حذف اصطناعية معزولة؛الحذف الإنتاجي والاحتفاظ A-07/A-08 محجوبان |
| R-19/R-22،T-19/22 | المالك5؛AG21/25؛P0 | globals/layout/P8P9P10 panels/tests |360/768/1280 keyboard/focus/axe/zoomCSS/motion وقياسات | الدليلP10؛قارئ شاشة/هاتف فعلي غير مثبتين |
| R-23،T-23 | المالك5؛SA ADR06؛P0 | manifest/sw/pwa-status/icons/offline | p10 worker/browser manifest/offline/APIcache/logout | أصول عامة فقط؛لاhealth queue/sync |
| R-18/R-21/R-24 | المالك7..10؛P0 | platform setup/test/e2e/performance/reports/checkpoints | dev/test26checksum/secrets/regression | لاP11/P12/cloud/fees/main/public deployment |


1.0 — 2026-10-11. الجدول الأصلي خط أساس التصميم؛ حالة «مصمم» لا تعني وظيفة منفذة. تقدم P1 في الملحق أدناه. المصادر: المالك=تكليف FULL REQUIREMENTS ، AG=n قسم AGENTS ، IMG=n الصورة كما حللت في[تحليل الصور](IMAGE_CONTENT_ANALYSIS.md). أولوية P1 في صفوف المتطلبات ليست رقم مرحلة التنفيذ؛ المسارات المستقبلية في الجدول تظل تخطيطًا ما لم يحدد الملحق تنفيذًا فعليًا.

رموز الوثائق: PR=[المتطلبات](PROJECT_REQUIREMENTS.md)، UX=[الشاشات](UX_UI_SPECIFICATION.md)، SA=[المعمارية](SYSTEM_ARCHITECTURE.md)، DB=[البيانات](DATABASE_DESIGN.md)، API=[العقود](API_SPECIFICATION.md)، IP=[الخطة والاختبارات](IMPLEMENTATION_PLAN.md). كل T-*معرف سيناريو قبول مفصل في IP ؛ وصف R-*في PR مرجعالقيم. كل صف مصمم/غيرمنفذ/غيرمختبر، ولا يستنتج اعتماد صحي.

| ID | الوصف | المصدر | أولوية/وحدة | ملفات التصميم؛ المسار المستقبلي | اختبار قبول | الحالة |
|---|---|---|---|---|---|---|
| R-01 | تسجيل/تحقق/دخول/خروج/استرداد/جلسات/MFA | AG5,8 ؛ المالك | P0 auth | PR/SA/DB/API/UX S02–06 ؛ src/modules/auth | T-01/20: token/revoke/rate | مصمم |
| R-02 | ملف/أهداف/حجم كوب/timezone/موافقات | AG5,8,20 ؛ المالك | P0 profile | PR/DB/API/UX S07/26/29 ؛ src/modules/auth | T-02: لا أثر رجعي ولا موافقة إجبارية اختيارية | مصمم، A-05/08 |
| R-03 | عزل/RBAC/مدرب مخول/منع رفع دور | AG6,18 | P0 security | PR/SA/DB/API/UX S40–42/50–51 ؛ src/server/authorization | T-03: A/B/coach/pool/DB | مصمم، A-11 |
| R-04 | محرك مدة/مهام/تكرار/نسخ/توقف/أرشفة | AG19 ؛ IMG03/04/05/06 | P0 programs | PR/DB/API/UX S44–46 ؛ src/modules/programs | T-04: 7/15/21/immutable | مصمم |
| R-05 | مشاركات/begin/withdraw/نسخة/أهداف | AG5,19,20 | P0 enrollment | PR/DB/API/UX S08–13 ؛ src/modules/programs | T-05: duplicate/concurrency | مصمم |
| R-06 | مهام يوم/ترتيب/أوقات/إتمام/تراجع/سابق | AG5,20,21 ؛ IMG01–03/05/06 | P0 schedule | PR/UX S11/13/DB/API ؛ src/modules/programs | T-06: القادمة/اختياري/replay | مصمم، DIF06/07/16 |
| R-07 | خطط/مكونات/حصص/بدائل/وحدات | AG5,9,19 ؛ IMG01–03/05/06 | P0 nutrition | PR/DB/API/UX S14/47/48 ؛ src/modules/nutrition | T-07/17: بديل مخول واعتماد | مصمم، A-01/05 |
| R-08 | ماء ml/cup/تعديل/حذف/مجموع | AG5,9,20 ؛ IMG01/02/03/05/06 | P0 tracking | PR/DB/API/UX S16 ؛ src/modules/tracking | T-08/12: snapshot/replay/لا يتمم غيره | مصمم، DIF04 |
| R-09 | إجمالي خطوات/تمرين/هدف شخصي | AG5,9,20 ؛ IMG01–06 | P0 tracking | PR/DB/API/UX S17/18 ؛ src/modules/tracking | T-09: replacement/0/absence | مصمم، DIF08 |
| R-10 | نوم/عادات/عبور منتصف الليل | AG5,20 ؛ IMG01–03/05/06 | P0 tracking | PR/DB/API/UX S19/20 ؛ src/modules/tracking | T-10: overlap/wake day/habits | مصمم |
| R-11 | تقييم/ملاحظات/وزن اختياري/مقاييس نسخ | AG5 ؛ IMG01/02/05/06 | P0 reviews | PR/DB/API/UX S21 ؛ src/modules/reviews | T-11: option/schema/unique | مصمم، DIF09–11 |
| R-12 | إنجاز يوم/أسبوع/تراكم/streak/تأخر | AG20 ؛ IMG01 نسب دون قاعدة | P0 analytics | PR BR01–12/SA/DB/API/UX S22/24 ؛ src/modules/analytics | T-12: صفر/100/duplicates/timezone | مصمم، A-03 |
| R-13 | تحفيز/شارات/شهادة واستحقاق/سحب | AG5,20 ؛ IMG01–06 رسائل | P1 motivation | PR BR09/DB/API/UX S23/24 ؛ src/modules/analytics | T-13: evidence/threshold/revoke | مصمم، A-04/10 |
| R-14 | إشعارات/تذكيرات/موافقة/quiet/push | AG5,19,21 ؛ المالك | P1 notifications | PR/SA ADR05/DB/API/UX S25/27 ؛ src/modules/notifications | T-14: consent/retry/DST | مصمم، A-09 |
| R-15 | لوحة إدارة/مدرب/محتوى/أدوار/تقارير | AG5,6,19,23 ؛ المالك | P0 admin | PR/DB/API/UX S40–56 ؛ src/app/(admin),(coach) | T-15/03: كل زر/منع lastadmin | مصمم |
| R-16 | تصدير/حذف/موافقات/احتفاظ | AG8,18,22 | P0 privacy | PR/SA/DB/API/UX S29–31 ؛ src/modules/privacy | T-16: private/TTL/ledger | مصمم، A-07/08 |
| R-17 | استخراج/تعارضات/اعتماد/تأهيل | AG9,24 ؛ IMG01–06 ؛ المالك | P0 content | IMAGE_CONTENT_ANALYSIS/PR/DB/API/UX S48/56 ؛ src/modules/nutrition | T-17: hash/reviewer/publish gate | مصمم، A-01/10 |
| R-18 | بيئات/نسخ مشفرة/استعادة/مراقبة | AG17,22 | P0 operations | SA/DB/IP/API/UX S54 ؛ src/server/jobs | T-18: guard/restore/isolation | مصمم، A-08 |
| R-19 | RTL/mobile/≤5nav/≤2click/states | AG4,21 ؛ IMG01–06 ؛ المالك | P0 UX | UX/PR/IP ؛ src/components | T-19: كل S/360/768/1280 | مصمم |
| R-20 | hashing/session/CSRF/XSS/rate/audit | AG8,18 | P0 security | SA/DB/API/PR ؛ src/server | T-20/03: هجمات وعزل | مصمم |
| R-21 | اختبارات/قبول/إصدارات/Git/HTTPS | AG10,11,14,23 ؛ المالك | P0 QA/release | IP/SA ؛ tests/unit,integration,e2e | T-21: checks+جهازان فعليان بعد الموافقة | مصمم |
| R-22 | وصول/أداء/قياسات فعلية | AG21,25 | P0 UX/performance | UX/PR NFR/SA/IP ؛ src/components | T-22: keyboard/reader/Lighthouse/p95 | مصمم |
| R-23 | PWA/انقطاع/لا claims offline غيرمنفذ | AG1,3,25 | P0 frontend | SA ADR06/UX/IP ؛ src/app | T-23: publiccache/failedsave | مصمم |
| R-24 | مجانية/no-card/domain/قابلية هجرة | AG16,17 ؛ المالك | P0 operations | SA costs/IP/PR ؛ docs/DEPLOYMENT.md مستقبلًا | T-24: quota/freeplan/portability | مصمم، A-06/07/09 |

## تتبع مصادر الصور وعدم إسقاط الاختلافات

| المصدر/جزء المحتوى | متطلبات التصميم | الاختلافات المرتبطة | اختبار/بوابة |
|---|---|---|---|
| IMG-01 الهوية/اسم/تاريخ | R-02/19 | DIF01/17 | T-02/19/A-10 |
| IMG-01 روتين 4/تغذية 4/عادات 4 | R-06–10/17 | DIF03–06/14/16 | T-06–10/17/A-01 |
| IMG-01 التزام/طاقة/جوع/نسبة/ملاحظات/تحفيز | R-11–13 | DIF09/10/11 | T-11–13 ؛ لا تبني formula من الدوائر |
| IMG-02 اليوم/تاريخ/قائمة 12/وقت بعدساعتين | R-02/06–10 | DIF03–05/16 | T-02/06–10 |
| IMG-02 مقاييس/مزاج/وزن/نص رسالة | R-11/13 | DIF09–11/17 | T-11/13/A-01 |
| IMG-03 جدول 7 فترات/أوقات نسبية | R-04/06/07/09 | DIF02/05–07/14 | T-04/06/07/09/A-01 |
| IMG-03 مصادر بروتين/خضار/قواعد/مهمجدًا | R-07/08/10/17 | DIF03/04/12/13 | T-07/17 ، G01/02/03/07 |
| IMG-03 رسائل مؤنثة/هوية | R-13/19 | DIF17 | T-13/19/A-10 |
| IMG-04 سبعةأيام/8000/رسائل يومية/دوائر | R-04/06/09/13 | DIF08/17 | T-04/09/13/A-05 |
| IMG-04 أسماء Instagram مطموسة | R-17 | G06 | لا استنتاج؛ A-10 |
| IMG-05 اسم مقاومة/أهداف/فوائد | R-17 | DIF01 | T-17/A-01 ؛ لا claims تلقائية |
| IMG-05 جدول 8 أوقات+نوم/طعام 4 فئات/حدود 3/تجنب 5 | R-06–11/17 | DIF02/03/06/07/13–15 | T-06–11/17 |
| IMG-05 ماء 8/2–3L ، خطوات 15 ، قواعد 6/محيطخصر/ملاحظات | R-08–12/17 | DIF04/08/11 | T-08–12 ؛ محيطخصر مرجع يحتاج A-05 قبل إضافة حقل منتج |
| IMG-05 رسائل/تحفيز/معلومةالأرز | R-07/13/17/19 | DIF03/17 | T-07/13/17/A-01 |
| IMG-06 اسم/هدف/فوائد | R-17 | DIF01 | T-17/A-01 |
| IMG-06 جدول 10 أوقات+نوم/مصادر/خضار/ممنوعات | R-06–10/17 | DIF02–07/12–15 | T-06–10/17 ؛ عبارات الوزن G02 |
| IMG-06 ماء 8/2–3L وخطوات 15 | R-08/09/12 | DIF04/08 | T-08/09/12 |
| IMG-06 تقييمعام/كيفكاناليوم/ملاحظات/تحفيز | R-11/13/19 | DIF09/11/17 | T-11/13/19 |

كل نصوص الأطعمة والرسائل المرجعية محفوظة في IMAGE_CONTENT_ANALYSIS ؛ ليس كل نص متطلب نشر. محيط الخصر ورد في IMG05 كتوجيه وليس طلب حقل قياس؛ سجّلعند A-05 بدل الإضافة غير المصرح بها. رابط كل DIF إلى R مصممفيهذا الجدول، وحسمهإلى ContentReview مستقبلًا.

## تغطية البنود الدائمة

| AGENTS قسم | التغطية |
|---|---|
| 1–4 هوية/رؤية/stack/UI | R-04/19/22/23 + SA/UX |
| 5–7 وحدات/أدوار/DB | R-01–16 + DB/API |
| 8–9 أمن/صحة | R-03/16/17/20 |
| 10–15 Git/جودة/توثيق/مراحل/قبول/تكليف | R-21 + IP ؛ لا app/DB/deploy ولا AGENTSedit في هذا التكليف |
| 16–18 مجانية/بيئات/متعدد | R-24/18/03 |
| 19–20 ديناميكية/إنجاز | R-04–06/12/13 |
| 21–22 UX/نسخ | R-19/22/18 |
| 23–25 قبول/تتبع/أداء | R-21/17/22/23 وهذا السجل |

## سجل الفجوات والاعتمادات

G01..09 مصدرها الصور في التحليل، A-01..12 قرارات المشروع في PR ؛ لا افتراض أنها اعتمدت. BR03/06 التقدم و ADR العزل/نسخ immutable قرارات تصميم تقنية محددة؛ threshold الشهادة/نافذة التأخر/أهداف الصحة/العمر/الاحتفاظ مقترحة ومميزة. Host ومواقع المعالجة و mail/scheduler غير معتمدة. توجد فجوات تمنع نشر المحتوى أو الإنتاج، لكن لا تمنع إكمال التصميم الحالي.

تحديث السجل عند كل تكليف: ربط الملفات الفعلية بدل المسارات المستقبلية، testartifact+commit ، تحويل مصمم→منفذ جزئي→منفذ مختبر فقط بعد تشغيل الاختبار، وإبقاء blocked صريحًا. لا تغير مصدر الصورة أو تمحو DIF بعد الحسم؛ يضاف قرار واعتماد.

## ملحق مرحلة P1 — 2026-10-11

المصدر تكليف المالك P1 TECHNICAL FOUNDATION، وAGENTS وTEC-01/07/08 وUX؛ أولوية P1 مرحلة تأسيس فقط. لا إغلاق A/RV أو وظيفتي المستخدم/المدرب.

| المعرف | التنفيذ الفعلي | اختبار القبول والأدلة | الحالة |
|---|---|---|---|
| P1-F01 / TEC-01 / R-21 | package.json/lock/tsconfig/next/postcss، App Router | npm run check؛ P1-TEST-RESULTS | أساس؛ لا قبول النظام كله |
| P1-F02 / R-19/22 | src/app وsrc/components وCairo/Lucide محليًا | tests/e2e/foundation.spec.ts؛ 360/768/1280 وaxe/keyboard | أساس UI؛ لا تنفيذ كل S-* |
| P1-F03 / TEC-08 / R-18 | compose.yaml وprisma config/schema وscripts/check-database.ts | dev/test Prisma/temp round-trip؛ مخطط بلا جداول | فصل بيئات؛ لا backup/RLS |
| P1-F04 / R-20/21 | init-env/check-secrets/local-database وgitignore | 13 unit negative cases وscan أسرار محلية | أساس حماية config؛ لا auth/RBAC |
| P1-F05 / R-21/24 | .github/workflows/p1-ci.yml وdocs/LOCAL-DEVELOPMENT | تشغيل يدوي فقط؛ GitHub CI لم ينفذ | إعداد جزئي؛ الحصة غير متحققة |

R-01..17 لا وظائف منفذة. R-23 لا PWA/offline. نتائج هذا الملحق لا تحول أي متطلب شامل إلى مكتمل؛ تقرير P1 يربط نطاق الشيفرة والاختبارات والقيود.

## ملحق P2 — تتبع التنفيذ

المصدر تكليف المالك P2 وAGENTS §7/8/17/18/19/20 وDATABASE_DESIGN/API_SPECIFICATION/TEC-02/03/04/08. جميع البنود التالية أولوية P2؛ قبول البنية لا يقبل وظائف المراحل التالية.

| المعرف | الوحدة والملفات | اختبار القبول | الحالة |
|---|---|---|---|
| P2-D01 / RV-02 | DB: prisma/schema.prisma وprisma/migrations | validate/generate/replay، FK/unique/ownership/version/options/time | بنية منفذة مختبرة |
| P2-S01 / RV-01 / R-03 | Security: AccessGrant/Consent/Assignment وRLS SQL | A/B/admin/coach scope/expiry/revoke السلبية | أساس مختبر؛ A-11 مفتوح |
| P2-S02 / TEC-02 | src/server/db/context.ts | non-owner/non-super/bypass denied، pool commit/rollback وPrisma | أساس مختبر؛ لا auth |
| P2-C01 / API / TEC-04 | src/server/contracts/p2.ts، IdempotencyRecord/OutboxJob | unit allowlist/revision/errors وunique races | عقود وتخزين فقط؛ services مؤجلة |
| P2-O01 / TEC-08 / R-18 | prisma.config.ts، scripts/p2-database.ts، local-database.ts | local identity/preflight/checksum وproduction CLI denied | محلي مختبر؛ لا backup/production |
| P2-Q01 / R-21 | tests/integration/p2-database.ts وtests/unit/p2-contracts.test.ts | P2-TEST-RESULTS:42 integration/21unit/21E2E | منفذ، audit dev5high مفتوح |

لا تتحول R-01..R-17 الشاملة إلى مكتملة بهذا الملحق؛ الخدمات والمصادقة والواجهات والأهداف الصحية والاعتمادات والقبول الإنتاجي تظل وفق مراحلها.

## ملحق P3 — 2026-10-12

المصدر تكليف المالك P3، AGENTS§8/17/18/21، R-01/02/03/19/20/21/22، API وUX S02..07/S26/S29، وTEC02/06/08. الأولوية P3 فقط؛ لا اعتماد سياسات صحية أوإنتاجية.

| المعرف / المصدر | الوحدة والملفات | اختبار القبول | الحالة |
|---|---|---|---|
| P3-A01 / R-01 / T-01 | auth/service/crypto/http، api/v1، AuthToken/Session | p3-auth integration:register/verify/login/expiry/reuse/password/revoke؛ E2E Mailpit cycle | تنفيذ محلي؛ النتائج فيP3-TEST-RESULTS |
| P3-A02 / RV-04 / T-01/20 | AuthChallenge، MFA crypto/service | partial denial/attempts/expiry/TOTP vectors/replay/recovery races؛ UI codes once | حل محلي؛ bootstrapA12 مفتوح |
| P3-A03 / RV-03 / T-01/02 | candidateEmail/AuthMail وemail/change/confirm | oldemail untilconfirm/duplicate rollback/session revoke | تنفيذ محلي فقط |
| P3-P01 / R-02 / T-02 | Prisma Profile، profilePatch وaccount-panel | partial/null/IANA/preferences/revision/concurrent save/reload | اختياري؛ لا هدف صحي افتراضي |
| P3-P02 / RV-07 / R-02 | UserGoal/Consent services/RLS/additive migrations | A/B owner denial/stale/missing revision/future/overlap/revocation | عقودP3؛ بقيةRV-07مؤجلة |
| P3-S01 / R-03/20 / T-03/20 | ghidai_auth/ghidai_app/VerifiedActor/withActor | SQL privilege/roleinjection/RLS/Prisma/pool commit+rollback/CSRF/limits | بوابة خادم محلية مختبرة |
| P3-M01 / A-09 / T-01/24 | Mailpit/compose/AuthMail/mail.ts/p3-outages | رسالة مستلمة، pendingencrypted، outage+retry؛ DBpause safe503 | محلي؛ لا بريد إنتاج/جدولة |
| P3-U01 / R-19/22 / T-19/22 | auth/account/privacy/onboarding/sharedP1UI | Playwright360/768/1280/axe/keyboard/overflow/functionalforms | النتيجة النهائية فيتقريرP3 |
| P3-Q01 / R-21 | unit/integration/e2e/CI scripts | type/lint/build/29unit/42P2/23P3 +E2E، audit/secrets | auditdev5high مفتوح؛ CImanualلم ينفذ |

الأرقام أعلاه تحدد نطاق الاختبار، ولا تحول النظام الشامل إلى جاهز إنتاجيًا. A-02/A-08/A-12 غير مغلقة، وصور الغذاء لا تصبح محتوى منشورًا.

## سجل تنفيذ P4 — 2026-10-12

| ID | المصدر والأولوية | التنفيذ | اختبار القبول | الحالة |
|---|---|---|---|---|
| R-04 | تكليف P4؛ AG19؛ IMG03/04/05/06؛ P0 | src/server/programs/service.ts وcontracts.ts؛ migrations P4؛ program-admin.tsx | tests/integration/p4-programs.ts؛ unit/p4-programs.test.ts؛ e2e/p4-programs.spec.ts | محرك محلي منفذ؛ لا P5 |
| R-07 | تكليف P4؛ AG5/9؛ الصور الست؛ P0 | nutrition.ts؛ Meal/PlanMeal/MealAlternative وhash graph | كميات ووحدات وبديل ذاتي ومراجعة ونشر اصطناعي وسحب البديل | مسودات ومراجعة ونشر اصطناعي؛ A-01/A-05 محجوبان |
| R-15 | تكليف P4؛ UX S44..S49؛ P0 | /admin/programs و/admin/content؛ API أوامر حقيقية | E2E التأليف والمراجعة والنشر والنسخ والسحب ووجبات/بدائل | أفعال P4 منفذة؛ بقية الإدارة لاحقة |
| R-17 | AG9/24؛ IMG01..06 وDIF01..17؛ P0 | p4-import-sources.ts؛ SourceExtract/Conflict وContentReview.qualificationSnapshot | hash مستقل وتأهيل منتهٍ/self-review وصلاحية المصدر والهوية | مراجع محفوظة وغير محسومة؛ A-01/A-10/A-12 مفتوحة |
| R-03/R-20 | AG6/8/18؛ P0 | جلسات P3، P4LocalCapability وRLS/MFA وscope | USER/COACH/ADMIN، انتهاء capability، SQL وواجهات رفض | تحقق محلي اصطناعي؛ لا صلاحيات إنتاجية |
| R-19/R-22 | AG21/25؛ UX؛ P0 | RTL وlabels واضحة وأهداف لمس ولوحة مفاتيح | Chromium360/768/1280 وaxe | تحقق آلي؛ قارئ شاشة وجهازان يدويان غير مثبتين |
| R-21 | AG11/23؛ P0 | scripts npm وP4-TEST-RESULTS | TypeScript/Lint/Build/Unit/Integration/E2E/secrets | النتائج الفعلية في التقرير؛ لا قبول إنتاج |

هذا الملحق لا يغير المصدر الأصلي للمتطلبات أو يدعي أن نجاح fixtures يغلق قرارات المالك.

## سجل تنفيذ P5–P7 — 2026-10-13

المصدر تكليف المالك المشترك P5/P6/P7، AGENTS§18–21/24/25، وBR-01..12؛ نطاقه تجربة المشارك المحلية فقط. الجدول الأصلي وصف التصميم، وهذا الملحق يربط التنفيذ الحالي بأدلة قابلة لإعادة التشغيل.

| ID / أولوية | المصدر والوظيفة | التنفيذ | اختبار القبول | الحالة والبوابة |
|---|---|---|---|---|
| R-05 / P0 | AG5/19/20، UX S08–13؛ نسخة وبداية وانسحاب | `src/server/participation/service.ts`، `participant-programs.tsx`، migration010 | `p5-participation.ts`:7/15/21، مرن/ثابت، replay، A/B، ثبات snapshot وتعدد البرامج | محلي منفذ؛ A-03/A-05 للاستخدام الحقيقي |
| R-06 / P0 | AG20/21، IMG01–03/05/06؛ أيام وأوقات وإتمام | `participation/rules.ts`، `participant-today.tsx`، EnrollmentDay/TaskOccurrence | unit P5، native P5، `p5-participant.spec.ts`:القادمة/تراجع/رفض المستقبل/فقد استجابة/360–1280 | محلي منفذ؛ لا تعليمات صور غير معتمدة |
| R-08 / P0 | AG5/9/20، IMG01/02/03/05/06؛ ماء وكوب | `tracking/service.ts` و`derived.ts`، `participant-logs.tsx`، migration011 | `p6-tracking.ts` وE2E:كوب snapshot، تعديل/حذف/تزامن/replay وتصحيح إتمام | محلي منفذ؛ المقادير اصطناعية، A-05 مفتوحة |
| R-09 / P0 | AG5/20، IMG01–06؛ خطوات ورياضة | StepDayLog.recordedForTime، TrackingService، migration013 | استبدال/0/غياب/حذف واستعادة؛ رفض تمرين لم ينتهِ في الخدمة وSQL | محلي منفذ؛ لا جمع snapshots أو هدف صحي موحد |
| R-10 / P0 | AG5/20، IMG01–03/05/06؛ نوم وعادات | SleepLog/HabitDefinition/HabitLog، UTC/snapshot، UI logs | عبور منتصف الليل/تداخل/DST/عادات شخصية وبرنامج وتراجع | محلي منفذ؛ سجلات بلا مشاركة مسموحة |
| R-11 / P0 | AG5، IMG01/02/05/06؛ تقييم وملاحظات ووزن | DailyReview/ReviewAnswer، مخططات ثابتة، LogRevision مشفر | native P6؛ E2E تبديل يومين ورفض استجابة قديمة؛ خيارات وإصدار منفصل | محلي منفذ؛ بيانات ومخططات اختبار فقط |
| R-12 / P0 | AG20، BR03–08، UX S22/24؛ C/N وإحصاء | `analytics/calculations.ts` و`service.ts`، `participant-progress.tsx` | unit P7 وnative P7:اختيارية/N0/وزن المقام/مستقبل/حذف؛ فلاتر ورسوم E2E | حساب فعلي؛ سياسة الاستمرارية/التأخر A-03/A-04 مفتوحة |
| R-13 / P1 | AG5/20، BR09؛ شارات وشهادة خاصة | AchievementRuleVersion/Award/Certificate، migration012 | مصدر وإصدار حالي، سحب ذري، SQL تزوير، تنزيل JSON وفحصه ورفضه بعد التراجع | آلية اختبارية؛ لا شهادة نهائية أو اعتماد A-04/A-10 |
| R-03/R-20 / P0 | AG8/18؛ عزل وتزامن وتدقيق | جلسات P3/withActor/RLS، أقفال actor ثم الموارد، receipts مشفرة | A/B/ADMIN/COACH غير مخولين؛ revision مفقود/قديم، نفس المفتاح، فشل DB | خادم وPostgreSQL؛ لا userId من العميل |
| R-19/R-22 / P0 | AG21/25؛ خمس وجهات وRTL وإتاحة | Today/Programs/Logs/Progress/Account، جداول تمرير معنونة وقابلة للتركيز | E2E360/768/1280، axe صفر، keyboard/overflow وحفظ حقيقي | آلي محلي؛ قارئ شاشة يدوي/جهازان/قياس إنتاج غير مثبت |
| R-21/R-23 / P0 | AG11/23/25؛ انحدار وفشل حفظ | scripts/participant-test-schema وparticipant-e2e وoutages | Type/Lint/Build/Unit/PG/E2E/503 ثم تعافٍ وإعادة حفظ | نتائج كل دورة في [التكامل](P5-P7-INTEGRATION-REPORT.md)؛ لا offline sync |

RV-07/RV-08/RV-09 وحالات مشاركة RV-10 مسواة تقنيًا في النطاق الحالي. قبول التشغيل الحقيقي لسياساتها مستقل. R-14 وواجهات P8+ وR-16/18 الإنتاجية لا تتحول إلى مكتملة بهذا الجدول؛ جميع A-01..A-12 تحتفظ بحالتها.

## P11 — Operational preparation (2026-10-15)

Owner P11 instruction authorizes local synthetic engineering only. Exact baseline79752ab; branchfeature/ghidai-p11-production-readiness. A-01–A-12 remain OPEN. Final execution status is recorded in [P11 tests](P11-TEST-RESULTS.md), not inferred from code presence.

| Requirement/source | Implementation evidence | Acceptance and scope |
|---|---|---|
| P11-01; owner§3, R-24 | P11-HOSTING-ASSESSMENT; official provider links | Current Free/card/domain/region/quotas/contracts/portability; no complete approved production stack |
| P11-02; owner§4, R-03/R-20 | operations/config, auth/runtime, api/ready, next.config, config/production.env.example | Config rejection, generic readiness, local cookies retained only on loopback; production adapter disabled |
| P11-03; owner§5, R-18/T-18 | operations/backup, p11-backup-rehearsal | New database only; encrypted logical archive, tampering rejection, counts/ownership/policies, restored auth/RLS/analytics; independent storage remains gate |
| P11-04; owner§6, R-18/R-24 | operations/monitor, p11-monitor, P11-MONITORING-RUNBOOK | Aggregated failures/storage alerts and actual outage/recovery; manual invocation only |
| P11-05; owner§7, R-20/T-20 | P11-SECURITY-REVIEW; lockfile and security tests | Official compatible patch review, audit residuals, secret scan and native RLS/auth/download regression |
| P11-06; owner§8, R-22/T-22 | today route + isolated transport/quick controls; p11-browser-performance, p11-capacity | Measured bytes/LCP/CLS/HTTP concurrency/query/server resources; local evidence only |
| P11-07; owner§9, R-21/R-24 | P11-RELEASE-GATES | A-01–12 authority unchanged; engineering versus actual launch explicit |
| P11-08; owner§10–12, R-21/T-21 | P11-TEST-RESULTS/P11-HANDOFF | Mandatory local regression then scoped branch delivery; no main merge/deployment/P12 |
