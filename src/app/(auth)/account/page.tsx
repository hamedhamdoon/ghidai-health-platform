import { AccountPanel } from '@/components/account-panel';
import { PageHeading } from '@/components/ui';
import Link from 'next/link';
export default function Page(){return <><PageHeading eyebrow="GHIDAI" title="حسابي">ملفك الشخصي وأهدافك الاختيارية وأمان حسابك.</PageHeading><nav aria-label="إعدادات الحساب" className="auth-links"><Link className="text-link" href="/coaching">موافقات المدربين</Link></nav><AccountPanel/></>;}
