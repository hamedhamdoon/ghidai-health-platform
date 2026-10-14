# مواصفات API v1

## ملحق التنفيذ P8/P9،2026-10-14

P8 contracts and local gates في[P8-HANDOFF](P8-HANDOFF.md)؛P9 في[P9-HANDOFF](P9-HANDOFF.md). VerifiedActor/session/CSRF/RLS/own filters،mutations Idempotency-Key وإصداراتIf-Match حيثتعدل. مساراتcoaching/assignments وcoach/participants وadmin users/assignments/operations/audit؛notifications center/settings/rules/read/local-tick؛privacy view/consents/exports/:id/download/deletion/requests. export download يعيدJSON envelope معcontent خاصللعميل لإنشاءملفBlob،وليسURLعام؛freshauth/owner/15min local expiry. admin metadata ليستhealthaccess؛finaldelete/Push/jobsproduction غيرمتاحة. no-store لكلالردود. [تقريرالتكامل](P8-P10-INTEGRATION-REPORT.md) يحددالتشغيلالفعليةوالحدود.

تحديث التنفيذ المحلي2026-10-13: عقود P3/P4 والمشارك P5–P7 منفذة ضمن حدودها الموثقة. جداول الإصدار1.0 أدناه خط أساس التصميم؛ ملحق P5–P7 المنفذ في نهاية الوثيقة و[تقرير التكامل](P5-P7-INTEGRATION-REPORT.md) يحددان الردود والقيود الحالية، ولا يفترض تنفيذ jobs أو cursor أو تصحيح إداري أو إنتاج من وصف التصميم.

1.0 — 2026-10-11. عقود تصميمية، ليست endpoints منفذة. الأساس `/api/v1` و JSON UTF-8 و same-origin. [المتطلبات](PROJECT_REQUIREMENTS.md)، [البيانات](DATABASE_DESIGN.md)، [الشاشات](UX_UI_SPECIFICATION.md) تحدد المعنى. هوية المالك من session فقط؛ `userId` غير مقبول في عمليات self. UUID في path يحدد موردًا ويخضع للتفويض.

## العقد العام

نجاح: `{data: T, meta: {requestId, serverTime, nextCursor?}}`. خطأ: `{error:{code,message,fields?:[{path,message}],requestId}}`؛ لا stack/SQL. POST إنشاء 201 ، قراءة/تعديل 200 ، حذف/خروج 204 بلا body ، jobs202. 400 تنسيق غير صالح، 401 جلسة غائبة/منتهية، 403 صلاحية، 404 مورد غير مرئي (لمنع تسريب ملكية)، 409conflict/locked/published ، 422validation ، 429rate limit مع Retry-After ، 503DB/مزود غير متاح. رسائل عربية من catalog ، لا نص حساس في error.

القوائم cursoropaque مرتبطة filter و actor ؛ `limit`1..100 الافتراضي 20 ، ترتيب(createdAt,id) أو(localDate,id)، الفلاتر allowlist ؛ date `YYYY-MM-DD`، instants ISO8601 مع offset ، IANAtimezone معتبرة. المبالغ integers ml/steps/min ، numericweight بصيغة string لتجنب float. server يعيد localDate/targetSnapshot/revision ؛ لا percentageWrite. responseDTOs معتمدة لكل role.

CSRF: session cookie + Origin/Host check + X-CSRF-Token لجميع mutationsbrowser بما فيها auth ، endpointGET `/auth/csrf` يعيد token session/preauthbound no-store. وظائف server تستخدم توقيع jobsecret لا cookie. `Idempotency-Key`UUID واجب POSTlogs/enrollments/jobs/completion commands ؛ الاحتفاظ 24h مقترح؛ scopedactor/action+hashbody ، replay يعيد نفس result ، body مختلف 409. `If-Match: "revision"` واجب PATCH/DELETE قابل للتعديل، غيابه 428PRECONDITION_REQUIRED ؛ stale409. uniqueDB يبقى حارسًا بعد انتهاء idempotencyTTL.

