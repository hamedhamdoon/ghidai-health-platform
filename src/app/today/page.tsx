import Link from 'next/link';
import { PageHeading } from '@/components/ui';
import { ParticipantToday } from '@/components/participant-today';
import { QuickTracking } from '@/components/quick-tracking';
export default function TodayPage(){return <><PageHeading eyebrow="اختبار محلي اصطناعي" title="اليوم">البرامج والسياسات المعروضة للاختبار فقط، وليست توصيات صحية معتمدة.</PageHeading><QuickTracking/><ParticipantToday/><Link href="/help">تعرف على المرحلة الحالية</Link></>;}
