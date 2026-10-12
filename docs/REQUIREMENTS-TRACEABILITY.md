# سجل تتبع المتطلبات

1.0 — 2026-10-11. الجدول الأصلي خط أساس التصميم؛ حالة «مصمم» لا تعني وظيفة منفذة. تقدم P1 في الملحق أدناه. المصادر: المالك=تكليف FULL REQUIREMENTS ، AG=n قسم AGENTS ، IMG=n الصورة كما حللت في[تحليل الصور](IMAGE_CONTENT_ANALYSIS.md). أولوية P1 في صفوف المتطلبات ليست رقم مرحلة التنفيذ؛ المسارات المستقبلية في الجدول تظل تخطيطًا ما لم يحدد الملحق تنفيذًا فعليًا.

رموز الوثائق: PR=[المتطلبات](PROJECT_REQUIREMENTS.md)، UX=[الشاشات](UX_UI_SPECIFICATION.md)، SA=[المعمارية](SYSTEM_ARCHITECTURE.md)، DB=[البيانات](DATABASE_DESIGN.md)، API=[العقود](API_SPECIFICATION.md)، IP=[الخطة والاختبارات](IMPLEMENTATION_PLAN.md). كل T-*معرف سيناريو قبول مفصل في IP ؛ وصف R-*في PR مرجعالقيم. كل صف مصمم/غيرمنفذ/غيرمختبر، ولا يستنتج اعتماد صحي.

