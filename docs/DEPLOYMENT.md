# نطاق التشغيل والنشر

P1 محلي فقط؛ [LOCAL-DEVELOPMENT](LOCAL-DEVELOPMENT.md) يوضح التشغيل وإعادة الإنشاء. لا حساب أو استضافة سحابية أو قاعدة إنتاج أو نشر عام أو دمج main. خادما dev/start وCompose يستمعان على loopback.

CI workflow_dispatch دون push trigger أو deployment؛ حصة Actions الخاصة لم تتحقق. لا تشغيل تلقائي أو مدفوعات. أي مزود مستقبلًا يحتاج فحص شروط الصفر تكلفة وإيقاف preview التلقائي، وإغلاق A-06..09 وموافقة منفصلة.

لا نسخ أو استعادة إنتاجية منفذة؛ volume تطوير ليس backup. لم يُغير WSL/Windows أو reset Docker. تُراجع ترقيات الحزم وصورة PostgreSQL أمنيًا قبل أي بيئة مستقبلية.