bodylimit32KB ، name1..80 ، notes0..2000 ، password12..128 ، email≤254 ، UUIDvalidate ؛ rejectunknownfields لمنع role/userIdinjection. كمية ماء في طلب 1..5000ml ، cup1..2000ml ، steps0..200000 ، exercise1..1440min ، sleep>0..1440min ، weight>0..500kg (حدود إدخال منتج مقترحة، لا توصيات صحية؛ validate مع مختص قبل الإطلاق). invalid/future/outsideallowedwindow422 أو 409DAY_LOCKED. قيم قرب الحد ليست دليل صحة ولا يتخذ النظام قرارًا علاجيًا.

## المصادقة والملف

| الطريقة والمسار | الدور / الطلب | النتيجة والقواعد |
|---|---|---|
| POST `/auth/register` | عام؛ displayName,email,password,policyVersion,privacyAccepted | 202 رسالة عامة، حساب PENDING و verifyjob ؛ لا role |
| POST `/auth/verify` | عام؛ token | 200 حالة ACTIVE بعد استهلاك token ؛ invalid/expired400TOKEN_INVALID |
| POST `/auth/verify/resend` | عام؛ email | 202 رسالة عامة، حدإرسال، لا كشف لوجود حساب |
| POST `/auth/login` | عام؛ email,password | 200actor+needsMfa مع cookie جديد؛ credentials401 رسالةواحدة؛ إذا MFA لا جلسة كاملة قبله |
| POST `/auth/logout` | مصادق | 204 إبطال session و cookie |
| POST `/auth/password/forgot` | عام؛ email | 202 دائمًالطلب صالح؛ لا token في response |
| POST `/auth/password/reset` | عام؛ token,newPassword | 200 ثم إبطال كل sessions ؛ أحادي الاستعمال |
| POST `/auth/reauth` | مصادق؛ password,totp? | 200freshreauthstamp ؛ rate-limited |
| POST `/auth/mfa/setup` | مصادق fresh ؛ password | 200secretsetup خاصمؤقت/QRdata ؛ no-store ؛ لا enabled قبل verify |
| POST `/auth/mfa/confirm` | مصادق setup ؛ code | 200enabled+recoveryCodes مرة واحدة؛ audit |
| POST `/auth/mfa/challenge` | preauthcookie ؛ code أو recoveryCode | 200fullsession ؛ single-userecovery ، attemptsbounded |
| DELETE `/auth/mfa` | مصادق fresh+MFA | 204 ؛ ممنوعلـ ADMIN/COACH إذا gate إنتاجيفعال؛ يحتاج مسار استرداد مراجعًا |
| GET `/me` | الجميع | profile,role,status,timezone,goals فقط ذاته |
| PATCH `/me/profile` | الجميع؛ displayName,timezone,locale,cupMl | 200revision ؛ تغيّر timezone للمستقبل دون تعديل مشاركة جارية |
| PUT `/me/password` | fresh ؛ currentPassword,newPassword | 200 وتدوير session وإبطالغيرها |
| GET `/me/sessions` | الجميع | id,lastSeen,expires,current ؛ لا hash/IP صريح |
| DELETE `/me/sessions/:id` | ownerfresh | 204 ؛ session الجاريةتخرج |
| POST `/me/sessions/revoke-all` | ownerfresh | 204 وخروج |
| GET/POST `/me/goals` | owner ؛ metric,value,effectiveDate,endDate? | هدف مستقبلي لا يعدل ماضيًا؛ تفاصيل التعارض مع برنامج 409 |
| PATCH/DELETE `/me/goals/:id` | owner ؛ futurefields فقط | 200/204 ؛ هدف snapshot ماضٍ لا يحذف |
| GET/POST `/me/consents` | owner ؛ kind,policyVersion,scope | قائمة/201 ، موافقة صريحة منفصلة |
| DELETE `/me/consents/:id` | owner | 204revocation+canceljobs+coachaccessrevoke |

