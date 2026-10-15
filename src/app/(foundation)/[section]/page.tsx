import { notFound } from 'next/navigation';
import Link from 'next/link';
import { CalendarDays, ClipboardList, ChartNoAxesCombined, Leaf } from 'lucide-react';
import { EmptyState, PageHeading } from '@/components/ui';
import { ParticipantPrograms } from '@/components/participant-programs';
import { ParticipantToday } from '@/components/participant-today';
import { ParticipantLogs } from '@/components/participant-logs';
import { QuickTracking } from '@/components/quick-tracking';
import { ParticipantProgress } from '@/components/participant-progress';
const sections = {
  today: { label: 'اليوم', title: 'لا توجد مهام يومية بعد', text: 'ستظهر هنا مهمتك القادمة بعد تنفيذ البرامج والمشاركة. تسجيل الماء والخطوات غير متاح في المرحلة الأولى.', icon: CalendarDays },
  'my-programs': { label: 'برنامجي', title: 'لا توجد برامج متاحة حاليًا', text: 'لم يُنفذ محرك البرامج أو الانضمام بعد. لن يُعرض محتوى غذائي قبل مراجعته واعتماده.', icon: Leaf },
  logs: { label: 'سجلاتي', title: 'لا توجد سجلات محفوظة', text: 'تسجيل الماء والنشاط والنوم سيُنفذ في مرحلة لاحقة. هذه الشاشة لا تحفظ أي بيانات.', icon: ClipboardList },
  progress: { label: 'تقدمي', title: 'لا توجد بيانات لعرض التقدم', text: 'ستعتمد الإحصائيات على سجلاتك الفعلية بعد تنفيذها. لا نعرض نسبًا أو رسومًا افتراضية.', icon: ChartNoAxesCombined },
};
export function generateStaticParams() { return Object.keys(sections).filter(section=>section!=='today').map((section) => ({ section })); }
export default async function FoundationPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!(section in sections)) notFound();
  const item = sections[section as keyof typeof sections];
  if(['today','my-programs','logs','progress'].includes(section))return <><PageHeading eyebrow="اختبار محلي اصطناعي" title={item.label}>البرامج والسياسات المعروضة للاختبار فقط، وليست توصيات صحية معتمدة.</PageHeading>{section==='today'?<><QuickTracking/><ParticipantToday/></>:section==='logs'?<ParticipantLogs/>:section==='progress'?<ParticipantProgress/>:<ParticipantPrograms/>}<Link href="/help">تعرف على المرحلة الحالية</Link></>;
  return <><PageHeading eyebrow="النسخة التأسيسية" title={item.label}>واجهة أساسية قيد التطوير — الوظائف ستتوفر في مراحلها المعتمدة.</PageHeading><EmptyState icon={item.icon} title={item.title}>{item.text}</EmptyState></>;
}