| ID | الوصف | المصدر | أولوية/وحدة | ملفات التصميم؛ المسار المستقبلي | اختبار قبول | الحالة |
|---|---|---|---|---|---|---|
| R-01 | تسجيل/تحقق/دخول/خروج/استرداد/جلسات/MFA | AG5,8 ؛ المالك | P0 auth | PR/SA/DB/API/UX S02–06 ؛ src/modules/auth | T-01/20: token/revoke/rate | مصمم |
| R-02 | ملف/أهداف/حجم كوب/timezone/موافقات | AG5,8,20 ؛ المالك | P0 profile | PR/DB/API/UX S07/26/29 ؛ src/modules/auth | T-02: لا أثر رجعي ولا موافقة إجبارية اختيارية | مصمم، A05/08 |
| R-03 | عزل/RBAC/مدرب مخول/منع رفع دور | AG6,18 | P0 security | PR/SA/DB/API/UX S40–42/50–51 ؛ src/server/authorization | T-03: A/B/coach/pool/DB | مصمم، A11 |
| R-04 | محرك مدة/مهام/تكرار/نسخ/توقف/أرشفة | AG19 ؛ IMG03/04/05/06 | P0 programs | PR/DB/API/UX S44–46 ؛ src/modules/programs | T-04: 7/15/21/immutable | مصمم |
| R-05 | مشاركات/begin/withdraw/نسخة/أهداف | AG5,19,20 | P0 enrollment | PR/DB/API/UX S08–13 ؛ src/modules/programs | T-05: duplicate/concurrency | مصمم |
| R-06 | مهام يوم/ترتيب/أوقات/إتمام/تراجع/سابق | AG5,20,21 ؛ IMG01–03/05/06 | P0 schedule | PR/UX S11/13/DB/API ؛ src/modules/programs | T-06: القادمة/اختياري/replay | مصمم، DIF06/07/16 |
| R-07 | خطط/مكونات/حصص/بدائل/وحدات | AG5,9,19 ؛ IMG01–03/05/06 | P0 nutrition | PR/DB/API/UX S14/47/48 ؛ src/modules/nutrition | T-07/17: بديل مخول واعتماد | مصمم، A01/05 |
| R-08 | ماء ml/cup/تعديل/حذف/مجموع | AG5,9,20 ؛ IMG01/02/03/05/06 | P0 tracking | PR/DB/API/UX S16 ؛ src/modules/tracking | T-08/12: snapshot/replay/لا يتمم غيره | مصمم، DIF04 |
| R-09 | إجمالي خطوات/تمرين/هدف شخصي | AG5,9,20 ؛ IMG01–06 | P0 tracking | PR/DB/API/UX S17/18 ؛ src/modules/tracking | T-09: replacement/0/absence | مصمم، DIF08 |
| R-10 | نوم/عادات/عبور منتصف الليل | AG5,20 ؛ IMG01–03/05/06 | P0 tracking | PR/DB/API/UX S19/20 ؛ src/modules/tracking | T-10: overlap/wake day/habits | مصمم |
| R-11 | تقييم/ملاحظات/وزن اختياري/مقاييس نسخ | AG5 ؛ IMG01/02/05/06 | P0 reviews | PR/DB/API/UX S21 ؛ src/modules/reviews | T-11: option/schema/unique | مصمم، DIF09–11 |
| R-12 | إنجاز يوم/أسبوع/تراكم/streak/تأخر | AG20 ؛ IMG01 نسب دون قاعدة | P0 analytics | PR BR01–12/SA/DB/API/UX S22/24 ؛ src/modules/analytics | T-12: صفر/100/duplicates/timezone | مصمم، A03 |
| R-13 | تحفيز/شارات/شهادة واستحقاق/سحب | AG5,20 ؛ IMG01–06 رسائل | P1 motivation | PR BR09/DB/API/UX S23/24 ؛ src/modules/analytics | T-13: evidence/threshold/revoke | مصمم، A04/10 |
| R-14 | إشعارات/تذكيرات/موافقة/quiet/push | AG5,19,21 ؛ المالك | P1 notifications | PR/SA ADR05/DB/API/UX S25/27 ؛ src/modules/notifications | T-14: consent/retry/DST | مصمم، A09 |
| R-15 | لوحة إدارة/مدرب/محتوى/أدوار/تقارير | AG5,6,19,23 ؛ المالك | P0 admin | PR/DB/API/UX S40–56 ؛ src/app/(admin),(coach) | T-15/03: كل زر/منع lastadmin | مصمم |
| R-16 | تصدير/حذف/موافقات/احتفاظ | AG8,18,22 | P0 privacy | PR/SA/DB/API/UX S29–31 ؛ src/modules/privacy | T-16: private/TTL/ledger | مصمم، A07/08 |
| R-17 | استخراج/تعارضات/اعتماد/تأهيل | AG9,24 ؛ IMG01–06 ؛ المالك | P0 content | IMAGE_CONTENT_ANALYSIS/PR/DB/API/UX S48/56 ؛ src/modules/nutrition | T-17: hash/reviewer/publish gate | مصمم، A01/10 |
| R-18 | بيئات/نسخ مشفرة/استعادة/مراقبة | AG17,22 | P0 operations | SA/DB/IP/API/UX S54 ؛ src/server/jobs | T-18: guard/restore/isolation | مصمم، A08 |
| R-19 | RTL/mobile/≤5nav/≤2click/states | AG4,21 ؛ IMG01–06 ؛ المالك | P0 UX | UX/PR/IP ؛ src/components | T-19: كل S/360/768/1280 | مصمم |
| R-20 | hashing/session/CSRF/XSS/rate/audit | AG8,18 | P0 security | SA/DB/API/PR ؛ src/server | T-20/03: هجمات وعزل | مصمم |
| R-21 | اختبارات/قبول/إصدارات/Git/HTTPS | AG10,11,14,23 ؛ المالك | P0 QA/release | IP/SA ؛ tests/unit,integration,e2e | T-21: checks+جهازان فعليان بعد الموافقة | مصمم |
| R-22 | وصول/أداء/قياسات فعلية | AG21,25 | P0 UX/performance | UX/PR NFR/SA/IP ؛ src/components | T-22: keyboard/reader/Lighthouse/p95 | مصمم |
| R-23 | PWA/انقطاع/لا claims offline غيرمنفذ | AG1,3,25 | P0 frontend | SA ADR06/UX/IP ؛ src/app | T-23: publiccache/failedsave | مصمم |
| R-24 | مجانية/no-card/domain/قابلية هجرة | AG16,17 ؛ المالك | P0 operations | SA costs/IP/PR ؛ docs/DEPLOYMENT.md مستقبلًا | T-24: quota/freeplan/portability | مصمم، A06/07/09 |