## البرامج والجدول والتغذية

| الطريقة والمسار | الطلب/الرد | التفويض / قواعد |
|---|---|---|
| GET `/programs` | filtertype ، cursor ؛ summarylist | مصادق؛ published فقط، لا draft |
| GET `/programs/:id` | publishedversion+dayspreview+approvedcontent | لا withdrawnhealthcontent |
| POST `/enrollments` | programId,versionId,startDate,goalOverrides[] →id,days,timezoneSnapshot | userverified ؛ override فقط metric مسموح ومراجع؛ duplicate409 |
| GET `/enrollments` | active/history | owner |
| GET `/enrollments/:id` | version,days,status,progress | owner |
| POST `/enrollments/:id/withdraw` | reason? →status | owner ؛ confirmation/UI ؛ لاحذف logs |
| GET `/today?date=...&enrollmentId=...` | tasks,nextTask,counts,water,steps,saveWindow | owner ؛ date من servertimezone إنغاب؛ no-store |
| GET `/enrollments/:id/days/:date` | occurrencesandreviewlinks | owner ، تاريخ ضمن المشاركة |
| PUT `/occurrences/:id/completion` | completed:boolean,occurredAt →completion,dayProgress,revision | owner ؛ MANUAL فقط؛ نفس completed لا ينشئ duplicate ؛ مشتق quantitative409USE_LOG |
| GET `/meals/:id?occurrenceId=...` | ingredients,unit,basis,alternatives,reviewMetadata | owner لهذا occurrence ؛ publishedcontent في version المشاركة |
| PUT `/occurrences/:id/meal-selection` | alternativeMealId? →selection | owner ؛ بديل موافق للنسخة؛ لا completion تلقائي |
| GET `/enrollments/:id/summary` | finalprogress,missingdays,awards | owner ؛ المستقبل ليس نهائيًا |

## السجلات والتقييم والتحليل

جميعمسارات `/logs` owner ، query date/from/to/type محدود≤366 يومًاللقراءة العادية، export للأكبر؛ الاسترجاع لا يمحو null/غياب. DELETEsoft-delete معإعادة حساب وتدقيق، لا generictableparameter.

| الطريقة والمسار | Payload/response | قواعد |
|---|---|---|
| GET `/logs` | groupedlist ، filters ، cursor | ملكية وفترة |
| POST `/logs/water` | amountMl أو cupCount+cupMl,occurredAt →log,total,goal,derivedProgress | XOR ، cupCount1..20 منتج؛ يحسب amountMl≤5000 ، حجم snapshot |
| PATCH/DELETE `/logs/water/:id` | amountMl,occurredAt أو delete | If-Match ، latewindow ، إعادةالعد |
| GET `/logs/steps/:date` | totalSteps أو null ، revision | 0 ليس null |
| PUT `/logs/steps/:date` | totalSteps,recordedForTime? | استبدال إجمالي؛ إنشاءب If-None-Match:*، تعديلب If-Match ؛ sourceMANUAL |
| DELETE `/logs/steps/:date` | حذف | يفصل غير مسجل عن 0 ؛ إعادة completion |
| POST `/logs/exercise` | type,startsAt,durationMin,note? | date محسوب، 201 |
| PATCH/DELETE `/logs/exercise/:id` | allowedfields | owner/window/revision |
| POST `/logs/sleep` | startsAt,endsAt | wakeDate محسوب، overlap409 |
| PATCH/DELETE `/logs/sleep/:id` | start/end أو delete | نفس قيد التداخل |
| GET/POST `/habits` | title,recurrence,startsDate,endsDate? | الشخصيةفقط؛ 201 |
| PATCH `/habits/:id` | title/futureperiod/archive | يحفظ ماضي السجلات |
| PUT `/habits/:id/days/:date` | completed:boolean | singleton ؛ nofuture |
| GET `/reviews/:date` | schema/options/answers/notes/weightKg | owner ؛ absentdata=null مع schema متاح |
| PUT `/reviews/:date` | schemaVersionId,answers[{dimensionId,optionId}],notes?,weightKg? | unique/date ؛ إنشاء If-None-Match أو updateIf-Match ؛ لا freeenum |
| GET `/analytics?from=&to=&enrollmentId=` | dailycounts,water/steps,reviewdimensions,streak,missingFlags | BR-03..10 ؛ targetsperdate ؛ لا mixschemas |
| GET `/achievements` | awards,status,evidenceSummary | owner |
| GET `/certificates/:id` | privatecertificateview/downloadmetadata | owner ، VALID ، formatJSON أو privatePDF عندتنفيذمولّد |
| POST/GET `/corrections` | targetKind,targetId,proposedPatch,reason / requests | owner ؛ خارج النافذة؛ noarbitraryuserId |
| POST `/corrections/:id/cancel` | empty | owner ، PENDING فقط |

