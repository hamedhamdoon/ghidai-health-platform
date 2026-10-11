# P2 — التحقق الأمني

2026-10-11 Asia/Muscat. [التنفيذ](P2-DATABASE-IMPLEMENTATION.md) و[النتائج](P2-TEST-RESULTS.md)؛ بيانات اصطناعية فقط.

| الطبقة | التنفيذ والدليل |
|---|---|
| الحسابات | bootstrap محلي لـmigrations، owner NOLOGIN، app غير Superuser/owner/BYPASSRLS؛ اختبار منع SET ROLE إلى owner/policy |
| RLS | ENABLE وFORCE على68 جدولًا؛ default deny؛ self، وcoach READ محدد؛ لا ADMIN health policy |
| grants | subject/resource/action/scopeUser/reason/expiry/revocation، assignment+consent composite، resource وREAD داخل الموافقة؛ سحب/انتهاء فوري |
| السياق | withActor يفحص حساب ghidai_app ويستخدم SET LOCAL parameterized داخل transaction؛ اختبار reuse max1 وcommit/rollback بلا تسرب |
| الملكية | FK مركبة للسجلات/المشاركات/الأيام/المهام/الموافقات/الإجابات، HealthRecord registry للتصحيح/revision |
| التدقيق | تغييرات grants/consents/assignments مدققة append-only، metadata revision فقط دون payload صحي |
| الأسرار | أربعة ملفات env محلية مستثناة؛ scanner يفحص كلمات مرور التطبيق الجديدة |
| منع إنتاج | URL/DB identity/preflight/checksum؛ Prisma migrate بعنوان production.invalid رفض قبل الاتصال |
| العقود | reject unknown/userId/role، If-Match، idempotency وDTO allowlist وsafeError |

ghidai_policy دور NOLOGIN ذي BYPASSRLS **محدود ومقصود**: SELECT على User/Consent/Assignment/Grant وINSERT على Audit فقط، بلا SELECT على الصحة ولا عضوية للتطبيق. يملك دوال policy/audit ضيقة بـsearch_path ثابت لتفادي recursion مع FORCE RLS. التطبيق لا يمكنه SET ROLE إليه. حساب migration privileged محليًا، غير مستخدم في وظائف التطبيق.

VerifiedActor نوع داخلي بلا منشئ إنتاجي؛ fixtureActor في الاختبار فقط. لا login أوsession resolver منفذ، ولا يجوز تمرير هوية من المتصفح مستقبلًا. RLS لا يحمي اختراق الخادم أوتسرب سر DB الذي يسمح بـSQL context. auth/MFA/CSRF/rate limiting والتشفير وإدارة المفاتيح خدمات لاحقة غير منفذة.

كتابات User/Session/AuthToken/MFA/Consent/Assignment/Grant وEnrollment/Completion/MealSelection/Reminder/Notification/PrivacyRequest محجوبة للتطبيق حتى تنفيذ خدماتها. التأليف والنشر بلا policies؛ publishing fail-closed. ADMIN break-glass والمصحح وتقارير الصحة مؤجلة إلى A-11؛ جميع A تبقى مفتوحة.

## الاعتماديات

audit الكامل ما زال5high تطويرية braces→micromatch→fast-glob→Next ESLint، وaudit --omit=dev صفر. npm الرسمي أظهر braces3.0.3/micromatch4.0.8/eslint-config-next16.4.0 أحدث منشور؛ [GitHub advisory](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) بلاpatched version. لم يثبت تحديث رسمي متوافق يصلحها؛ لا downgrade/force/suppress أوpatch غير رسمي. peer ESLint الحالي >=9؛ انتهاء دعم ESLint9 خطر مستقل، وتحديث major وحده لا يزيل braces. لا تغييرات حزم/lockfile. audit الكامل WARN وليس PASS؛ يعاد تقييمه قبل الإصدار التالي. لا pentest مستقل أوتقييم قانون عمان أوجاهزية إنتاج.