## تتبع مصادر الصور وعدم إسقاط الاختلافات

| المصدر/جزء المحتوى | متطلبات التصميم | الاختلافات المرتبطة | اختبار/بوابة |
|---|---|---|---|
| IMG-01 الهوية/اسم/تاريخ | R02/19 | DIF01/17 | T02/19/A10 |
| IMG-01 روتين 4/تغذية 4/عادات 4 | R06–10/17 | DIF03–06/14/16 | T06–10/17/A01 |
| IMG-01 التزام/طاقة/جوع/نسبة/ملاحظات/تحفيز | R11–13 | DIF09/10/11 | T11–13 ؛ لا تبني formula من الدوائر |
| IMG-02 اليوم/تاريخ/قائمة 12/وقت بعدساعتين | R02/06–10 | DIF03–05/16 | T02/06–10 |
| IMG-02 مقاييس/مزاج/وزن/نص رسالة | R11/13 | DIF09–11/17 | T11/13/A01 |
| IMG-03 جدول 7 فترات/أوقات نسبية | R04/06/07/09 | DIF02/05–07/14 | T04/06/07/09/A01 |
| IMG-03 مصادر بروتين/خضار/قواعد/مهمجدًا | R07/08/10/17 | DIF03/04/12/13 | T07/17 ، G01/02/03/07 |
| IMG-03 رسائل مؤنثة/هوية | R13/19 | DIF17 | T13/19/A10 |
| IMG-04 سبعةأيام/8000/رسائل يومية/دوائر | R04/06/09/13 | DIF08/17 | T04/09/13/A05 |
| IMG-04 أسماء Instagram مطموسة | R17 | G06 | لا استنتاج؛ A10 |
| IMG-05 اسم مقاومة/أهداف/فوائد | R17 | DIF01 | T17/A01 ؛ لا claims تلقائية |
| IMG-05 جدول 8 أوقات+نوم/طعام 4 فئات/حدود 3/تجنب 5 | R06–11/17 | DIF02/03/06/07/13–15 | T06–11/17 |
| IMG-05 ماء 8/2–3L ، خطوات 15 ، قواعد 6/محيطخصر/ملاحظات | R08–12/17 | DIF04/08/11 | T08–12 ؛ محيطخصر مرجع يحتاج A05 قبل إضافة حقل منتج |
| IMG-05 رسائل/تحفيز/معلومةالأرز | R07/13/17/19 | DIF03/17 | T07/13/17/A01 |
| IMG-06 اسم/هدف/فوائد | R17 | DIF01 | T17/A01 |
| IMG-06 جدول 10 أوقات+نوم/مصادر/خضار/ممنوعات | R06–10/17 | DIF02–07/12–15 | T06–10/17 ؛ عبارات الوزن G02 |
| IMG-06 ماء 8/2–3L وخطوات 15 | R08/09/12 | DIF04/08 | T08/09/12 |
| IMG-06 تقييمعام/كيفكاناليوم/ملاحظات/تحفيز | R11/13/19 | DIF09/11/17 | T11/13/19 |

كل نصوص الأطعمة والرسائل المرجعية محفوظة في IMAGE_CONTENT_ANALYSIS ؛ ليس كل نص متطلب نشر. محيط الخصر ورد في IMG05 كتوجيه وليس طلب حقل قياس؛ سجّلعند A05 بدل الإضافة غير المصرح بها. رابط كل DIF إلى R مصممفيهذا الجدول، وحسمهإلى ContentReview مستقبلًا.

## تغطية البنود الدائمة