مثال **اصطناعي**: POSTwater `{amountMl:250,occurredAt:"2026-10-11T09:00:00+04:00"}` يعيد `{data:{log:{id:"UUID",amountMl:250,revision:1},dailyTotalMl:750,targetMl:1500,metricProgress:50,dayProgress:{completed:2,required:5,percentage:40}},meta:{requestId:"...",serverTime:"..."}}`. الماء 50% لا يحول نسبة المهام إلى 50%. target مثالللمطوّر؛ ليس هدفًا صحيًا معتمدًا.

## التنبيهات والخصوصية

| الطريقة والمسار | الطلب/النتيجة | شروط |
|---|---|---|
| GET `/notifications` | cursor/unread | owner |
| PATCH `/notifications/:id` | read:true | owner |
| GET/PUT `/notification-preferences` | enabledInApp,enabledPush,quietStart,quietEnd,timezone | consentmatch ، validationquietwindow |
| GET/POST `/reminders` | occurrence/template,localTime,channel | owner ؛ onlysupportedchannels |
| PATCH/DELETE `/reminders/:id` | allowedfields | cancelfuturejobs |
| POST/DELETE `/push-subscriptions` | endpoint/keys أو subscriptionId | ownerconsent ؛ encrypt ؛ endpointallowlistsecurity/SSRFchecks |
| POST `/privacy/exports` | formatJSON/CSV | freshreauth ، 202jobId ؛ لا paidstorage |
| GET `/privacy/requests/:id` | status,expiresAt | owner |
| GET `/privacy/exports/:id/download` | streamedfile | ownerfresh、shortTTL、no-store ؛ لامشاركة URL عامة |
| POST `/privacy/deletions` | confirmation,policyVersion | fresh+explicitUI ، 202 ؛ sessionrevoked بعد التأكيد؛ رد حالة عام لا يفضح health |

## المدرب والمحتوى والإدارة

prefix `/coach` يتطلب COACH أو ADMIN لديه grant مماثل، ولايتجاوز scope. prefix `/admin`ADMIN و fresh/MFA لحساسية الأدوار/نشر/استثناء. Contentreviewqualification شرطإضافيلا role بديل.

