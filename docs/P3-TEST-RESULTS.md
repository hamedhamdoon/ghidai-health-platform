# P3 — نتائج الاختبارات الفعلية

2026-10-12، Asia/Muscat. الخادم loopback وPostgreSQL اختبار ghidai_test على55433؛ schemas `p3_test_*` جديدة ومحفوظة، ولا بيانات أشخاص حقيقيين. اختبارات P2 في schemas مستقلة محفوظة. لا حذف DB/volume/schema.

| الفحص | آخر نتيجة مؤكدة |
|---|---|
| dev/test migrations P3 | PASS: ثلاث إضافية بعد تسع P2؛ checksums P2 محفوظة |
| Prisma validate/generate | PASS:70models، عميل Profile حقيقي خلف RLS |
| TypeScript/Lint/Build | PASS؛ آخرcheck متسلسل بعد إصلاحUnicode/رسائلالشبكة والمدخلات السلبية |
| Unit | PASS:29 (21P1/P2 +8P3) |
| P2 PostgreSQL regression | PASS:42groups |
| P3 PostgreSQL integration | PASS:23groups؛ expiry/replay/duplicate email/SQL privilege مختبرة |
| E2E | PASS:60/60 في آخرجولة،1.2دقيقة،360/768/1280؛21P1 +39P3، ويشملgoalsCRUD وMFA وoffline Arabic error |
| mail/database outage | PASS:4checks،Mailpitpause→pending→retry،PostgreSQLpause→503→unpause→401؛ المخططات والرسائل محفوظة |
| audit runtime | PASS:0 |
| audit كامل | WARN:5high تطويرية بلاpatch رسمي، لم تتجاهل |
| secrets/diff | PASS قبل الحفظ؛ AGENTS وmigrations P2 بلافرق |
| dev/test Prisma probes | PASS بعد تحديث تحقق baseline من9الثابت إلى أسماء/checksums الاثنتي عشرة |
| Git | Commit/Push بعد اكتمال آخر فحص؛ القيم الفعلية في تسليم المحادثة |

## التغطية

Register/duplicate/verify/expiry/reuse، pending login، failed credentials، forgot generic/reset/revoke، reauth/change password/session revocation، MFA setup/confirm/partial session/attempts/recovery race، CSRF/mass assignment/body limits، A/B profile/goals/consents ownership، RLS direct denial/Prisma/commit+rollback context، optimistic races وshared counters. اختبارات المتصفح تستخدم الرسائل **المستلمة فعليًا** عبر Mailpit وتنفذ النماذج.

## إخفاقات اكتشفت وصححت

1. أول migration P3 في test اصطدمت بدور auth غير مهيأ؛ transaction رجعت كاملًا. فحص عدم وجود AuthChallenge ثم Prisma resolve rolled-back دون حذف أو تعديل migrations P2؛ role provisioning يسبقها الآن.
2. Prisma introspection كرر اسم ContentRevision بعلاقة PlanMeal الموجودة من P2؛ استعيد اسم Meal الصحيح دون تغيير DB، ثم validate/generate نجحا.
3. قفل User FOR UPDATE عارض FK من اتصال app المستقل؛ استبدل بـFOR NO KEY UPDATE، وأعيد اختبار goals/consents والتزامن بنجاح.
4. lint كشف تحديث state في effect وتحذير dependencies؛ استخدمت callback async مستقر دون إسكات القواعد. ترتيب معلمات Argon2 PHC يختلف؛ الاختبار يفحص المعلمات لا ترتيبها.
5. أول E2E أعاد45/54PASS، وفشل9دورات auth لأن Next أعاد بناء URL داخليًا بـlocalhost. Host loopback allowlist يحسم الأصل ويهمل forwarded headers؛ الاختبار النهائي يتحقق من ذلك.
6. مراجعة واجهة MFA وجدت أن refresh قد يخفي recoveryCodes فورًا؛ يؤجل refresh حتى إقرار المستخدم بحفظ الرموز، ويختبر ذلك في المتصفح.
7. probeP1 توقع9migrations ثابتة فأخفق بعدP3؛ أصبح يفحص الأسماء/checksums المعروفة دون تعطيل الحاجز، ثمdev/testنجحا. DATE للأهداف يعاد كنصYYYY-MM-DD كي لا يتغير اليوم بتوقيت نظامWindows؛ لاتقريبضمني لقيمDECIMALعندPATCH.
8. اختبارoffline الإضافي رصد رسالة عربية صحيحة، لكن locatorعامطابق أيضًا announcerالوصول الخاص بـNext؛ قيد الاختبار على التنبيه المحتوي رسالة الشبكة دون تغيير ضوابط التطبيق أوإزالة عنصر الوصول.
9. شدد البريد لمنع قائمةمستلمين/comments/headerinjection، وترجمت أخطاءfetch إلىالعربية. مقارنةCSRF تفحص طولUTF8bytes قبل timingSafeEqual كي لا يصبح malformedUnicode إخفاق503؛unit وHTTPnegative يغطيانه.

## قياس الأداء المحلي

تشغيل `scripts/p3-performance.ts` على /login عبرChromium، دونcache،100mslatency/1.5Mbpsdownload/4xCPUsimulation. ثلاث عينات محلية، وليست جهازهاتف حقيقي أوSLAإنتاج:

| العرض | DCL ms | load ms | LCP ms | النقلbytes | overflow |
|---|---:|---:|---:|---:|---|
|360|2248|3766|1868|196551|false|
|768|3439|3440|1656|196551|false|
|1280|2822|2823|1584|196551|false|

الأثر: شاشة الدخول أظهرتLCPبين1.58و1.87ثانية في العينات النهائية، والنقلنحو192KiB، ولاانزياحأفقي. قياسخاصبهذهالشاشة وظروفالجهاز؛ ليسLighthouse/FID/INP أوحملDB/كلالشاشات. المخرجات المحلية فيtest-results/p3-performance.json، وأداةالقياس قابلة لإعادةالتشغيل بعدbuild.

ليس نجاح build وحده دليل اكتمال. CI يدوي لم يشغّل على GitHub، لا فحص قانوني/اختبار إنتاج/HTTPS/جهازان/قارئ شاشة يدوي/نسخ إنتاج. قياسات الأداء المحلية توثق منفصلة عند توفرها ولا تدعي SLA.