| AGENTS قسم | التغطية |
|---|---|
| 1–4 هوية/رؤية/stack/UI | R04/19/22/23 + SA/UX |
| 5–7 وحدات/أدوار/DB | R01–16 + DB/API |
| 8–9 أمن/صحة | R03/16/17/20 |
| 10–15 Git/جودة/توثيق/مراحل/قبول/تكليف | R21 + IP ؛ لا app/DB/deploy ولا AGENTSedit في هذا التكليف |
| 16–18 مجانية/بيئات/متعدد | R24/18/03 |
| 19–20 ديناميكية/إنجاز | R04–06/12/13 |
| 21–22 UX/نسخ | R19/22/18 |
| 23–25 قبول/تتبع/أداء | R21/17/22/23 وهذا السجل |

## سجل الفجوات والاعتمادات

G01..09 مصدرها الصور في التحليل، A01..12 قرارات المشروع في PR ؛ لا افتراض أنها اعتمدت. BR03/06 التقدم و ADR العزل/نسخ immutable قرارات تصميم تقنية محددة؛ threshold الشهادة/نافذة التأخر/أهداف الصحة/العمر/الاحتفاظ مقترحة ومميزة. Host ومواقع المعالجة و mail/scheduler غير معتمدة. توجد فجوات تمنع نشر المحتوى أو الإنتاج، لكن لا تمنع إكمال التصميم الحالي.

تحديث السجل عند كل تكليف: ربط الملفات الفعلية بدل المسارات المستقبلية، testartifact+commit ، تحويل مصمم→منفذ جزئي→منفذ مختبر فقط بعد تشغيل الاختبار، وإبقاء blocked صريحًا. لا تغير مصدر الصورة أو تمحو DIF بعد الحسم؛ يضاف قرار واعتماد.

## ملحق مرحلة P1 — 2026-10-11

المصدر تكليف المالك P1 TECHNICAL FOUNDATION، وAGENTS وTEC-01/07/08 وUX؛ أولوية P1 مرحلة تأسيس فقط. لا إغلاق A/RV أو وظيفتي المستخدم/المدرب.

| المعرف | التنفيذ الفعلي | اختبار القبول والأدلة | الحالة |
|---|---|---|---|
| P1-F01 / TEC-01 / R21 | package.json/lock/tsconfig/next/postcss، App Router | npm run check؛ P1-TEST-RESULTS | أساس؛ لا قبول النظام كله |
| P1-F02 / R19/22 | src/app وsrc/components وCairo/Lucide محليًا | tests/e2e/foundation.spec.ts؛ 360/768/1280 وaxe/keyboard | أساس UI؛ لا تنفيذ كل S-* |
| P1-F03 / TEC-08 / R18 | compose.yaml وprisma config/schema وscripts/check-database.ts | dev/test Prisma/temp round-trip؛ مخطط بلا جداول | فصل بيئات؛ لا backup/RLS |
| P1-F04 / R20/21 | init-env/check-secrets/local-database وgitignore | 13 unit negative cases وscan أسرار محلية | أساس حماية config؛ لا auth/RBAC |
| P1-F05 / R21/24 | .github/workflows/p1-ci.yml وdocs/LOCAL-DEVELOPMENT | تشغيل يدوي فقط؛ GitHub CI لم ينفذ | إعداد جزئي؛ الحصة غير متحققة |

R01..17 لا وظائف منفذة. R23 لا PWA/offline. نتائج هذا الملحق لا تحول أي متطلب شامل إلى مكتمل؛ تقرير P1 يربط نطاق الشيفرة والاختبارات والقيود.

## ملحق P2 — تتبع التنفيذ

المصدر تكليف المالك P2 وAGENTS §7/8/17/18/19/20 وDATABASE_DESIGN/API_SPECIFICATION/TEC-02/03/04/08. جميع البنود التالية أولوية P2؛ قبول البنية لا يقبل وظائف المراحل التالية.