| الطريقة والمسار | payload/result | التفويض والقواعد |
|---|---|---|
| GET `/coach/participants` | listscoped | assignment+consent نافذ |
| GET `/coach/participants/:id/summary` | allowedmetrics/profile | scope ؛ revoke→404 |
| POST `/coach/participants/:id/notes` | text≤2000 →note | note-scope ، لا logsedit |
| GET/POST `/admin/programs` | metadata/type/slug | COACH يستخدم`/coach/programs`للمخول؛ ADMIN عام |
| PATCH `/admin/programs/:id` | status,reason | pause/archive ، لا deletedhistory |
| POST `/admin/programs/:id/versions` | copyFromVersionId?+draftmetadata | newversion |
| GET/PATCH `/admin/program-versions/:id` | duration/start/schema/policy | DRAFT فقط، If-Match |
| PUT `/admin/program-versions/:id/days/:index` | tasks[],recurrence? | validatekeys/order/cycles/time ، atomicdraftreplace |
| PUT `/admin/program-versions/:id/nutrition` | planlinks+approvedalternatives | DRAFT ؛ يربط immutablecontentrevision |
| PUT `/admin/program-versions/:id/rules` | achievementRuleIds/remindertemplates | DRAFTvalidated |
| GET `/admin/program-versions/:id/preview` | expandedcalendar/testgoals | قراءةمعاينة، لاتكتب health |
| POST `/admin/program-versions/:id/submit` | empty | DRAFT→IN_REVIEW ؛ completenessreport |
| POST `/admin/program-versions/:id/publish` | expectedContentHashes,confirmation | ADMIN ؛ allapproved+immutablelinks ؛ atomic ، 409APPROVAL_REQUIRED |
| POST `/admin/program-versions/:id/withdraw` | reason,safety:boolean | ADMIN ؛ سحب السلامة يجدد display/occurrenceexclusions مدققة |
| GET/POST `/admin/content` | kind,title,body,sourceExtractIds,requiresReview | COACH لديه`/coach/content`مخول؛ requiresReview يصنفخادميًلا صلاحية لتجاوزه |
| POST `/admin/content/:id/revisions` | proposedcontent | createsnewdraft ؛ لا editapproved |
| POST `/content-revisions/:id/submit` | empty | author/scopededitor |
| POST `/content-revisions/:id/review` | decision,rationale,contentHash | reviewerqualifiedindependent ؛ رفض/اعتماد؛ لا selfapproval |
| GET/POST `/admin/qualifications` | reviewerId,scope,evidenceReference,validUntil | verifier مخولغير self |
| PATCH `/admin/qualifications/:id` | status/expiry,reason | fresh ؛ أثر سحب التأهيل على publishing موثق |
| GET `/admin/users` | filtersrole/status,cursor | accountsmetadataonly |
| PATCH `/admin/users/:id` | status أو role,reason | freshMFA ، لا lastadminremoval ، إبطال sessions |
| GET/POST `/admin/assignments` | coachId,userId,scope,expiresAt | createsPENDINGconsentrequest ؛ لا silentgrant |
| DELETE `/admin/assignments/:id` | reason | revoke+audit |
| GET `/admin/reports` | aggregatesbyperiod/program | smallcohortsuppressionpolicyA11 |
| GET `/admin/audit` | filters/cursor | safeaudit ؛ read-only |
| GET `/admin/operations` | limits/job/backupreports | noenvironmentsecrets |
| GET `/admin/corrections` | requests | onlyexplicitcorrectorgrant ؛ noallhealthbyADMINrole |
| POST `/admin/corrections/:id/decision` | APPROVE/REJECT,reason,expectedRevision | authorizedscope ، atomicpatch+recalc+audit |
| POST `/internal/jobs/run` | batch≤100 ، timestamp/signature | machinesignedallowlist ، idempotentclaim ، noUSER |
| GET `/health/live` | status | عام minimal ، لا DBURI/versiondetails |
| GET `/health/ready` | db/jobsreadiness | operationsauth ، nohealth |

التفاصيل المتطابقة لـ COACHprefix: يسمح GET/POSTprograms و POSTversions و GET/PATCHdraft و PUTdays/nutrition/rules و GETpreview و POSTsubmit و GET/POSTcontent و POSTrevisions للكيانات المخولة فقط؛ publish/withdraw/users/audit/operations غير متاح. Contracttests تثبتتفويضكل route وميثود، لا مجرد إخفاء زر.

## حالات الفشل والاختبارات

