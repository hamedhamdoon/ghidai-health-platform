# P3 — تحقق الأمن

2026-10-12، بيانات اصطناعية فقط. [التنفيذ](P3-AUTH-IMPLEMENTATION.md) و[الاختبارات](P3-TEST-RESULTS.md).

| الضابط | التنفيذ / دليل الاختبار |
|---|---|
| كلمات المرور | Argon2id ثابت المعلمات، 12–128 حرفًا، لا password في DTO/log؛ hash/verify/wrong password في unit/integration |
| جلسات | 256bit opaque، SHA256 في DB، HttpOnly/SameSite=Strict/path=/؛ تدوير/إبطال/expiry/idle في DB |
| local cookie | Secure=false **في HTTP loopback فقط**؛ أصل مقيد 127.0.0.1:3000/3100، الخادم مربوط loopback، production/provider غير مهيأ؛ لا ادعاء cookie إنتاجي |
| CSRF | nonce cookie HttpOnly + HMAC للnonce/session أو preauth/expiry، Origin/Host allowlist، no forwarded host trust؛ حماية auth mutations أيضًا |
| الرموز | hashed، expiry/usedAt، استهلاك ذري مع قفل الحساب، إبطال القديمة، rollback في التعارض؛ fragment بدل query |
| MFA | encrypted secret، setup expiry، preauth لا Session، persisted bounded attempts، lastStep replay guard، recovery hashes أحادية الاستخدام |
| RBAC/RLS | مصادقة DB موثوقة تنتج VerifiedActor؛ ghidai_auth لا health/table ownership/bypass/role writes، ghidai_app no owner/bypass؛ profile/goal/consent ownership وpool reset |
| تزامن | register unique، verify/reset/challenge single consume، recovery locked، If-Match CAS؛ User NO KEY UPDATE لمنع FK deadlock |
| حدود | counters مشتركة PostgreSQL، مفاتيح HMAC+SHA256 لا email/IP صريح؛ 429 وRetry-After،32KB bounded stream، strict fields |
| أخطاء وتخزين مؤقت | DTO allowlists، React escaping، error catalog عربي/requestId دون SQL/stack، private no-store، لا localStorage/sessionStorage للأسرار |
| تدقيق | register/login/logout/reauth/token/password/MFA/recovery/session/email، وConsent triggers P2؛ metadata لا payload صحي/credentials |
| انقطاع | البريد encrypted pending وإعادة محاولة؛ اتصال/query/statement timeout، إخفاق DB آمن503؛ اختبارات الأعطال الحقيقية موثقة في التقرير |

تعزل RLS مستخدمين موثوقين عبر خادم سليم؛ لا تحمي اختراق الخادم أو تسرب credentials DB الذي يسمح بضبط SQL context. بوابة ghidai_auth لها قراءة جميع credentials بالضرورة للتحقق قبل معرفة المستخدم، وتحتاج حماية أسرار الخادم. لا endpoint عام يتيح SQL أو اختيار actor. Session.id المرسل للإبطال **مورد** يخضع لمالك الجلسة الموثوق، ولا يصبح هوية.

## الاعتماديات المفتوحة

أعيد npm audit وnpm registry بتاريخ2026-10-12: runtime0؛ كامل5high في braces→micromatch→fast-glob→@next/eslint-plugin-next→eslint-config-next. أحدث المنشور المستقر braces3.0.3/micromatch4.0.8/eslint-config-next16.4.0؛ [النشرة الرسمية](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) لا تسجل patched version. audit يقترح downgrade رئيسيًا14.2.35؛ لم يطبق force/downgrade أو suppression. الأثر الحالي سلسلة تطوير lint، مع خطر DoS لأنماط braces غير موثوقة؛ لا تقبل patterns خارجية في أدوات الفحص، وأعد التقييم قبل الإصدار. التقرير الكامل WARN/exit1، وليس PASS.

## البوابات المتبقية

A-02 الجمهور/الأهلية، A-08 مدد الجلسات والاحتفاظ والنسخ، A-12 إدارة واسترداد المسؤول، A-07 القانون، A-09 بريد الإنتاج وغيرها وفق سجل القرارات مفتوحة. لا انتشارعام/HTTPS/real-data/موافقة نهائية أمنية. لا bootstrap دائم أوMFA bypass. مراجعة أمن مستقلة/قارئ شاشة عملي/جهازان مستقلان/حمل إنتاج وbackup restoration ليست مثبتة بهذه المرحلة.
