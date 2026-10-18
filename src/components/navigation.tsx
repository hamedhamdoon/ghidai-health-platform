'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CalendarDays, ClipboardList, ChartNoAxesCombined, CircleUserRound, Leaf } from 'lucide-react';
const destinations = [
  { href: '/today', label: 'اليوم', icon: CalendarDays },
  { href: '/my-programs', label: 'برنامجي', icon: Leaf },
  { href: '/logs', label: 'سجلاتي', icon: ClipboardList },
  { href: '/progress', label: 'تقدمي', icon: ChartNoAxesCombined },
  { href: '/account', label: 'حسابي', icon: CircleUserRound },
];
export function Navigation() {
  const pathname = usePathname();
  return <nav className="navigation" aria-label="التنقل الرئيسي">{destinations.map(({ href, label, icon: Icon }) => <Link key={href} href={href} prefetch={false} aria-current={pathname === href ? 'page' : undefined}><Icon size={22} aria-hidden="true"/><span>{label}</span></Link>)}</nav>;
}