T-01tokenreplay/expiry/passwordreset/revoke/MFA ؛ T-03 كل CRUD ب UUID لغيره+roleinjection+pool ؛ T-05joinconcurrency/versionwithdraw ؛ T-06completionreplay/stale； T-08waterXOR/cup/negative/delete/replay ؛ T-09stepreplacement ؛ T-10sleepcrossmidnight/overlap/DST ؛ T-11schemaoptionmismatch ؛ T-12zeroN/targets/future/late ؛ T-14quiettime/revokedconsent/jobdoubleclaim/providerfailure ؛ T-16exportexpired/private/deletionretry ؛ T-17selfapproval/hashchanged/unqualifiedreview/publishdraft ؛ T-20CSRF/XSS/rate/unknownfields；T-24quotareached→503 دون data loss. OpenAPI3.1JSONschemas ومولد client مرحلة التنفيذ من هذه العقود، لا generatedspec يدعي التنفيذ الآن.

## ملحق عقود P2 المحلية

نفذت allowlists وDTOs وinput/revision/ownership/idempotency/error helpers في src/server/contracts/p2.ts، مع قيود DB في Prisma/SQL؛ لا endpoint وظيفي جديد. userId/role غير مقبولين؛ If-Match صيغة quoted positive integer، stale409 وmissing428. ownership denial404 ورسائل عامة بلاSQL. idempotency يُربط actor (userId مخزَّن خادميًا)/action/key وhash normalized DTO، وuniqueRace مختبر؛ TTL/replay/encryption ليست خدمات منفذة بعد.

Exercise type allowlist التقنية في P2: WALK/RUN/STRENGTH/OTHER، وليست توصية تمرين. Program policy/late window/goal eligibility والتوقيت المستقبلي والتصحيح وIf-None-Match lifecycle مفحوصة عند تنفيذ الخدمات ذات الصلة؛ RV-07/08/10 تبقى مفتوحة قبلها. رفض publishing وخدمات الكتابة غير المنفذة في DB يمنع اعتبار عقود التأليف والمشاركة متاحة الآن. [التفاصيل](P2-DATABASE-IMPLEMENTATION.md).

## ملحق عقود P3 الفعلية — 2026-10-12

مصدر التنفيذ تكليف P3؛ [التنفيذ](P3-AUTH-IMPLEMENTATION.md). `/api/v1` يستخدم envelope العام data/meta والخطأ error، و204 بلاbody. CSRF GET يعيد `data.csrfToken`. جميع mutations تحقق Origin/Host+CSRF+JSON32KB. no-store و429Retry-After. هوية self من Session فقط.

| المورد / العملية | عقد P3 |
|---|---|
| register | displayName,email,password,privacyAccepted=true,policyVersion=synthetic-local-p3-v1؛ USER/PENDING فقط؛202عام |
| login/challenge | data.needsMfa؛ لا actor DTO قبل MFA؛ الملف والدور والحالة تقرأ من GET /me بعد الجلسة الكاملة |
| email/change POST | fresh/CSRF؛ email؛202، candidateEmail مربوط بـhash، البريد الحالي ثابت |
| email/confirm POST | token؛200، conflict409، invalid400، نجاح يبطل الجلسات/التحديات/الرموز |
| me GET | profile(displayName,timezone,locale,cupMl,preferences,revision),emailNormalized,role,status,mfaEnabled؛ أهداف وموافقات وجلسات عبر قوائمها المنفصلة |
| profile PATCH | جزئي غير فارغ؛ displayName/timezone/locale ar/cupMl null أو1..2000/preferences={reducedMotion:boolean}؛ If-Match واجب؛200+ETag |
| goals POST/PATCH/DELETE | POST كامل؛ PATCH جزئي غير فارغ؛ metric/value/effectiveDate/endDate nullable؛ مستقبل فقط وفق timezone؛ If-Match علىPATCH/DELETE؛404لغير المملوك/409stale أوoverlap/428missing |
| consents POST/DELETE | kind PRIVACY أوNOTIFICATIONS،policyVersion محلي،scope={localSynthetic:true}؛ scopeKey محلي؛201؛ DELETEIf-Match يسجلrevokedAt ولا يمحو السجل؛404/409/428 |
| security commands | password PUT وsession revoke وMFA DELETE تغييرات أمنية مؤمّنة بـfresh، وMFA عند تفعيله؛ لاIf-Match لعملية الإبطال لأنها لا تستبدل محتوى بإصدار قديم؛ logoutCSRF؛204عند الإبطال |

