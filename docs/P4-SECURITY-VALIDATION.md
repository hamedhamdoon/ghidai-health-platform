# P4 — تحقق الأمن المحلي

2026-10-12، Asia/Muscat. المصادقة والجلسات وCSRF/Origin/Host/body32KB/rate limit من P3؛ البرنامج يعمل على loopback فقط. خدمات P4 لا تستعمل owner URL أو bypass؛ withActor يفحص ghidai_app NOBYPASSRLS ويضع app.user_id داخل transaction، ويعيد السياق بعد commit/rollback.

P4LocalCapability جدول FORCE RLS مستقل عن role؛ لا INSERT/UPDATE من ghidai_app. صلاحية ADMIN/COACH لا تكفي وحدها: جلسة ACTIVE + capability SYNTHETIC_LOCAL_ONLY لم تنته + قاعدة GHIDAI محلية. fixtures CLI يقبل development فقط، والحسابات اصطناعية، والسلطة ساعتان؛ لا تسليم مسؤول حقيقي أو bootstrap إنتاجي. النشر/السحب/التأهيل وحالة البرنامج تتطلب أيضًا reauth≤10دقائق وMFA موثق في الجلسة مع عامل مفعّل حاليًا وتحقق لا يسبق تفعيله. مسارات coach البديلة تمر بالتحقق الحساس نفسه. USER لا يرفع صلاحياته عبر التسجيل أو SQL.

RLS يقتصر تحرير البرامج على المالك/ADMIN، ويمنع COACH من قراءة مسودات برامج الغير. المشرف لا يكتسب قراءة WaterLog أوغيرها؛ P2 regression يفحص ذلك. مراجعة المحتوى لا تسمح باعتماد المؤلف، أو scope خاطئ، أو تأهيل منتهٍ، أو تغيير graph أثناء المراجعة. وظائف SECURITY DEFINER الجديدة مثبتة search_path، مسندة لدور السياسة المحدود، مع revoke PUBLIC؛ لا قبول table/SQL من العميل.

الإصدارات وروابطها بعد النشر immutable؛ قفل الأب يزامن تغيير الأطفال مع النشر. الإيصالات مشفرة ومفصولة actor/action/key. If-Match والأقفال والتحقق النهائي يحميان التزامن. المصدر الحقيقي أو نسله محجوب عن النشر ولو وافق مراجع اصطناعي. سحب محتوى أو بديل يمنع عرض النسخة للمستخدم التالي عبر سياسة visibility دون محو الماضي. سجلات السحب والقرار append-only؛ audit لا يحمل النص الصحي أو الأسرار.

## تحذيرات أدوات التطوير الخمسة

أعيد `npm run audit:p4` فعليًا: runtime صفر، full خمس High: braces وmicromatch وfast-glob و@next/eslint-plugin-next وeslint-config-next. الأربع الأخيرة تمثل مسار الاعتمادية المتأثر بالتحذير الأساسي. [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) يذكر braces≤3.0.3 ولا patch منشور عند التحقق في2026-10-12. npm يقترح downgrade كبيرًا إلى eslint-config-next14.2.35؛ لم يطبق لأنه لا يمثل إصلاحًا متوافقًا مثبتًا مع Next16.4.0. لم تستخدم audit fix --force أو تجاهل/severity filter لإخفائها.

تبقى مخاطرة تطوير مفتوحة: لا تمرر أنماط glob غير موثوقة إلى أدوات lint/build. API لا يستعمل braces/glob مع بيانات المستخدم. تقارير JSON المحلية في `.npm-cache/p4-audit-*`، لا في مجلد Playwright الذي ينظف مخرجاته. runtime0 لا يعني حصانة عامة أو جاهزية إنتاج.

الأدلة الآلية والأخطاء المصححة في [P4-TEST-RESULTS](P4-TEST-RESULTS.md). لا اختبار إنتاج أو فحص قانوني أو حسابات صحية فعلية أو استعادة إنتاج/جهازين مستقلين/NVDA مثبت؛ القرارات والقبول المطلوبان قبل المراحل اللاحقة باقون.