| المعرف | الوحدة والملفات | اختبار القبول | الحالة |
|---|---|---|---|
| P2-D01 / RV-02 | DB: prisma/schema.prisma وprisma/migrations | validate/generate/replay، FK/unique/ownership/version/options/time | بنية منفذة مختبرة |
| P2-S01 / RV-01 / R03 | Security: AccessGrant/Consent/Assignment وRLS SQL | A/B/admin/coach scope/expiry/revoke السلبية | أساس مختبر؛ A-11 مفتوح |
| P2-S02 / TEC-02 | src/server/db/context.ts | non-owner/non-super/bypass denied، pool commit/rollback وPrisma | أساس مختبر؛ لا auth |
| P2-C01 / API / TEC-04 | src/server/contracts/p2.ts، IdempotencyRecord/OutboxJob | unit allowlist/revision/errors وunique races | عقود وتخزين فقط؛ services مؤجلة |
| P2-O01 / TEC-08 / R18 | prisma.config.ts، scripts/p2-database.ts، local-database.ts | local identity/preflight/checksum وproduction CLI denied | محلي مختبر؛ لا backup/production |
| P2-Q01 / R21 | tests/integration/p2-database.ts وtests/unit/p2-contracts.test.ts | P2-TEST-RESULTS:42 integration/21unit/21E2E | منفذ، audit dev5high مفتوح |

لا تتحول R01..R17 الشاملة إلى مكتملة بهذا الملحق؛ الخدمات والمصادقة والواجهات والأهداف الصحية والاعتمادات والقبول الإنتاجي تظل وفق مراحلها.

## ملحق P3 — 2026-10-12

المصدر تكليف المالك P3، AGENTS§8/17/18/21، R01/02/03/19/20/21/22، API وUX S02..07/S26/S29، وTEC02/06/08. الأولوية P3 فقط؛ لا اعتماد سياسات صحية أوإنتاجية.

| المعرف / المصدر | الوحدة والملفات | اختبار القبول | الحالة |
|---|---|---|---|
| P3-A01 / R01 / T01 | auth/service/crypto/http، api/v1، AuthToken/Session | p3-auth integration:register/verify/login/expiry/reuse/password/revoke؛ E2E Mailpit cycle | تنفيذ محلي؛ النتائج فيP3-TEST-RESULTS |
| P3-A02 / RV04 / T01/20 | AuthChallenge، MFA crypto/service | partial denial/attempts/expiry/TOTP vectors/replay/recovery races؛ UI codes once | حل محلي؛ bootstrapA12 مفتوح |
| P3-A03 / RV03 / T01/02 | candidateEmail/AuthMail وemail/change/confirm | oldemail untilconfirm/duplicate rollback/session revoke | تنفيذ محلي فقط |
| P3-P01 / R02 / T02 | Prisma Profile، profilePatch وaccount-panel | partial/null/IANA/preferences/revision/concurrent save/reload | اختياري؛ لا هدف صحي افتراضي |
| P3-P02 / RV07 / R02 | UserGoal/Consent services/RLS/additive migrations | A/B owner denial/stale/missing revision/future/overlap/revocation | عقودP3؛ بقيةRV07مؤجلة |
| P3-S01 / R03/20 / T03/20 | ghidai_auth/ghidai_app/VerifiedActor/withActor | SQL privilege/roleinjection/RLS/Prisma/pool commit+rollback/CSRF/limits | بوابة خادم محلية مختبرة |
| P3-M01 / A09 / T01/24 | Mailpit/compose/AuthMail/mail.ts/p3-outages | رسالة مستلمة، pendingencrypted، outage+retry؛ DBpause safe503 | محلي؛ لا بريد إنتاج/جدولة |
| P3-U01 / R19/22 / T19/22 | auth/account/privacy/onboarding/sharedP1UI | Playwright360/768/1280/axe/keyboard/overflow/functionalforms | النتيجة النهائية فيتقريرP3 |
| P3-Q01 / R21 | unit/integration/e2e/CI scripts | type/lint/build/29unit/42P2/23P3 +E2E، audit/secrets | auditdev5high مفتوح؛ CImanualلم ينفذ |

الأرقام أعلاه تحدد نطاق الاختبار، ولا تحول النظام الشامل إلى جاهز إنتاجيًا. A02/A08/A12 غير مغلقة، وصور الغذاء لا تصبح محتوى منشورًا.