حدود الأهداف **تقنية للاختبار وليست توصيات**: STEPS1..200000،WATER_ML1..20000،EXERCISE_MIN/SLEEP_MIN1..1440. لا افتراض لهدف أوقيمة كوب. قيم DECIMAL كـstring. إكمال التهيئة اختياري، ولا تبنى مشاركةبرنامج فيP3.

RV-03 عولج لهذه الدورة؛ RV-04 تحدي محلي محدد دون إغلاق bootstrapA-12؛ RV-07 مسوّى لعمليات P3 فقط. بقية العقد خارج المصادقة/الملف تصميم مستقبلي. لاOpenAPI مولد كامل أوpolicy إنتاج معتمدة فيP3. النتائج الفعلية في [P3-TEST-RESULTS](P3-TEST-RESULTS.md).

## ملحق API المنفذ في P4

العقود الفعلية في [P4-PROGRAM-ENGINE](P4-PROGRAM-ENGINE.md) و[P4-CONTENT-REVIEW](P4-CONTENT-REVIEW.md)، والخدمة src/server/programs/service.ts. الاسم النصي في payload هو bodyText؛ كل المحتوى يخضع للمراجعة ولا يقبل requiresReview من العميل. POST يحتاج Idempotency-Key UUID، والتعديلات والأوامر الموجهة تحتاج If-Match مقتبسًا. معاينة النسخة تعيد references وchecks لنقص الأيام والاعتمادات والمصادر والوجبات. أضيفت recurrence وreturn-to-draft وmeals/nutrition-plans، والتأهيل محلي اصطناعي فقط. أوامر الغذاء تستخدم revision المحتوى الأب لمنع تعارض تعديل graph؛ النص والمكونات يتجمدان عند IN_REVIEW. لا APIs مشاركة أو سجلات يومية جديدة في P4.

## عقد P5–P7 المنفذ محليًا

الملحق الحالي يحدد التصرف الفعلي فوق الجداول التصميمية السابقة. هوية المالك من جلسة P3؛ لا يقبل userId في الجسم أو الفلاتر. الردود private/no-store وتستخدم غلاف data/meta، والأخطاء العربية لا تعرض SQL/stack. خدمات المصدر `participation/service.ts` و`tracking/service.ts` و`analytics/service.ts`.

