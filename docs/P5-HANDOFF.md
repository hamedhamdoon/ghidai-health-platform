# P5 — المشاركة والجدول المحلي

2026-10-13، Asia/Muscat. الفرع feature/ghidai-p5-p7-participant-experience من P4 المعتمد 836e98fc1534514bddc9ec788c63bd3ac89f1a9a. تكليف المالك يشمل P5–P7؛ هذه نقطة P5 المستقلة.

استعراض البرامج المنشورة المسموحة وتفاصيلها، الانضمام لنسخة محددة ببداية مرنة أو ثابتة، توليد أيام المشاركة ومهامها ومواعيدها المطلقة والنسبية، اليوم والمهمة القادمة والتاريخ، الإتمام اليدوي والتراجع، والانسحاب مع إبقاء التاريخ. مشاركات متعددة في برامج مختلفة؛ نسخة البرنامج والسياسة والمنطقة الزمنية والأهداف والترتيب محفوظة وثابتة. تعديل الملف لا يعيد تفسير المشاركة.

التنفيذ: src/server/participation، شاشتا ParticipantPrograms وParticipantToday، ومسارات /my-programs و/today. API مصادق /participant/programs و/enrollments و/today و/occurrences/:id/completion. POST/PUT يحتاجان Idempotency-Key؛ الإتمام والانسحاب يحتاجان If-Match. هوية المالك من جلسة P3 فقط؛ RLS بحساب ghidai_app لا مدير قاعدة البيانات. قفل actor ثم المشاركة والأيام والمهام؛ قفل نسخة الانضمام عبر helper محدود لا يمنح المشارك UPDATE على Program.

RV-10: SCHEDULED→ACTIVE عند بلوغ البداية، ACTIVE→COMPLETED بعد آخر يوم ونافذة الحفظ، SCHEDULED/ACTIVE→WITHDRAWN بطلب المشارك. COMPLETED/WITHDRAWN نهائيتان. OPEN→LOCKED عند انتهاء النافذة أو الانسحاب؛ OPEN→EXCLUDED يتطلب سحب سلامة مدققًا. لا إعادة فتح ولا تغيير snapshot. اكتمال حالة المشاركة زمني وليس إثبات استحقاق شهادة.

الانضمام محصور بقاعدة محلية وسياسة streakRule.syntheticOnly=true؛ A-03 ما زالت مفتوحة. تخصيص الأهداف محجوب لحين اعتماد سجل السياسات؛ لا هدف صحي موحد أو قراءة محتوى مسحوب. المهام التاريخية تبقى بمعرفها وعدّها وعنوان بديل آمن عند سحب المحتوى. نشر/سحب المحتوى يبقى عبر P4.

إعادة الاختبار: npm run test:p5 ثم npm run check؛ E2E بعد build على3100 باستخدام p5-participant.spec.ts ومخطط P5 المحضر. سكربت participant-test-schema ينشئ مخططًا جديدًا ويحفظ السابق؛ لا تغيير مرجع المخطط أثناء خادم اختبار قائم. لا حذف قاعدة أو volumes أو migrations سابقة. النتائج في [P5-TEST-RESULTS](P5-TEST-RESULTS.md). لا P8 أو إنتاج أو main merge.