| الطريقة والمسار بعد /api/v1 | المدخل/المخرج الفعلي | التفويض والقيد |
|---|---|---|
| GET participant/programs وparticipant/programs/:id | كتالوج وتفاصيل النسخ المنشورة المسموحة والأيام | جلسة مصادق عليها؛ بوابة مراجعة P4، لا محتوى مسحوب |
| POST enrollments | programId/versionId/startDate/goalOverrides[] → المشاركة | سياسة محلية syntheticOnly؛ goalOverrides غير الفارغة محجوبة بسجل سياسة معتمد؛ مجموعة أيام كاملة ذرية |
| GET enrollments وenrollments/:id | كل مشاركات المالك، metadata النسخة الثابتة، الحالات والأيام | snapshot المنطقة والسياسة والنسخة لا يعاد تفسيره من الملف |
| GET today?date=&enrollmentId= وenrollments/:id/days/:date | occurrences والمهمة القادمة/counts/saveWindow | المالك، تاريخ ضمن المشاركة؛ القادم لا يسمح بإتمام يوم مستقبل |
| PUT occurrences/:id/completion | completed/occurredAt → إتمام أو تراجع وrevision | MANUAL فقط؛ THRESHOLD يرجع USE_LOG؛ If-Match للـoccurrence |
| POST enrollments/:id/withdraw | reason? → WITHDRAWN | If-Match للمشاركة؛ locks وتاريخ محفوظ، لا حذف |
| GET logs?from=&to= أو date= | قوائم سجلات شخصية غير محذوفة؛≤366 يومًا | يظل التسجيل الشخصي دون مشاركة مسموحًا |
| POST logs/water، PATCH/DELETE logs/water/:id | amountMl أو cupCount/cupMl وoccurredAt | XOR ووحدة وحجم snapshot، تعديل/حذف منطقي مع إعادة DERIVED |
| GET/PUT/DELETE logs/steps/:date | totalSteps/recordedForTime → snapshot أو غياب | إجمالي بديل، 0 صريح؛ DELETE يحفظ revision لاستعادة صحيحة |
| POST logs/exercise، PATCH/DELETE logs/exercise/:id | type/startsAt/durationMin/note? | يبدأ وينتهي قبل وقت الخادم؛ لا تمرين مستقبلي مكتمل |
| POST logs/sleep، PATCH/DELETE logs/sleep/:id | startsAt/endsAt | مدة صحيحة وعدم تداخل؛ wakeDate في snapshot |
| GET/POST habits، PATCH habits/:id، PUT habits/:id/days/:date | تعريف أيام الأسبوع وحدود وعادة/إتمام يوم | habitDefinition ملكية وrevision؛ singleton اليوم بلا مستقبل |
| GET/PUT reviews/:date | schemaVersionId/answers/notes?/weightKg? | مخطط منشور مكتمل أو تاريخ خاص مسموح وخيارات مطابقة، revision هذا التاريخ، لا عرض مسودة جزئية أو تعديل جواب يوم باستجابة يوم آخر |
| GET analytics?from=&to=&enrollmentId= | daily C/N، due/final/weekly/streak، metrics والتقييمات |≤366 يومًا، فلاتر allowlist بلا تكرار، نسخة/title/timezone خاص بالمشاركة، لا متوسط مخططات مختلفة |
| GET achievements | awards وإصدار القاعدة والإثبات والحالة وشهادة الاختبار المرتبطة | يعيد التقييم من المصدر؛ لا endpoint لإنشاء استحقاق يدوي |
| GET certificates/:id | serial TEST-/status/evidence/verification/syntheticOnly/watermark | المالك فقط؛ فحص حي وإصدار مصدر،409CERTIFICATE_REVOKED بعد حفظ السحب |

كل mutation مشاركة/تتبع تحتاج CSRF وIdempotency-Key UUID؛ المفتاح مرتبط بالفاعل وpath/method/input/preconditions. If-Match `"revision"` مطلوب للتعديل والحذف والتراجع، وIf-None-Match:* لإنشاء خطوات/تقييم/عادة يوم جديدة؛ إذا بقي singleton محذوف منطقيًا تستعاد بإصداره المحفوظ. غياب precondition يرجع428، الإصدار القديم أو مفتاح الجسم المختلف409، validation422، المورد غير المرئي404، وانقطاع DB503.

أوامر P5–P7 الحالية تعيد نجاحًا200 مع JSON، بما فيه الحذف المنطقي وإصداره؛ ليست جميع رموز201/204 في جدول التصميم العام منفذة في هذه الخدمات. قوائم logs محدودة500 لكل نوع داخل الفترة وليست cursor API كاملة. تقارير تصحيح إداري خارج النافذة، محرر قواعد إنتاجي، شهادات PDF موقعة/عامة، وتنبيهات لم تنفذ بهذا النطاق؛ لا زر أو مسار يوحي بها. النتائج والانحدار والقيود في [التكامل](P5-P7-INTEGRATION-REPORT.md).
